import solver, { LPModel } from 'javascript-lp-solver';
import {
  Asset,
  Constraint,
  PERSON_IDS,
  PersonId,
  Scenario,
} from '../types';

export interface EqualizeResult {
  ok: boolean;
  feasible: boolean;
  /** Optimised maximum deviation from the equal target (in €). */
  achievedT: number;
  /** Updated scenario with new flexible-asset allocations. */
  scenario: Scenario;
  /** Human-readable warnings/explanations. */
  messages: string[];
}

interface EqualizeOptions {
  /** Weight of fairness term `t` in the objective. Default 1. */
  fairnessWeight?: number;
  /** Multiplier for soft-constraint slack weights. Default 1. */
  softWeightMultiplier?: number;
}

/**
 * Chebyshev minimax LP. Minimises max|balance − target| over the four sisters
 * by redistributing the percentages on assets marked `flexible` (and not `locked`).
 *
 * Hard constraints (active only) become LP constraints:
 *   - minBalance: person's final balance ≥ amount.
 *   - minAssetShare: x[asset][person] ≥ percent/100.
 *   - fixAssetAllocation: x[asset][person] = pct/100 for each person, and the
 *     asset is treated as locked for the solver.
 *
 * Soft constraints (active only) add weighted slack variables to the objective:
 *   - preferFullAsset: pushes x[asset][person] toward 1.
 *   - preferLiquidity: pushes the cash-like flexible asset's allocation toward 1
 *     for the chosen person (only practical when cash is flexible).
 *   - avoidSplitAsset: penalises assets that end up split among multiple
 *     recipients (linearised as a sum of "share above 0" indicators via slacks).
 */
