import { useState } from 'react';
import { useStore } from '../state/store';
import { generateSuggestions, Suggestion } from '../solver/suggest';
import { formatEuro } from '../lib/format';
import { uid } from '../lib/format';
import { Scenario } from '../types';

export function SuggestionsPanel() {
  const scenario = useStore((s) => s.scenarios[s.activeId]);
  const replaceAll = useStore((s) => s.replaceAll);
  const all = useStore((s) => s.scenarios);
  const activeId = useStore((s) => s.activeId);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [running, setRunning] = useState(false);

  function run() {
    setRunning(true);
    try {
      const out = generateSuggestions(scenario);
      setSuggestions(out);
    } finally {
      setRunning(false);
    }
  }

  function saveAsScenario(s: Suggestion) {
    const id = uid('scn');
    const sc: Scenario = {
      ...s.scenario,
      id,
      name: s.scenario.name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'draft',
    };
    replaceAll({
      schemaVersion: 1,
      activeId: id,
      mode: 'manual',
      scenarios: { ...all, [id]: sc },
    });
  }

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Vorschläge</h2>
          <p className="text-xs text-slate-500">
            Drei Lösungen mit unterschiedlichen Schwerpunkten. Du kannst eine als neues Szenario speichern.
          </p>
        </div>
        <button className="btn-primary" onClick={run} disabled={running}>
          {running ? 'Berechne…' : 'Vorschläge erzeugen'}
        </button>
      </div>

      {suggestions.length === 0 && (
        <p className="text-sm text-slate-500">
          Klicke "Vorschläge erzeugen", um drei Varianten zu sehen — fair zuerst, ausgewogen, oder Wünsche zuerst.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {suggestions.map((s) => (
          <div
            key={s.id}
            className="rounded-md border border-slate-200 bg-slate-50 p-3"
          >
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-semibold">{s.label}</h3>
              <span className="pill bg-slate-100 text-slate-700">{s.fairness}/100</span>
            </div>
            <p className="mb-2 text-xs text-slate-600">{s.description}</p>
            <ul className="mb-2 space-y-1 text-xs text-slate-700">
              <li>max Δ: {formatEuro(s.maxDev)}</li>
              <li>Σ |Δ|: {formatEuro(s.sumDev)}</li>
              {s.messages.slice(0, 1).map((m, i) => (
                <li key={i} className="text-slate-500">{m}</li>
              ))}
            </ul>
            <button className="btn w-full" onClick={() => saveAsScenario(s)}>
              Als Szenario speichern
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
