import { useMemo, useState } from 'react';
import { PEOPLE, PERSON_IDS } from '../types';
import { useStore } from '../state/store';
import { computeBalances } from '../lib/balances';
import { fairnessScore, maxDeviation } from '../lib/fairness';
import { formatEuroCompact, formatSignedEuroCompact } from '../lib/format';
import { BalancesDetails } from './BalancesDetails';

export function StickyBalanceBar() {
  const scenario = useStore((s) => s.scenarios[s.activeId]);
  const balances = useMemo(() => computeBalances(scenario), [scenario]);
  const [open, setOpen] = useState(false);

  const score = fairnessScore(balances);
  const maxDev = maxDeviation(balances);

  return (
    <div className="sticky top-[56px] z-20 border-b border-slate-200 bg-white/95 backdrop-blur md:top-[64px]">
      <div className="mx-auto max-w-6xl px-3 py-2 md:px-6">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {PEOPLE.map((p) => {
            const total = balances.perPerson[p.id];
            const diff = balances.diff[p.id];
            const positive = diff >= 0;
            return (
              <div
                key={p.id}
                className="rounded-lg p-[2px]"
                style={{
                  background: `linear-gradient(135deg, ${p.colors.primary}, ${p.colors.accent})`,
                }}
              >
                <div className="flex items-center justify-between rounded-[7px] bg-white px-3 py-2">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      {p.name}
                    </div>
                    <div className="text-base font-semibold tabular-nums text-slate-800 md:text-lg">
                      {formatEuroCompact(total)}
                    </div>
                  </div>
                  <span
                    className={`pill text-[10px] tabular-nums ${
                      positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {formatSignedEuroCompact(diff)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span>
            Goal per person:{' '}
            <span className="font-semibold tabular-nums text-slate-800">
              {formatEuroCompact(balances.equalTarget)}
            </span>
          </span>
          <span className="hidden sm:inline">
            max Δ{' '}
            <span className="tabular-nums text-slate-800">{formatEuroCompact(maxDev)}</span>
          </span>
          <span>
            Fairness <span className="font-semibold text-slate-800">{score}/100</span>
          </span>
          <button
            className="btn-ghost px-2 py-0.5 text-xs"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            {open ? '▴ Hide details' : '▾ Details'}
          </button>
        </div>

        {open && (
          <div className="mt-2">
            <BalancesDetails balances={balances} compact />
          </div>
        )}
      </div>
      {/* Mobile-only quick chips for at-a-glance balance while details are closed */}
      <div className="mx-auto hidden max-w-6xl px-3 pb-2 md:hidden">
        <div className="flex flex-wrap gap-1">
          {PERSON_IDS.map((p) => (
            <span key={p} className="pill bg-slate-100 text-[10px] text-slate-600">
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
