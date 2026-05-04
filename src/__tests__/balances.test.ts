import { describe, expect, it } from 'vitest';
import { computeBalances } from '../lib/balances';
import { v0Scenario } from '../data/seed';

describe('computeBalances', () => {
  it('matches the hand calculation for the V0 baseline', () => {
    const b = computeBalances(v0Scenario());
    // Total estate = 1.32 + 0.25 (Helmhaus reno add-on) + 1.35 + 0.75 + 0.75
    //                + 0.275 + 0.25992 ≈ 4.954 920 M.
    // (Agri land defaults to 6 plots × 1083 m² × 40 €/m² = 259 920 €;
    //  per-sister spots all start at 0 so the agri land contributes to
    //  totalAssets but not to any single sister's balance until plots
    //  are assigned. Helmhaus renovation costs are additive on top of
    //  the headline value and split per the parent's allocation.)
    expect(b.totalAssets).toBeCloseTo(4_954_920, 0);
    expect(b.equalTarget).toBeCloseTo(1_238_730, 0);

    // Lisa: (1.32 + 0.25)*0.72 + 0.275*0.6164 - 150k = 1,149,910
    expect(b.perPerson.lisa).toBeCloseTo(1_149_910, -1);
    // Vicky: (1.32 + 0.25)*0.28 + 0.75*0.5 + 0.275*0.3836 + 150k + 80k = 1,150,090
    expect(b.perPerson.vicky).toBeCloseTo(1_150_090, -1);
    // Jackie: 1.35*0.62 + 0.75*0.5 = 1,212,000
    expect(b.perPerson.jackie).toBeCloseTo(1_212_000, -1);
    // Alexa: 1.35*0.38 + 0.75*1.0 = 1,263,000
    expect(b.perPerson.alexa).toBeCloseTo(1_263_000, -1);
  });
});
