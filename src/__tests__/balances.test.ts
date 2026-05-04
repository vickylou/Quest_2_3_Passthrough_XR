import { describe, expect, it } from 'vitest';
import { computeBalances } from '../lib/balances';
import { v0Scenario } from '../data/seed';

describe('computeBalances', () => {
  it('matches the hand calculation for the V0 baseline', () => {
    const b = computeBalances(v0Scenario());
    // Total estate = 1.32 + 1.35 + 0.75 + 0.75 + 0.275 + 0.259998 ≈ 4.705 M
    // (agri land defaults to 6 plots × 43_333 € = 259_998 €; per-sister
    //  spots all start at 0 so the agri land contributes to totalAssets but
    //  not to any single sister's balance until plots are assigned).
    expect(b.totalAssets).toBeCloseTo(4_704_998, 0);
    expect(b.equalTarget).toBeCloseTo(1_176_249.5, 0);

    // Lisa: 1.32M*0.72 + 0.275M*0.6164 - 150k = 969,910
    expect(b.perPerson.lisa).toBeCloseTo(969_910, -1);
    // Vicky: 1.32M*0.28 + 0.75M*0.5 + 0.275M*0.3836 + 150k + 80k = 1,080,090
    expect(b.perPerson.vicky).toBeCloseTo(1_080_090, -1);
    // Jackie: 1.35M*0.62 + 0.75M*0.5 = 1,212,000
    expect(b.perPerson.jackie).toBeCloseTo(1_212_000, -1);
    // Alexa: 1.35M*0.38 + 0.75M*1.0 = 1,263,000
    expect(b.perPerson.alexa).toBeCloseTo(1_263_000, -1);
  });
});
