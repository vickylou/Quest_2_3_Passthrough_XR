import { useState } from 'react';
import { ScenarioBar } from './components/ScenarioBar';
import { AssetTable } from './components/AssetTable';
import { TransferList } from './components/TransferList';
import { CorrectionList } from './components/CorrectionList';
import { NotesPanel } from './components/NotesPanel';
import { CompareView } from './components/CompareView';
import { StickyBalanceBar } from './components/StickyBalanceBar';

export default function App() {
  const [showCompare, setShowCompare] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2 md:px-6 md:py-3">
          <div>
            <h1 className="text-base font-semibold tracking-tight md:text-lg">
              Inheritance Calculator
            </h1>
            <p className="hidden text-xs text-slate-500 md:block">
              Lisa · Vicky · Jackie · Alexa — drafts per person, joint meetings, side-by-side comparisons.
            </p>
          </div>
          <button className="btn" onClick={() => setShowCompare(true)}>
            Compare
          </button>
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
