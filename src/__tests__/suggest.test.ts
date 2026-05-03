import { describe, expect, it } from 'vitest';
import { suggestProportional } from '../lib/balances';

describe('suggestProportional', () => {
  it('keeps the existing 72:28 ratio when Jackie is added with 13', () => {
    const out = suggestProportional(
      { lisa: 72, vicky: 28, jackie: 0, alexa: 0 },
      'jackie',
      13
    );
    expect(out.jackie).toBe(13);
    // 100 - 13 = 87 split 72:28 → Lisa 87 * 72/100 = 62.64, Vicky 87 * 28/100 = 24.36
    expect(out.lisa).toBeCloseTo(62.64, 2);
    expect(out.vicky).toBeCloseTo(24.36, 2);
    expect(out.alexa).toBeCloseTo(0, 2);
    expect(out.lisa + out.vicky + out.jackie + out.alexa).toBeCloseTo(100, 2);
  });

  it('falls back to even split when others are all zero', () => {
    const out = suggestProportional(
      { lisa: 0, vicky: 0, jackie: 0, alexa: 0 },
      'lisa',
      40
    );
    expect(out.lisa).toBe(40);
    expect(out.vicky).toBeCloseTo(20, 2);
    expect(out.jackie).toBeCloseTo(20, 2);
    expect(out.alexa).toBeCloseTo(20, 2);
  });

  it('shrinks others proportionally when the edited value would push the sum > 100', () => {
    // Lisa 50, Vicky 30, Jackie 20, Alexa 0 (sums to 100). Edit Alexa to 50.
    // Others must shrink to total 50. Ratio Lisa:Vicky:Jackie = 5:3:2 → 25, 15, 10.
    const out = suggestProportional(
      { lisa: 50, vicky: 30, jackie: 20, alexa: 0 },
      'alexa',
      50
    );
    expect(out.alexa).toBe(50);
    expect(out.lisa).toBeCloseTo(25, 2);
    expect(out.vicky).toBeCloseTo(15, 2);
    expect(out.jackie).toBeCloseTo(10, 2);
  });
});
