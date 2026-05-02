import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { computeBalances } from '../lib/balances';
import { fairnessScore, maxDeviation, sumAbsDeviation } from '../lib/fairness';
import { PEOPLE } from '../types';
import { formatEuro, formatSignedEuro } from '../lib/format';
import { exportComparePDF } from '../lib/pdf';

export function CompareView({ onClose }: { onClose: () => void }) {
  const all = useStore((s) => s.scenarios);
  const ids = Object.keys(all);
  const [selected, setSelected] = useState<string[]>(ids.slice(0, Math.min(3, ids.length)));

  const rows = useMemo(
    () =>
      selected.map((id) => {
        const sc = all[id];
        const b = computeBalances(sc);
        return {
          id,
          name: sc.name,
          status: sc.status,
          balances: b,
          fairness: fairnessScore(b),
          maxDev: maxDeviation(b),
          sumDev: sumAbsDeviation(b),
        };
      }),
    [selected, all]
  );

  const minMax = Math.min(...rows.map((r) => r.maxDev));

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-3 md:p-6">
      <div className="card w-full max-w-5xl">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Szenarien vergleichen</h2>
            <p className="text-xs text-slate-500">Bis zu 4 Szenarien nebeneinander.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn"
              onClick={() => exportComparePDF(rows.map((r) => all[r.id]))}
              disabled={rows.length === 0}
            >
              Vergleich als PDF
            </button>
            <button className="btn" onClick={onClose}>
              Schliessen
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {ids.map((id) => {
            const isSel = selected.includes(id);
            return (
              <button
                key={id}
                className={`pill ${isSel ? 'bg-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-600'}`}
                onClick={() => {
                  if (isSel) {
                    setSelected(selected.filter((x) => x !== id));
                  } else if (selected.length < 4) {
                    setSelected([...selected, id]);
                  }
                }}
              >
                {all[id].name}
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left">
                <th className="border-b py-2 pr-3"> </th>
                {rows.map((r) => (
                  <th key={r.id} className="border-b py-2 pr-3">
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-[10px] text-slate-500">{r.status}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PEOPLE.map((p) => (
                <tr key={p.id}>
                  <td className="border-b py-2 pr-3 font-medium">{p.name}</td>
                  {rows.map((r) => {
                    const total = r.balances.perPerson[p.id];
                    const diff = r.balances.diff[p.id];
                    return (
                      <td key={r.id} className="border-b py-2 pr-3 tabular-nums">
                        <div>{formatEuro(total)}</div>
                        <div className={`text-xs ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatSignedEuro(diff)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td className="border-b py-2 pr-3 font-medium">Ziel pro Person</td>
                {rows.map((r) => (
                  <td key={r.id} className="border-b py-2 pr-3 tabular-nums">
                    {formatEuro(r.balances.equalTarget)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-b py-2 pr-3 font-medium">max Δ</td>
                {rows.map((r) => (
                  <td
                    key={r.id}
                    className={`border-b py-2 pr-3 tabular-nums ${r.maxDev === minMax ? 'bg-emerald-50 font-semibold' : ''}`}
                  >
                    {formatEuro(r.maxDev)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-b py-2 pr-3 font-medium">Σ |Δ|</td>
                {rows.map((r) => (
                  <td key={r.id} className="border-b py-2 pr-3 tabular-nums">
                    {formatEuro(r.sumDev)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border-b py-2 pr-3 font-medium">Fairness</td>
                {rows.map((r) => (
                  <td key={r.id} className="border-b py-2 pr-3">
                    <span className="pill bg-slate-100 text-slate-700">{r.fairness}/100</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
