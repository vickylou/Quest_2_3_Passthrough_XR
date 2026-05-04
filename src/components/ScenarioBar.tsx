import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { exportScenarioPDF } from '../lib/pdf';
import { Author, AUTHORS, Scenario, ScenarioStatus, Visibility } from '../types';
import { buildShareUrl } from '../lib/share';

type Tab = 'mine' | 'others';

export function ScenarioBar() {
  const all = useStore((s) => s.scenarios);
  const activeId = useStore((s) => s.activeId);
  const viewerId = useStore((s) => s.viewerId);
  const lastSavedAt = useStore((s) => s.lastSavedAt);
  const setActive = useStore((s) => s.setActive);
  const renameActive = useStore((s) => s.renameActive);
  const setMeeting = useStore((s) => s.setMeeting);
  const setVisibility = useStore((s) => s.setVisibility);
  const setSharedWith = useStore((s) => s.setSharedWith);
  const duplicateActive = useStore((s) => s.duplicateActive);
  const deleteScenario = useStore((s) => s.deleteScenario);
  const setStatus = useStore((s) => s.setStatus);
  const resetToDefault = useStore((s) => s.resetToDefault);
  const loadExample = useStore((s) => s.loadExample);
  const saveAsNew = useStore((s) => s.saveAsNew);
  const addBlankScenario = useStore((s) => s.addBlankScenario);

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [shareInfo, setShareInfo] = useState<{ url: string; copied: boolean } | null>(null);

  const active = all[activeId];
  const visibleScenarios = useMemo(() => filterVisible(all, viewerId), [all, viewerId]);
  const mineScenarios = useMemo(
    () => visibleScenarios.filter((s) => s.author === viewerId),
    [visibleScenarios, viewerId]
  );
  const othersScenarios = useMemo(
    () => visibleScenarios.filter((s) => s.author !== viewerId),
    [visibleScenarios, viewerId]
  );

  const isMine = !!active && active.author === viewerId;
  const tab: Tab = isMine ? 'mine' : 'others';
  const tabList = tab === 'mine' ? mineScenarios : othersScenarios;
  const grouped = useMemo(() => groupForTab(tabList, tab), [tabList, tab]);

  // If the current active scenario isn't visible to this viewer, switch to one that is.
  useEffect(() => {
    if (!active) return;
    if (!isVisibleToViewer(active, viewerId)) {
      const fallback = mineScenarios[0] ?? othersScenarios[0];
      if (fallback) setActive(fallback.id);
    }
  }, [active, viewerId, mineScenarios, othersScenarios, setActive]);

  if (!active) return null;

  function switchTab(target: Tab) {
    if (target === tab) return;
    const next = target === 'mine' ? mineScenarios[0] : othersScenarios[0];
    if (next) {
      setActive(next.id);
      return;
    }
    // Switching to an empty Mine tab — create a blank scenario so the user
    // has something to edit instead of getting stuck. (We don't auto-create
    // on the Others side because there's no meaningful blank for that case.)
    if (target === 'mine') {
      addBlankScenario();
    }
  }

  return (
    <section className="card">
      <TabSwitch
        current={tab}
        mineCount={mineScenarios.length}
        othersCount={othersScenarios.length}
        onSwitch={switchTab}
      />

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1">
          <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Active scenario
          </label>
          <select
            className="field"
            value={activeId}
            onChange={(e) => setActive(e.target.value)}
          >
            {grouped.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {pickerLabel(s, tab)}
                  </option>
                ))}
              </optgroup>
            ))}
            {grouped.length === 0 && (
              <option value={activeId} disabled>
                — none yet —
              </option>
            )}
          </select>
        </div>

        <ScenarioChips scenario={active} tab={tab} />
      </div>

      {tab === 'mine' ? (
        <MineToolbar
          active={active}
          renaming={renaming}
          renameValue={renameValue}
          setRenaming={setRenaming}
          setRenameValue={setRenameValue}
          renameActive={renameActive}
          setMeeting={setMeeting}
          setVisibility={setVisibility}
          setSharedWith={setSharedWith}
          duplicateActive={duplicateActive}
          deleteScenario={() => deleteScenario(activeId)}
          setStatus={setStatus}
          resetToDefault={resetToDefault}
          loadExample={loadExample}
          openSaveModal={() => setShowSaveModal(true)}
          openShareLink={() => setShareInfo({ url: buildShareUrl(active), copied: false })}
          lastSavedAt={lastSavedAt}
        />
      ) : (
        <OthersToolbar
          active={active}
          duplicateActive={duplicateActive}
        />
      )}

      {showSaveModal && (
        <SaveAsModal
          defaultName={`${active.name} – copy`}
          defaultMeeting={active.meeting}
          onCancel={() => setShowSaveModal(false)}
          onSave={(payload) => {
            saveAsNew(payload);
            setShowSaveModal(false);
          }}
        />
      )}

      {shareInfo && (
        <ShareLinkModal
          url={shareInfo.url}
          copied={shareInfo.copied}
          onCopied={() => setShareInfo({ ...shareInfo, copied: true })}
          onClose={() => setShareInfo(null)}
        />
      )}
    </section>
  );
}

