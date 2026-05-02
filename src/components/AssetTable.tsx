import { Asset, PERSON_IDS, PEOPLE, PersonId } from '../types';
import { useStore } from '../state/store';
import { formatEuro, formatPercent } from '../lib/format';

export function AssetTable() {
  const active = useStore((s) => s.scenarios[s.activeId]);
  const updateAsset = useStore((s) => s.updateAsset);
  const removeAsset = useStore((s) => s.removeAsset);
  const addAsset = useStore((s) => s.addAsset);

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Vermögenswerte</h2>
          <p className="text-xs text-slate-500">
            Werte und prozentuale Verteilung pro Person. Schloss = im Auto-Modus nicht ändern. Flex = darf vom Solver ausgeglichen werden.
          </p>
        </div>
        <button onClick={addAsset} className="btn">
          + Vermögen
        </button>
      </div>

      <div className="space-y-3">
        {active.assets.map((asset) => (
          <AssetRow
            key={asset.id}
            asset={asset}
            onChange={(mut) => updateAsset(asset.id, mut)}
            onRemove={() => removeAsset(asset.id)}
          />
        ))}
      </div>
    </div>
  );
}

function AssetRow({
  asset,
  onChange,
  onRemove,
}: {
  asset: Asset;
  onChange: (mut: (a: Asset) => Asset) => void;
  onRemove: () => void;
}) {
  const sum = PERSON_IDS.reduce((acc, p) => acc + (asset.allocations[p] ?? 0), 0);
  const sumWarning = Math.abs(sum - 100) > 0.05;

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-12 md:items-end">
        <div className="md:col-span-4">
          <label className="block text-xs font-medium text-slate-600">Name</label>
          <input
            className="field"
            value={asset.name}
            onChange={(e) => onChange((a) => ({ ...a, name: e.target.value }))}
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-slate-600">Gesamtwert (€)</label>
          <input
            className="field"
            type="number"
            inputMode="decimal"
            value={asset.totalValue}
            onChange={(e) =>
              onChange((a) => ({ ...a, totalValue: Number(e.target.value) || 0 }))
            }
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 md:col-span-5">
          <ToggleChip
            label="Locked"
            active={asset.locked}
            onClick={() => onChange((a) => ({ ...a, locked: !a.locked }))}
          />
          <ToggleChip
            label="Flexibel"
            active={asset.flexible}
            onClick={() => onChange((a) => ({ ...a, flexible: !a.flexible, locked: false }))}
          />
          <ToggleChip
            label="Teilbar"
            active={asset.splittable}
            onClick={() => onChange((a) => ({ ...a, splittable: !a.splittable }))}
          />
          <button onClick={onRemove} className="btn-ghost ml-auto text-rose-600 hover:bg-rose-50">
            Entfernen
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {PEOPLE.map((person) => (
          <PersonShareInput
            key={person.id}
            personId={person.id}
            personName={person.name}
            color={person.color}
            percent={asset.allocations[person.id] ?? 0}
            euro={(asset.totalValue * (asset.allocations[person.id] ?? 0)) / 100}
            allowed={
              !asset.allowedRecipients || asset.allowedRecipients.includes(person.id)
            }
            onToggleAllowed={() =>
              onChange((a) => {
                const cur = a.allowedRecipients ?? [...PERSON_IDS];
                const has = cur.includes(person.id);
                const next = has
                  ? cur.filter((p) => p !== person.id)
                  : [...cur, person.id];
                return { ...a, allowedRecipients: next.length === 4 ? undefined : next };
              })
            }
            onChange={(v) =>
              onChange((a) => ({
                ...a,
                allocations: { ...a.allocations, [person.id]: v },
              }))
            }
          />
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className={sumWarning ? 'text-rose-600 font-medium' : 'text-slate-500'}>
          Summe: {formatPercent(sum)} {sumWarning ? '⚠ sollte 100 % sein' : ''}
        </span>
        {asset.notes && <span className="text-slate-400">{asset.notes}</span>}
      </div>
    </div>
  );
}

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`pill ${active ? 'bg-slate-700 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}
    >
      {label}
    </button>
  );
}

function PersonShareInput({
  personName,
  color,
  percent,
  euro,
  allowed,
  onToggleAllowed,
  onChange,
}: {
  personId: PersonId;
  personName: string;
  color: string;
  percent: number;
  euro: number;
  allowed: boolean;
  onToggleAllowed: () => void;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs font-medium">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: color }}
          />
          {personName}
        </span>
        <button
          onClick={onToggleAllowed}
          title="Berechtigt für Auto-Verteilung"
          className={`pill text-[10px] ${allowed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
        >
          {allowed ? 'erlaubt' : 'aus'}
        </button>
      </div>
      <input
        type="number"
        inputMode="decimal"
        className="field"
        step="0.01"
        value={percent}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
      <div className="mt-1 text-xs text-slate-500">{formatEuro(euro)}</div>
    </div>
  );
}
