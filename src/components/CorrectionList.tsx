import { Correction, PEOPLE, PersonId } from '../types';
import { useIsActiveReadOnly, useStore } from '../state/store';
import { SectionIllustration } from './icons/SectionIllustration';
import { toneStyle } from '../lib/tones';

const fmtEuro = (n: number) =>
  '€ ' +
  n.toLocaleString('de-DE', {
    maximumFractionDigits: 0,
  });

export function CorrectionList() {
  const corrections = useStore((s) => s.scenarios[s.activeId].corrections);
  const update = useStore((s) => s.updateCorrection);
  const remove = useStore((s) => s.removeCorrection);
  const add = useStore((s) => s.addCorrection);
  const readOnly = useIsActiveReadOnly();
  const tone = toneStyle('amber');

  return (
    <section
      className="w-full overflow-hidden rounded-lg border shadow-sm"
      style={{ borderColor: tone.border, background: tone.bg }}
    >
      <div className="grid grid-cols-1 gap-0 md:grid-cols-[1fr_auto]">
        <div className="min-w-0 p-3 md:p-4">
          <div className="mb-3 flex items-start gap-3 md:block">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Corrections</h2>
                {!readOnly && (
                  <button onClick={add} className="btn">
                    + Correction
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Optional adjustments per person — historical support, special benefits, or
                assumptions. Grouped by sister; only active rows count toward the final balance.
              </p>
            </div>
            <div
              className="flex w-32 shrink-0 items-center justify-center self-stretch overflow-hidden rounded-md md:hidden"
              style={{ background: tone.imageBg }}
              aria-hidden
            >
              <SectionIllustration
                kind="correction"
                tint={tone.accent}
                className="h-full w-full max-h-24 p-1"
              />
            </div>
          </div>

          {corrections.length === 0 ? (
            <p className="text-sm text-slate-500">No corrections yet.</p>
          ) : (
            <div className="space-y-1.5">
              {PEOPLE.map((p) => {
                const personCorr = corrections.filter((c) => c.person === p.id);
                if (personCorr.length === 0) return null;
                const activeSum = personCorr.reduce(
                  (acc, c) => (c.active ? acc + c.amount : acc),
                  0
                );
                const activeCount = personCorr.filter((c) => c.active).length;
                return (
                  <PersonCorrectionGroup
                    key={p.id}
                    personId={p.id}
                    personName={p.name}
                    colors={p.colors}
                    corrections={personCorr}
                    activeSum={activeSum}
                    activeCount={activeCount}
                    onUpdate={update}
                    onRemove={remove}
                    readOnly={readOnly}
                  />
                );
              })}
            </div>
          )}

          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Correction values are assumptions, not legal facts. Useful for fairness discussions —
            verify with a notary or tax adviser before acting on them.
          </div>
        </div>

        <div
          className="hidden border-l md:block md:w-72"
          style={{ background: tone.imageBg, borderColor: tone.border }}
        >
          <div className="flex h-full items-center justify-center p-3">
            <SectionIllustration
              kind="correction"
              tint={tone.accent}
              className="h-full w-full max-h-44"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function PersonCorrectionGroup({
  personId,
  personName,
  colors,
  corrections,
  activeSum,
  activeCount,
  onUpdate,
  onRemove,
  readOnly,
}: {
  personId: PersonId;
  personName: string;
  colors: { primary: string; accent: string };
  corrections: Correction[];
  activeSum: number;
  activeCount: number;
  onUpdate: (id: string, mut: (c: Correction) => Correction) => void;
  onRemove: (id: string) => void;
  readOnly: boolean;
}) {
  void personId;
  const gradient = `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`;
  const positive = activeSum >= 0;
  return (
    <details className="overflow-hidden rounded-md border-2 bg-white" style={{ borderColor: colors.primary }}>
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: gradient }}
            aria-hidden
          />
          <strong className="text-slate-800">{personName}</strong>
          <span className="text-xs text-slate-500">
            ({activeCount}/{corrections.length} aktiv)
          </span>
        </span>
        <span
          className={`text-xs font-semibold tabular-nums ${
            activeSum === 0
              ? 'text-slate-500'
              : positive
                ? 'text-emerald-700'
                : 'text-rose-700'
          }`}
        >
          {activeSum === 0 ? fmtEuro(0) : `${positive ? '+' : '−'}${fmtEuro(Math.abs(activeSum))}`}
        </span>
      </summary>
      <div className="space-y-1.5 border-t border-slate-200 p-2">
        {corrections.map((c) => (
          <CorrectionRow
            key={c.id}
            correction={c}
            onUpdate={onUpdate}
            onRemove={onRemove}
            readOnly={readOnly}
          />
        ))}
      </div>
    </details>
  );
}

function CorrectionRow({
  correction: c,
  onUpdate,
  onRemove,
  readOnly,
}: {
  correction: Correction;
  onUpdate: (id: string, mut: (c: Correction) => Correction) => void;
  onRemove: (id: string) => void;
  readOnly: boolean;
}) {
  return (
    <div className="grid grid-cols-12 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5">
      <input
        type="checkbox"
        checked={c.active}
        className="col-span-1 h-5 w-5 rounded border-slate-300 text-slate-700 focus:ring-slate-500 disabled:opacity-60"
        onChange={(e) => onUpdate(c.id, (x) => ({ ...x, active: e.target.checked }))}
        title={c.active ? 'Active — counts in balance' : 'Inactive — ignored'}
        disabled={readOnly}
      />
      <select
        className="field col-span-3 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-600 md:col-span-2"
        value={c.person}
        onChange={(e) => onUpdate(c.id, (x) => ({ ...x, person: e.target.value as PersonId }))}
        disabled={readOnly}
      >
        {PEOPLE.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <input
        className="field col-span-5 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-600 md:col-span-6"
        placeholder="Note (e.g. free housing, parental support)"
        value={c.note}
        onChange={(e) => onUpdate(c.id, (x) => ({ ...x, note: e.target.value }))}
        disabled={readOnly}
      />
      <div className="relative col-span-3 md:col-span-2">
        <input
          className="field py-1 pr-5 text-right text-sm tabular-nums disabled:bg-slate-50 disabled:text-slate-600"
          type="number"
          inputMode="decimal"
          value={c.amount}
          onChange={(e) => onUpdate(c.id, (x) => ({ ...x, amount: Number(e.target.value) || 0 }))}
          onFocus={(e) => e.currentTarget.select()}
          disabled={readOnly}
        />
        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
          €
        </span>
      </div>
      {!readOnly && (
        <button
          onClick={() => onRemove(c.id)}
          className="btn-ghost col-span-12 px-2 py-0.5 text-rose-600 hover:bg-rose-50 md:col-span-1"
          title="Remove correction"
          aria-label="Remove correction"
        >
          ×
        </button>
      )}
    </div>
  );
}
