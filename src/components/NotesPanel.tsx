import { useIsActiveReadOnly, useStore } from '../state/store';

export function NotesPanel() {
  const scenario = useStore((s) => s.scenarios[s.activeId]);
  const setNotes = useStore((s) => s.setNotes);
  const setAssumptions = useStore((s) => s.setAssumptions);
  const readOnly = useIsActiveReadOnly();

  return (
    <div className="card">
      <h2 className="mb-2 text-lg font-semibold">Notes & assumptions</h2>
      <p className="mb-3 text-xs text-slate-500">
        Capture why this scenario was created and what assumptions it relies on. Both appear in the PDF export.
      </p>
      <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
      <textarea
        className="field mb-3 min-h-[80px] disabled:bg-slate-50 disabled:text-slate-600"
        value={scenario.notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Why was this variant created?"
        disabled={readOnly}
      />
      <label className="mb-1 block text-xs font-medium text-slate-600">Assumptions</label>
      <textarea
        className="field min-h-[80px] disabled:bg-slate-50 disabled:text-slate-600"
        value={scenario.assumptions}
        onChange={(e) => setAssumptions(e.target.value)}
        placeholder="What assumptions apply? (e.g. agricultural land at 40 €/m², no rezoning)"
        disabled={readOnly}
      />
    </div>
  );
}
