import { useStore } from '../state/store';
import { Mode } from '../types';

export function ModeToggle() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const runEqualizer = useStore((s) => s.runEqualizer);

  const items: { id: Mode; label: string; description: string }[] = [
    { id: 'manual', label: 'Manuell', description: 'Werte direkt bearbeiten' },
    { id: 'auto', label: 'Auto-Ausgleich', description: 'Flexible Vermögen automatisch verteilen' },
    { id: 'suggestions', label: 'Vorschläge', description: 'Drei Varianten erzeugen' },
  ];

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                className={`rounded-md px-3 py-2 text-sm ${
                  active
                    ? 'bg-slate-700 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => setMode(item.id)}
                title={item.description}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {mode === 'auto' && (
          <button
            className="btn-primary"
            onClick={() => {
              const messages = runEqualizer();
              if (messages.length > 0) alert(messages.join('\n'));
            }}
          >
            Ausgleich berechnen
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {items.find((m) => m.id === mode)?.description}.
        {mode === 'auto' &&
          ' Markiere Vermögen als "flexibel" und drücke "Ausgleich berechnen".'}
      </p>
    </div>
  );
}
