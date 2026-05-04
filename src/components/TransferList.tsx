import { PEOPLE, PersonId, Transfer, TransferSource } from '../types';
import { useIsActiveReadOnly, useStore } from '../state/store';
import { SectionIllustration } from './icons/SectionIllustration';
import { toneStyle } from '../lib/tones';

const SOURCE_OPTIONS: { value: NonNullable<TransferSource>; label: string }[] = [
  ...PEOPLE.map((p) => ({ value: p.id as NonNullable<TransferSource>, label: p.name })),
  { value: 'mum', label: 'Mum' },
  { value: 'dad', label: 'Dad' },
  { value: 'mum_and_dad', label: 'Mum & Dad' },
];

const fmtEuro = (n: number) =>
  '€ ' +
  n.toLocaleString('de-DE', {
    maximumFractionDigits: 0,
  });

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
      <div className="grid grid-cols-1 gap-0 md:grid-cols-[1fr_auto]">
        <div className="min-w-0 p-3 md:p-4">
          <div className="mb-3 flex items-start gap-3 md:block">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Direct payments</h2>
                {!readOnly && (
                  <button onClick={add} className="btn">
                    + Payment
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Money flowing between people (equalisation payments, parental support, etc.).
                Grouped by sister — each sister's section shows payments where she is the sender or
                the receiver.
              </p>
            </div>
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

          {transfers.length === 0 ? (
            <p className="text-sm text-slate-500">No payments recorded yet.</p>
          ) : (
            <div className="space-y-1.5">
              {PEOPLE.map((p) => {
                const personTransfers = transfers.filter(
                  (t) => t.from === p.id || t.to === p.id
                );
                if (personTransfers.length === 0) return null;
                const net = personTransfers.reduce((acc, t) => {
                  if (t.to === p.id) return acc + t.amount;
                  if (t.from === p.id) return acc - t.amount;
                  return acc;
                }, 0);
                return (
                  <PersonTransferGroup
                    key={p.id}
                    personId={p.id}
                    personName={p.name}
                    colors={p.colors}
                    transfers={personTransfers}
                    net={net}
                    onUpdate={update}
                    onRemove={remove}
                    readOnly={readOnly}
                  />
                );
              })}
              {/* Transfers that don't involve any sister (e.g. mum→dad, or
                  intra-parent flows). Rare but render so they aren't lost. */}
              {(() => {
                const orphan = transfers.filter(
                  (t) =>
                    !PEOPLE.some((p) => t.from === p.id || t.to === p.id)
                );
                if (orphan.length === 0) return null;
                return (
                  <details className="rounded-md border border-slate-200 bg-white">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-700">
                      Andere ({orphan.length})
                    </summary>
                    <div className="space-y-1.5 border-t border-slate-200 p-2">
                      {orphan.map((t) => (
                        <TransferRow
                          key={t.id}
                          transfer={t}
                          onUpdate={update}
                          onRemove={remove}
                          readOnly={readOnly}
                        />
                      ))}
                    </div>
                  </details>
                );
              })()}
            </div>
          )}
        </div>

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

function PersonTransferGroup({
  personId,
  personName,
  colors,
  transfers,
  net,
  onUpdate,
  onRemove,
  readOnly,
}: {
  personId: PersonId;
  personName: string;
  colors: { primary: string; accent: string };
  transfers: Transfer[];
  net: number;
  onUpdate: (id: string, mut: (t: Transfer) => Transfer) => void;
  onRemove: (id: string) => void;
  readOnly: boolean;
}) {
  void personId;
  const gradient = `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`;
  const positive = net >= 0;
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
          <span className="text-xs text-slate-500">({transfers.length})</span>
        </span>
        <span
          className={`text-xs font-semibold tabular-nums ${
            positive ? 'text-emerald-700' : 'text-rose-700'
          }`}
        >
          {positive ? '+' : '−'}
          {fmtEuro(Math.abs(net))}
        </span>
      </summary>
      <div className="space-y-1.5 border-t border-slate-200 p-2">
        {transfers.map((t) => (
          <TransferRow
            key={t.id}
            transfer={t}
            onUpdate={onUpdate}
            onRemove={onRemove}
            readOnly={readOnly}
          />
        ))}
      </div>
    </details>
  );
}

function TransferRow({
  transfer: t,
  onUpdate,
  onRemove,
  readOnly,
}: {
  transfer: Transfer;
  onUpdate: (id: string, mut: (t: Transfer) => Transfer) => void;
  onRemove: (id: string) => void;
  readOnly: boolean;
}) {
  return (
    <div className="grid grid-cols-12 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5">
      <input
        className="field col-span-12 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-600 md:col-span-4"
        placeholder="Description"
        value={t.name}
        onChange={(e) => onUpdate(t.id, (x) => ({ ...x, name: e.target.value }))}
        disabled={readOnly}
      />
      <select
        className="field col-span-5 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-600 md:col-span-2"
        value={t.from ?? 'mum_and_dad'}
        onChange={(e) =>
          onUpdate(t.id, (x) => ({ ...x, from: e.target.value as TransferSource }))
        }
        title="From"
        disabled={readOnly}
      >
        {SOURCE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="col-span-1 text-center text-slate-400">→</span>
      <select
        className="field col-span-3 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-600 md:col-span-2"
        value={t.to}
        onChange={(e) => onUpdate(t.id, (x) => ({ ...x, to: e.target.value as PersonId }))}
        title="To"
        disabled={readOnly}
      >
        {PEOPLE.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="relative col-span-2 md:col-span-2">
        <input
          className="field py-1 pr-5 text-right text-sm tabular-nums disabled:bg-slate-50 disabled:text-slate-600"
          type="number"
          inputMode="decimal"
          value={t.amount}
          onChange={(e) =>
            onUpdate(t.id, (x) => ({ ...x, amount: Number(e.target.value) || 0 }))
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
          onClick={() => onRemove(t.id)}
          className="btn-ghost col-span-1 px-2 py-0.5 text-rose-600 hover:bg-rose-50"
          aria-label="Remove payment"
          title="Remove payment"
        >
          ×
        </button>
      )}
    </div>
  );
}
