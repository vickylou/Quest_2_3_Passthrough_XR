import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { exportScenarioPDF } from '../lib/pdf';
import { Author, AUTHORS, Scenario, ScenarioStatus } from '../types';

export function ScenarioBar() {
  const all = useStore((s) => s.scenarios);
  const activeId = useStore((s) => s.activeId);
  const lastSavedAt = useStore((s) => s.lastSavedAt);
  const setActive = useStore((s) => s.setActive);
  const renameActive = useStore((s) => s.renameActive);
  const setAuthor = useStore((s) => s.setAuthor);
  const setMeeting = useStore((s) => s.setMeeting);
  const duplicateActive = useStore((s) => s.duplicateActive);
  const deleteScenario = useStore((s) => s.deleteScenario);
  const setStatus = useStore((s) => s.setStatus);
  const resetToDefault = useStore((s) => s.resetToDefault);
  const saveAsNew = useStore((s) => s.saveAsNew);

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  const active = all[activeId];
  const groups = useMemo(() => groupScenarios(all), [all]);

  if (!active) return null;

  return (
    <section className="card">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1">
          <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Active scenario
          </label>
          <select
            className="field"
            value={activeId}
            onChange={(e) => setActive(e.target.value)}
          >
            {groups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {statusBadge(s.status)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Author
          </label>
          <select
            className="field"
            value={active.author}
            onChange={(e) => setAuthor(e.target.value as Author)}
            title="Who created this scenario"
          >
            {AUTHORS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Meeting (optional)
          </label>
          <input
            className="field"
            placeholder="e.g. Family meeting Dec 15"
            value={active.meeting ?? ''}
            onChange={(e) => setMeeting(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {!renaming ? (
          <button
            className="btn"
            onClick={() => {
              setRenameValue(active.name);
              setRenaming(true);
            }}
          >
            Rename
          </button>
        ) : (
          <span className="flex items-center gap-2">
            <input
              className="field"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
            />
            <button
              className="btn-primary"
              onClick={() => {
                renameActive(renameValue.trim() || active.name);
                setRenaming(false);
              }}
            >
              OK
            </button>
            <button className="btn" onClick={() => setRenaming(false)}>
              Cancel
            </button>
          </span>
        )}
        <button className="btn-primary" onClick={() => setShowSaveModal(true)}>
          Save as new scenario
        </button>
        <button className="btn" onClick={duplicateActive}>
          Duplicate
        </button>
        <button
          className="btn"
          onClick={() => {
            if (confirm(`Delete scenario "${active.name}"?`)) deleteScenario(activeId);
          }}
        >
          Delete
        </button>
        <button className="btn" onClick={() => exportScenarioPDF(active)}>
          Export PDF
        </button>
        <button
          className="btn"
          onClick={() => {
            if (confirm('Reset to example data? Current scenarios will be lost.'))
              resetToDefault();
          }}
        >
          Load example
        </button>
        <SavedBadge lastSavedAt={lastSavedAt} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-600">Status:</span>
        <StatusButton current={active.status} value="draft" label="Draft" onClick={setStatus} />
        <StatusButton current={active.status} value="preferred" label="Preferred" onClick={setStatus} />
        <StatusButton current={active.status} value="final" label="Final" onClick={setStatus} />
      </div>

      {showSaveModal && (
        <SaveAsModal
          defaultAuthor={active.author}
          defaultName={`${active.name} – copy`}
          defaultMeeting={active.meeting}
          onCancel={() => setShowSaveModal(false)}
          onSave={(payload) => {
            saveAsNew(payload);
            setShowSaveModal(false);
          }}
        />
      )}
    </section>
  );
}

function groupScenarios(all: Record<string, Scenario>): Array<{
  label: string;
  scenarios: Scenario[];
}> {
  const byMeeting = new Map<string, Scenario[]>();
  const byAuthor = new Map<Author, Scenario[]>();
  for (const s of Object.values(all)) {
    if (s.meeting && s.meeting.trim().length > 0) {
      const key = s.meeting.trim();
      const arr = byMeeting.get(key) ?? [];
      arr.push(s);
      byMeeting.set(key, arr);
    } else {
      const arr = byAuthor.get(s.author) ?? [];
      arr.push(s);
      byAuthor.set(s.author, arr);
    }
  }
  const groups: Array<{ label: string; scenarios: Scenario[] }> = [];
  for (const [label, scs] of byMeeting) {
    groups.push({ label: `Meeting · ${label}`, scenarios: scs.sort(byNameAsc) });
  }
  for (const a of AUTHORS) {
    const list = byAuthor.get(a.id);
    if (list && list.length > 0) {
      groups.push({ label: `${a.name}'s scenarios`, scenarios: list.sort(byNameAsc) });
    }
  }
  return groups;
}

function byNameAsc(a: Scenario, b: Scenario): number {
  return a.name.localeCompare(b.name);
}

function statusBadge(s: ScenarioStatus): string {
  if (s === 'preferred') return '★';
  if (s === 'final') return '✓';
  return '';
}

function StatusButton({
  current,
  value,
  label,
  onClick,
}: {
  current: ScenarioStatus;
  value: ScenarioStatus;
  label: string;
  onClick: (s: ScenarioStatus) => void;
}) {
  const active = current === value;
  return (
    <button
      className={`pill px-3 py-1 ${
        active
          ? value === 'final'
            ? 'bg-emerald-600 text-white'
            : value === 'preferred'
              ? 'bg-amber-500 text-white'
              : 'bg-slate-700 text-white'
          : 'bg-white border border-slate-300 text-slate-700'
      }`}
      onClick={() => onClick(value)}
    >
      {label}
    </button>
  );
}

function SavedBadge({ lastSavedAt }: { lastSavedAt?: number }) {
  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!lastSavedAt) return null;
  const diffSec = Math.max(0, Math.floor((tick - lastSavedAt) / 1000));
  let label: string;
  if (diffSec < 5) label = 'Saved just now';
  else if (diffSec < 60) label = `Saved ${diffSec}s ago`;
  else if (diffSec < 3600) label = `Saved ${Math.floor(diffSec / 60)} min ago`;
  else label = `Saved ${new Date(lastSavedAt).toLocaleTimeString('en-CH', { hour: '2-digit', minute: '2-digit' })}`;
  return (
    <span
      className="pill bg-emerald-50 text-emerald-700"
      title="Changes are saved automatically to this device."
    >
      ✓ {label}
    </span>
  );
}

function SaveAsModal({
  defaultAuthor,
  defaultName,
  defaultMeeting,
  onSave,
  onCancel,
}: {
  defaultAuthor: Author;
  defaultName: string;
  defaultMeeting?: string;
  onSave: (payload: { name: string; author: Author; meeting?: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const [author, setAuthor] = useState<Author>(defaultAuthor);
  const [meeting, setMeeting] = useState(defaultMeeting ?? '');

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-3">
      <div className="card w-full max-w-md">
        <h3 className="mb-2 text-lg font-semibold">Save as new scenario</h3>
        <p className="mb-3 text-xs text-slate-500">
          A copy of the active scenario will be saved with the values below. Each person can keep
          several drafts side by side and group them under a meeting.
        </p>
        <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
        <input
          className="field mb-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <label className="mb-1 block text-xs font-medium text-slate-600">Author</label>
        <select
          className="field mb-2"
          value={author}
          onChange={(e) => setAuthor(e.target.value as Author)}
        >
          {AUTHORS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Meeting (optional)
        </label>
        <input
          className="field"
          placeholder="Leave blank for a personal draft"
          value={meeting}
          onChange={(e) => setMeeting(e.target.value)}
        />

        <div className="mt-4 flex justify-end gap-2">
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() =>
              onSave({
                name: name.trim() || defaultName,
                author,
                meeting: meeting.trim() ? meeting.trim() : undefined,
              })
            }
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