export function equalize(scenario: Scenario, options: EqualizeOptions = {}): EqualizeResult {
  const fairnessWeight = options.fairnessWeight ?? 1;
  const softMul = options.softWeightMultiplier ?? 1;

  const messages: string[] = [];

  // Apply hard `fixAssetAllocation` constraints by stamping allocations onto
  // their assets and treating those assets as locked for this solve.
  const assets = scenario.assets.map((a) => ({ ...a, allocations: { ...a.allocations } }));
  const activeConstraints = scenario.constraints.filter((c) => c.active);

  for (const c of activeConstraints) {
    if (c.kind === 'hard' && c.type === 'fixAssetAllocation') {
      const idx = assets.findIndex((a) => a.id === c.assetId);
      if (idx >= 0) {
        assets[idx] = {
          ...assets[idx],
          allocations: { ...c.allocations },
          locked: true,
          flexible: false,
        };
      }
    }
  }

  const flexibleAssets = assets.filter((a) => a.flexible && !a.locked);

  if (flexibleAssets.length === 0) {
    messages.push(
      'No flexible assets. Mark at least one asset as "flexible" in the Auto-equalize setup so the solver has something to redistribute.'
    );
    return { ok: false, feasible: true, achievedT: NaN, scenario, messages };
  }

  // Compute baseline balance per person from locked assets + transfers + active corrections.
  const baseline: Record<PersonId, number> = { lisa: 0, vicky: 0, jackie: 0, alexa: 0 };
  let totalAssetValue = 0;
  for (const a of assets) {
    totalAssetValue += a.totalValue;
    if (a.flexible && !a.locked) continue;
    for (const p of PERSON_IDS) {
      baseline[p] += (a.totalValue * (a.allocations[p] ?? 0)) / 100;
    }
  }
  for (const t of scenario.transfers) {
    if (t.from) baseline[t.from] -= t.amount;
    baseline[t.to] += t.amount;
  }
  let totalCorrections = 0;
  for (const c of scenario.corrections) {
    if (!c.active) continue;
    baseline[c.person] += c.amount;
    totalCorrections += c.amount;
  }

  const T = (totalAssetValue + totalCorrections) / 4;

  // Build LP.
  const variables: LPModel['variables'] = {};
  const constraints: LPModel['constraints'] = {};

  // t variable (fairness slack)
  variables['t'] = { fairness: fairnessWeight };
  constraints['t_nonneg'] = { min: 0 };
  variables['t']['t_nonneg'] = 1;

  // Per-person fairness constraints:
  //   B[p] + Σ V_a · x[a][p] − T ≤ t        (rewrite: Σ V_a · x[a][p] − t ≤ T − B[p])
  //   T − B[p] − Σ V_a · x[a][p] ≤ t        (rewrite: Σ V_a · x[a][p] + t ≥ T − B[p])
  for (const p of PERSON_IDS) {
    constraints[`fair_upper_${p}`] = { max: T - baseline[p] };
    constraints[`fair_lower_${p}`] = { min: T - baseline[p] };
    variables['t'][`fair_upper_${p}`] = -1;
    variables['t'][`fair_lower_${p}`] = 1;
  }

  // Per-asset variables and 100% sum constraints.
  for (const asset of flexibleAssets) {
    const allowed = effectiveAllowed(asset, activeConstraints);
    constraints[`sum_${asset.id}`] = { equal: 1 };
    for (const p of PERSON_IDS) {
      const varName = `x_${asset.id}_${p}`;
      variables[varName] = { fairness: 0 };
      // sum constraint: only allowed recipients participate; others fixed at 0 by upper bound.
      if (allowed.includes(p)) {
        variables[varName][`sum_${asset.id}`] = 1;
        // x ≥ 0 implicit via solver (default lower bound 0 once a constraint mentions the var).
        // Add explicit upper bound 1 for safety.
        constraints[`upper_${varName}`] = { max: 1 };
        variables[varName][`upper_${varName}`] = 1;
        // Fairness coupling
        variables[varName][`fair_upper_${p}`] = asset.totalValue;
        variables[varName][`fair_lower_${p}`] = asset.totalValue;
      } else {
        // Force to zero by equality constraint.
        constraints[`zero_${varName}`] = { equal: 0 };
        variables[varName][`zero_${varName}`] = 1;
      }
    }
  }

  // Hard constraints
  for (const c of activeConstraints) {
    if (c.kind !== 'hard') continue;
    if (c.type === 'minBalance') {
      // baseline[p] + Σ V_a · x[a][p] ≥ amount
      const key = `hard_minBal_${c.id}`;
      constraints[key] = { min: c.amount - baseline[c.person] };
      for (const a of flexibleAssets) {
        const allowed = effectiveAllowed(a, activeConstraints);
        if (allowed.includes(c.person)) {
          variables[`x_${a.id}_${c.person}`][key] = a.totalValue;
        }
      }
    } else if (c.type === 'minAssetShare') {
      const a = flexibleAssets.find((x) => x.id === c.assetId);
      if (!a) continue;
      const allowed = effectiveAllowed(a, activeConstraints);
      if (!allowed.includes(c.person)) continue;
      const key = `hard_minShare_${c.id}`;
      constraints[key] = { min: c.percent / 100 };
      variables[`x_${a.id}_${c.person}`][key] = 1;
    }
    // fixAssetAllocation handled at preprocess.
  }

  // Soft constraints — encode with slack vars added to the objective.
  for (const c of activeConstraints) {
    if (c.kind !== 'soft') continue;
    const w = (c.weight ?? 1) * softMul;
    if (c.type === 'preferFullAsset') {
      const a = flexibleAssets.find((x) => x.id === c.assetId);
      if (!a) continue;
      const allowed = effectiveAllowed(a, activeConstraints);
      if (!allowed.includes(c.person)) continue;
      const slack = `s_full_${c.id}`;
      variables[slack] = { fairness: w };
      constraints[`s_full_${c.id}_def`] = { min: 1 };
      // x + s ≥ 1
      variables[`x_${a.id}_${c.person}`][`s_full_${c.id}_def`] = 1;
      variables[slack][`s_full_${c.id}_def`] = 1;
      constraints[`s_full_${c.id}_nn`] = { min: 0 };
      variables[slack][`s_full_${c.id}_nn`] = 1;
    } else if (c.type === 'preferLiquidity') {
      // Push the cash-like flexible asset toward this person.
      const cash = flexibleAssets.find((x) => x.name.toLowerCase().includes('cash'));
      if (!cash) continue;
      const allowed = effectiveAllowed(cash, activeConstraints);
      if (!allowed.includes(c.person)) continue;
      const slack = `s_liq_${c.id}`;
      variables[slack] = { fairness: w };
      constraints[`s_liq_${c.id}_def`] = { min: 1 };
      variables[`x_${cash.id}_${c.person}`][`s_liq_${c.id}_def`] = 1;
      variables[slack][`s_liq_${c.id}_def`] = 1;
      constraints[`s_liq_${c.id}_nn`] = { min: 0 };
      variables[slack][`s_liq_${c.id}_nn`] = 1;
    } else if (c.type === 'avoidSplitAsset') {
      const a = flexibleAssets.find((x) => x.id === c.assetId);
      if (!a) continue;
      // Penalise the second-largest share. We approximate with a single slack
      // s ≥ Σ_p x − max_p x ≈ 1 − max_p x. Linearised: introduce s and m where
      // m ≤ x[a][p] ∀ p in allowed AND m ≥ 0; minimize (1 − m) via cost on s = 1 − m.
      const allowed = effectiveAllowed(a, activeConstraints);
      if (allowed.length <= 1) continue;
      const m = `m_split_${c.id}`;
      const s = `s_split_${c.id}`;
      variables[m] = { fairness: 0 };
      variables[s] = { fairness: w };
      // s + m ≥ 1
      constraints[`s_split_${c.id}_def`] = { min: 1 };
      variables[s][`s_split_${c.id}_def`] = 1;
      variables[m][`s_split_${c.id}_def`] = 1;
      // m ≤ x for each allowed p:  -x + m ≤ 0
      for (const p of allowed) {
        const k = `s_split_${c.id}_le_${p}`;
        constraints[k] = { max: 0 };
        variables[m][k] = 1;
        variables[`x_${a.id}_${p}`][k] = -1;
      }
      constraints[`s_split_${c.id}_nn`] = { min: 0 };
      variables[s][`s_split_${c.id}_nn`] = 1;
      constraints[`m_split_${c.id}_nn`] = { min: 0 };
      variables[m][`m_split_${c.id}_nn`] = 1;
    }
  }

  const model: LPModel = {
    optimize: 'fairness',
    opType: 'min',
    constraints,
    variables,
  };

  let result;
  try {
    result = solver.Solve(model);
  } catch (err) {
    messages.push(`Solver error: ${(err as Error).message}`);
    return { ok: false, feasible: false, achievedT: NaN, scenario, messages };
  }

  if (!result.feasible) {
    messages.push(
      'The hard constraints cannot all be satisfied at once. Disable or adjust some of them and try again.'
    );
    return { ok: false, feasible: false, achievedT: NaN, scenario, messages };
  }

  // Pull results back. Variables not present in the result are 0.
  const tVal = numVal(result['t']);
  const newAssets = scenario.assets.map((a) => {
    const flex = flexibleAssets.find((f) => f.id === a.id);
    if (!flex) return a;
    const next: Record<PersonId, number> = { lisa: 0, vicky: 0, jackie: 0, alexa: 0 };
    let sum = 0;
    for (const p of PERSON_IDS) {
      const v = numVal(result[`x_${a.id}_${p}`]);
      next[p] = v * 100;
      sum += v * 100;
    }
    if (sum > 0) {
      // Normalise to 100 to absorb rounding noise.
      const factor = 100 / sum;
      for (const p of PERSON_IDS) next[p] = round2(next[p] * factor);
    }
    // Fix rounding so it sums exactly to 100.
    const fixed = fixSumTo100(next);
    return { ...a, allocations: fixed };
  });

  if (tVal > 1) {
    messages.push(
      `Best feasible solution: max deviation € ${Math.round(tVal).toLocaleString('en-CH')}. Perfect equalisation was not possible with the current flexible assets.`
    );
  } else {
    messages.push('Equalisation succeeded. All four people are very close to the goal.');
  }

  return {
    ok: true,
    feasible: true,
    achievedT: tVal,
    scenario: {
      ...scenario,
      assets: newAssets,
      updatedAt: Date.now(),
    },
    messages,
  };
}

function effectiveAllowed(asset: Asset, _constraints: Constraint[]): PersonId[] {
  if (asset.allowedRecipients && asset.allowedRecipients.length > 0) {
    return asset.allowedRecipients;
  }
  return [...PERSON_IDS];
}

function numVal(x: unknown): number {
  if (typeof x === 'number' && isFinite(x)) return x;
  return 0;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

function fixSumTo100(values: Record<PersonId, number>): Record<PersonId, number> {
  const sum = PERSON_IDS.reduce((acc, p) => acc + values[p], 0);
  if (sum === 0) return values;
  const adj: Record<PersonId, number> = { ...values };
  // Find the max contributor and absorb the rounding delta there.
  let maxKey: PersonId = 'lisa';
  for (const p of PERSON_IDS) if (adj[p] > adj[maxKey]) maxKey = p;
  adj[maxKey] = round2(adj[maxKey] + (100 - sum));
  return adj;
}
