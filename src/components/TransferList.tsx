import { PEOPLE, PersonId, Transfer, TransferSource } from '../types';
import { useIsActiveReadOnly, useStore } from '../state/store';
import { SectionIllustration } from './icons/SectionIllustration';
import { MoveButtons } from './MoveButtons';
import { toneStyle } from '../lib/tones';

const SOURCE_OPTIONS: { value: NonNullable<TransferSource>; label: string }[] = [
  ...PEOPLE.map((p) => ({ value: p.id as NonNullable<TransferSource>, label: p.name })),
  { value: 'mum', label: 'Mum' },
  { value: 'dad', label: 'Dad' },
  { value: 'mum_and_dad', label: 'Mum & Dad' },
];

// Vicky is shown first because this is her instance of the calculator;
// the other three follow in their original order.
const SISTERS_VICKY_FIRST = (() => {
  const vicky = PEOPLE.find((p) => p.id === 'vicky')!;
  const others = PEOPLE.filter((p) => p.id !== 'vicky');
  return [vicky, ...others];
})();

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
  const move = useStore((s) => s.moveTransfer);
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
                <h2 className="text-lg font-semibold">Direct payments to</h2>
                {!readOnly && (
                  <button onClick={() => add()} className="btn">
                    + Payment
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Grouped by recipient — each sister's section shows payments she received. Each row
                still shows the sender (Lisa, Vicky, Jackie, Alexa, Mum, Dad, or Mum &amp; Dad).
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

          <div className="space-y-1.5">
            {SISTERS_VICKY_FIRST.map((p) => {
              const personTransfers = transfers.filter((t) => t.to === p.id);
              const incoming = personTransfers.reduce((acc, t) => acc + t.amount, 0);
              const activeIncoming = personTransfers.reduce(
                (acc, t) => (t.active !== false ? acc + t.amount : acc),
                0
              );
              const activeCount = personTransfers.filter(
                (t) => t.active !== false
              ).length;
              return (
                <PersonTransferGroup
                  key={p.id}
                  personId={p.id}
                  personName={p.name}
                  colors={p.colors}
                  transfers={personTransfers}
                  incoming={incoming}
                  activeIncoming={activeIncoming}
                  activeCount={activeCount}
                  onAdd={() => add(p.id)}
                  onUpdate={update}
                  onRemove={remove}
                  onMove={move}
                  readOnly={readOnly}
                />
              );
            })}
          </div>
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
  incoming,
  activeIncoming,
  activeCount,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
  readOnly,
}: {
  personId: PersonId;
  personName: string;
  colors: { primary: string; accent: string };
  transfers: Transfer[];
  incoming: number;
  activeIncoming: number;
  activeCount: number;
  onAdd: () => void;
  onUpdate: (id: string, mut: (t: Transfer) => Transfer) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  readOnly: boolean;
}) {
  void personId;
  void incoming;
  const gradient = `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`;
  return (
    <details
      className="overflow-hidden rounded-md border-2 bg-white"
      style={{ borderColor: colors.primary }}
    >
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: gradient }}
            aria-hidden
          />
          <strong className="text-slate-800">{personName}</strong>
          <span className="text-xs text-slate-500">
            ({activeCount}/{transfers.length} active)
          </span>
        </span>
        <span
          className={`text-xs font-semibold tabular-nums ${
            activeIncoming > 0 ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          +{fmtEuro(activeIncoming)}
        </span>
      </summary>
      <div className="space-y-1.5 border-t border-slate-200 p-2">
        {transfers.length === 0 && (
          <p className="text-xs italic text-slate-400">Noch keine Zahlungen an {personName}.</p>
        )}
        {transfers.map((t, idx) => (
          <TransferRow
            key={t.id}
            transfer={t}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onMoveUp={() => onMove(t.id, 'up')}
            onMoveDown={() => onMove(t.id, 'down')}
            canMoveUp={idx > 0}
            canMoveDown={idx < transfers.length - 1}
            readOnly={readOnly}
          />
        ))}
        {!readOnly && (
          <button
            type="button"
            onClick={onAdd}
            className="btn btn-compact w-full justify-center"
          >
            + Payment to {personName}
          </button>
        )}
      </div>
    </details>
  );
}

function TransferRow({
  transfer: t,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  readOnly,
}: {
  transfer: Transfer;
  onUpdate: (id: string, mut: (t: Transfer) => Transfer) => void;
  onRemove: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  readOnly: boolean;
}) {
  const isActive = t.active !== false;
  return (
    <div className="space-y-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5">
      {/* Description gets its own full-width row so longer notes have room.
          The ▲▼ controls sit at the right edge so they don't compete with
          the inputs in the controls row below. */}
      <div className="flex items-center gap-1">
        <input
          className="field flex-1 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-600"
          placeholder="Description (e.g. emergency support after divorce)"
          value={t.name}
          onChange={(e) => onUpdate(t.id, (x) => ({ ...x, name: e.target.value }))}
          disabled={readOnly}
        />
        {!readOnly && (
          <MoveButtons
            onUp={onMoveUp}
            onDown={onMoveDown}
            canUp={canMoveUp}
            canDown={canMoveDown}
            label="payment"
          />
        )}
      </div>
      <div className="grid grid-cols-12 items-center gap-2">
        <input
          type="checkbox"
          checked={isActive}
          className="col-span-1 h-5 w-5 rounded border-slate-300 text-slate-700 focus:ring-slate-500 disabled:opacity-60"
          onChange={(e) => onUpdate(t.id, (x) => ({ ...x, active: e.target.checked }))}
          title={isActive ? 'Active — counts in balance' : 'Inactive — ignored'}
          disabled={readOnly}
        />
        <select
          className="field col-span-4 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-600 md:col-span-3"
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
        <div className="relative col-span-2 md:col-span-4">
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
    </div>
  );
}
