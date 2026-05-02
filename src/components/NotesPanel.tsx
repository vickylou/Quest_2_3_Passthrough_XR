import { useStore } from '../state/store';

export function NotesPanel() {
  const scenario = useStore((s) => s.scenarios[s.activeId]);
  const setNotes = useStore((s) => s.setNotes);
  const setAssumptions = useStore((s) => s.setAssumptions);

  return (
    <div className="card">
      <h2 className="mb-2 text-lg font-semibold">Notizen & Annahmen</h2>
      <p className="mb-3 text-xs text-slate-500">
        Halte fest, warum dieses Szenario erstellt wurde und welche Annahmen ihm zugrunde liegen. Beides erscheint im PDF-Export.
      </p>
      <label className="mb-1 block text-xs font-medium text-slate-600">Notizen</label>
      <textarea
        className="field mb-3 min-h-[80px]"
        value={scenario.notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Warum wurde diese Variante erstellt?"
      />
      <label className="mb-1 block text-xs font-medium text-slate-600">Annahmen</label>
      <textarea
        className="field min-h-[80px]"
        value={scenario.assumptions}
        onChange={(e) => setAssumptions(e.target.value)}
        placeholder="Welche Annahmen gelten? (z. B. Landwirtschaft 40 €/m², keine Umzonung)"
      />
    </div>
  );
}
