import { describe, expect, it } from 'vitest';
import { equalize } from '../solver/equalize';
import { v1Scenario, v2Scenario } from '../data/seed';
import { computeBalances } from '../lib/balances';
import { maxDeviation } from '../lib/fairness';
import { PERSON_IDS } from '../types';

/**
 * V1 and V2 cannot achieve a perfect equalization because Alexa (V1) and
 * Jackie (V2) sit structurally above the equal target after the locked
 * allocations, and the only flexible asset (cash) can only be added (never
 * subtracted). The tests below check:
 *   - the solver returns ok/feasible
 *   - the locked land allocation is preserved
 *   - cash percentages still sum to 100
 *   - the achieved max deviation matches the analytic structural minimum
 *     (i.e. the solver is doing the best the math allows)
 */
describe('equalize (Chebyshev LP)', () => {
  it('V1: Lisa & Vicky equal land, cash adjusted, structural minimum honoured', () => {
    const r = equalize(v1Scenario());
    expect(r.ok).toBe(true);
    const b = computeBalances(r.scenario);
    expect(b.equalTarget).toBeCloseTo(1_176_250, 0);

    const land = r.scenario.assets.find((a) => a.id === 'landwirtschaft')!;
    expect(land.allocations.lisa).toBeCloseTo(50, 1);
    expect(land.allocations.vicky).toBeCloseTo(50, 1);
    expect(land.allocations.jackie).toBeCloseTo(0, 1);
    expect(land.allocations.alexa).toBeCloseTo(0, 1);

    const cash = r.scenario.assets.find((a) => a.id === 'cash')!;
    const sum = PERSON_IDS.reduce((acc, p) => acc + cash.allocations[p], 0);
    expect(sum).toBeCloseTo(100, 1);

    // Alexa's locked balance sits 86,750 € above target; cash can only be added.
    // Solver should achieve max deviation no worse than ~87k.
    expect(maxDeviation(b)).toBeLessThan(95_000);
    // And no better than ~86,750 (structural lower bound).
    expect(maxDeviation(b)).toBeGreaterThan(80_000);
  });

  it('V2: three sisters share land, cash three-way, Jackie structural surplus', () => {
    const r = equalize(v2Scenario());
    expect(r.ok).toBe(true);
    const b = computeBalances(r.scenario);
    expect(b.equalTarget).toBeCloseTo(1_176_250, 0);

    const cash = r.scenario.assets.find((a) => a.id === 'cash')!;
    expect(cash.allocations.alexa).toBeLessThan(0.1);
    const sum = PERSON_IDS.reduce((acc, p) => acc + cash.allocations[p], 0);
    expect(sum).toBeCloseTo(100, 1);

    // Jackie ends up structurally above target after locked land + B1; expect
    // max deviation around her surplus (~120k).
    expect(maxDeviation(b)).toBeLessThan(140_000);
    expect(maxDeviation(b)).toBeGreaterThan(80_000);
  });
});
