import { Asset, PEOPLE, PERSON_IDS, PersonId } from '../types';
import { useStore } from '../state/store';

export function AutoModePanel() {
  const scenario = useStore((s) => s.scenarios[s.activeId]);
  const updateAsset = useStore((s) => s.updateAsset);
  const runEqualizer = useStore((s) => s.runEqualizer);

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Auto-equalize setup</h2>
          <p className="text-xs text-slate-500">
            Mark which assets the auto-equalizer is allowed to redistribute. Locked assets stay
            untouched. Flexible assets get redistributed to bring everyone closer to the equal goal.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            const messages = runEqualizer();
            if (messages.length > 0) alert(messages.join('\n'));
          }}
        >
          Run equalizer
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="border-b border-slate-200 py-2 pr-3">Asset</th>
              <th className="border-b border-slate-200 py-2 pr-3">Locked</th>
              <th className="border-b border-slate-200 py-2 pr-3">Flexible</th>
              <th className="border-b border-slate-200 py-2 pr-3">Splittable</th>
              <th className="border-b border-slate-200 py-2 pr-3">Allowed recipients</th>
            </tr>
          </thead>
          <tbody>
            {scenario.assets.map((asset) => (
              <AssetFlagsRow
                key={asset.id}
                asset={asset}
                onChange={(mut) => updateAsset(asset.id, mut)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        <strong>Locked</strong>: solver cannot change this asset.
        <strong className="ml-2">Flexible</strong>: solver may redistribute this asset to balance the result.
        <strong className="ml-2">Splittable</strong>: a soft hint — discourage co-ownership when off.
      </p>
    </div>
  );
}

function AssetFlagsRow({
  asset,
  onChange,
}: {
  asset: Asset;
  onChange: (mut: (a: Asset) => Asset) => void;
}) {
  const allowed = asset.allowedRecipients ?? [...PERSON_IDS];

  function toggleAllowed(p: PersonId) {
    const has = allowed.includes(p);
    const next = has ? allowed.filter((x) => x !== p) : [...allowed, p];
    onChange((a) => ({
      ...a,
      allowedRecipients: next.length === PERSON_IDS.length ? undefined : next,
    }));
  }

  return (
    <tr className="border-b border-slate-100">
      <td className="py-2 pr-3 font-medium text-slate-700">{asset.name}</td>
      <td className="py-2 pr-3">
        <input
          type="checkbox"
          checked={asset.locked}
          onChange={(e) => onChange((a) => ({ ...a, locked: e.target.checked }))}
          className="h-5 w-5 rounded border-slate-300"
        />
      </td>
      <td className="py-2 pr-3">
        <input
          type="checkbox"
          checked={asset.flexible}
          onChange={(e) =>
            onChange((a) => ({ ...a, flexible: e.target.checked, locked: e.target.checked ? false : a.locked }))
          }
          className="h-5 w-5 rounded border-slate-300"
        />
      </td>
      <td className="py-2 pr-3">
        <input
          type="checkbox"
          checked={asset.splittable}
          onChange={(e) => onChange((a) => ({ ...a, splittable: e.target.checked }))}
          className="h-5 w-5 rounded border-slate-300"
        />
      </td>
      <td className="py-2 pr-3">
        <div className="flex flex-wrap gap-1">
          {PEOPLE.map((p) => {
            const isAllowed = allowed.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggleAllowed(p.id)}
                className={`pill ${isAllowed ? 'text-white' : 'border border-slate-300 bg-white text-slate-500'}`}
                style={
                  isAllowed
                    ? { background: `linear-gradient(135deg, ${p.colors.primary}, ${p.colors.accent})` }
                    : undefined
                }
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </td>
    </tr>
  );
}
