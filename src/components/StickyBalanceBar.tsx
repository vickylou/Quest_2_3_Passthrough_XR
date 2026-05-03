import { useMemo, useState } from 'react';
import { PEOPLE, PersonId, TransferSource } from '../types';
import { useStore } from '../state/store';
import { computeBalances, computePersonBreakdown } from '../lib/balances';
import { fairnessScore, maxDeviation } from '../lib/fairness';
import {
  formatEuro,
  formatEuroCompact,
  formatSignedEuro,
  formatSignedEuroCompact,
} from '../lib/format';
import { toneStyle } from '../lib/tones';

const SOURCE_LABEL: Record<NonNullable<TransferSource>, string> = {
  lisa: 'Lisa',
  vicky: 'Vicky',
  jackie: 'Jackie',
  alexa: 'Alexa',
  mum: 'Mum',
  dad: 'Dad',
  mum_and_dad: 'Mum & Dad',
};

export function StickyBalanceBar() {
  const scenario = useStore((s) => s.scenarios[s.activeId]);
  const balances = useMemo(() => computeBalances(scenario), [scenario]);
  const [openId, setOpenId] = useState<PersonId | null>(null);

  const score = fairnessScore(balances);
  const maxDev = maxDeviation(balances);

  return (
    <div
      className="sticky top-[56px] z-20 border-b border-slate-200 bg-white/95 backdrop-blur md:top-[60px]"
      data-pdf-capture="balance-bar"
    >
      <div className="mx-auto max-w-6xl px-3 py-2 md:px-6">
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
          {PEOPLE.map((p) => {
            const total = balances.perPerson[p.id];
            const diff = balances.diff[p.id];
            const isOpen = openId === p.id;
            return (
              <button
                key={p.id}
                className="rounded-lg p-[2px] text-left transition focus:outline-none focus:ring-2 focus:ring-slate-400"
                style={{
                  background: `linear-gradient(135deg, ${p.colors.primary}, ${p.colors.accent})`,
                }}
                onClick={() => setOpenId(isOpen ? null : p.id)}
                aria-expanded={isOpen}
                aria-controls={`breakdown-${p.id}`}
              >
                <div className="flex items-center justify-between rounded-[7px] bg-white px-3 py-1.5">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                      {p.name}
                    </div>
                    <div className="text-base font-semibold tabular-nums text-slate-800 md:text-lg">
                      {formatEuroCompact(total)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span
                      className={`pill text-[10px] tabular-nums ${
                        diff >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {formatSignedEuroCompact(diff)}
                    </span>
                    <span className="text-[10px] text-slate-400">{isOpen ? '▴' : '▾'}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Goal / fairness strip */}
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span>
            Goal{' '}
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
        </div>

        {/* Per-sister expansion */}
        {openId && (
          <PersonBreakdownPanel
            id={`breakdown-${openId}`}
            personId={openId}
            onClose={() => setOpenId(null)}
          />
        )}
      </div>
    </div>
  );
}

function PersonBreakdownPanel({
  id,
  personId,
  onClose,
}: {
  id: string;
  personId: PersonId;
  onClose: () => void;
}) {
  const scenario = useStore((s) => s.scenarios[s.activeId]);
  const breakdown = useMemo(
    () => computePersonBreakdown(scenario, personId),
    [scenario, personId]
  );
  const person = PEOPLE.find((p) => p.id === personId)!;

  return (
    <div
      id={id}
      className="mt-2 rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${person.colors.primary}, ${person.colors.accent})`,
            }}
            aria-hidden
          />
          {person.name}'s breakdown
        </h3>
        <button onClick={onClose} className="btn-ghost px-2 py-0.5 text-xs">
          Close
        </button>
      </div>

      <div className="space-y-2">
        {breakdown.perAsset.length > 0 && (
          <Row title="From assets">
            {breakdown.perAsset.map((a) => {
              const tone = toneStyle(a.tone);
              return (
                <BreakdownLine
                  key={a.assetId}
                  label={a.assetName}
                  hint={`${a.percent.toFixed(2)} %`}
                  amount={a.amount}
                  swatch={tone.accent}
                />
              );
            })}
          </Row>
        )}

        {(breakdown.transfersIn.length > 0 || breakdown.transfersOut.length > 0) && (
          <Row title="Direct payments">
            {breakdown.transfersIn.map((t) => (
              <BreakdownLine
                key={t.id}
                label={t.name}
                hint={`from ${t.from ? SOURCE_LABEL[t.from] : 'Mum & Dad'}`}
                amount={t.amount}
              />
            ))}
            {breakdown.transfersOut.map((t) => {
              const toLabel = SOURCE_LABEL[t.to];
              return (
                <BreakdownLine
                  key={t.id}
                  label={t.name}
                  hint={`to ${toLabel}`}
                  amount={-t.amount}
                />
              );
            })}
          </Row>
        )}

        {breakdown.corrections.length > 0 && (
          <Row title="Active corrections">
            {breakdown.corrections.map((c) => (
              <BreakdownLine key={c.id} label={c.note} amount={c.amount} />
            ))}
          </Row>
        )}

        <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatEuro(breakdown.total)}</span>
        </div>
      </div>
    </div>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function BreakdownLine({
  label,
  hint,
  amount,
  swatch,
}: {
  label: string;
  hint?: string;
  amount: number;
  swatch?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1 text-xs">
      <span className="flex min-w-0 items-center gap-1.5 truncate text-slate-700">
        {swatch && (
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ background: swatch }}
            aria-hidden
          />
        )}
        <span className="truncate">{label}</span>
        {hint && <span className="shrink-0 text-slate-400">· {hint}</span>}
      </span>
      <span
        className={`shrink-0 tabular-nums ${
          amount >= 0 ? 'text-slate-700' : 'text-rose-700'
        }`}
      >
        {amount >= 0 ? formatEuro(amount) : formatSignedEuro(amount)}
      </span>
    </div>
  );
}
