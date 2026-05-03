import { PEOPLE, PersonId } from '../types';
import { useStore } from '../state/store';

export function CorrectionList() {
  const corrections = useStore((s) => s.scenarios[s.activeId].corrections);
  const update = useStore((s) => s.updateCorrection);
  const remove = useStore((s) => s.removeCorrection);
  const add = useStore((s) => s.addCorrection);

  return (
    <section className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Corrections</h2>
          <p className="text-xs text-slate-500">
            Optional adjustments per person — historical support, special benefits, or assumptions.
            Active rows count toward the final balance.
          </p>
        </div>
        <button onClick={add} className="btn">+ Correction</button>
      </div>

      <div className="space-y-1.5">
        {corrections.length === 0 && (
          <p className="text-sm text-slate-500">No corrections yet.</p>
        )}
        {corrections.map((c) => (
          <div
            key={c.id}
            className="grid grid-cols-12 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5"
          >
            <input
              type="checkbox"
              checked={c.active}
              className="col-span-1 h-5 w-5 rounded border-slate-300 text-slate-700 focus:ring-slate-500"
              onChange={(e) => update(c.id, (x) => ({ ...x, active: e.target.checked }))}
              title={c.active ? 'Active — counts in balance' : 'Inactive — ignored'}
            />
            <select
              className="field col-span-3 py-1 text-sm md:col-span-2"
              value={c.person}
              onChange={(e) => update(c.id, (x) => ({ ...x, person: e.target.value as PersonId }))}
            >
              {PEOPLE.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input
              className="field col-span-5 py-1 text-sm md:col-span-6"
              placeholder="Note (e.g. free housing, parental support)"
              value={c.note}
              onChange={(e) => update(c.id, (x) => ({ ...x, note: e.target.value }))}
            />
            <div className="relative col-span-3 md:col-span-2">
              <input
                className="field py-1 pr-5 text-right text-sm tabular-nums"
                type="number"
                inputMode="decimal"
                value={c.amount}
                onChange={(e) => update(c.id, (x) => ({ ...x, amount: Number(e.target.value) || 0 }))}
              />
              <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                €
              </span>
            </div>
            <button
              onClick={() => remove(c.id)}
              className="btn-ghost col-span-12 px-2 py-0.5 text-rose-600 hover:bg-rose-50 md:col-span-1"
              title="Remove correction"
              aria-label="Remove correction"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Correction values are assumptions, not legal facts. Useful for fairness discussions —
        verify with a notary or tax adviser before acting on them.
      </div>
    </section>
  );
}
