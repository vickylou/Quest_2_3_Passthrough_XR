import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { isCloudConfigured, subscribeSyncStatus, syncPull, SyncStatus } from '../state/sync';
import { CloudSetup } from './CloudSetup';

export function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>({ kind: 'idle' });
  const [showSetup, setShowSetup] = useState(false);
  const viewerId = useStore((s) => s.viewerId);
  const scenarios = useStore((s) => s.scenarios);
  const replaceAll = useStore((s) => s.replaceAll);
  const activeId = useStore((s) => s.activeId);

  const configured = isCloudConfigured();

  useEffect(() => subscribeSyncStatus(setStatus), []);

  // On first mount + whenever the viewer changes, pull any visible scenarios
  // that were authored on other devices.
  useEffect(() => {
    if (!configured) return;
    void runPull();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerId, configured]);

  async function runPull() {
    const { scenarios: merged, pulled } = await syncPull(viewerId, scenarios);
    if (pulled > 0) {
      replaceAll({
        schemaVersion: 3,
        activeId: scenarios[activeId] ? activeId : Object.keys(merged)[0],
        scenarios: merged,
        viewerId,
        lastSavedAt: Date.now(),
      });
    }
  }

  if (!configured) {
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
        className="btn flex items-center gap-1"
        onClick={runPull}
        title="Pull the latest scenarios shared by the family"
      >
        <span className={statusDot(status)}>●</span>
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">↻</span>
      </button>
      <button
        className="btn-ghost px-2 py-0.5 text-xs"
        onClick={() => setShowSetup(true)}
        title="Cloud sync settings"
      >
        ⚙
      </button>
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
