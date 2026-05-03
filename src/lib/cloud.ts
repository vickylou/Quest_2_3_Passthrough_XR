import { Author, Scenario } from '../types';

/**
 * Cloud sync — minimal Supabase REST client (no SDK) for a small family
 * collaboration use case. The "anon" Supabase key is treated as a shared
 * family secret; everyone with the URL + key can read and write scenarios.
 *
 * Setup steps the user runs once on supabase.com:
 *   1. Create a free project.
 *   2. SQL editor: run SCHEMA_SQL below.
 *   3. Settings → API → copy Project URL + anon public key.
 *   4. Paste them into the Cloud Setup modal in the app.
 */

const CONFIG_KEY = 'inheritance.cloud';

export interface CloudConfig {
  url: string;
  anonKey: string;
  /**
   * Logical "family" identifier. Lets one Supabase project host more than one
   * family circle if ever needed. Defaults to 'default'.
   */
  familyId: string;
}

export const SCHEMA_SQL = `-- Inheritance Calculator: scenarios sync table.
-- Run once in your Supabase project's SQL editor.
create table if not exists public.scenarios (
  id text primary key,
  family_id text not null default 'default',
  author text not null,
  name text not null,
  meeting text,
  visibility text not null check (visibility in ('public','shared')),
  shared_with text[],
  status text not null default 'draft',
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  deleted boolean not null default false
);
alter table public.scenarios enable row level security;
drop policy if exists "anon all" on public.scenarios;
create policy "anon all" on public.scenarios for all using (true) with check (true);
create index if not exists idx_scenarios_vis on public.scenarios (visibility, deleted);
create index if not exists idx_scenarios_shared on public.scenarios using gin (shared_with);
`;

export function loadCloudConfig(): CloudConfig | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CloudConfig>;
    if (!parsed.url || !parsed.anonKey) return null;
    return {
      url: parsed.url.replace(/\/+$/, ''),
      anonKey: parsed.anonKey,
      familyId: parsed.familyId || 'default',
    };
  } catch {
    return null;
  }
}

export function saveCloudConfig(config: CloudConfig | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (config === null) {
      localStorage.removeItem(CONFIG_KEY);
    } else {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    }
  } catch {
    /* ignore */
  }
}

interface CloudRow {
  id: string;
  family_id: string;
  author: Author;
  name: string;
  meeting: string | null;
  visibility: 'public' | 'shared';
  shared_with: Author[] | null;
  status: string;
  payload: Scenario;
  updated_at: string;
  created_at: string;
  deleted: boolean;
}

function headers(config: CloudConfig, extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

/**
 * Fetches every scenario the viewer is allowed to see — public ones, ones
 * authored by the viewer (so their cloud copies stay in sync), and ones
 * shared explicitly with the viewer.
 */
export async function pullVisibleScenarios(
  config: CloudConfig,
  viewer: Author
): Promise<Scenario[]> {
  // PostgREST "or" syntax. shared_with is a Postgres array; we filter in JS to
  // keep the URL simple.
  const url = `${config.url}/rest/v1/scenarios?select=*&family_id=eq.${encodeURIComponent(config.familyId)}&deleted=eq.false`;
  const res = await fetch(url, { headers: headers(config) });
  if (!res.ok) {
    throw new Error(`Pull failed: ${res.status} ${await res.text().catch(() => '')}`);
  }
  const rows = (await res.json()) as CloudRow[];
  const visible = rows.filter((r) => {
    if (r.author === viewer) return true;
    if (r.visibility === 'public') return true;
    if (r.visibility === 'shared' && Array.isArray(r.shared_with) && r.shared_with.includes(viewer))
      return true;
    return false;
  });
  return visible.map(rowToScenario);
}

/**
 * Upserts a scenario into the cloud. Private scenarios are never pushed; if
 * you flip visibility from public/shared to private, call `cloudDelete`
 * separately to remove it.
 */
export async function pushScenario(
  config: CloudConfig,
  scenario: Scenario
): Promise<void> {
  if (scenario.visibility === 'private') return;
  const row: Partial<CloudRow> = {
    id: scenario.id,
    family_id: config.familyId,
    author: scenario.author,
    name: scenario.name,
    meeting: scenario.meeting ?? null,
    visibility: scenario.visibility,
    shared_with: scenario.sharedWith ?? null,
    status: scenario.status,
    payload: scenario,
    updated_at: new Date(scenario.updatedAt).toISOString(),
    created_at: new Date(scenario.createdAt).toISOString(),
    deleted: false,
  };
  const url = `${config.url}/rest/v1/scenarios?on_conflict=id`;
  const res = await fetch(url, {
    method: 'POST',
    headers: headers(config, {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    throw new Error(`Push failed: ${res.status} ${await res.text().catch(() => '')}`);
  }
}

/** Soft-deletes a scenario by id (sets `deleted = true`). */
export async function cloudDelete(config: CloudConfig, scenarioId: string): Promise<void> {
  const url = `${config.url}/rest/v1/scenarios?id=eq.${encodeURIComponent(scenarioId)}&family_id=eq.${encodeURIComponent(config.familyId)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: headers(config, { Prefer: 'return=minimal' }),
    body: JSON.stringify({ deleted: true, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) {
    throw new Error(`Delete failed: ${res.status} ${await res.text().catch(() => '')}`);
  }
}

/** Quick health check used by the setup modal. */
export async function testConnection(config: CloudConfig): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const url = `${config.url}/rest/v1/scenarios?select=id&limit=1`;
    const res = await fetch(url, { headers: headers(config) });
    if (!res.ok) {
      return { ok: false, error: `${res.status}: ${await res.text().catch(() => '')}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

function rowToScenario(row: CloudRow): Scenario {
  // Trust the embedded payload (which already matches our Scenario shape) and
  // overlay the row-level fields so we never disagree with the materialised
  // columns.
  const sc = row.payload;
  return {
    ...sc,
    id: row.id,
    author: row.author,
    name: row.name,
    meeting: row.meeting ?? undefined,
    visibility: row.visibility,
    sharedWith: row.shared_with ?? undefined,
    status: (row.status as Scenario['status']) ?? sc.status,
    updatedAt: Date.parse(row.updated_at),
    createdAt: Date.parse(row.created_at),
  };
}
