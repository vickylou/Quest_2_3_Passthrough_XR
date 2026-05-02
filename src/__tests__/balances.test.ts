import { describe, expect, it } from 'vitest';
import { computeBalances } from '../lib/balances';
import { v0Scenario } from '../data/seed';

describe('computeBalances', () => {
  it('matches the hand calculation for the V0 baseline', () => {
    const b = computeBalances(v0Scenario());
    // Total estate = 1.32 + 1.35 + 0.75 + 0.75 + 0.275 + 0.26 = 4.705 M
    expect(b.totalAssets).toBeCloseTo(4_705_000, 0);
    expect(b.equalTarget).toBeCloseTo(1_176_250, 0);

    // Lisa: 1.32M*0.72 + 0.275M*0.6164 + 0.26M*0.42 - 150k = 1,079,110
    expect(b.perPerson.lisa).toBeCloseTo(1_079_110, -1);
    // Vicky: 1.32M*0.28 + 0.75M*0.5 + 0.275M*0.3836 + 0.26M*0.42 + 150k + 80k = 1,189,290
    expect(b.perPerson.vicky).toBeCloseTo(1_189_290, -1);
    // Jackie: 1.35M*0.62 + 0.75M*0.5 + 0.26M*0.16 = 1,253,600
    expect(b.perPerson.jackie).toBeCloseTo(1_253_600, -1);
    // Alexa: 1.35M*0.38 + 0.75M*1.0 = 1,263,000
    expect(b.perPerson.alexa).toBeCloseTo(1_263_000, -1);
  });
});
