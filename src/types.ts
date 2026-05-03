export type PersonId = 'lisa' | 'vicky' | 'jackie' | 'alexa';

export interface PersonColors {
  primary: string;
  accent: string;
}

export const PEOPLE: { id: PersonId; name: string; colors: PersonColors }[] = [
  { id: 'lisa', name: 'Lisa', colors: { primary: '#16a34a', accent: '#2563eb' } },
  { id: 'vicky', name: 'Vicky', colors: { primary: '#eab308', accent: '#f97316' } },
  { id: 'jackie', name: 'Jackie', colors: { primary: '#dc2626', accent: '#ec4899' } },
  { id: 'alexa', name: 'Alexa', colors: { primary: '#9333ea', accent: '#7c3aed' } },
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
  /** Selects an inline SVG illustration for the card's right column. */
  imageKey?: 'house' | 'plot' | 'cash' | 'field';
  /**
   * Optional informational breakdown of what makes up `totalValue`. Display-only
   * — balance math still uses `totalValue`. The remainder
   * (`totalValue − sum(subItems)`) is shown as a "Base value" line.
   */
  subItems?: AssetSubItem[];
  notes?: string;
}

export interface AssetSubItem {
  id: string;
  label: string;
  amount: number;
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
