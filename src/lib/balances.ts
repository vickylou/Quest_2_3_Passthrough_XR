import {
  Allocation,
  Asset,
  Balances,
  Correction,
  PERSON_IDS,
  PersonId,
  Scenario,
  Transfer,
  ValidationIssue,
} from '../types';

function emptyByPerson(): Record<PersonId, number> {
  return { lisa: 0, vicky: 0, jackie: 0, alexa: 0 };
}

export function computeBalances(scenario: Scenario): Balances {
  const perPersonAsset = emptyByPerson();
  const perPersonTransfer = emptyByPerson();
  const perPersonCorrection = emptyByPerson();

  let totalAssets = 0;
  for (const asset of scenario.assets) {
    totalAssets += asset.totalValue;
    for (const p of PERSON_IDS) {
      const pct = asset.allocations[p] ?? 0;
      perPersonAsset[p] += (asset.totalValue * pct) / 100;
    }
  }

  for (const t of scenario.transfers) {
    if (t.from) perPersonTransfer[t.from] -= t.amount;
    perPersonTransfer[t.to] += t.amount;
  }

  let totalCorrections = 0;
  for (const c of scenario.corrections) {
    if (!c.active) continue;
    perPersonCorrection[c.person] += c.amount;
    totalCorrections += c.amount;
  }

  const perPerson = emptyByPerson();
  for (const p of PERSON_IDS) {
    perPerson[p] =
      perPersonAsset[p] + perPersonTransfer[p] + perPersonCorrection[p];
  }

  const estatePool = totalAssets + totalCorrections;
  const equalTarget = estatePool / 4;
  const equalTargetWithoutCorrections = totalAssets / 4;

  const diff = emptyByPerson();
  for (const p of PERSON_IDS) {
    diff[p] = perPerson[p] - equalTarget;
  }

  return {
    perPerson,
    perPersonAsset,
    perPersonTransfer,
    perPersonCorrection,
    totalAssets,
    totalCorrections,
    estatePool,
    equalTarget,
    equalTargetWithoutCorrections,
    diff,
  };
}

export function validateScenario(scenario: Scenario): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const asset of scenario.assets) {
    const sum = PERSON_IDS.reduce(
      (acc, p) => acc + (asset.allocations[p] ?? 0),
      0
    );
    if (Math.abs(sum - 100) > 0.05) {
      issues.push({
        level: 'warning',
        assetId: asset.id,
        message: `${asset.name}: shares add up to ${sum.toFixed(2)} % (should be 100 %).`,
      });
    }
    for (const p of PERSON_IDS) {
      const v = asset.allocations[p] ?? 0;
      if (v < -0.001 || v > 100.001) {
        issues.push({
          level: 'error',
          assetId: asset.id,
          message: `${asset.name}: ${p} = ${v.toFixed(2)} % (must be between 0 and 100).`,
        });
      }
    }
  }

  for (const t of scenario.transfers) {
    if (t.amount < 0) {
      issues.push({
        level: 'error',
        message: `Payment "${t.name}": negative amount.`,
      });
    }
  }

  return issues;
}

export function normalizeAllocation(asset: Asset): Asset {
  const sum = PERSON_IDS.reduce(
    (acc, p) => acc + (asset.allocations[p] ?? 0),
    0
  );
  if (sum === 0) return asset;
  const factor = 100 / sum;
  const next = { ...asset.allocations };
  for (const p of PERSON_IDS) next[p] = (next[p] ?? 0) * factor;
  return { ...asset, allocations: next };
}

/** Helper: number of recipients with > threshold percent. */
export function recipientCount(asset: Asset, thresholdPct = 1): number {
  return PERSON_IDS.filter((p) => (asset.allocations[p] ?? 0) > thresholdPct).length;
}

export function transfersTouching(transfers: Transfer[], person: PersonId): Transfer[] {
  return transfers.filter((t) => t.from === person || t.to === person);
}

export function correctionsFor(corrections: Correction[], person: PersonId): Correction[] {
  return corrections.filter((c) => c.person === person);
}

/**
 * Computes a "suggested" allocation for the OTHER persons given that one
 * person's value is being edited. The remaining 100 − editedVal % is split
 * across the others proportionally to their current values, so the rough
 * shape of the existing distribution is preserved.
 *
 * If the others currently sum to 0 (nothing to scale), the deficit is split
 * evenly across them.
 */
export function suggestProportional(
  current: Allocation,
  editedId: PersonId,
  editedVal: number
): Allocation {
  const out: Allocation = { ...current, [editedId]: editedVal };
  const target = 100 - editedVal;
  const others = PERSON_IDS.filter((p) => p !== editedId);
  const otherSum = others.reduce((acc, p) => acc + (current[p] ?? 0), 0);

  if (otherSum <= 0) {
    const each = target / others.length;
    for (const p of others) out[p] = Math.max(0, each);
    return out;
  }

  const factor = target / otherSum;
  for (const p of others) {
    const v = (current[p] ?? 0) * factor;
    out[p] = Math.max(0, v);
  }
  return out;
}
