import { PEOPLE, PersonId } from '../types';
import { useStore } from '../state/store';

export function TransferList() {
  const transfers = useStore((s) => s.scenarios[s.activeId].transfers);
  const update = useStore((s) => s.updateTransfer);
  const remove = useStore((s) => s.removeTransfer);
  const add = useStore((s) => s.addTransfer);

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Direct payments</h2>
          <p className="text-xs text-slate-500">
            Money flowing between people (e.g. equalisation payments, parental support).
            Use "—" as the source for external money.
          </p>
        </div>
        <button onClick={add} className="btn">+ Payment</button>
      </div>

      <div className="space-y-2">
        {transfers.length === 0 && (
          <p className="text-sm text-slate-500">No payments recorded yet.</p>
        )}
        {transfers.map((t) => (
          <div
            key={t.id}
            className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-12 md:items-end"
          >
            <div className="md:col-span-4">
              <label className="block text-xs text-slate-600">Description</label>
              <input
                className="field"
                value={t.name}
                onChange={(e) => update(t.id, (x) => ({ ...x, name: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-600">From</label>
              <select
                className="field"
                value={t.from ?? ''}
                onChange={(e) =>
                  update(t.id, (x) => ({
                    ...x,
                    from: e.target.value ? (e.target.value as PersonId) : null,
                  }))
                }
              >
                <option value="">— external —</option>
                {PEOPLE.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-600">To</label>
              <select
                className="field"
                value={t.to}
                onChange={(e) => update(t.id, (x) => ({ ...x, to: e.target.value as PersonId }))}
              >
                {PEOPLE.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-slate-600">Amount (€)</label>
              <input
                className="field"
                type="number"
                inputMode="decimal"
                value={t.amount}
                onChange={(e) => update(t.id, (x) => ({ ...x, amount: Number(e.target.value) || 0 }))}
              />
            </div>
            <div className="md:col-span-1 md:text-right">
              <button onClick={() => remove(t.id)} className="btn-ghost text-rose-600 hover:bg-rose-50">
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
