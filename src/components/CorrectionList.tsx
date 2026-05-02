import { PEOPLE, PersonId } from '../types';
import { useStore } from '../state/store';

export function CorrectionList() {
  const corrections = useStore((s) => s.scenarios[s.activeId].corrections);
  const update = useStore((s) => s.updateCorrection);
  const remove = useStore((s) => s.removeCorrection);
  const add = useStore((s) => s.addCorrection);

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Korrekturen / Sondervorteile</h2>
          <p className="text-xs text-slate-500">
            Optionale historische Vorteile, Hilfen oder Annahmen, die in die Fairness einfliessen. Aktivierte Beträge werden zur Bilanz dazu gerechnet.
          </p>
        </div>
        <button onClick={add} className="btn">+ Korrektur</button>
      </div>

      <div className="mb-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
        Korrekturwerte sind optionale Annahmen. Sie helfen bei der Diskussion über Fairness, sollten aber rechtlich/steuerlich geprüft werden.
      </div>

      <div className="space-y-2">
        {corrections.map((c) => (
          <div
            key={c.id}
            className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-12"
          >
            <div className="md:col-span-1 flex items-center">
              <input
                type="checkbox"
                checked={c.active}
                className="h-5 w-5 rounded border-slate-300 text-slate-700 focus:ring-slate-500"
                onChange={(e) => update(c.id, (x) => ({ ...x, active: e.target.checked }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-600">Kategorie</label>
              <input
                className="field"
                value={c.category}
                onChange={(e) => update(c.id, (x) => ({ ...x, category: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-600">Person</label>
              <select
                className="field"
                value={c.person}
                onChange={(e) => update(c.id, (x) => ({ ...x, person: e.target.value as PersonId }))}
              >
                {PEOPLE.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-slate-600">Beschreibung</label>
              <input
                className="field"
                value={c.description}
                onChange={(e) => update(c.id, (x) => ({ ...x, description: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-600">Betrag (€)</label>
              <input
                className="field"
                type="number"
                inputMode="decimal"
                value={c.amount}
                onChange={(e) => update(c.id, (x) => ({ ...x, amount: Number(e.target.value) || 0 }))}
              />
            </div>
            <div className="md:col-span-2 flex items-end justify-end">
              <button onClick={() => remove(c.id)} className="btn-ghost text-rose-600 hover:bg-rose-50">
                Entfernen
              </button>
            </div>
            <div className="md:col-span-12">
              <label className="block text-xs text-slate-600">Notiz</label>
              <input
                className="field"
                placeholder="Warum wurde dieser Wert gewählt?"
                value={c.note}
                onChange={(e) => update(c.id, (x) => ({ ...x, note: e.target.value }))}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