function TabSwitch({
  current,
  mineCount,
  othersCount,
  onSwitch,
}: {
  current: Tab;
  mineCount: number;
  othersCount: number;
  onSwitch: (t: Tab) => void;
}) {
  return (
    <div
      role="tablist"
      className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-sm"
    >
      <TabButton
        active={current === 'mine'}
        // Mine is always clickable — switching to it when empty creates a
        // blank scenario, so the user is never stranded on the Others tab.
        onClick={() => onSwitch('mine')}
        label="Mine"
        count={mineCount}
      />
      <TabButton
        active={current === 'others'}
        // Others stays disabled when empty — there's no meaningful action
        // to take ("create a scenario from someone else" needs the someone
        // else to push one first).
        disabled={othersCount === 0 && current !== 'others'}
        onClick={() => onSwitch('others')}
        label="From others"
        count={othersCount}
      />
    </div>
  );
}

function TabButton({
  active,
  disabled,
  onClick,
  label,
  count,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md px-3 py-1 transition ${
        active
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-500 hover:text-slate-700 disabled:opacity-40'
      }`}
    >
      {label}{' '}
      <span className={`text-xs ${active ? 'text-slate-500' : 'text-slate-400'}`}>({count})</span>
    </button>
  );
}

function ScenarioChips({ scenario, tab }: { scenario: Scenario; tab: Tab }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {tab === 'others' && <Chip>By {authorName(scenario.author)}</Chip>}
      {scenario.meeting && <Chip tone="indigo">📅 {scenario.meeting}</Chip>}
      <Chip tone={visibilityTone(scenario.visibility)}>{visibilityLabel(scenario.visibility)}</Chip>
      {scenario.status !== 'draft' && (
        <Chip tone={scenario.status === 'final' ? 'emerald' : 'amber'}>
          {scenario.status === 'final' ? '✓ Final' : '★ Preferred'}
        </Chip>
      )}
    </div>
  );
}

type ChipTone = 'slate' | 'indigo' | 'emerald' | 'amber' | 'sky' | 'violet';

function Chip({ children, tone = 'slate' }: { children: React.ReactNode; tone?: ChipTone }) {
  const palette: Record<ChipTone, string> = {
    slate: 'bg-slate-100 text-slate-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-800',
    sky: 'bg-sky-50 text-sky-700',
    violet: 'bg-violet-50 text-violet-700',
  };
  return <span className={`pill ${palette[tone]} text-xs`}>{children}</span>;
}

function MineToolbar({
  active,
  renaming,
  renameValue,
  setRenaming,
  setRenameValue,
  renameActive,
  setMeeting,
  setVisibility,
  setSharedWith,
  duplicateActive,
  deleteScenario,
  setStatus,
  resetToDefault,
  loadExample,
  openSaveModal,
  openShareLink,
  lastSavedAt,
}: {
  active: Scenario;
  renaming: boolean;
  renameValue: string;
  setRenaming: (v: boolean) => void;
  setRenameValue: (v: string) => void;
  renameActive: (name: string) => void;
  setMeeting: (m: string | undefined) => void;
  setVisibility: (v: Visibility) => void;
  setSharedWith: (a: Author[]) => void;
  duplicateActive: () => void;
  deleteScenario: () => void;
  setStatus: (s: ScenarioStatus) => void;
  resetToDefault: () => void;
  loadExample: () => void;
  openSaveModal: () => void;
  openShareLink: () => void;
  lastSavedAt?: number;
}) {
  return (
    <>
      <div className="mt-3 flex flex-wrap items-end gap-2">
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

        <div className="flex flex-col">
          <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Visibility
          </label>
          <select
            className="field"
            value={active.visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            title="Who can see this scenario"
          >
            <option value="private">🔒 Private (just me)</option>
            <option value="public">🌐 Public (everyone)</option>
            <option value="shared">👥 Shared with…</option>
          </select>
        </div>

        {active.visibility === 'shared' && (
          <div className="flex flex-col">
            <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Shared with
            </label>
            <SharedWithChips
              author={active.author}
              selected={active.sharedWith ?? []}
              onChange={setSharedWith}
            />
          </div>
        )}

        {active.visibility !== 'private' && (
          <button
            className="btn-primary"
            onClick={openShareLink}
            title="Generate a link you can paste into WhatsApp / iMessage / email"
          >
            Share link…
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
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
        <button className="btn-primary" onClick={openSaveModal}>
          Save as new scenario
        </button>
        <button className="btn" onClick={duplicateActive}>
          Duplicate
        </button>
        <button
          className="btn"
          onClick={() => {
            if (confirm(`Delete scenario "${active.name}"?`)) deleteScenario();
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
            if (confirm('Load demo data? Three example scenarios will be added — current scenarios will be lost.'))
              loadExample();
          }}
        >
          Load example
        </button>
        <button
          className="btn-ghost text-slate-500"
          onClick={() => {
            if (confirm('Start fresh with a single blank scenario? Current scenarios will be lost.'))
              resetToDefault();
          }}
          title="Reset to a single blank scenario"
        >
          Start fresh
        </button>
        <SavedBadge lastSavedAt={lastSavedAt} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-600">Status:</span>
        <StatusButton current={active.status} value="draft" label="Draft" onClick={setStatus} />
        <StatusButton current={active.status} value="preferred" label="Preferred" onClick={setStatus} />
        <StatusButton current={active.status} value="final" label="Final" onClick={setStatus} />
      </div>
    </>
  );
}

function OthersToolbar({
  active,
  duplicateActive,
}: {
  active: Scenario;
  duplicateActive: () => void;
}) {
  return (
    <>
      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Read-only — this scenario was created by <strong>{authorName(active.author)}</strong>. Click
        Duplicate to edit your own copy.
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="btn-primary" onClick={duplicateActive}>
          Duplicate to edit
        </button>
        <button className="btn" onClick={() => exportScenarioPDF(active)}>
          Export PDF
        </button>
      </div>
    </>
  );
}

function isVisibleToViewer(s: Scenario, viewer: Author): boolean {
  if (s.author === viewer) return true;
  if (s.visibility === 'public') return true;
  if (s.visibility === 'shared' && s.sharedWith?.includes(viewer)) return true;
  return false;
}

function filterVisible(all: Record<string, Scenario>, viewer: Author): Scenario[] {
  return Object.values(all).filter((s) => isVisibleToViewer(s, viewer));
}

function groupForTab(scenarios: Scenario[], tab: Tab): Array<{
  label: string;
  scenarios: Scenario[];
}> {
  if (tab === 'mine') {
    const meetings = new Map<string, Scenario[]>();
    const drafts: Scenario[] = [];
    for (const s of scenarios) {
      if (s.meeting && s.meeting.trim().length > 0) {
        const key = s.meeting.trim();
        const arr = meetings.get(key) ?? [];
        arr.push(s);
        meetings.set(key, arr);
      } else {
        drafts.push(s);
      }
    }
    const groups: Array<{ label: string; scenarios: Scenario[] }> = [];
    if (drafts.length > 0) groups.push({ label: 'My drafts', scenarios: drafts.sort(byNameAsc) });
    for (const [label, scs] of meetings) {
      groups.push({ label: `📅 ${label}`, scenarios: scs.sort(byNameAsc) });
    }
    return groups;
  }
  // tab === 'others' — group by author so it's clear whose scenario you're looking at.
  const byAuthor = new Map<Author, Scenario[]>();
  for (const s of scenarios) {
    const arr = byAuthor.get(s.author) ?? [];
    arr.push(s);
    byAuthor.set(s.author, arr);
  }
  const groups: Array<{ label: string; scenarios: Scenario[] }> = [];
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

function pickerLabel(s: Scenario, tab: Tab): string {
  const status = statusBadge(s.status);
  const visibility = tab === 'mine' ? ` ${visibilityIcon(s.visibility)}` : '';
  const meeting = s.meeting ? ` · 📅 ${s.meeting}` : '';
  return `${s.name}${visibility}${status}${meeting}`;
}

function authorName(a: Author): string {
  return AUTHORS.find((x) => x.id === a)?.name ?? a;
}

function statusBadge(s: ScenarioStatus): string {
  if (s === 'preferred') return ' ★';
  if (s === 'final') return ' ✓';
  return '';
}

function visibilityIcon(v: Visibility): string {
  if (v === 'public') return '🌐';
  if (v === 'shared') return '👥';
  return '🔒';
}

function visibilityLabel(v: Visibility): string {
  if (v === 'public') return '🌐 Public';
  if (v === 'shared') return '👥 Shared';
  return '🔒 Private';
}

function visibilityTone(v: Visibility): ChipTone {
  if (v === 'public') return 'sky';
  if (v === 'shared') return 'violet';
  return 'slate';
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
  else
    label = `Saved ${new Date(lastSavedAt).toLocaleTimeString('en-CH', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  return (
    <span
      className="pill bg-emerald-50 text-emerald-700"
      title="Changes are saved automatically to this device."
    >
      ✓ {label}
    </span>
  );
}

function SharedWithChips({
  author,
  selected,
  onChange,
}: {
  author: Author;
  selected: Author[];
  onChange: (next: Author[]) => void;
}) {
  // The author themselves always sees their own scenario; don't list them.
  const candidates = AUTHORS.filter((a) => a.id !== author);
  return (
    <div className="flex flex-wrap gap-1">
      {candidates.map((a) => {
        const on = selected.includes(a.id);
        return (
          <button
            key={a.id}
            className={`pill ${
              on ? 'bg-slate-700 text-white' : 'border border-slate-300 bg-white text-slate-600'
            }`}
            onClick={() => {
              const next = on ? selected.filter((x) => x !== a.id) : [...selected, a.id];
              onChange(next);
            }}
          >
            {a.name}
          </button>
        );
      })}
    </div>
  );
}

function ShareLinkModal({
  url,
  copied,
  onCopied,
  onClose,
}: {
  url: string;
  copied: boolean;
  onCopied: () => void;
  onClose: () => void;
}) {
  function copy() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard
        .writeText(url)
        .then(onCopied)
        .catch(() => {
          /* fallback below */
        });
    }
  }
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-3">
      <div className="card w-full max-w-lg">
        <h3 className="mb-2 text-lg font-semibold">Share this scenario</h3>
        <p className="mb-3 text-xs text-slate-500">
          Copy this link and send it to whoever you want to share with (WhatsApp, iMessage, email).
          When they open it on their phone, the app will offer to import the scenario into their
          own list.
        </p>
        <textarea
          readOnly
          className="field min-h-[88px] text-xs"
          value={url}
          onFocus={(e) => e.currentTarget.select()}
        />
        <div className="mt-3 flex justify-end gap-2">
          <button className="btn" onClick={onClose}>
            Close
          </button>
          <button className="btn-primary" onClick={copy}>
            {copied ? '✓ Copied' : 'Copy link'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SaveAsModal({
  defaultName,
  defaultMeeting,
  onSave,
  onCancel,
}: {
  defaultName: string;
  defaultMeeting?: string;
  onSave: (payload: { name: string; meeting?: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const [meeting, setMeeting] = useState(defaultMeeting ?? '');

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-3">
      <div className="card w-full max-w-md">
        <h3 className="mb-2 text-lg font-semibold">Save as new scenario</h3>
        <p className="mb-3 text-xs text-slate-500">
          A copy of the active scenario will be saved with the values below. New scenarios start
          as Private — set them to Public or Shared once you want to share them.
        </p>
        <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
        <input
          className="field mb-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
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
