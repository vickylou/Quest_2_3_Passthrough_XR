import { create } from 'zustand';
import {
  Asset,
  Author,
  Correction,
  PersistedState,
  Scenario,
  ScenarioStatus,
  Transfer,
  Visibility,
} from '../types';
import { defaultState, loadState, saveState } from './persistence';
import { uid } from '../lib/format';
import { syncDelete, syncPushOne } from './sync';

/** Per-scenario debounce so we don't fire a network call on every keystroke. */
const PUSH_DEBOUNCE_MS = 800;
const pushTimers = new Map<string, ReturnType<typeof setTimeout>>();

function schedulePush(scenario: Scenario, previousVisibility: Visibility | undefined): void {
  const existing = pushTimers.get(scenario.id);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    pushTimers.delete(scenario.id);
    void syncPushOne(scenario, previousVisibility);
  }, PUSH_DEBOUNCE_MS);
  pushTimers.set(scenario.id, timer);
}

interface StoreState extends PersistedState {
  // ---- selectors ----
  active: () => Scenario;
  // ---- mutations ----
  setActive: (id: string) => void;
  updateActive: (mut: (s: Scenario) => Scenario) => void;
  saveAsNew: (overrides?: Partial<Scenario>) => string;
  duplicateActive: () => void;
  renameActive: (name: string) => void;
  setAuthor: (author: Author) => void;
  setMeeting: (meeting: string | undefined) => void;
  setViewer: (viewer: Author) => void;
  setVisibility: (visibility: Visibility) => void;
  setSharedWith: (people: Author[]) => void;
  importScenario: (scenario: Scenario) => string;
  deleteScenario: (id: string) => void;
  setStatus: (status: ScenarioStatus) => void;
  setNotes: (notes: string) => void;
  setAssumptions: (assumptions: string) => void;
  resetToDefault: () => void;
  clearAll: () => void;
  replaceAll: (state: PersistedState) => void;
  // assets
  addAsset: () => void;
  updateAsset: (id: string, mut: (a: Asset) => Asset) => void;
  removeAsset: (id: string) => void;
  // transfers
  addTransfer: () => void;
  updateTransfer: (id: string, mut: (t: Transfer) => Transfer) => void;
  removeTransfer: (id: string) => void;
  // corrections
  addCorrection: () => void;
  updateCorrection: (id: string, mut: (c: Correction) => Correction) => void;
  removeCorrection: (id: string) => void;
}

function persistAndReturn<T extends PersistedState>(s: T): T {
  const next = { ...s, lastSavedAt: Date.now() } as T;
  saveState(next);
  return next;
}

