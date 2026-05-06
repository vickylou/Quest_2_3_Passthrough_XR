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
   * Additive sub-items (e.g. renovation costs that the heir still has to
   * pour into the property). Each row is added on top of `totalValue` to
   * give the asset's effective total. Each row carries its own per-sister
   * percentage split — typically the heirs of the asset shoulder these
   * costs in different proportions than the headline allocation. When a
   * row has no `allocations`, it falls back to the parent asset's split.
   */
  subItems?: AssetSubItem[];
  /**
   * Free-form longer description of how the asset is internally structured
   * (e.g. for a house, who lives where, who pays what). Currently rendered
   * as a placeholder nested card; will be expanded in a future iteration.
   */
  internalBreakdown?: string;
  notes?: string;
  /**
   * Per-floor card totals for the rich Helmhaus internal-split panel.
   * Only populated on the Helmhaus asset; other assets ignore it. When
   * present these values override the appraisal anchors so the user's
   * tweaks survive a refresh / redeploy / cloud-sync cycle.
   */
  helmhausSplit?: HelmhausSplitValues;
  /**
   * Only used on the agricultural-land asset. The land is always divided
   * into whole plots (spots) — `landMode` only changes which value-per-plot
   * is active: the agricultural value or the building-property value.
   * Spots and the per-sister whole-plot allocation are SHARED across modes
   * (the land is physically divided the same way regardless of zoning).
   *
   * `buildingConfig` holds the live spots/valuePerSpot/perSister. The two
   * `*ValuePerSpot` fields remember each mode's value-per-plot so toggling
   * round-trips both edits without loss.
   */
  landMode?: 'agricultural' | 'building';
  buildingConfig?: BuildingConfig;
  /** Per-mode metrics — saved when leaving a mode so toggling restores both
   *  m²-per-spot and €/m² exactly as the user last saw them. */
  agriculturalSpotMetrics?: LandSpotMetrics;
  buildingSpotMetrics?: LandSpotMetrics;
  /** @deprecated Pre-metrics single-value snapshots. Read on first load if
   *  metrics are missing, then never written again. */
  agriculturalValuePerSpot?: number;
  buildingValuePerSpot?: number;
  /** @deprecated Pre-spots-everywhere snapshot. Ignored by the UI. */
  agriculturalSnapshot?: {
    totalValue: number;
    allocations: Allocation;
  };
}

export interface BuildingConfig {
  spots: number;
  /**
   * Authoritative price for one plot. Derived from
   * `(totalSquareMeters / spots) × eurosPerSquareMeter` when those fields
   * are present (the UI always keeps it in sync). Older saved data without
   * the metric fields falls back to this stored number.
   */
  valuePerSpot: number;
  /** Total physical area of the parcel in m². m² per spot is derived
   *  (`totalSquareMeters / spots`). */
  totalSquareMeters?: number;
  /** Price per m² in the currently-active land mode. */
  eurosPerSquareMeter?: number;
  /** @deprecated Replaced by `totalSquareMeters`. Read on first load only
   *  so older saved data lifts cleanly into the new shape. */
  squareMetersPerSpot?: number;
  perSister: Allocation;
}

/** Per-mode snapshot of the plot inputs so toggling agri↔building
 *  round-trips total area, €/m², AND the per-sister spot allocation —
 *  e.g. "Vicky gets all 6 plots if agricultural but Lisa 2 / Vicky 2 /
 *  Jackie 1 / Alexa 1 if rezoned to building plots." */
export interface LandSpotMetrics {
  totalSquareMeters: number;
  eurosPerSquareMeter: number;
  perSister: Allocation;
}

export interface HelmhausSplitValues {
  egTotal: number;
  ogLisa: number;
  ogVicky: number;
  praxisFull: number;
  dgFull: number;
  garageTotal: number;
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
  /** Optional per-sister split for this sub-item. Falls back to the parent
   *  asset's `allocations` when unset. */
  allocations?: Allocation;
}

export interface Transfer {
  id: string;
  name: string;
  /** Null means Mum & Dad (legacy "external"). */
  from: TransferSource;
  to: PersonId;
  amount: number;
  /**
   * When false, the payment is shown but excluded from the balance — same
   * pattern as Corrections. Treat undefined as `true` so older saved data
   * (which never had this field) continues to count toward the balance
   * exactly as it did before.
   */
  active?: boolean;
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
  /**
   * Tombstones for scenarios this device deleted. We never re-pull a
   * scenario whose id is in this list — protects against (a) a failed
   * cloud-delete leaving the row alive on the server, and (b) another
   * device's backfill re-pushing a not-yet-deleted local copy.
   */
  deletedIds?: string[];
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
