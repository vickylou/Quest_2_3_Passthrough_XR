import { Scenario } from '../types';
import {
  cloudDelete,
  loadCloudConfig,
  pullScenarios,
  pushScenario,
} from '../lib/cloud';

export type SyncStatus =
  | { kind: 'idle' }
  | { kind: 'syncing'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'success'; pulled: number; pushedAt: number };

const listeners = new Set<(status: SyncStatus) => void>();
let current: SyncStatus = { kind: 'idle' };

export function subscribeSyncStatus(fn: (s: SyncStatus) => void): () => void {
  listeners.add(fn);
  fn(current);
  return () => {
    listeners.delete(fn);
  };
}

function setStatus(next: SyncStatus): void {
  current = next;
  for (const fn of listeners) fn(next);
}

export function getSyncStatus(): SyncStatus {
  return current;
}

export function isCloudConfigured(): boolean {
  return loadCloudConfig() !== null;
}

/** Pulls everything visible to the signed-in user (server-side RLS-filtered). */
export async function syncPull(
  localScenarios: Record<string, Scenario>,
  viewerRole?: Scenario['author']
): Promise<{ scenarios: Record<string, Scenario>; pulled: number }> {
  const config = loadCloudConfig();
  if (!config) return { scenarios: localScenarios, pulled: 0 };
  setStatus({ kind: 'syncing', message: 'Pulling scenarios…' });
  try {
    const remote = await pullScenarios(config.familyId);
    const merged = mergeRemote(localScenarios, remote);
    // After merging, push up any owned scenarios that aren't already in
    // the cloud — this is the one-time backfill that cloud-backs the
    // user's existing local-only private drafts.
    if (viewerRole) {
      const remoteIds = new Set(remote.map((r) => r.id));
      void backfillOwnedLocal(merged, remoteIds, viewerRole);
    }
    setStatus({ kind: 'success', pulled: remote.length, pushedAt: Date.now() });
    return { scenarios: merged, pulled: remote.length };
  } catch (err) {
    setStatus({ kind: 'error', message: (err as Error).message });
    return { scenarios: localScenarios, pulled: 0 };
  }
}

/**
 * Pushes a single scenario. Every visibility — including 'private' — is
 * pushed: RLS only lets the author read their own private rows, so cloud
 * backup keeps drafts safe across browser wipes and devices without
 * exposing them. The `previousVisibility` parameter is kept for future
 * use (e.g. recording transitions) but no longer drives delete behaviour.
 */
export async function syncPushOne(
  scenario: Scenario,
  previousVisibility: Scenario['visibility'] | undefined
): Promise<void> {
  void previousVisibility;
  const config = loadCloudConfig();
  if (!config) return;
  try {
    await pushScenario(scenario, config.familyId);
    setStatus({ kind: 'success', pulled: 0, pushedAt: Date.now() });
  } catch (err) {
    setStatus({ kind: 'error', message: (err as Error).message });
  }
}

/**
 * One-shot backfill: push any local scenario the viewer authored that the
 * cloud doesn't already have. Runs after a pull so brand-new local
 * private drafts get cloud-backed automatically. Errors on individual
 * rows are swallowed — backfill should never break the foreground sync.
 */
export async function backfillOwnedLocal(
  scenarios: Record<string, Scenario>,
  remoteIds: Set<string>,
  viewerRole: Scenario['author']
): Promise<void> {
  const config = loadCloudConfig();
  if (!config) return;
  const owned = Object.values(scenarios).filter(
    (s) => s.author === viewerRole && !remoteIds.has(s.id)
  );
  for (const sc of owned) {
    try {
      await pushScenario(sc, config.familyId);
    } catch {
      /* ignore individual failures — surfaced via error status on next push */
    }
  }
}

/** Soft-delete a scenario in the cloud (called when user deletes a non-private one). */
export async function syncDelete(scenarioId: string): Promise<void> {
  const config = loadCloudConfig();
  if (!config) return;
  try {
    await cloudDelete(scenarioId, config.familyId);
  } catch (err) {
    setStatus({ kind: 'error', message: (err as Error).message });
  }
}

/** Last-write-wins merge keyed on updatedAt. */
function mergeRemote(
  local: Record<string, Scenario>,
  remote: Scenario[]
): Record<string, Scenario> {
  const out: Record<string, Scenario> = { ...local };
  for (const r of remote) {
    const existing = out[r.id];
    if (!existing || r.updatedAt > existing.updatedAt) {
      out[r.id] = r;
    }
  }
  return out;
}

export { AUTH_SCHEMA_SQL, testConnection } from '../lib/cloud';
