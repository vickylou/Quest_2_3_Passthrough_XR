import { Constraint, PEOPLE, PersonId } from '../types';
import { useStore } from '../state/store';

export function ConstraintsPanel() {
  const scenario = useStore((s) => s.scenarios[s.activeId]);
  const update = useStore((s) => s.updateConstraint);
  const remove = useStore((s) => s.removeConstraint);
  const add = useStore((s) => s.addConstraint);

  const hard = scenario.constraints.filter((c) => c.kind === 'hard');
  const soft = scenario.constraints.filter((c) => c.kind === 'soft');

  return (
    <div className="card">
      <div className="mb-3">
        <h2 className="text-lg font-semibold">Wishes & constraints</h2>
        <p className="text-xs text-slate-500">
          Hard constraints must be satisfied. Soft wishes feed weighted hints into the auto-equalizer.
        </p>
      </div>

      <h3 className="mb-2 text-sm font-semibold text-slate-700">Hard constraints</h3>
      <div className="mb-2 space-y-2">
        {hard.length === 0 && <p className="text-xs text-slate-500">No hard constraints yet.</p>}
        {hard.map((c) => (
          <ConstraintRow
            key={c.id}
            constraint={c}
            assets={scenario.assets}
            onUpdate={(mut) => update(c.id, mut as (x: Constraint) => Constraint)}
            onRemove={() => remove(c.id)}
          />
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          className="btn"
          onClick={() =>
            add({
              kind: 'hard',
              type: 'minBalance',
              person: 'lisa',
              amount: 0,
              note: '',
              active: true,
            } as Constraint)
          }
        >
          + Minimum balance
        </button>
        <button
          className="btn"
          onClick={() =>
            add({
              kind: 'hard',
              type: 'minAssetShare',
              assetId: scenario.assets[0]?.id ?? '',
              person: 'lisa',
              percent: 0,
              note: '',
              active: true,
            } as Constraint)
          }
        >
          + Minimum asset share
        </button>
      </div>

      <h3 className="mb-2 text-sm font-semibold text-slate-700">Soft wishes</h3>
      <div className="mb-2 space-y-2">
        {soft.length === 0 && <p className="text-xs text-slate-500">No wishes yet.</p>}
        {soft.map((c) => (
          <ConstraintRow
            key={c.id}
            constraint={c}
            assets={scenario.assets}
            onUpdate={(mut) => update(c.id, mut as (x: Constraint) => Constraint)}
            onRemove={() => remove(c.id)}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="btn"
          onClick={() =>
            add({
              kind: 'soft',
              type: 'preferFullAsset',
              assetId: scenario.assets[0]?.id ?? '',
              person: 'lisa',
              weight: 3,
              note: '',
              active: true,
            } as Constraint)
          }
        >
          + Full asset for person
        </button>
        <button
          className="btn"
          onClick={() =>
            add({
              kind: 'soft',
              type: 'avoidSplitAsset',
              assetId: scenario.assets[0]?.id ?? '',
              weight: 2,
              note: '',
              active: true,
            } as Constraint)
          }
        >
          + Avoid splitting asset
        </button>
        <button
          className="btn"
          onClick={() =>
            add({
              kind: 'soft',
              type: 'preferLiquidity',
              person: 'lisa',
              weight: 2,
              note: '',
              active: true,
            } as Constraint)
          }
        >
          + Prefer liquidity for person
        </button>
      </div>
    </div>
  );
}

function ConstraintRow({
  constraint,
  assets,
  onUpdate,
  onRemove,
}: {
  constraint: Constraint;
  assets: { id: string; name: string }[];
  onUpdate: (mut: (c: Constraint) => Constraint) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center gap-3">
        <input
          type="checkbox"
          checked={constraint.active}
          onChange={(e) => onUpdate((c) => ({ ...c, active: e.target.checked }))}
          className="h-5 w-5 rounded"
        />
        <span className="pill bg-slate-200 text-slate-700">{labelForType(constraint.type)}</span>
        <button onClick={onRemove} className="btn-ghost ml-auto text-rose-600 hover:bg-rose-50">
          ×
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
        {needsPerson(constraint.type) && 'person' in constraint && (
          <div className="md:col-span-3">
            <label className="block text-xs text-slate-600">Person</label>
            <select
              className="field"
              value={constraint.person}
              onChange={(e) =>
                onUpdate((c) => ({ ...c, person: e.target.value as PersonId }) as Constraint)
              }
            >
              {PEOPLE.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {needsAsset(constraint.type) && 'assetId' in constraint && (
          <div className="md:col-span-4">
            <label className="block text-xs text-slate-600">Asset</label>
            <select
              className="field"
              value={constraint.assetId}
              onChange={(e) =>
                onUpdate((c) => ({ ...c, assetId: e.target.value }) as Constraint)
              }
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        {'amount' in constraint && (
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-600">Amount (€)</label>
            <input
              className="field"
              type="number"
              value={constraint.amount}
              onChange={(e) => onUpdate((c) => ({ ...c, amount: Number(e.target.value) || 0 }) as Constraint)}
            />
          </div>
        )}

        {'percent' in constraint && (
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-600">Min %</label>
            <input
              className="field"
              type="number"
              value={constraint.percent}
              onChange={(e) => onUpdate((c) => ({ ...c, percent: Number(e.target.value) || 0 }) as Constraint)}
            />
          </div>
        )}

        {'weight' in constraint && (
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-600">Weight</label>
            <input
              className="field"
              type="number"
              min={0}
              step={0.5}
              value={constraint.weight}
              onChange={(e) => onUpdate((c) => ({ ...c, weight: Number(e.target.value) || 0 }) as Constraint)}
            />
          </div>
        )}
      </div>

      <div className="mt-2">
        <label className="block text-xs text-slate-600">Note</label>
        <input
          className="field"
          value={constraint.note}
          placeholder="Why this constraint?"
          onChange={(e) => onUpdate((c) => ({ ...c, note: e.target.value }))}
        />
      </div>
    </div>
  );
}

function labelForType(type: Constraint['type']): string {
  switch (type) {
    case 'minBalance': return 'minimum balance';
    case 'minAssetShare': return 'minimum asset share';
    case 'fixAssetAllocation': return 'fixed allocation';
    case 'preferFullAsset': return 'prefer full asset';
    case 'preferLiquidity': return 'prefer liquidity';
    case 'avoidSplitAsset': return 'avoid splitting';
    default: return type;
  }
}

function needsPerson(type: Constraint['type']): boolean {
  return ['minBalance', 'minAssetShare', 'preferFullAsset', 'preferLiquidity'].includes(type);
}

function needsAsset(type: Constraint['type']): boolean {
  return ['minAssetShare', 'fixAssetAllocation', 'preferFullAsset', 'avoidSplitAsset'].includes(type);
}
