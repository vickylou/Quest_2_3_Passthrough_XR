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

export function StickyBalanceBar({ headerHidden = false }: { headerHidden?: boolean }) {
  const scenario = useStore((s) => s.scenarios[s.activeId]);
  const balances = useMemo(() => computeBalances(scenario), [scenario]);
  const [expanded, setExpanded] = useState(false);

  const score = fairnessScore(balances);
  const maxDev = maxDeviation(balances);

  // When the header collapses on mobile, slide the bar up to fill the gap;
  // on md+ the header doesn't collapse so the bar stays anchored just below
  // it like before.
  const stickTop = headerHidden ? 'top-0 md:top-[60px]' : 'top-[44px] md:top-[60px]';

  return (
    <div
      className={`sticky z-20 border-b border-indigo-200 bg-indigo-50/95 backdrop-blur transition-[top] duration-200 ${stickTop}`}
      data-pdf-capture="balance-bar"
    >
      <div className="mx-auto max-w-6xl px-3 py-2 md:px-6">
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
          {PEOPLE.map((p) => (
            <SisterChip
              key={p.id}
              personId={p.id}
              total={balances.perPerson[p.id]}
              diff={balances.diff[p.id]}
              expanded={expanded}
              onToggle={() => setExpanded((v) => !v)}
            />
          ))}
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
            max Δ <span className="tabular-nums text-slate-800">{formatEuroCompact(maxDev)}</span>
          </span>
          <span>
            Fairness <span className="font-semibold text-slate-800">{score}/100</span>
          </span>
          <button
            className="btn-ghost px-2 py-0.5 text-xs"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? '▴ Hide breakdown' : '▾ Show breakdown'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SisterChip({
  personId,
  total,
  diff,
  expanded,
  onToggle,
}: {
  personId: PersonId;
  total: number;
  diff: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const person = PEOPLE.find((p) => p.id === personId)!;
  const positive = diff >= 0;
  const gradient = `linear-gradient(135deg, ${person.colors.primary}, ${person.colors.accent})`;

  return (
    <div
      className="min-w-0 overflow-hidden rounded-lg p-[2px]"
      style={{ background: gradient }}
    >
      <div className="overflow-hidden rounded-[7px] bg-white">
        {/* Tight stacked layout on phone: name on top, total below, diff
            and arrow on a third row. Each row is its own block so a long
            value can't push a sibling off the edge of the chip. */}
        <button
          className="flex w-full min-w-0 flex-col items-start gap-0 px-1.5 py-1 text-left focus:outline-none focus:ring-2 focus:ring-slate-400 md:flex-row md:items-center md:justify-between md:gap-1 md:px-3 md:py-1.5"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`chip-${personId}-detail`}
        >
          <div className="min-w-0 max-w-full md:flex-1">
            <div className="text-[9px] font-medium uppercase tracking-wide text-slate-500">
              {person.name}
            </div>
            <div className="truncate text-sm font-semibold tabular-nums text-slate-800 md:text-lg">
              {formatEuroCompact(total)}
            </div>
          </div>
          <div className="mt-0.5 flex w-full min-w-0 items-center justify-between gap-1 md:mt-0 md:w-auto md:flex-col md:items-end md:gap-0.5">
            <span
              className={`pill truncate max-w-full text-[9px] tabular-nums md:text-[10px] ${
                positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {formatSignedEuroCompact(diff)}
            </span>
            <span className="shrink-0 text-[10px] text-slate-400">{expanded ? '▴' : '▾'}</span>
          </div>
        </button>

        {expanded && (
          <div
            id={`chip-${personId}-detail`}
            className="border-t border-slate-200 px-2 pb-2 pt-1.5"
          >
            <ChipBreakdown personId={personId} />
          </div>
        )}
      </div>
    </div>
  );
}

function ChipBreakdown({ personId }: { personId: PersonId }) {
  const scenario = useStore((s) => s.scenarios[s.activeId]);
  const breakdown = useMemo(
    () => computePersonBreakdown(scenario, personId),
    [scenario, personId]
  );

  return (
    <div className="space-y-1.5 text-xs">
      {breakdown.perAsset.length > 0 && (
        <Section title="From assets">
          {breakdown.perAsset.map((a) => {
            const tone = toneStyle(a.tone);
            return (
              <Line
                key={a.assetId}
                label={a.assetName}
                hint={`${a.percent.toFixed(2)} %`}
                amount={a.amount}
                swatch={tone.accent}
              />
            );
          })}
        </Section>
      )}

      {(breakdown.transfersIn.length > 0 || breakdown.transfersOut.length > 0) && (
        <Section title="Direct payments">
          {breakdown.transfersIn.map((t) => (
            <Line
              key={t.id}
              label={t.name}
              hint={`from ${t.from ? SOURCE_LABEL[t.from] : 'Mum & Dad'}`}
              amount={t.amount}
            />
          ))}
          {breakdown.transfersOut.map((t) => (
            <Line key={t.id} label={t.name} hint={`to ${SOURCE_LABEL[t.to]}`} amount={-t.amount} />
          ))}
        </Section>
      )}

      {breakdown.corrections.length > 0 && (
        <Section title="Active corrections">
          {breakdown.corrections.map((c) => (
            <Line key={c.id} label={c.note || '(no note)'} amount={c.amount} />
          ))}
        </Section>
      )}

      <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatEuro(breakdown.total)}</span>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-0.5 text-[9px] uppercase tracking-wide text-slate-500">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Line({
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
    <div className="flex items-center justify-between gap-1 rounded bg-slate-50 px-1.5 py-0.5 text-[11px]">
      <span className="flex min-w-0 items-center gap-1 truncate text-slate-700">
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
