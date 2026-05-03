import { useRef, useState } from 'react';
import { useStore } from '../state/store';
import { downloadAsFile, exportJSON, importJSON } from '../state/persistence';
import { exportScenarioPDF } from '../lib/pdf';
import { ScenarioStatus } from '../types';

export function ScenarioBar() {
  const all = useStore((s) => s.scenarios);
  const activeId = useStore((s) => s.activeId);
  const setActive = useStore((s) => s.setActive);
  const renameActive = useStore((s) => s.renameActive);
  const duplicateActive = useStore((s) => s.duplicateActive);
  const deleteScenario = useStore((s) => s.deleteScenario);
  const setStatus = useStore((s) => s.setStatus);
  const resetToDefault = useStore((s) => s.resetToDefault);
  const clearAll = useStore((s) => s.clearAll);
  const replaceAll = useStore((s) => s.replaceAll);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const active = all[activeId];
  if (!active) return null;

  const ids = Object.keys(all);

  return (
    <div className="card">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-600">Active scenario</label>
          <div className="flex items-center gap-2">
            <select
              className="field"
              value={activeId}
              onChange={(e) => setActive(e.target.value)}
            >
              {ids.map((id) => (
                <option key={id} value={id}>
                  {all[id].name} {statusBadge(all[id].status)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
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
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-600">Status:</span>
        <StatusButton current={active.status} value="draft" label="Draft" onClick={setStatus} />
        <StatusButton
          current={active.status}
          value="preferred"
          label="Preferred"
          onClick={setStatus}
        />
        <StatusButton current={active.status} value="final" label="Final" onClick={setStatus} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="btn"
          onClick={() => exportScenarioPDF(active)}
        >
          Export PDF
        </button>
        <button
          className="btn"
          onClick={() => {
            const txt = exportJSON({
              schemaVersion: 1,
              activeId,
              scenarios: all,
              mode: 'manual',
            });
            downloadAsFile('inheritance.json', txt);
          }}
        >
          Export JSON
        </button>
        <button className="btn" onClick={() => fileInputRef.current?.click()}>
          Import JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const txt = await file.text();
              const next = importJSON(txt);
              replaceAll(next);
            } catch (err) {
              alert(`Import failed: ${(err as Error).message}`);
            } finally {
              if (fileInputRef.current) fileInputRef.current.value = '';
            }
          }}
        />
        <button
          className="btn"
          onClick={() => {
            if (confirm('Reset to example data? Current scenarios will be lost.'))
              resetToDefault();
          }}
        >
          Load example
        </button>
        <button
          className="btn-ghost text-rose-600"
          onClick={() => {
            if (confirm('Delete everything?')) clearAll();
          }}
        >
          Clear all
        </button>
      </div>
    </div>
  );
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
