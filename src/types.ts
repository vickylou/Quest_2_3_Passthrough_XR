export type PersonId = 'lisa' | 'vicky' | 'jackie' | 'alexa';

export const PEOPLE: { id: PersonId; name: string; color: string }[] = [
  { id: 'lisa', name: 'Lisa', color: '#7c9ec3' },
  { id: 'vicky', name: 'Vicky', color: '#c37c9e' },
  { id: 'jackie', name: 'Jackie', color: '#c39e7c' },
  { id: 'alexa', name: 'Alexa', color: '#7cc39e' },
];

export const PERSON_IDS: PersonId[] = ['lisa', 'vicky', 'jackie', 'alexa'];

export type Allocation = Record<PersonId, number>; // percentages summing to 100

export interface Asset {
  id: string;
  name: string;
  totalValue: number;
  allocations: Allocation;
  /** When true, the auto-equalizer must not touch this asset's allocations. */
  locked: boolean;
  /** When true, the auto-equalizer is allowed to redistribute this asset. */
  flexible: boolean;
  /**
   * Optional whitelist limiting which sisters may receive shares of this asset
   * during auto-equalization. If undefined, all four are allowed.
   */
  allowedRecipients?: PersonId[];
  /** Soft preference signal: if false, splitting this asset is discouraged. */
  splittable: boolean;
  notes?: string;
}

export interface Transfer {
  id: string;
  name: string;
  /** Null means external (e.g. parents) — adds to `to` without subtracting from anyone. */
  from: PersonId | null;
  to: PersonId;
  amount: number;
}

export interface Correction {
  id: string;
  category: string;
  person: PersonId;
  description: string;
  amount: number;
  active: boolean;
  note: string;
}

export type Constraint =
  | {
      id: string;
      kind: 'hard';
      type: 'minBalance';
      person: PersonId;
      amount: number;
      note: string;
      active: boolean;
    }
  | {
      id: string;
      kind: 'hard';
      type: 'minAssetShare';
      assetId: string;
      person: PersonId;
      percent: number;
      note: string;
      active: boolean;
    }
  | {
      id: string;
      kind: 'hard';
      type: 'fixAssetAllocation';
      assetId: string;
      allocations: Allocation;
      note: string;
      active: boolean;
    }
  | {
      id: string;
      kind: 'soft';
      type: 'preferFullAsset';
      assetId: string;
      person: PersonId;
      weight: number;
      note: string;
      active: boolean;
    }
  | {
      id: string;
      kind: 'soft';
      type: 'preferLiquidity';
      person: PersonId;
      weight: number;
      note: string;
      active: boolean;
    }
  | {
      id: string;
      kind: 'soft';
      type: 'avoidSplitAsset';
      assetId: string;
      weight: number;
      note: string;
      active: boolean;
    };

export type ScenarioStatus = 'draft' | 'preferred' | 'final';

export interface Scenario {
  id: string;
  name: string;
  notes: string;
  assumptions: string;
  createdAt: number;
  updatedAt: number;
  status: ScenarioStatus;
  assets: Asset[];
  transfers: Transfer[];
  corrections: Correction[];
  constraints: Constraint[];
}

export type Mode = 'manual' | 'auto' | 'suggestions';

export interface PersistedState {
  schemaVersion: number;
  activeId: string;
  scenarios: Record<string, Scenario>;
  mode: Mode;
}

export interface Balances {
  perPerson: Record<PersonId, number>;
  perPersonAsset: Record<PersonId, number>;
  perPersonTransfer: Record<PersonId, number>;
  perPersonCorrection: Record<PersonId, number>;
  totalAssets: number;
  totalCorrections: number;
  estatePool: number;
  equalTarget: number;
  equalTargetWithoutCorrections: number;
  diff: Record<PersonId, number>;
}

export interface ValidationIssue {
  level: 'warning' | 'error';
  message: string;
  assetId?: string;
}
