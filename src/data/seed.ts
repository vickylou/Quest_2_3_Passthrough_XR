import { Asset, Author, Correction, PersonId, Scenario, Transfer } from '../types';

const zero = (): Record<PersonId, number> => ({ lisa: 0, vicky: 0, jackie: 0, alexa: 0 });

function alloc(parts: Partial<Record<PersonId, number>>): Record<PersonId, number> {
  return { ...zero(), ...parts };
}

export const HELMHAUS_ID = 'helmhaus';
export const WEBERHAUS_ID = 'weberhaus';
export const BAUGRUND_1_ID = 'baugrund_1';
export const BAUGRUND_2_ID = 'baugrund_2';
export const CASH_ID = 'cash';
export const LANDWIRTSCHAFT_ID = 'landwirtschaft';

export function defaultAssets(): Asset[] {
  return [
    {
      id: HELMHAUS_ID,
      name: 'Helmhaus',
      totalValue: 1_320_000,
      allocations: alloc({ lisa: 72, vicky: 28 }),
      imageKey: 'house',
      tone: 'sky',
      subItems: [{ id: 'helm_renovation', label: 'Renovation costs', amount: 250_000 }],
      internalBreakdown: '',
    },
    {
      id: WEBERHAUS_ID,
      name: 'Weberhaus',
      totalValue: 1_350_000,
      allocations: alloc({ jackie: 62, alexa: 38 }),
      imageKey: 'house',
      tone: 'rose',
      internalBreakdown: '',
    },
    {
      id: BAUGRUND_1_ID,
      name: 'Building plot 1',
      totalValue: 750_000,
      allocations: alloc({ vicky: 50, jackie: 50 }),
      imageKey: 'plot',
      tone: 'amber',
    },
    {
      id: BAUGRUND_2_ID,
      name: 'Building plot 2',
      totalValue: 750_000,
      allocations: alloc({ alexa: 100 }),
      imageKey: 'plot',
      tone: 'lime',
    },
    {
      id: CASH_ID,
      name: 'Cash',
      totalValue: 275_000,
      allocations: alloc({ lisa: 61.64, vicky: 38.36 }),
      imageKey: 'cash',
      tone: 'emerald',
      notes: 'From sold plot, after renovation',
    },
    {
      id: LANDWIRTSCHAFT_ID,
      name: 'Agricultural land',
      totalValue: 260_000,
      allocations: alloc({ lisa: 42, vicky: 42, jackie: 16 }),
      imageKey: 'field',
      tone: 'orange',
      notes: '6 500 m² ≈ 40 €/m². Future upside if rezoned.',
      landMode: 'agricultural',
      buildingConfig: {
        spots: 6,
        valuePerSpot: 750_000,
        perSister: { lisa: 0, vicky: 0, jackie: 0, alexa: 0 },
      },
    },
  ];
}

export function defaultTransfers(): Transfer[] {
  return [
    {
      id: 'transfer_lisa_vicky',
      name: 'Equalisation payment Lisa → Vicky',
      from: 'lisa',
      to: 'vicky',
      amount: 150_000,
    },
    {
      id: 'transfer_parents_vicky',
      name: 'Parental support → Vicky',
      from: 'mum_and_dad',
      to: 'vicky',
      amount: 80_000,
    },
  ];
}

export function defaultCorrections(): Correction[] {
  // Empty by default — the user can add their own.
  // Keep a small set of inactive examples so the panel isn't empty on first load.
  return [
    { id: 'corr_lisa_1', person: 'lisa', amount: 0, active: false, note: 'Reduced rent / housing support' },
    { id: 'corr_vicky_1', person: 'vicky', amount: 0, active: false, note: 'Divorce-related emergency support' },
    { id: 'corr_jackie_1', person: 'jackie', amount: 0, active: false, note: 'Free / reduced housing' },
    { id: 'corr_alexa_1', person: 'alexa', amount: 0, active: false, note: 'Support received from parents' },
  ];
}

function makeBaseScenario(
  id: string,
  name: string,
  author: Author,
  notes: string,
  options: {
    meeting?: string;
    visibility?: Scenario['visibility'];
    sharedWith?: Scenario['sharedWith'];
    overrides?: (assets: Asset[]) => Asset[];
  } = {}
): Scenario {
  const now = Date.now();
  return {
    id,
    name,
    author,
    meeting: options.meeting,
    visibility: options.visibility ?? 'private',
    sharedWith: options.sharedWith,
    notes,
    assumptions: '',
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    assets: (options.overrides ?? ((a) => a))(defaultAssets()),
    transfers: defaultTransfers(),
    corrections: defaultCorrections(),
  };
}

/**
 * Fresh blank slate for a new user. Asset cards are present (Helmhaus etc.)
 * with their canonical values, but every percentage is 0 — the four sister
 * chips therefore start at €0 and only fill up as the user allocates shares.
 */
export function blankScenario(author: Author = 'lisa'): Scenario {
  const now = Date.now();
  const zeroAlloc = { lisa: 0, vicky: 0, jackie: 0, alexa: 0 };
  return {
    id: 'blank',
    name: 'My new scenario',
    author,
    visibility: 'private',
    notes: '',
    assumptions: '',
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    assets: defaultAssets().map((a) => ({ ...a, allocations: { ...zeroAlloc } })),
    transfers: [],
    corrections: [],
  };
}

export function v0Scenario(): Scenario {
  return makeBaseScenario(
    'v0',
    'V0 – Starting point',
    'mum',
    'Current state of the discussion. All values editable.',
    { meeting: 'Family meeting', visibility: 'public' }
  );
}

export function v1Scenario(): Scenario {
  return makeBaseScenario(
    'v1',
    "Vicky's draft – land 50/50 with Lisa",
    'vicky',
    'Lisa and Vicky each get half of the agricultural land. Cash partly compensates the others.',
    {
      visibility: 'private',
      overrides: (assets) =>
        assets.map((a) => {
          if (a.id === LANDWIRTSCHAFT_ID) {
            return { ...a, allocations: { lisa: 50, vicky: 50, jackie: 0, alexa: 0 } };
          }
          if (a.id === CASH_ID) {
            return { ...a, allocations: { lisa: 73, vicky: 27, jackie: 0, alexa: 0 } };
          }
          return a;
        }),
    }
  );
}

export function v2Scenario(): Scenario {
  return makeBaseScenario(
    'v2',
    "Jackie's draft – three sisters share land",
    'jackie',
    'Lisa, Vicky and Jackie each get roughly the same share of the agricultural land. Cash split among the three.',
    {
      visibility: 'private',
      overrides: (assets) =>
        assets.map((a) => {
          if (a.id === LANDWIRTSCHAFT_ID) {
            return { ...a, allocations: { lisa: 33.33, vicky: 33.33, jackie: 33.34, alexa: 0 } };
          }
          if (a.id === CASH_ID) {
            return { ...a, allocations: { lisa: 73, vicky: 27, jackie: 0, alexa: 0 } };
          }
          return a;
        }),
    }
  );
}
