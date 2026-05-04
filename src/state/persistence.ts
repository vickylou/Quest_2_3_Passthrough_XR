import { Author, AssetTone, PersistedState, Scenario } from '../types';
import {
  BAUGRUND_1_ID,
  BAUGRUND_2_ID,
  CASH_ID,
  HELMHAUS_ID,
  LANDWIRTSCHAFT_ID,
  WEBERHAUS_ID,
  blankScenario,
  v0Scenario,
  v1Scenario,
  v2Scenario,
} from '../data/seed';

const STORAGE_KEY = 'inheritance.v3';
const LEGACY_KEYS = ['inheritance.v2', 'inheritance.v1'];
const SCHEMA_VERSION = 3;

export function loadState(): PersistedState {
  try {
    if (typeof localStorage === 'undefined') return defaultState();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
      if (
        parsed.schemaVersion === SCHEMA_VERSION &&
        parsed.scenarios &&
        Object.keys(parsed.scenarios).length > 0
      ) {
        if (!parsed.activeId || !parsed.scenarios[parsed.activeId]) {
          parsed.activeId = Object.keys(parsed.scenarios)[0];
        }
        if (!parsed.viewerId) parsed.viewerId = 'lisa';
        return ensureCanonicalTones(claimOwnPrivateScenarios(parsed));
      }
    }
    // Legacy: lift older schemas into the new shape so users don't lose work.
    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(key);
      if (!legacy) continue;
      try {
        return ensureCanonicalTones(claimOwnPrivateScenarios(migrateLegacy(JSON.parse(legacy))));
      } catch {
        /* try next key */
      }
    }
    return defaultState();
  } catch {
    return defaultState();
  }
}

/**
 * Restore the canonical colour tone on the six seed assets (Helmhaus → sky,
 * Weberhaus → rose, etc.) for any scenario that was created or migrated
 * before the tone field existed, or where it was somehow set to 'slate'
 * (the no-colour default). Runs on every load so older local drafts and
 * any cloud-pulled rows from older versions both pick up the colours.
 */
const CANONICAL_TONES: Record<string, AssetTone> = {
  [HELMHAUS_ID]: 'sky',
  [WEBERHAUS_ID]: 'rose',
  [BAUGRUND_1_ID]: 'amber',
  [BAUGRUND_2_ID]: 'lime',
  [CASH_ID]: 'emerald',
  [LANDWIRTSCHAFT_ID]: 'orange',
};

/**
 * The shorter (or empty) notes shown beneath each canonical asset's title
 * on the card. Force-synced on load so existing scenarios in localStorage
 * pick up edits made to the seed strings — there's no UI to edit notes,
 * so this can't clobber user-typed text.
 */
const CANONICAL_NOTES: Record<string, string | undefined> = {
  [HELMHAUS_ID]: undefined,
  [WEBERHAUS_ID]: undefined,
  [BAUGRUND_1_ID]: undefined,
  [BAUGRUND_2_ID]: undefined,
  [CASH_ID]: 'From sold plot, after renovation',
  [LANDWIRTSCHAFT_ID]: '6 500 m² ≈ 40 €/m². Future upside if rezoned.',
};

function ensureCanonicalTones(state: PersistedState): PersistedState {
  let touched = false;
  const next: Record<string, Scenario> = {};
  for (const [id, sc] of Object.entries(state.scenarios)) {
    let scTouched = false;
    const newAssets = sc.assets.map((a) => {
      let updated = a;
      const canonicalTone = CANONICAL_TONES[a.id];
      if (canonicalTone && (!a.tone || a.tone === 'slate')) {
        updated = { ...updated, tone: canonicalTone };
        scTouched = true;
      }
      if (a.id in CANONICAL_NOTES) {
        const wanted = CANONICAL_NOTES[a.id];
        if (a.notes !== wanted) {
          updated = { ...updated, notes: wanted };
          scTouched = true;
        }
      }
      return updated;
    });
    if (scTouched) {
      next[id] = { ...sc, assets: newAssets };
      touched = true;
    } else {
      next[id] = sc;
    }
  }
  if (!touched) return state;
  return { ...state, scenarios: next };
}

/**
 * One-shot recovery for users whose private drafts were authored under a
 * different role (typically `lisa`, the seed default) before the auth gate
 * tied each device to a real role. Such drafts were silently hidden by the
 * visibility filter (`author !== viewer`). Re-stamping the author rescues
 * them and also makes any future flip to Public / Shared accepted by RLS,
 * since the cloud check is `author = viewer_role()`.
 *
 * Only PRIVATE scenarios are claimed. Public / shared rows might have come
 * from a cloud pull (where they're someone else's), so we leave those alone.
 */
function claimOwnPrivateScenarios(state: PersistedState): PersistedState {
  const viewer = state.viewerId;
  if (!viewer) return state;
  let touched = false;
  const next: Record<string, Scenario> = {};
  for (const [id, sc] of Object.entries(state.scenarios)) {
    if (sc.visibility === 'private' && sc.author !== viewer) {
      next[id] = { ...sc, author: viewer };
      touched = true;
    } else {
      next[id] = sc;
    }
  }
  if (!touched) return state;
  return { ...state, scenarios: next };
}

export function saveState(state: PersistedState): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded or private mode — ignore silently */
  }
}

/**
 * Brand-new state for a freshly-loaded device — a single blank scenario where
 * every sister starts at €0 and the user allocates from there. The V0/V1/V2
 * example data lives behind the explicit "Load example" button instead.
 *
 * The blank scenario is authored by `viewer` so that whoever calls "Start
 * fresh" or accidentally deletes their last scenario doesn't end up with a
 * 'lisa'-authored placeholder that falls into the "From others" tab from
 * their point of view.
 */
