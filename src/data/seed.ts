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
      notes: 'Inkl. ~250k Renovierung. Bestehende Aufteilung Lisa/Vicky.',
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
      notes: 'Verteilung anpassbar (z. B. 62/38 statt 50/50).',
    },
    {
      id: BAUGRUND_1_ID,
      name: 'Baugrund 1',
      totalValue: 750_000,
      allocations: alloc({ vicky: 50, jackie: 50 }),
      locked: false,
      flexible: false,
      splittable: true,
      notes: 'Geteilter Baugrund Vicky/Jackie.',
    },
    {
      id: BAUGRUND_2_ID,
      name: 'Baugrund 2',
      totalValue: 750_000,
      allocations: alloc({ alexa: 100 }),
      locked: false,
      flexible: false,
      splittable: false,
      notes: 'Voller Baugrund für Alexa (sie hat noch kein Haus).',
    },
    {
      id: CASH_ID,
      name: 'Cash',
      totalValue: 275_000,
      allocations: alloc({ lisa: 61.64, vicky: 38.36 }),
      locked: false,
      flexible: true,
      splittable: true,
      notes: 'Erlös aus verkauftem Baugrund minus Renovierung.',
    },
    {
      id: LANDWIRTSCHAFT_ID,
      name: 'Landwirtschaftlicher Grund',
      totalValue: 260_000,
      allocations: alloc({ lisa: 42, vicky: 42, jackie: 16 }),
      locked: false,
      flexible: false,
      splittable: true,
      notes: '6 500 m² ≈ 40 €/m². Mögliches Zukunftspotential bei Umzonung.',
    },
  ];
}

export function defaultTransfers(): Transfer[] {
  return [
    {
      id: 'transfer_lisa_vicky',
      name: 'Ausgleichszahlung Lisa → Vicky',
      from: 'lisa',
      to: 'vicky',
      amount: 150_000,
    },
    {
      id: 'transfer_parents_vicky',
      name: 'Unterstützung Eltern → Vicky',
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
      category: 'Wohnen',
      person: 'lisa',
      description: 'Reduzierte / freie Miete',
      amount: 0,
      active: false,
      note: '',
    },
    {
      id: 'corr_lisa_practice',
      category: 'Wohnen',
      person: 'lisa',
      description: 'Reduzierte Praxis-Miete',
      amount: 0,
      active: false,
      note: '',
    },
    {
      id: 'corr_lisa_kids',
      category: 'Familienhilfe',
      person: 'lisa',
      description: 'Unterstützung für Kinder durch Eltern',
      amount: 0,
      active: false,
      note: '',
    },
    {
      id: 'corr_jackie_housing',
      category: 'Wohnen',
      person: 'jackie',
      description: 'Reduzierte / freie Wohngelegenheit',
      amount: 0,
      active: false,
      note: '',
    },
    {
      id: 'corr_alexa_support',
      category: 'Familienhilfe',
      person: 'alexa',
      description: 'Erhaltene Unterstützung von Eltern',
      amount: 0,
      active: false,
      note: '',
    },
    {
      id: 'corr_vicky_credit',
      category: 'Familienhilfe',
      person: 'vicky',
      description: 'Hilfe bei Kreditrückzahlung durch Eltern',
      amount: 0,
      active: false,
      note: '',
    },
    {
      id: 'corr_vicky_interest',
      category: 'Zeitwert',
      person: 'vicky',
      description: 'Eingesparte Zinsen durch frühere Unterstützung',
      amount: 0,
      active: false,
      note: '',
    },
    {
      id: 'corr_vicky_divorce',
      category: 'Notfallhilfe',
      person: 'vicky',
      description: 'Scheidungsbedingte Notfall-Unterstützung',
      amount: 0,
      active: false,
      note: '',
    },
    {
      id: 'corr_general',
      category: 'Sonstiges',
      person: 'lisa',
      description: 'Andere Korrektur',
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
      note: 'Alexa soll möglichst einen ganzen Baugrund bekommen (sie hat noch kein Haus).',
      active: true,
    },
    {
      id: 'pref_avoid_split_b1',
      kind: 'soft',
      type: 'avoidSplitAsset',
      assetId: BAUGRUND_1_ID,
      weight: 2,
      note: 'Baugrund 1 möglichst nicht weiter aufteilen.',
      active: false,
    },
    {
      id: 'pref_avoid_split_b2',
      kind: 'soft',
      type: 'avoidSplitAsset',
      assetId: BAUGRUND_2_ID,
      weight: 3,
      note: 'Baugrund 2 möglichst nicht aufteilen.',
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
    'V0 – Ausgangspunkt',
    'Aktueller Stand der Diskussion. Alle Werte editierbar.'
  );
}

/**
 * V1 base: Lisa & Vicky bekommen je 50 % Landwirtschaft, Jackie 0.
 * Cash wird flexibel — der Solver verteilt es so, dass alle nahe am Zielwert sind.
 */
export function v1Scenario(): Scenario {
  return makeBaseScenario(
    'v1',
    'V1 – Lisa & Vicky teilen Landwirtschaft',
    'Lisa und Vicky bekommen je 50 % der Landwirtschaft. Cash wird automatisch verteilt um Jackie zu kompensieren.',
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
 * V2 base: Lisa, Vicky, Jackie teilen Landwirtschaft zu je ~33.33 % (Alexa 0).
 * Cash wird flexibel auf Lisa, Vicky, Jackie verteilt (Alexa 0).
 */
export function v2Scenario(): Scenario {
  return makeBaseScenario(
    'v2',
    'V2 – Drei Schwestern teilen Landwirtschaft',
    'Lisa, Vicky, Jackie bekommen ungefähr gleich viel Landwirtschaft. Cash wird auf die drei aufgeteilt.',
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
