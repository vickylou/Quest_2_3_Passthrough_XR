import { Author, Scenario } from '../types';
import {
  cloudDelete,
  CloudConfig,
  loadCloudConfig,
  pullVisibleScenarios,
  pushScenario,
} from '../lib/cloud';

export type SyncStatus =
  | { kind: 'idle' }
  | { kind: 'syncing'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'success'; pulled: number; pushedAt: number };

let listeners = new Set<(status: SyncStatus) => void>();
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

/** Pulls everyone-else's visible scenarios and merges them into local state. */
export async function syncPull(
  viewer: Author,
  localScenarios: Record<string, Scenario>
): Promise<{ scenarios: Record<string, Scenario>; pulled: number }> {
  const config = loadCloudConfig();
  if (!config) return { scenarios: localScenarios, pulled: 0 };
  setStatus({ kind: 'syncing', message: 'Pulling scenarios…' });
  try {
    const remote = await pullVisibleScenarios(config, viewer);
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
        await cloudDelete(config, scenario.id);
      }
      return;
    }
    await pushScenario(config, scenario);
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
    await cloudDelete(config, scenarioId);
  } catch (err) {
    setStatus({ kind: 'error', message: (err as Error).message });
  }
}

/**
 * Last-write-wins merge: remote rows replace local rows when their
 * `updatedAt` is newer. Local rows that don't exist remotely are kept.
 */
function mergeRemote(
  local: Record<string, Scenario>,
  remote: Scenario[]
): Record<string, Scenario> {
  const out: Record<string, Scenario> = { ...local };
  for (const r of remote) {
    const existing = out[r.id];
    if (!existing) {
      out[r.id] = r;
      continue;
    }
    if (r.updatedAt > existing.updatedAt) {
      out[r.id] = r;
    }
  }
  return out;
}

/** Expose the schema SQL constant for the setup modal. */
export { SCHEMA_SQL, testConnection } from '../lib/cloud';
export type { CloudConfig };
