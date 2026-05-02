import { useState } from 'react';
import { useStore } from './state/store';
import { ScenarioBar } from './components/ScenarioBar';
import { AssetTable } from './components/AssetTable';
import { TransferList } from './components/TransferList';
import { CorrectionList } from './components/CorrectionList';
import { ConstraintsPanel } from './components/ConstraintsPanel';
import { BalancesPanel } from './components/BalancesPanel';
import { NotesPanel } from './components/NotesPanel';
import { ModeToggle } from './components/ModeToggle';
import { SuggestionsPanel } from './components/SuggestionsPanel';
import { CompareView } from './components/CompareView';

export default function App() {
  const mode = useStore((s) => s.mode);
  const [showCompare, setShowCompare] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-3 py-3 md:px-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight md:text-xl">
              Erbteilungs-Rechner
            </h1>
            <p className="text-xs text-slate-500">
              Lisa · Vicky · Jackie · Alexa — Szenarien vergleichen, Wünsche festhalten, Vorschläge erzeugen.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => setShowCompare(true)}>
              Vergleichen
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-3 py-4 md:px-6 md:py-6">
        <ScenarioBar />
        <ModeToggle />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <AssetTable />
            <TransferList />
            <CorrectionList />
            <ConstraintsPanel />
            {mode === 'suggestions' && <SuggestionsPanel />}
            <NotesPanel />
          </div>
          <div className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
            <BalancesPanel />
          </div>
        </div>

        <footer className="py-6 text-center text-xs text-slate-400">
          Korrekturwerte sind optionale Annahmen, keine rechtlichen Tatsachen. Vor Unterzeichnung mit Notar/Steuerberatung prüfen.
        </footer>
      </main>

      {showCompare && <CompareView onClose={() => setShowCompare(false)} />}
    </div>
  );
}
