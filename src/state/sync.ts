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
  localScenarios: Record<string, Scenario>
): Promise<{ scenarios: Record<string, Scenario>; pulled: number }> {
  const config = loadCloudConfig();
  if (!config) return { scenarios: localScenarios, pulled: 0 };
  setStatus({ kind: 'syncing', message: 'Pulling scenarios…' });
  try {
    const remote = await pullScenarios(config.familyId);
    const merged = mergeRemote(localScenarios, remote);
    setStatus({ kind: 'success', pulled: remote.length, pushedAt: Date.now() });
    return { scenarios: merged, pulled: remote.length };
  } catch (err) {
    setStatus({ kind: 'error', message: (err as Error).message });
    return { scenarios: localScenarios, pulled: 0 };
  }
}

/**
 * Pushes a single scenario. Private scenarios are intentionally not pushed —
 * they remain on the device that authored them. Visibility transitions from
 * non-private → private trigger a soft delete on the cloud.
 */
export async function syncPushOne(
  scenario: Scenario,
  previousVisibility: Scenario['visibility'] | undefined
): Promise<void> {
  const config = loadCloudConfig();
  if (!config) return;
  try {
    if (scenario.visibility === 'private') {
      if (previousVisibility && previousVisibility !== 'private') {
        await cloudDelete(scenario.id, config.familyId);
      }
      return;
    }
    await pushScenario(scenario, config.familyId);
    setStatus({ kind: 'success', pulled: 0, pushedAt: Date.now() });
  } catch (err) {
    setStatus({ kind: 'error', message: (err as Error).message });
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
