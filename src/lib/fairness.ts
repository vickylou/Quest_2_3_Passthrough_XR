import { Balances, PERSON_IDS } from '../types';

export function maxDeviation(b: Balances): number {
  return Math.max(...PERSON_IDS.map((p) => Math.abs(b.diff[p])));
}

export function sumAbsDeviation(b: Balances): number {
  return PERSON_IDS.reduce((acc, p) => acc + Math.abs(b.diff[p]), 0);
}

/**
 * Fairness score in [0, 100]. 100 = perfect equality.
 * Uses max deviation relative to the equal target.
 */
export function fairnessScore(b: Balances): number {
  if (b.equalTarget === 0) return 100;
  const ratio = maxDeviation(b) / b.equalTarget;
  return Math.max(0, Math.min(100, Math.round((1 - ratio) * 100)));
}
