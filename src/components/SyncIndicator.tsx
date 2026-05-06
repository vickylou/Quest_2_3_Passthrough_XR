import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { isCloudConfigured, subscribeSyncStatus, syncPull, SyncStatus } from '../state/sync';
import { isPreconfigured, onAuthStateChange } from '../lib/cloud';
import { CloudSetup } from './CloudSetup';

export function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>({ kind: 'idle' });
  const [showSetup, setShowSetup] = useState(false);
  const [authed, setAuthed] = useState(false);
  const viewerId = useStore((s) => s.viewerId);
  const scenarios = useStore((s) => s.scenarios);
  const replaceAll = useStore((s) => s.replaceAll);
  const activeId = useStore((s) => s.activeId);
  const deletedIds = useStore((s) => s.deletedIds);

  const configured = isCloudConfigured();

  useEffect(() => subscribeSyncStatus(setStatus), []);

  // Track auth state — pulls only make sense when signed in (RLS rejects otherwise).
  useEffect(() => {
    if (!configured) {
      setAuthed(false);
      return;
    }
    return onAuthStateChange((s) => setAuthed(!!s));
  }, [configured]);

  // Pull when we become signed in or when the viewer's role changes.
  useEffect(() => {
    if (!configured || !authed) return;
    void runPull();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, viewerId, configured]);

  async function runPull() {
    const { scenarios: merged, pulled } = await syncPull(scenarios, viewerId, deletedIds);
    if (pulled > 0) {
      replaceAll({
        schemaVersion: 3,
        activeId: scenarios[activeId] ? activeId : Object.keys(merged)[0],
        scenarios: merged,
        viewerId,
        lastSavedAt: Date.now(),
        deletedIds,
      });
    }
  }

  if (!configured) {
    // No env vars baked in AND nothing in localStorage → user must paste keys.
    if (isPreconfigured()) {
      // Should not happen — preconfigured implies configured. Defensive fallback.
      return null;
    }
    return (
      <>
        <button
          className="btn"
          onClick={() => setShowSetup(true)}
          title="Set up cloud sync so the family can share scenarios automatically"
        >
          ☁ Set up sync
        </button>
        {showSetup && <CloudSetup onClose={() => setShowSetup(false)} />}
      </>
    );
  }

  const label = renderLabel(status);
  return (
    <>
      <button
        className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-800 px-1.5 py-1 text-[11px] font-medium text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-white/40 md:px-3 md:py-1.5 md:text-sm"
        onClick={runPull}
        title={`${label} — tap to pull the latest scenarios shared by the family`}
        aria-label={label}
      >
        <span className={statusDot(status)}>●</span>
        <span className="hidden md:inline">{label}</span>
        <span className="md:hidden">↻</span>
      </button>
      {!isPreconfigured() && (
        <button
          className="btn-ghost px-1.5 py-0.5 text-xs text-white hover:bg-slate-700"
          onClick={() => setShowSetup(true)}
          title="Cloud sync settings"
        >
          ⚙
        </button>
      )}
      {showSetup && <CloudSetup onClose={() => setShowSetup(false)} />}
    </>
  );
}

function renderLabel(status: SyncStatus): string {
  switch (status.kind) {
    case 'syncing':
      return status.message;
    case 'error':
      return `Sync error`;
    case 'success':
      if (status.pulled > 0) return `Synced (+${status.pulled})`;
      return 'Synced';
    case 'idle':
    default:
      return 'Sync';
  }
}

function statusDot(status: SyncStatus): string {
  switch (status.kind) {
    case 'syncing':
      return 'text-amber-500';
    case 'error':
      return 'text-rose-500';
    case 'success':
      return 'text-emerald-500';
    case 'idle':
    default:
      return 'text-slate-400';
  }
}
