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

/**
 * Anyone who can author a scenario or send a transfer. The four sisters
 * actually receive inheritance; "mum" and "dad" only act as senders of
 * transfers and as scenario authors. "test" is a temporary identity used
 * to verify cross-device sync from a second phone — safe to remove once
 * everyone is on board.
 */
export type Author = PersonId | 'mum' | 'dad' | 'test';

export const AUTHORS: { id: Author; name: string }[] = [
  { id: 'lisa', name: 'Lisa' },
  { id: 'vicky', name: 'Vicky' },
  { id: 'jackie', name: 'Jackie' },
  { id: 'alexa', name: 'Alexa' },
  { id: 'mum', name: 'Mum' },
  { id: 'dad', name: 'Dad' },
  { id: 'test', name: 'Test phone' },
];

/** "From" of a transfer. `null` is legacy (was "external") and now treated as Mum & Dad combined. */
export type TransferSource = PersonId | 'mum' | 'dad' | 'mum_and_dad' | null;

export type Allocation = Record<PersonId, number>; // percentages summing to 100

export interface Asset {
  id: string;
  name: string;
  totalValue: number;
  allocations: Allocation;
  /** Selects an inline SVG illustration for the card's right column. */
  imageKey?: 'house' | 'plot' | 'cash' | 'field';
  /** Per-card colour tone. Drives card border and illustration tint. */
  tone?: AssetTone;
  /**
   * Optional informational breakdown of what makes up `totalValue`. Display-only
   * — balance math still uses `totalValue`. The remainder
   * (`totalValue − sum(subItems)`) is shown as a "Base value" line.
   */
  subItems?: AssetSubItem[];
  /**
   * Free-form longer description of how the asset is internally structured
   * (e.g. for a house, who lives where, who pays what). Currently rendered
   * as a placeholder nested card; will be expanded in a future iteration.
   */
  internalBreakdown?: string;
  notes?: string;
}

export type AssetTone =
  | 'sky'
  | 'rose'
  | 'amber'
  | 'lime'
  | 'emerald'
  | 'orange'
  | 'violet'
  | 'slate';

export interface AssetSubItem {
  id: string;
  label: string;
  amount: number;
}

export interface Transfer {
  id: string;
  name: string;
  /** Null means Mum & Dad (legacy "external"). */
  from: TransferSource;
  to: PersonId;
  amount: number;
}

export interface Correction {
  id: string;
  person: PersonId;
  amount: number;
  active: boolean;
  note: string;
}

export type ScenarioStatus = 'draft' | 'preferred' | 'final';

/**
 * Who can see this scenario in the picker on a given device.
 *   - 'private': only the author (default)
 *   - 'public':  any viewer who has the scenario on their device
 *   - 'shared':  visible to the people listed in `sharedWith`
 *
 * Cross-device propagation happens via the Share-link button — the visibility
 * label informs which prompt the share button uses, the link itself is what
 * actually moves the scenario to another phone.
 */
export type Visibility = 'private' | 'public' | 'shared';

export interface Scenario {
  id: string;
  name: string;
  /** Who created this scenario. */
  author: Author;
  /**
   * Optional name for a joint / family-meeting scenario. When set, this
   * scenario shows up grouped under that meeting in the picker instead of
   * under its author.
   */
  meeting?: string;
  /** Who can see this scenario on devices that have it. Default: 'private'. */
  visibility: Visibility;
  /** When `visibility === 'shared'`, the explicit list of recipients. */
  sharedWith?: Author[];
  notes: string;
  assumptions: string;
  createdAt: number;
  updatedAt: number;
  status: ScenarioStatus;
  assets: Asset[];
  transfers: Transfer[];
  corrections: Correction[];
}

export interface PersistedState {
  schemaVersion: number;
  activeId: string;
  scenarios: Record<string, Scenario>;
  /**
   * Who is currently using the app on this device. Used to filter the
   * scenario picker (only show scenarios authored by this person, public
   * ones, and ones shared with this person). Defaults to 'lisa' on the
   * very first load; the user picks their own identity in the header.
   */
  viewerId: Author;
  /** Last time any change was persisted (epoch ms). Used for the "saved" indicator. */
  lastSavedAt?: number;
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

/** Per-person breakdown used by the expandable sticky bar chips. */
export interface PersonBreakdown {
  perAsset: Array<{ assetId: string; assetName: string; tone?: AssetTone; amount: number; percent: number }>;
  transfersIn: Array<{ id: string; name: string; from: TransferSource; amount: number }>;
  transfersOut: Array<{ id: string; name: string; to: PersonId; amount: number }>;
  corrections: Array<{ id: string; note: string; amount: number }>;
  total: number;
}

export interface ValidationIssue {
  level: 'warning' | 'error';
  message: string;
  assetId?: string;
}
