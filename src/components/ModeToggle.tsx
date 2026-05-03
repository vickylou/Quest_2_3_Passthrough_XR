import { useStore } from '../state/store';
import { Mode } from '../types';

export function ModeToggle() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);

  const items: { id: Mode; label: string; description: string }[] = [
    { id: 'manual', label: 'Manual', description: 'Edit values directly.' },
    { id: 'auto', label: 'Auto-equalize', description: 'Auto-distribute flexible assets.' },
    { id: 'suggestions', label: 'Suggestions', description: 'Generate three variants.' },
  ];

  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-2">
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
      <p className="mt-2 text-xs text-slate-500">
        {items.find((m) => m.id === mode)?.description}
      </p>
    </div>
  );
}
