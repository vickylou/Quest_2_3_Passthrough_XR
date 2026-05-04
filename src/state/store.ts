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
import { defaultState, exampleState, loadState, saveState } from './persistence';
import { blankScenario } from '../data/seed';
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
  addBlankScenario: () => string;
  saveAsNew: (overrides?: Partial<Scenario>) => string;
  duplicateActive: () => void;
  renameActive: (name: string) => void;
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
  loadExample: () => void;
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

/**
 * True when the active scenario is owned by the current viewer (so they can
 * edit it). Read-only scenarios — public / shared ones authored by someone
 * else — pass through every mutation as a no-op so a stray UI control or
 * keyboard event can't corrupt state. The user has to Duplicate first.
 */
function canMutateActive(s: PersistedState): boolean {
  const cur = s.scenarios[s.activeId];
  return !!cur && cur.author === s.viewerId;
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
      if (!canMutateActive(s)) return s;
      const cur = s.scenarios[s.activeId];
      const next = { ...mut(cur), updatedAt: Date.now() };
      const persisted = persistAndReturn({
        ...s,
        scenarios: { ...s.scenarios, [s.activeId]: next },
      });
      // Push only if it's a sharable scenario; private edits stay local.
      if (next.visibility !== 'private') schedulePush(next, next.visibility);
      return persisted;
    }),

  addBlankScenario: () => {
    const id = uid('scn');
    let savedId = id;
    set((s) => {
      const blank = { ...blankScenario(s.viewerId), id, createdAt: Date.now(), updatedAt: Date.now() };
      savedId = id;
      return persistAndReturn({
        ...s,
        scenarios: { ...s.scenarios, [id]: blank },
        activeId: id,
      });
    });
    return savedId;
  },

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
        // Author is always the current viewer — RLS rejects anything else,
        // and "creating on behalf of someone else" is no longer a workflow
        // we support now that everyone signs in with their own account.
        author: s.viewerId,
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
        // Duplicating someone else's read-only scenario MUST claim the copy
        // for the current viewer; otherwise the new row would get rejected
        // by RLS the moment they tried to make it Public / Shared.
        author: s.viewerId,
        // Always start the duplicate Private so they can edit freely without
        // immediately exposing a half-edited draft.
        visibility: 'private',
        sharedWith: undefined,
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
      // Private duplicate — never pushed.
      return persisted;
    }),

  renameActive: (name) =>
    set((s) => {
      if (!canMutateActive(s)) return s;
      const cur = s.scenarios[s.activeId];
      const next = { ...cur, name, updatedAt: Date.now() };
      const persisted = persistAndReturn({
        ...s,
        scenarios: { ...s.scenarios, [s.activeId]: next },
      });
      if (next.visibility !== 'private') schedulePush(next, next.visibility);
      return persisted;
    }),

  setMeeting: (meeting) =>
    set((s) => {
      if (!canMutateActive(s)) return s;
      const cur = s.scenarios[s.activeId];
      const next = { ...cur, meeting: meeting || undefined, updatedAt: Date.now() };
      const persisted = persistAndReturn({
        ...s,
        scenarios: { ...s.scenarios, [s.activeId]: next },
      });
      if (next.visibility !== 'private') schedulePush(next, next.visibility);
      return persisted;
    }),

  setViewer: (viewer) =>
    set((s) => {
      // Re-stamp any private drafts whose author was the previous default
      // (typically 'lisa' before the user signed in) so they belong to the
      // newly-resolved real role. Without this, the visibility filter would
      // hide the user's own old drafts under the "From others" tab — and
      // because they're private, RLS would reject any later push too.
      let touched = false;
      const claimed: Record<string, Scenario> = {};
      for (const [id, sc] of Object.entries(s.scenarios)) {
        if (sc.visibility === 'private' && sc.author !== viewer) {
          claimed[id] = { ...sc, author: viewer };
          touched = true;
        } else {
          claimed[id] = sc;
        }
      }
      return persistAndReturn({
        ...s,
        viewerId: viewer,
        scenarios: touched ? claimed : s.scenarios,
      });
    }),

  setVisibility: (visibility) =>
    set((s) => {
      if (!canMutateActive(s)) return s;
      const cur = s.scenarios[s.activeId];
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
      if (!canMutateActive(s)) return s;
      const cur = s.scenarios[s.activeId];
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
      // You can only delete scenarios you authored. Cloud-pulled scenarios
      // from other family members can be hidden by Duplicating + flipping
      // their copy private, but the original stays under the author's
      // control.
      if (target.author !== s.viewerId) return s;
      const remaining = { ...s.scenarios };
      delete remaining[id];
      // Soft-delete on the cloud if the scenario was visible to anyone else.
      if (target.visibility !== 'private') {
        void syncDelete(id);
      }
      const ids = Object.keys(remaining);
      if (ids.length === 0) return persistAndReturn(defaultState(s.viewerId));
      const activeId = s.activeId === id ? ids[0] : s.activeId;
      return persistAndReturn({ ...s, scenarios: remaining, activeId });
    }),

  setStatus: (status) =>
    set((s) => {
      if (!canMutateActive(s)) return s;
      const cur = s.scenarios[s.activeId];
      const scenarios = { ...s.scenarios };
      if (status === 'final') {
        for (const id of Object.keys(scenarios)) {
          if (scenarios[id].status === 'final' && id !== s.activeId) {
            scenarios[id] = { ...scenarios[id], status: 'draft' };
          }
        }
      }
      const next = { ...cur, status, updatedAt: Date.now() };
      scenarios[s.activeId] = next;
      const persisted = persistAndReturn({ ...s, scenarios });
      if (next.visibility !== 'private') schedulePush(next, next.visibility);
      return persisted;
    }),

  setNotes: (notes) =>
    set((s) => {
      if (!canMutateActive(s)) return s;
      const cur = s.scenarios[s.activeId];
      const next = { ...cur, notes, updatedAt: Date.now() };
      const persisted = persistAndReturn({
        ...s,
        scenarios: { ...s.scenarios, [s.activeId]: next },
      });
      if (next.visibility !== 'private') schedulePush(next, next.visibility);
      return persisted;
    }),

  setAssumptions: (assumptions) =>
    set((s) => {
      if (!canMutateActive(s)) return s;
      const cur = s.scenarios[s.activeId];
      const next = { ...cur, assumptions, updatedAt: Date.now() };
      const persisted = persistAndReturn({
        ...s,
        scenarios: { ...s.scenarios, [s.activeId]: next },
      });
      if (next.visibility !== 'private') schedulePush(next, next.visibility);
      return persisted;
    }),

  resetToDefault: () =>
    set((s) => persistAndReturn(defaultState(s.viewerId))),

  loadExample: () =>
    set((s) => persistAndReturn(exampleState(s.viewerId))),

  clearAll: () =>
    set((s) => {
      try {
        localStorage.removeItem('inheritance.v1');
        localStorage.removeItem('inheritance.v2');
      } catch {
        /* ignore */
      }
      return persistAndReturn(defaultState(s.viewerId));
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

/**
 * True when the active scenario is owned by someone else (so the UI should
 * render in read-only mode and gate edits behind a Duplicate action).
 */
export function useIsActiveReadOnly(): boolean {
  return useStore((s) => {
    const cur = s.scenarios[s.activeId];
    return !!cur && cur.author !== s.viewerId;
  });
}
