import { createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { Author, Scenario } from '../types';

/**
 * Cloud sync — Supabase JS SDK with magic-link auth + Row Level Security.
 *
 * Privacy model:
 *   - Each family member signs in with their own email (magic link).
 *   - On first sign-in they pick a role (lisa / vicky / jackie / alexa / mum / dad / test)
 *     which is stored in the `identities` table.
 *   - All scenarios reads/writes go through Supabase. RLS policies enforce
 *     server-side that a signed-in user can only see scenarios where they are
 *     the author, or visibility = 'public', or visibility = 'shared' AND their
 *     role is in shared_with. The Viewing-as picker is gone — you can't
 *     impersonate a family member by clicking around anymore.
 *
 * Setup the user runs once in their Supabase project's SQL editor: AUTH_SCHEMA_SQL.
 */

const CONFIG_KEY = 'inheritance.cloud';

/**
 * Build-time defaults from Vite env vars. When the deploy injects these
 * secrets the family doesn't need to paste anything — the app autoconfigures
 * cloud sync on first load and the only step left is signing in.
 */
const ENV_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const ENV_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
const ENV_FAMILY_ID = (import.meta.env.VITE_SUPABASE_FAMILY_ID ?? 'default').trim() || 'default';

/** True if the deploy baked credentials into the bundle. */
export function isPreconfigured(): boolean {
  return ENV_URL.length > 0 && ENV_ANON_KEY.length > 0;
}

export interface CloudConfig {
  url: string;
  anonKey: string;
  /** Lets one Supabase project host multiple family circles. Defaults to 'default'. */
  familyId: string;
}

export const AUTH_SCHEMA_SQL = `-- Inheritance Calculator: cloud schema (run once in Supabase SQL editor).

-- 1. Scenarios table (idempotent — safe to re-run).
create table if not exists public.scenarios (
  id text primary key,
  family_id text not null default 'default',
  author text not null,
  name text not null,
  meeting text,
  visibility text not null check (visibility in ('private','public','shared')),
  shared_with text[],
  status text not null default 'draft',
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  deleted boolean not null default false
);
alter table public.scenarios enable row level security;

-- 2. Identities table: maps each Supabase auth user → family role.
--    Each (role, family_id) pair is unique, so the first email to sign up as
--    "vicky" claims that role and no one else can take it later.
create table if not exists public.identities (
  auth_uid uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('lisa','vicky','jackie','alexa','mum','dad','test')),
  family_id text not null default 'default',
  created_at timestamptz not null default now()
);
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'identities_role_family_unique'
  ) then
    alter table public.identities
      add constraint identities_role_family_unique unique (role, family_id);
  end if;
end $$;
alter table public.identities enable row level security;

-- 3. Helper: returns the signed-in user's family role (null if not signed in / no identity yet).
create or replace function public.viewer_role() returns text
  language sql stable security definer set search_path = public, auth as $$
  select role from public.identities where auth_uid = auth.uid();
$$;

-- 4. Replace the old permissive policy (if any) with auth-based policies.
drop policy if exists "anon all" on public.scenarios;
drop policy if exists "scenarios read visible" on public.scenarios;
drop policy if exists "scenarios insert own" on public.scenarios;
drop policy if exists "scenarios update own" on public.scenarios;
drop policy if exists "scenarios delete own" on public.scenarios;

create policy "scenarios read visible" on public.scenarios for select
  using (
    auth.uid() is not null
    and deleted = false
    and (
      author = public.viewer_role()
      or visibility = 'public'
      or (visibility = 'shared' and public.viewer_role() = any(shared_with))
    )
  );

create policy "scenarios insert own" on public.scenarios for insert
  with check (auth.uid() is not null and author = public.viewer_role());

create policy "scenarios update own" on public.scenarios for update
  using (auth.uid() is not null and author = public.viewer_role())
  with check (author = public.viewer_role());

create policy "scenarios delete own" on public.scenarios for delete
  using (auth.uid() is not null and author = public.viewer_role());

-- 5. Identities policies: each user can read and INSERT their own row, but
--    cannot update or delete it once set. The role is permanent — to change
--    roles, sign in with a different email account.
drop policy if exists "users manage own identity" on public.identities;
drop policy if exists "users read own identity" on public.identities;
drop policy if exists "users insert own identity" on public.identities;

create policy "users read own identity" on public.identities
  for select using (auth.uid() = auth_uid);
create policy "users insert own identity" on public.identities
  for insert with check (auth.uid() = auth_uid);
-- Intentionally NO update / delete policies: the row is immutable from the
-- client. Server-only changes still possible via the service-role key.

-- 6. Indexes (idempotent).
create index if not exists idx_scenarios_vis on public.scenarios (visibility, deleted);
create index if not exists idx_scenarios_shared on public.scenarios using gin (shared_with);
`;

// ---------------------------------------------------------------------------
// Config storage (URL + anon key — same as before, kept in localStorage)
// ---------------------------------------------------------------------------

export function loadCloudConfig(): CloudConfig | null {
  // Build-time env vars take precedence so the family always uses the
  // same project — rotating the key is just a redeploy away.
  if (isPreconfigured()) {
    return {
      url: ENV_URL.replace(/\/+$/, ''),
      anonKey: ENV_ANON_KEY,
      familyId: ENV_FAMILY_ID,
    };
  }
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

// ---------------------------------------------------------------------------
// SDK client (singleton scoped to current config)
// ---------------------------------------------------------------------------

let cachedClient: SupabaseClient | null = null;
let cachedConfigSig = '';

function configSig(c: CloudConfig | null): string {
  return c ? `${c.url}|${c.anonKey}|${c.familyId}` : '';
}

/** Returns the Supabase client for the configured project, or null if unconfigured. */
export function getClient(): SupabaseClient | null {
  const cfg = loadCloudConfig();
  const sig = configSig(cfg);
  if (!cfg) {
    cachedClient = null;
    cachedConfigSig = '';
    return null;
  }
  if (cachedClient && sig === cachedConfigSig) return cachedClient;
  cachedClient = createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  cachedConfigSig = sig;
  return cachedClient;
}

/** Test connection without auth — confirms URL + anon key reach the API. */
export async function testConnection(
  config: CloudConfig
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const tmp = createClient(config.url, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    // GET against scenarios — RLS may return zero rows for an anon caller; that's still
    // a valid 200 response that proves the URL and key are correct.
    const { error } = await tmp.from('scenarios').select('id').limit(1);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export async function getSession(): Promise<Session | null> {
  const c = getClient();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session ?? null;
}

export function onAuthStateChange(handler: (session: Session | null) => void): () => void {
  const c = getClient();
  if (!c) return () => {};
  const sub = c.auth.onAuthStateChange((_event, session) => handler(session));
  return () => sub.data.subscription.unsubscribe();
}

export async function signInWithEmail(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const c = getClient();
  if (!c) return { ok: false, error: 'Cloud not configured.' };
  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : undefined;
  const { error } = await c.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const c = getClient();
  if (!c) return;
  await c.auth.signOut();
}

// ---------------------------------------------------------------------------
// Identities (which family role this auth user maps to)
// ---------------------------------------------------------------------------

export async function loadIdentity(user: User): Promise<Author | null> {
  const c = getClient();
  if (!c) return null;
  const { data, error } = await c
    .from('identities')
    .select('role')
    .eq('auth_uid', user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data.role as Author;
}

/**
 * Inserts the signed-in user's role row. The role is permanent — there is no
 * UPDATE path. If the user already has a row, this is a no-op. If the role is
 * already claimed by another auth account, the unique constraint surfaces a
 * clear error to the UI.
 */
export async function saveIdentity(user: User, role: Author, familyId: string): Promise<void> {
  const c = getClient();
  if (!c) throw new Error('Cloud not configured.');
  const { error } = await c.from('identities').insert(
    { auth_uid: user.id, role, family_id: familyId }
  );
  if (error) {
    // Friendlier messages for the two common cases.
    if (/duplicate key|unique/.test(error.message) && /role/.test(error.message)) {
      throw new Error(`Role "${role}" is already taken by someone else in this family. Pick another, or contact whoever set up the cloud to free it.`);
    }
    if (/duplicate key|unique/.test(error.message) && /auth_uid/.test(error.message)) {
      // Same auth user already has a role row — ignore (idempotent).
      return;
    }
    throw new Error(error.message);
  }
}

// ---------------------------------------------------------------------------
// Scenarios (server-side filtering via RLS — no need to filter client-side)
// ---------------------------------------------------------------------------

interface CloudRow {
  id: string;
  family_id: string;
  author: Author;
  name: string;
  meeting: string | null;
  visibility: 'private' | 'public' | 'shared';
  shared_with: Author[] | null;
  status: string;
  payload: Scenario;
  updated_at: string;
  created_at: string;
  deleted: boolean;
}

export async function pullScenarios(familyId: string): Promise<Scenario[]> {
  const c = getClient();
  if (!c) return [];
  const { data, error } = await c
    .from('scenarios')
    .select('*')
    .eq('family_id', familyId)
    .eq('deleted', false);
  if (error) throw new Error(error.message);
  return (data as CloudRow[]).map(rowToScenario);
}

export async function pushScenario(scenario: Scenario, familyId: string): Promise<void> {
  // Private scenarios are pushed too — RLS guarantees only the author can
  // read them back. Cloud backup keeps drafts safe across browser wipes
  // and devices without ever exposing them to other family members.
  const c = getClient();
  if (!c) return;
  const row: Partial<CloudRow> = {
    id: scenario.id,
    family_id: familyId,
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
  const { error } = await c.from('scenarios').upsert(row, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export async function cloudDelete(scenarioId: string, familyId: string): Promise<void> {
  const c = getClient();
  if (!c) return;
  const { error } = await c
    .from('scenarios')
    .update({ deleted: true, updated_at: new Date().toISOString() })
    .eq('id', scenarioId)
    .eq('family_id', familyId);
  if (error) throw new Error(error.message);
}

function rowToScenario(row: CloudRow): Scenario {
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
