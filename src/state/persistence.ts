import { Mode, PersistedState, Scenario } from '../types';
import { v0Scenario, v1Scenario, v2Scenario } from '../data/seed';
import { equalize } from '../solver/equalize';

const STORAGE_KEY = 'inheritance.v1';
const SCHEMA_VERSION = 1;

export function loadState(): PersistedState {
  try {
    if (typeof localStorage === 'undefined') return defaultState();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed.schemaVersion || parsed.schemaVersion !== SCHEMA_VERSION) {
      return migrate(parsed);
    }
    if (!parsed.scenarios || Object.keys(parsed.scenarios).length === 0) {
      return defaultState();
    }
    if (!parsed.activeId || !parsed.scenarios[parsed.activeId]) {
      parsed.activeId = Object.keys(parsed.scenarios)[0];
    }
    if (!parsed.mode) parsed.mode = 'manual';
    return parsed;
  } catch {
    return defaultState();
  }
}

export function saveState(state: PersistedState): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded or private mode — ignore silently */
  }
}

export function defaultState(): PersistedState {
  const v0 = v0Scenario();
  // Compute V1 and V2 by running the equalizer once on their seeds so the
  // scenarios ship with realistic numbers, not magic constants.
  const v1Solved = equalize(v1Scenario()).scenario;
  const v2Solved = equalize(v2Scenario()).scenario;

  const scenarios: Record<string, Scenario> = {
    [v0.id]: v0,
    [v1Solved.id]: v1Solved,
    [v2Solved.id]: v2Solved,
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    activeId: v0.id,
    scenarios,
    mode: 'manual',
  };
}

function migrate(_state: unknown): PersistedState {
  // Future schema migrations land here. For now any unknown shape resets to defaults.
  return defaultState();
}

export function exportJSON(state: PersistedState): string {
  return JSON.stringify(state, null, 2);
}

export function importJSON(text: string): PersistedState {
  const parsed = JSON.parse(text) as PersistedState;
  if (!parsed.schemaVersion || !parsed.scenarios) {
    throw new Error('Ungültige Datei: schemaVersion oder scenarios fehlt.');
  }
  if (parsed.schemaVersion !== SCHEMA_VERSION) return migrate(parsed);
  return parsed;
}

export function downloadAsFile(filename: string, contents: string, mime = 'application/json'): void {
  const blob = new Blob([contents], { type: mime });
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

/** Mode helper used by callers that import only the mode type. */
export type { Mode };
