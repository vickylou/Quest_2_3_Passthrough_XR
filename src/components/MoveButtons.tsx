/**
 * Tiny ▲ ▼ pair shown next to the remove button on each row, used by every
 * orderable list (assets, payments, corrections). On mobile, true HTML5
 * drag-and-drop is unreliable, so we expose explicit move-up / move-down
 * controls that work the same on phone, tablet, and desktop.
 *
 * The hosting list decides what "neighbour" means — assets reorder globally,
 * payments reorder within the recipient's group, corrections reorder within
 * the same person's group.
 */
export function MoveButtons({
  onUp,
  onDown,
  canUp,
  canDown,
  label,
}: {
  onUp: () => void;
  onDown: () => void;
  canUp: boolean;
  canDown: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center" role="group" aria-label={`Reorder ${label}`}>
      <button
        type="button"
        onClick={onUp}
        disabled={!canUp}
        className="btn-ghost px-1 py-0.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        title={`Move ${label} up`}
        aria-label={`Move ${label} up`}
      >
        ▲
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={!canDown}
        className="btn-ghost px-1 py-0.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        title={`Move ${label} down`}
        aria-label={`Move ${label} down`}
      >
        ▼
      </button>
    </div>
  );
}
