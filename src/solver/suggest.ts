import { Scenario } from '../types';
import { computeBalances } from '../lib/balances';
import { fairnessScore, maxDeviation, sumAbsDeviation } from '../lib/fairness';
import { equalize } from './equalize';

export interface Suggestion {
  id: string;
  label: string;
  description: string;
  scenario: Scenario;
  achievedT: number;
  fairness: number;
  maxDev: number;
  sumDev: number;
  messages: string[];
}

/**
 * Generates three suggestions by running the equalizer with different
 * weight profiles:
 *   - "Fair" prioritises fairness over preferences.
 *   - "Wunsch" prioritises soft constraints (preferences) over fairness.
 *   - "Ausgewogen" balances them.
 */
export function generateSuggestions(scenario: Scenario): Suggestion[] {
  const profiles: Array<{
    id: string;
    label: string;
    description: string;
    fairnessWeight: number;
    softWeightMultiplier: number;
  }> = [
    {
      id: 'fair',
      label: 'Fair zuerst',
      description: 'Maximiere Gleichheit – Wünsche zählen weniger.',
      fairnessWeight: 4,
      softWeightMultiplier: 1,
    },
    {
      id: 'balanced',
      label: 'Ausgewogen',
      description: 'Gleichheit und Wünsche gleich gewichten.',
      fairnessWeight: 2,
      softWeightMultiplier: 2,
    },
    {
      id: 'preference',
      label: 'Wünsche zuerst',
      description: 'Wünsche wichtiger als perfekte Gleichheit.',
      fairnessWeight: 1,
      softWeightMultiplier: 5,
    },
  ];

  return profiles.map((profile) => {
    const r = equalize(scenario, {
      fairnessWeight: profile.fairnessWeight,
      softWeightMultiplier: profile.softWeightMultiplier,
    });
    const balances = computeBalances(r.scenario);
    return {
      id: profile.id,
      label: profile.label,
      description: profile.description,
      scenario: { ...r.scenario, name: `${scenario.name} – ${profile.label}` },
      achievedT: r.achievedT,
      fairness: fairnessScore(balances),
      maxDev: maxDeviation(balances),
      sumDev: sumAbsDeviation(balances),
      messages: r.messages,
    };
  });
}
