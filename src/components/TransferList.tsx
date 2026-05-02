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
          <h2 className="text-lg font-semibold">Direkte Zahlungen</h2>
          <p className="text-xs text-slate-500">
            Geld, das zwischen Personen fliesst (z. B. Ausgleichszahlungen, Hilfe von den Eltern). "—" als Absender = externe Quelle.
          </p>
        </div>
        <button onClick={add} className="btn">+ Zahlung</button>
      </div>

      <div className="space-y-2">
        {transfers.length === 0 && (
          <p className="text-sm text-slate-500">Keine Zahlungen erfasst.</p>
        )}
        {transfers.map((t) => (
          <div
            key={t.id}
            className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-12 md:items-end"
          >
            <div className="md:col-span-4">
              <label className="block text-xs text-slate-600">Bezeichnung</label>
              <input
                className="field"
                value={t.name}
                onChange={(e) => update(t.id, (x) => ({ ...x, name: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-600">Von</label>
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
                <option value="">— extern —</option>
                {PEOPLE.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-600">An</label>
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
              <label className="block text-xs text-slate-600">Betrag (€)</label>
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
