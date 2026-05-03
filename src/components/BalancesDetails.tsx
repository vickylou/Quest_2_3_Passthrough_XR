import { Balances, PEOPLE } from '../types';
import { computeBalances, validateScenario } from '../lib/balances';
import { sumAbsDeviation } from '../lib/fairness';
import { formatEuro, formatEuroCompact, formatSignedEuro } from '../lib/format';
import { useStore } from '../state/store';

export function BalancesDetails({
  balances,
  compact = false,
}: {
  balances?: Balances;
  compact?: boolean;
}) {
  const scenario = useStore((s) => s.scenarios[s.activeId]);
  const b = balances ?? computeBalances(scenario);
  const issues = validateScenario(scenario);

  const Title = ({ children }: { children: React.ReactNode }) => (
    <h2 className={compact ? 'text-sm font-semibold text-slate-700' : 'text-lg font-semibold'}>
      {children}
    </h2>
  );

  return (
    <div className={compact ? 'rounded-md border border-slate-200 bg-white p-3' : 'card'}>
      <Title>Final balance breakdown</Title>
      <p className="mt-1 text-xs text-slate-500">
        Goal per person: {formatEuroCompact(b.equalTarget)}{' '}
        <span className="text-slate-400">
          (without corrections {formatEuroCompact(b.equalTargetWithoutCorrections)})
        </span>
      </p>

      {issues.length > 0 && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <ul className="list-disc pl-4">
            {issues.map((i, idx) => (
              <li key={idx}>{i.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="border-b border-slate-200 py-1 pr-3">Person</th>
              <th className="border-b border-slate-200 py-1 pr-3 text-right">Assets</th>
              <th className="border-b border-slate-200 py-1 pr-3 text-right">Payments</th>
              <th className="border-b border-slate-200 py-1 pr-3 text-right">Corrections</th>
              <th className="border-b border-slate-200 py-1 pr-3 text-right">Total</th>
              <th className="border-b border-slate-200 py-1 pr-3 text-right">Δ vs Goal</th>
            </tr>
          </thead>
          <tbody>
            {PEOPLE.map((p) => (
              <tr key={p.id} className="border-b border-slate-100">
                <td className="py-1 pr-3 font-medium text-slate-700">{p.name}</td>
                <td className="py-1 pr-3 text-right tabular-nums">
                  {formatEuro(b.perPersonAsset[p.id])}
                </td>
                <td className="py-1 pr-3 text-right tabular-nums">
                  {formatSignedEuro(b.perPersonTransfer[p.id])}
                </td>
                <td className="py-1 pr-3 text-right tabular-nums">
                  {formatSignedEuro(b.perPersonCorrection[p.id])}
                </td>
                <td className="py-1 pr-3 text-right font-semibold tabular-nums">
                  {formatEuro(b.perPerson[p.id])}
                </td>
                <td
                  className={`py-1 pr-3 text-right tabular-nums ${
                    b.diff[p.id] >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatSignedEuro(b.diff[p.id])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 md:grid-cols-4">
        <Stat label="Total assets" value={formatEuro(b.totalAssets)} />
        <Stat label="Active corrections" value={formatEuro(b.totalCorrections)} />
        <Stat label="Estate pool" value={formatEuro(b.estatePool)} />
        <Stat label="Σ |Δ|" value={formatEuro(sumAbsDeviation(b))} />
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
