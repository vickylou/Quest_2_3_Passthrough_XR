import { useEffect, useState } from 'react';
import { ScenarioBar } from './components/ScenarioBar';
import { AssetTable } from './components/AssetTable';
import { TransferList } from './components/TransferList';
import { CorrectionList } from './components/CorrectionList';
import { NotesPanel } from './components/NotesPanel';
import { CompareView } from './components/CompareView';
import { StickyBalanceBar } from './components/StickyBalanceBar';
import { AuthStatus } from './components/AuthStatus';
import { SyncIndicator } from './components/SyncIndicator';
import { SignIn } from './components/SignIn';
import { IdentitySetup } from './components/IdentitySetup';
import { useStore } from './state/store';
import { clearImportFromUrl, readImportFromUrl } from './lib/share';
import { useAuth } from './lib/useAuth';
import { loadCloudConfig } from './lib/cloud';

export default function App() {
  const [showCompare, setShowCompare] = useState(false);
  const importScenario = useStore((s) => s.importScenario);
  const setViewer = useStore((s) => s.setViewer);
  const auth = useAuth();

  useEffect(() => {
    const incoming = readImportFromUrl();
    if (!incoming) return;
    const ok =
      typeof window !== 'undefined' &&
      window.confirm(
        `Import shared scenario "${incoming.name}"?\n\nIt will be saved to this device alongside your other scenarios.`
      );
    if (ok) importScenario(incoming);
    clearImportFromUrl();
  }, [importScenario]);

  // Once we know who's signed in, mirror their role onto the local viewer cache.
  useEffect(() => {
    if (auth.role) setViewer(auth.role);
  }, [auth.role, setViewer]);

  // Cloud is set up but the user hasn't signed in yet → block the app.
  if (auth.configured && !auth.loading && !auth.session) {
    return <SignIn mode="screen" />;
  }

  // Signed in, but no family role yet → block the app on role selection.
  if (auth.configured && auth.session && !auth.loading && !auth.role) {
    const familyId = loadCloudConfig()?.familyId ?? 'default';
    return (
      <IdentitySetup
        user={auth.session.user}
        familyId={familyId}
        mode="screen"
        onSaved={() => {
          /* AuthState picks up the role on the next loadIdentity. */
          window.location.reload();
        }}
      />
    );
  }

  // Initial auth check — keep the screen quiet until we know.
  if (auth.configured && auth.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2 md:px-6 md:py-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">
              Inheritance Calculator
            </h1>
            <p className="hidden text-xs text-slate-500 md:block">
              Lisa · Vicky · Jackie · Alexa — drafts per person, joint meetings, side-by-side comparisons.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AuthStatus />
            <SyncIndicator />
            <button className="btn" onClick={() => setShowCompare(true)}>
              Compare
            </button>
          </div>
        </div>
      </header>

      <StickyBalanceBar />

      <main className="mx-auto max-w-6xl space-y-3 px-3 py-4 md:px-6 md:py-6">
        <ScenarioBar />
        <AssetTable />
        <TransferList />
        <CorrectionList />
        <NotesPanel />

        <footer className="py-6 text-center text-xs text-slate-400">
          Correction values are optional assumptions, not legal facts. Verify with a notary or tax adviser before signing.
        </footer>
      </main>

      {showCompare && <CompareView onClose={() => setShowCompare(false)} />}
    </div>
  );
}
