import { PEOPLE, PersonId, TransferSource } from '../types';
import { useIsActiveReadOnly, useStore } from '../state/store';
import { SectionIllustration } from './icons/SectionIllustration';
import { toneStyle } from '../lib/tones';

const SOURCE_OPTIONS: { value: NonNullable<TransferSource>; label: string }[] = [
  ...PEOPLE.map((p) => ({ value: p.id as NonNullable<TransferSource>, label: p.name })),
  { value: 'mum', label: 'Mum' },
  { value: 'dad', label: 'Dad' },
  { value: 'mum_and_dad', label: 'Mum & Dad' },
];

export function TransferList() {
  const transfers = useStore((s) => s.scenarios[s.activeId].transfers);
  const update = useStore((s) => s.updateTransfer);
  const remove = useStore((s) => s.removeTransfer);
  const add = useStore((s) => s.addTransfer);
  const readOnly = useIsActiveReadOnly();
  const tone = toneStyle('violet');

  return (
    <section
      className="w-full overflow-hidden rounded-lg border shadow-sm"
      style={{ borderColor: tone.border, background: tone.bg }}
    >
      {/* Same outer grid as the asset cards: single column on phone with
          an inline mobile illustration in the top-right; two-column on
          md+ with a full-height illustration well on the right. */}
      <div className="grid grid-cols-1 gap-0 md:grid-cols-[1fr_auto]">
        <div className="min-w-0 p-3 md:p-4">
          <div className="mb-3 flex items-start gap-3 md:block">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Direct payments</h2>
                {!readOnly && <button onClick={add} className="btn">+ Payment</button>}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Money flowing between people (equalisation payments, parental support, etc.). When
                the sender is one of the four sisters her balance shrinks; Mum / Dad senders are
                external.
              </p>
            </div>
            {/* Mobile-only illustration in the top-right corner */}
            <div
              className="flex w-32 shrink-0 items-center justify-center self-stretch overflow-hidden rounded-md md:hidden"
              style={{ background: tone.imageBg }}
              aria-hidden
            >
              <SectionIllustration
                kind="transfer"
                tint={tone.accent}
                className="h-full w-full max-h-24 p-1"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            {transfers.length === 0 && (
              <p className="text-sm text-slate-500">No payments recorded yet.</p>
            )}
            {transfers.map((t) => (
              <div
                key={t.id}
                className="grid grid-cols-12 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5"
              >
                <input
                  className="field col-span-12 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-600 md:col-span-4"
                  placeholder="Description"
                  value={t.name}
                  onChange={(e) => update(t.id, (x) => ({ ...x, name: e.target.value }))}
                  disabled={readOnly}
                />
                <select
                  className="field col-span-5 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-600 md:col-span-2"
                  value={t.from ?? 'mum_and_dad'}
                  onChange={(e) =>
                    update(t.id, (x) => ({ ...x, from: e.target.value as TransferSource }))
                  }
                  title="From"
                  disabled={readOnly}
                >
                  {SOURCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span className="col-span-1 text-center text-slate-400">→</span>
                <select
                  className="field col-span-3 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-600 md:col-span-2"
                  value={t.to}
                  onChange={(e) => update(t.id, (x) => ({ ...x, to: e.target.value as PersonId }))}
                  title="To"
                  disabled={readOnly}
                >
                  {PEOPLE.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <div className="relative col-span-2 md:col-span-2">
                  <input
                    className="field py-1 pr-5 text-right text-sm tabular-nums disabled:bg-slate-50 disabled:text-slate-600"
                    type="number"
                    inputMode="decimal"
                    value={t.amount}
                    onChange={(e) =>
                      update(t.id, (x) => ({ ...x, amount: Number(e.target.value) || 0 }))
                    }
                    onFocus={(e) => e.currentTarget.select()}
                    disabled={readOnly}
                  />
                  <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                    €
                  </span>
                </div>
                {!readOnly && (
                  <button
                    onClick={() => remove(t.id)}
                    className="btn-ghost col-span-1 px-2 py-0.5 text-rose-600 hover:bg-rose-50"
                    aria-label="Remove payment"
                    title="Remove payment"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Desktop-only full-height illustration well */}
        <div
          className="hidden border-l md:block md:w-72"
          style={{ background: tone.imageBg, borderColor: tone.border }}
        >
          <div className="flex h-full items-center justify-center p-3">
            <SectionIllustration
              kind="transfer"
              tint={tone.accent}
              className="h-full w-full max-h-44"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