export const useStore = create<StoreState>()((set, get) => ({
  ...loadState(),

  active: () => {
    const s = get();
    return s.scenarios[s.activeId];
  },

  setActive: (id) =>
    set((s) => {
      if (!s.scenarios[id]) return s;
      return persistAndReturn({ ...s, activeId: id });
    }),

  updateActive: (mut) =>
    set((s) => {
      const cur = s.scenarios[s.activeId];
      if (!cur) return s;
      const next = { ...mut(cur), updatedAt: Date.now() };
      const persisted = persistAndReturn({
        ...s,
        scenarios: { ...s.scenarios, [s.activeId]: next },
      });
      // Push only if it's a sharable scenario; private edits stay local.
      if (next.visibility !== 'private') schedulePush(next, next.visibility);
      return persisted;
    }),

  saveAsNew: (overrides) => {
    const id = uid('scn');
    let savedId = id;
    set((s) => {
      const cur = s.scenarios[s.activeId];
      if (!cur) return s;
      const copy: Scenario = {
        ...cur,
        ...overrides,
        id,
        status: 'draft',
        // New "Save as" copies always start private so people can experiment
        // before sharing. They can flip to Public / Shared from the bar.
        visibility: overrides?.visibility ?? 'private',
        sharedWith: overrides?.sharedWith,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      savedId = id;
      const persisted = persistAndReturn({
        ...s,
        scenarios: { ...s.scenarios, [id]: copy },
        activeId: id,
      });
      if (copy.visibility !== 'private') schedulePush(copy, copy.visibility);
      return persisted;
    });
    return savedId;
  },

  duplicateActive: () =>
    set((s) => {
      const cur = s.scenarios[s.activeId];
      if (!cur) return s;
      const id = uid('scn');
      const copy: Scenario = {
        ...cur,
        id,
        name: `${cur.name} (copy)`,
        status: 'draft',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const persisted = persistAndReturn({
        ...s,
        scenarios: { ...s.scenarios, [id]: copy },
        activeId: id,
      });
      if (copy.visibility !== 'private') schedulePush(copy, copy.visibility);
      return persisted;
    }),

  renameActive: (name) =>
    set((s) => {
      const cur = s.scenarios[s.activeId];
      if (!cur) return s;
      const next = { ...cur, name, updatedAt: Date.now() };
      return persistAndReturn({
        ...s,
        scenarios: { ...s.scenarios, [s.activeId]: next },
      });
    }),

  setAuthor: (author) =>
    set((s) => {
      const cur = s.scenarios[s.activeId];
      if (!cur) return s;
      return persistAndReturn({
        ...s,
        scenarios: {
          ...s.scenarios,
          [s.activeId]: { ...cur, author, updatedAt: Date.now() },
        },
      });
    }),

  setMeeting: (meeting) =>
    set((s) => {
      const cur = s.scenarios[s.activeId];
      if (!cur) return s;
      return persistAndReturn({
        ...s,
        scenarios: {
          ...s.scenarios,
          [s.activeId]: { ...cur, meeting: meeting || undefined, updatedAt: Date.now() },
        },
      });
    }),

  setViewer: (viewer) => set((s) => persistAndReturn({ ...s, viewerId: viewer })),

  setVisibility: (visibility) =>
    set((s) => {
      const cur = s.scenarios[s.activeId];
      if (!cur) return s;
      const prevVisibility = cur.visibility;
      const next = { ...cur, visibility, updatedAt: Date.now() };
      const persisted = persistAndReturn({
        ...s,
        scenarios: { ...s.scenarios, [s.activeId]: next },
      });
      schedulePush(next, prevVisibility);
      return persisted;
    }),

  setSharedWith: (people) =>
    set((s) => {
      const cur = s.scenarios[s.activeId];
      if (!cur) return s;
      const next = { ...cur, sharedWith: people, updatedAt: Date.now() };
      const persisted = persistAndReturn({
        ...s,
        scenarios: { ...s.scenarios, [s.activeId]: next },
      });
      if (next.visibility !== 'private') schedulePush(next, next.visibility);
      return persisted;
    }),

  importScenario: (scenario) => {
    // Use a fresh id so two imports from the same source don't collide with
    // an existing scenario. The original scenario keeps its name + author.
    const id = uid('imp');
    let savedId = id;
    set((s) => {
      const sc: Scenario = {
        ...scenario,
        id,
        createdAt: scenario.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        // If the recipient is already in the sharedWith list, keep the
        // original sharing intent. Otherwise the imported scenario is
        // visible only to the recipient (effectively private once received).
        visibility: scenario.visibility ?? 'private',
      };
      savedId = id;
      return persistAndReturn({
        ...s,
        scenarios: { ...s.scenarios, [id]: sc },
        activeId: id,
      });
    });
    return savedId;
  },

  deleteScenario: (id) =>
    set((s) => {
      const target = s.scenarios[id];
      if (!target) return s;
      const remaining = { ...s.scenarios };
      delete remaining[id];
      // Soft-delete on the cloud if the scenario was visible to anyone else.
      if (target.visibility !== 'private') {
        void syncDelete(id);
      }
      const ids = Object.keys(remaining);
      if (ids.length === 0) return persistAndReturn(defaultState());
      const activeId = s.activeId === id ? ids[0] : s.activeId;
      return persistAndReturn({ ...s, scenarios: remaining, activeId });
    }),

  setStatus: (status) =>
    set((s) => {
      const cur = s.scenarios[s.activeId];
      if (!cur) return s;
      const scenarios = { ...s.scenarios };
      if (status === 'final') {
        for (const id of Object.keys(scenarios)) {
          if (scenarios[id].status === 'final' && id !== s.activeId) {
            scenarios[id] = { ...scenarios[id], status: 'draft' };
          }
        }
      }
      scenarios[s.activeId] = { ...cur, status, updatedAt: Date.now() };
      return persistAndReturn({ ...s, scenarios });
    }),

  setNotes: (notes) =>
    set((s) => {
      const cur = s.scenarios[s.activeId];
      if (!cur) return s;
      return persistAndReturn({
        ...s,
        scenarios: {
          ...s.scenarios,
          [s.activeId]: { ...cur, notes, updatedAt: Date.now() },
        },
      });
    }),

  setAssumptions: (assumptions) =>
    set((s) => {
      const cur = s.scenarios[s.activeId];
      if (!cur) return s;
      return persistAndReturn({
        ...s,
        scenarios: {
          ...s.scenarios,
          [s.activeId]: { ...cur, assumptions, updatedAt: Date.now() },
        },
      });
    }),

  resetToDefault: () => set(() => persistAndReturn(defaultState())),

  clearAll: () =>
    set(() => {
      try {
        localStorage.removeItem('inheritance.v1');
        localStorage.removeItem('inheritance.v2');
      } catch {
        /* ignore */
      }
      return persistAndReturn(defaultState());
    }),

  replaceAll: (state) => set(() => persistAndReturn(state)),

  addAsset: () =>
    get().updateActive((s) => ({
      ...s,
      assets: [
        ...s.assets,
        {
          id: uid('asset'),
          name: 'New asset',
          totalValue: 0,
          allocations: { lisa: 0, vicky: 0, jackie: 0, alexa: 0 },
          tone: 'slate',
        },
      ],
    })),

  updateAsset: (id, mut) =>
    get().updateActive((s) => ({
      ...s,
      assets: s.assets.map((a) => (a.id === id ? mut(a) : a)),
    })),

  removeAsset: (id) =>
    get().updateActive((s) => ({
      ...s,
      assets: s.assets.filter((a) => a.id !== id),
    })),

  addTransfer: () =>
    get().updateActive((s) => ({
      ...s,
      transfers: [
        ...s.transfers,
        {
          id: uid('tr'),
          name: 'New payment',
          from: 'mum_and_dad',
          to: 'vicky',
          amount: 0,
        },
      ],
    })),

  updateTransfer: (id, mut) =>
    get().updateActive((s) => ({
      ...s,
      transfers: s.transfers.map((t) => (t.id === id ? mut(t) : t)),
    })),

  removeTransfer: (id) =>
    get().updateActive((s) => ({
      ...s,
      transfers: s.transfers.filter((t) => t.id !== id),
    })),

  addCorrection: () =>
    get().updateActive((s) => ({
      ...s,
      corrections: [
        ...s.corrections,
        {
          id: uid('corr'),
          person: 'lisa',
          amount: 0,
          active: false,
          note: '',
        },
      ],
    })),

  updateCorrection: (id, mut) =>
    get().updateActive((s) => ({
      ...s,
      corrections: s.corrections.map((c) => (c.id === id ? mut(c) : c)),
    })),

  removeCorrection: (id) =>
    get().updateActive((s) => ({
      ...s,
      corrections: s.corrections.filter((c) => c.id !== id),
    })),
}));
