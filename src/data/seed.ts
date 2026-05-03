import { Asset, Correction, Constraint, PersonId, Scenario, Transfer } from '../types';

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
      locked: true,
      flexible: false,
      allowedRecipients: ['lisa', 'vicky'],
      splittable: true,
      imageKey: 'house',
      subItems: [
        { id: 'helm_renovation', label: 'Renovation costs', amount: 250_000 },
      ],
      notes: 'Existing Lisa / Vicky split. Renovation costs broken out below.',
    },
    {
      id: WEBERHAUS_ID,
      name: 'Weberhaus',
      totalValue: 1_350_000,
      allocations: alloc({ jackie: 62, alexa: 38 }),
      locked: false,
      flexible: false,
      allowedRecipients: ['jackie', 'alexa'],
      splittable: true,
      imageKey: 'house',
      notes: 'Split is adjustable (e.g. 62 / 38 instead of 50 / 50).',
    },
    {
      id: BAUGRUND_1_ID,
      name: 'Building plot 1',
      totalValue: 750_000,
      allocations: alloc({ vicky: 50, jackie: 50 }),
      locked: false,
      flexible: false,
      splittable: true,
      imageKey: 'plot',
      notes: 'Shared plot Vicky / Jackie.',
    },
    {
      id: BAUGRUND_2_ID,
      name: 'Building plot 2',
      totalValue: 750_000,
      allocations: alloc({ alexa: 100 }),
      locked: false,
      flexible: false,
      splittable: false,
      imageKey: 'plot',
      notes: 'Full plot for Alexa (she does not yet own a house).',
    },
    {
      id: CASH_ID,
      name: 'Cash',
      totalValue: 275_000,
      allocations: alloc({ lisa: 61.64, vicky: 38.36 }),
      locked: false,
      flexible: true,
      splittable: true,
      imageKey: 'cash',
      notes: 'Proceeds from the sold building plot, minus renovation contribution.',
    },
    {
      id: LANDWIRTSCHAFT_ID,
      name: 'Agricultural land',
      totalValue: 260_000,
      allocations: alloc({ lisa: 42, vicky: 42, jackie: 16 }),
      locked: false,
      flexible: false,
      splittable: true,
      imageKey: 'field',
      notes: '6 500 m² ≈ 40 €/m². Future upside if rezoned.',
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
      from: null,
      to: 'vicky',
      amount: 80_000,
    },
  ];
}

export function defaultCorrections(): Correction[] {
  return [
    {
      id: 'corr_lisa_rent',
      category: 'Housing',
      person: 'lisa',
      description: 'Reduced / free rent',
      amount: 0,
      active: false,
      note: '',
    },
    {
      id: 'corr_lisa_practice',
      category: 'Housing',
      person: 'lisa',
      description: 'Reduced practice rent',
      amount: 0,
      active: false,
      note: '',
    },
    {
      id: 'corr_lisa_kids',
      category: 'Family support',
      person: 'lisa',
      description: 'Support for children from parents',
      amount: 0,
      active: false,
      note: '',
    },
    {
      id: 'corr_jackie_housing',
      category: 'Housing',
      person: 'jackie',
      description: 'Reduced / free housing',
      amount: 0,
      active: false,
      note: '',
    },
    {
      id: 'corr_alexa_support',
      category: 'Family support',
      person: 'alexa',
      description: 'Support received from parents',
      amount: 0,
      active: false,
      note: '',
    },
    {
      id: 'corr_vicky_credit',
      category: 'Family support',
      person: 'vicky',
      description: 'Help with credit repayment from parents',
      amount: 0,
      active: false,
      note: '',
    },
    {
      id: 'corr_vicky_interest',
      category: 'Time value',
      person: 'vicky',
      description: 'Interest saved through earlier support',
      amount: 0,
      active: false,
      note: '',
    },
    {
      id: 'corr_vicky_divorce',
      category: 'Emergency support',
      person: 'vicky',
      description: 'Divorce-related emergency support',
      amount: 0,
      active: false,
      note: '',
    },
    {
      id: 'corr_general',
      category: 'Other',
      person: 'lisa',
      description: 'Other correction',
      amount: 0,
      active: false,
      note: '',
    },
  ];
}

export function defaultConstraints(): Constraint[] {
  return [
    {
      id: 'pref_alexa_full_plot',
      kind: 'soft',
      type: 'preferFullAsset',
      assetId: BAUGRUND_2_ID,
      person: 'alexa',
      weight: 5,
      note: 'Alexa should ideally receive a full building plot (she has no house yet).',
      active: true,
    },
    {
      id: 'pref_avoid_split_b1',
      kind: 'soft',
      type: 'avoidSplitAsset',
      assetId: BAUGRUND_1_ID,
      weight: 2,
      note: 'Avoid splitting building plot 1 further if possible.',
      active: false,
    },
    {
      id: 'pref_avoid_split_b2',
      kind: 'soft',
      type: 'avoidSplitAsset',
      assetId: BAUGRUND_2_ID,
      weight: 3,
      note: 'Avoid splitting building plot 2 if possible.',
      active: true,
    },
  ];
}

function makeBaseScenario(
  id: string,
  name: string,
  notes: string,
  overrides: (assets: Asset[]) => Asset[] = (a) => a
): Scenario {
  const now = Date.now();
  return {
    id,
    name,
    notes,
    assumptions: '',
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    assets: overrides(defaultAssets()),
    transfers: defaultTransfers(),
    corrections: defaultCorrections(),
    constraints: defaultConstraints(),
  };
}

export function v0Scenario(): Scenario {
  return makeBaseScenario(
    'v0',
    'V0 – Starting point',
    'Current state of the discussion. All values editable.'
  );
}

/**
 * V1 base: Lisa & Vicky each get 50 % of the agricultural land, Jackie 0.
 * Cash becomes flexible — the solver distributes it so everyone is close
 * to the equal goal.
 */
export function v1Scenario(): Scenario {
  return makeBaseScenario(
    'v1',
    'V1 – Lisa & Vicky share agricultural land',
    'Lisa and Vicky each get 50 % of the agricultural land. Cash is auto-distributed to compensate Jackie.',
    (assets) =>
      assets.map((a) => {
        if (a.id === LANDWIRTSCHAFT_ID) {
          return {
            ...a,
            allocations: { lisa: 50, vicky: 50, jackie: 0, alexa: 0 },
            locked: true,
            flexible: false,
          };
        }
        if (a.id === CASH_ID) {
          return {
            ...a,
            locked: false,
            flexible: true,
            allowedRecipients: ['lisa', 'vicky', 'jackie', 'alexa'],
          };
        }
        return a;
      })
  );
}

/**
 * V2 base: Lisa, Vicky, Jackie share agricultural land roughly 33.33 % each
 * (Alexa 0). Cash flexible across Lisa, Vicky, Jackie (Alexa 0).
 */
export function v2Scenario(): Scenario {
  return makeBaseScenario(
    'v2',
    'V2 – Three sisters share agricultural land',
    'Lisa, Vicky and Jackie each get roughly the same share of the agricultural land. Cash is split among the three.',
    (assets) =>
      assets.map((a) => {
        if (a.id === LANDWIRTSCHAFT_ID) {
          return {
            ...a,
            allocations: { lisa: 33.33, vicky: 33.33, jackie: 33.34, alexa: 0 },
            locked: true,
            flexible: false,
          };
        }
        if (a.id === CASH_ID) {
          return {
            ...a,
            locked: false,
            flexible: true,
            allowedRecipients: ['lisa', 'vicky', 'jackie'],
          };
        }
        return a;
      })
  );
}
