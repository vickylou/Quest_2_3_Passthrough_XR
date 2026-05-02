import { create } from 'zustand';
import {
  Asset,
  Constraint,
  Correction,
  Mode,
  PersistedState,
  PersonId,
  Scenario,
  ScenarioStatus,
  Transfer,
} from '../types';
import { defaultState, loadState, saveState } from './persistence';
import { uid } from '../lib/format';
import { equalize as runEqualize } from '../solver/equalize';

interface StoreState extends PersistedState {
  // ---- selectors ----
  active: () => Scenario;
  // ---- mutations ----
  setMode: (mode: Mode) => void;
  setActive: (id: string) => void;
  updateActive: (mut: (s: Scenario) => Scenario) => void;
  saveAs: (name: string) => void;
  duplicateActive: () => void;
  renameActive: (name: string) => void;
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
  // constraints
  addConstraint: (preset?: Partial<Constraint>) => void;
  updateConstraint: (id: string, mut: (c: Constraint) => Constraint) => void;
  removeConstraint: (id: string) => void;
  // solver
  runEqualizer: () => string[];
}

function persistAndReturn<T extends PersistedState>(s: T): T {
  saveState(s);
  return s;
}

export const useStore = create<StoreState>()((set, get) => ({
  ...loadState(),

  active: () => {
    const s = get();
    return s.scenarios[s.activeId];
  },

  setMode: (mode) => set((s) => persistAndReturn({ ...s, mode })),

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
      return persistAndReturn({
        ...s,
        scenarios: { ...s.scenarios, [s.activeId]: next },
      });
    }),

  saveAs: (name) =>
    set((s) => {
      const cur = s.scenarios[s.activeId];
      if (!cur) return s;
      const id = uid('scn');
      const copy: Scenario = {
        ...cur,
        id,
        name,
        status: 'draft',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return persistAndReturn({
        ...s,
        scenarios: { ...s.scenarios, [id]: copy },
        activeId: id,
      });
    }),

  duplicateActive: () =>
    set((s) => {
      const cur = s.scenarios[s.activeId];
      if (!cur) return s;
      const id = uid('scn');
      const copy: Scenario = {
        ...cur,
        id,
        name: `${cur.name} (Kopie)`,
        status: 'draft',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return persistAndReturn({
        ...s,
        scenarios: { ...s.scenarios, [id]: copy },
        activeId: id,
      });
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

  deleteScenario: (id) =>
    set((s) => {
      if (!s.scenarios[id]) return s;
      const remaining = { ...s.scenarios };
      delete remaining[id];
      const ids = Object.keys(remaining);
      if (ids.length === 0) return persistAndReturn(defaultState());
      const activeId = s.activeId === id ? ids[0] : s.activeId;
      return persistAndReturn({ ...s, scenarios: remaining, activeId });
    }),

  setStatus: (status) =>
    set((s) => {
      const cur = s.scenarios[s.activeId];
      if (!cur) return s;
      let scenarios = { ...s.scenarios };
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
      } catch {
        /* ignore */
      }
      return defaultState();
    }),

  replaceAll: (state) => set(() => persistAndReturn(state)),

  addAsset: () =>
    get().updateActive((s) => ({
      ...s,
      assets: [
        ...s.assets,
        {
          id: uid('asset'),
          name: 'Neuer Vermögenswert',
          totalValue: 0,
          allocations: { lisa: 0, vicky: 0, jackie: 0, alexa: 0 },
          locked: false,
          flexible: false,
          splittable: true,
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
          name: 'Neue Zahlung',
          from: 'lisa' as PersonId,
          to: 'vicky' as PersonId,
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
          category: 'Sonstiges',
          person: 'lisa',
          description: 'Neue Korrektur',
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

  addConstraint: (preset) =>
    get().updateActive((s) => {
      const base: Constraint = preset
        ? ({ ...(preset as Constraint), id: uid('con'), active: preset.active ?? true } as Constraint)
        : ({
            id: uid('con'),
            kind: 'soft',
            type: 'avoidSplitAsset',
            assetId: s.assets[0]?.id ?? '',
            weight: 1,
            note: '',
            active: true,
          } as Constraint);
      return { ...s, constraints: [...s.constraints, base] };
    }),

  updateConstraint: (id, mut) =>
    get().updateActive((s) => ({
      ...s,
      constraints: s.constraints.map((c) => (c.id === id ? mut(c) : c)),
    })),

  removeConstraint: (id) =>
    get().updateActive((s) => ({
      ...s,
      constraints: s.constraints.filter((c) => c.id !== id),
    })),

  runEqualizer: () => {
    const s = get();
    const cur = s.scenarios[s.activeId];
    if (!cur) return ['Kein aktives Szenario.'];
    const r = runEqualize(cur);
    if (r.ok) {
      set((curState) =>
        persistAndReturn({
          ...curState,
          scenarios: { ...curState.scenarios, [s.activeId]: r.scenario },
        })
      );
    }
    return r.messages;
  },
}));
