import { useMemo } from 'react';
import { PEOPLE, PERSON_IDS } from '../types';
import { useStore } from '../state/store';
import { computeBalances, validateScenario } from '../lib/balances';
import { fairnessScore, maxDeviation, sumAbsDeviation } from '../lib/fairness';
import { formatEuro, formatSignedEuro } from '../lib/format';

export function BalancesPanel() {
  const scenario = useStore((s) => s.scenarios[s.activeId]);

  const balances = useMemo(() => computeBalances(scenario), [scenario]);
  const issues = useMemo(() => validateScenario(scenario), [scenario]);
  const score = fairnessScore(balances);
  const maxDev = maxDeviation(balances);
  const sumDev = sumAbsDeviation(balances);

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Endbilanz</h2>
          <p className="text-xs text-slate-500">
            Ziel pro Person: {formatEuro(balances.equalTarget)} (mit Korrekturen).
            Ohne Korrekturen: {formatEuro(balances.equalTargetWithoutCorrections)}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="pill bg-slate-100 text-slate-700">Fairness {score}/100</span>
          <span className="pill bg-slate-100 text-slate-700">max Δ {formatEuro(maxDev)}</span>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <ul className="list-disc pl-4">
            {issues.map((i, idx) => (
              <li key={idx}>{i.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {PEOPLE.map((person) => {
          const total = balances.perPerson[person.id];
          const diff = balances.diff[person.id];
          const positive = diff >= 0;
          return (
            <div
              key={person.id}
              className="rounded-md border border-slate-200 bg-white p-3"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ background: person.color }}
                  />
                  {person.name}
                </span>
                <span
                  className={`pill ${positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}
                >
                  {formatSignedEuro(diff)}
                </span>
              </div>
              <div className="text-2xl font-semibold tabular-nums">
                {formatEuro(total)}
              </div>
              <div className="mt-1 grid grid-cols-3 gap-1 text-[11px] text-slate-500">
                <span>Vermögen: {formatEuro(balances.perPersonAsset[person.id])}</span>
                <span>Zahl.: {formatSignedEuro(balances.perPersonTransfer[person.id])}</span>
                <span>Korr.: {formatSignedEuro(balances.perPersonCorrection[person.id])}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 md:grid-cols-4">
        <Stat label="Total Vermögen" value={formatEuro(balances.totalAssets)} />
        <Stat label="Aktive Korrekturen" value={formatEuro(balances.totalCorrections)} />
        <Stat label="Pool" value={formatEuro(balances.estatePool)} />
        <Stat label="Σ |Δ|" value={formatEuro(sumDev)} />
      </div>

      {/* Sticky bottom strip on mobile for at-a-glance balances */}
      <div className="mt-4 flex flex-wrap gap-2 md:hidden">
        {PERSON_IDS.map((p) => {
          const person = PEOPLE.find((x) => x.id === p)!;
          return (
            <span
              key={p}
              className="pill text-xs"
              style={{ background: person.color, color: 'white' }}
            >
              {person.name} {formatEuro(balances.perPerson[p])}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="font-semibold text-slate-700">{value}</div>
    </div>
  );
}