export function defaultState(viewer: Author = 'lisa'): PersistedState {
  const blank = blankScenario(viewer);
  return {
    schemaVersion: SCHEMA_VERSION,
    activeId: blank.id,
    scenarios: { [blank.id]: blank },
    viewerId: viewer,
    lastSavedAt: Date.now(),
  };
}

/** Demo data — three filled-in scenarios — exposed behind the "Load example" button. */
export function exampleState(viewer: Author = 'lisa'): PersistedState {
  const v0 = v0Scenario();
  const v1 = v1Scenario();
  const v2 = v2Scenario();
  return {
    schemaVersion: SCHEMA_VERSION,
    activeId: v0.id,
    scenarios: { [v0.id]: v0, [v1.id]: v1, [v2.id]: v2 },
    viewerId: viewer,
    lastSavedAt: Date.now(),
  };
}

/**
 * Best-effort migration from any older schema (v1 had `mode` + constraints +
 * verbose Correction with category/description, and Transfer.from = null
 * meaning external) to the v2 shape.
 */
function migrateLegacy(legacy: unknown): PersistedState {
  if (!isRecord(legacy) || !isRecord(legacy.scenarios)) return defaultState();
  const out: Record<string, Scenario> = {};
  for (const [id, raw] of Object.entries(legacy.scenarios)) {
    if (!isRecord(raw)) continue;
    const sc: Scenario = {
      id: String(raw.id ?? id),
      name: String(raw.name ?? 'Untitled'),
      author: (raw.author as Scenario['author']) ?? 'mum',
      meeting: typeof raw.meeting === 'string' ? raw.meeting : undefined,
      visibility: (raw.visibility as Scenario['visibility']) ?? 'private',
      sharedWith: Array.isArray(raw.sharedWith)
        ? (raw.sharedWith as Scenario['sharedWith'])
        : undefined,
      notes: String(raw.notes ?? ''),
      assumptions: String(raw.assumptions ?? ''),
      createdAt: Number(raw.createdAt ?? Date.now()),
      updatedAt: Number(raw.updatedAt ?? Date.now()),
      status: (raw.status as Scenario['status']) ?? 'draft',
      assets: Array.isArray(raw.assets)
        ? raw.assets.map((a) => migrateAsset(a))
        : [],
      transfers: Array.isArray(raw.transfers)
        ? raw.transfers.map((t) => migrateTransfer(t))
        : [],
      corrections: Array.isArray(raw.corrections)
        ? raw.corrections.map((c) => migrateCorrection(c))
        : [],
    };
    out[sc.id] = sc;
  }
  if (Object.keys(out).length === 0) return defaultState();
  const activeId =
    typeof legacy.activeId === 'string' && out[legacy.activeId]
      ? legacy.activeId
      : Object.keys(out)[0];
  const viewerId =
    typeof legacy.viewerId === 'string' && (legacy.viewerId as string)
      ? (legacy.viewerId as Scenario['author'])
      : 'lisa';
  return {
    schemaVersion: SCHEMA_VERSION,
    activeId,
    scenarios: out,
    viewerId,
    lastSavedAt: Date.now(),
  };
}

function migrateAsset(raw: unknown): Scenario['assets'][number] {
  const a = isRecord(raw) ? raw : {};
  const allocations = isRecord(a.allocations)
    ? {
        lisa: Number(a.allocations.lisa ?? 0),
        vicky: Number(a.allocations.vicky ?? 0),
        jackie: Number(a.allocations.jackie ?? 0),
        alexa: Number(a.allocations.alexa ?? 0),
      }
    : { lisa: 0, vicky: 0, jackie: 0, alexa: 0 };
  return {
    id: String(a.id ?? Math.random().toString(36).slice(2)),
    name: String(a.name ?? 'Asset'),
    totalValue: Number(a.totalValue ?? 0),
    allocations,
    imageKey: a.imageKey as Scenario['assets'][number]['imageKey'],
    tone: a.tone as Scenario['assets'][number]['tone'],
    subItems: Array.isArray(a.subItems)
      ? a.subItems.map((s) => ({
          id: String(isRecord(s) ? (s.id ?? Math.random()) : Math.random()),
          label: String(isRecord(s) ? (s.label ?? '') : ''),
          amount: Number(isRecord(s) ? (s.amount ?? 0) : 0),
        }))
      : undefined,
    notes: typeof a.notes === 'string' ? a.notes : undefined,
  };
}

function migrateTransfer(raw: unknown): Scenario['transfers'][number] {
  const t = isRecord(raw) ? raw : {};
  // Legacy: from === null meant external; translate to mum_and_dad.
  let from: Scenario['transfers'][number]['from'] = (t.from as Scenario['transfers'][number]['from']) ?? null;
  if (from === null) from = 'mum_and_dad';
  return {
    id: String(t.id ?? Math.random().toString(36).slice(2)),
    name: String(t.name ?? 'Payment'),
    from,
    to: (t.to as Scenario['transfers'][number]['to']) ?? 'lisa',
    amount: Number(t.amount ?? 0),
  };
}

function migrateCorrection(raw: unknown): Scenario['corrections'][number] {
  const c = isRecord(raw) ? raw : {};
  // Legacy fields category + description fold into a single note string.
  const noteParts = [c.description, c.note, c.category].filter(
    (x) => typeof x === 'string' && x.length > 0
  );
  return {
    id: String(c.id ?? Math.random().toString(36).slice(2)),
    person: (c.person as Scenario['corrections'][number]['person']) ?? 'lisa',
    amount: Number(c.amount ?? 0),
    active: Boolean(c.active),
    note: (noteParts[0] as string) ?? '',
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function downloadAsFile(filename: string, contents: string | Blob, mime = 'application/json'): void {
  const blob = contents instanceof Blob ? contents : new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}
