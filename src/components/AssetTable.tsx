import { useState } from 'react';
import { Asset, AssetSubItem, PERSON_IDS, PEOPLE, PersonId } from '../types';
import { useStore } from '../state/store';
import { formatEuro, formatPercent, uid } from '../lib/format';
import { suggestProportional } from '../lib/balances';
import { AssetIllustration } from './icons/AssetIllustration';

export function AssetTable() {
  const active = useStore((s) => s.scenarios[s.activeId]);
  const updateAsset = useStore((s) => s.updateAsset);
  const removeAsset = useStore((s) => s.removeAsset);
  const addAsset = useStore((s) => s.addAsset);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Assets</h2>
        <button onClick={addAsset} className="btn">+ Asset</button>
      </div>

      <div className="space-y-5">
        {active.assets.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            onChange={(mut) => updateAsset(asset.id, mut)}
            onRemove={() => removeAsset(asset.id)}
          />
        ))}
      </div>
    </section>
  );
}

function AssetCard({
  asset,
  onChange,
  onRemove,
}: {
  asset: Asset;
  onChange: (mut: (a: Asset) => Asset) => void;
  onRemove: () => void;
}) {
  const sum = PERSON_IDS.reduce((acc, p) => acc + (asset.allocations[p] ?? 0), 0);
  const sumOff = Math.abs(sum - 100) > 0.05;

  return (
    <div>
      {/* Title sits outside the card body */}
      <AssetTitle name={asset.name} onRename={(name) => onChange((a) => ({ ...a, name }))} />

      <div className="card overflow-hidden p-0">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto]">
          {/* Left column */}
          <div className="space-y-4 p-4">
            <TotalValueField
              value={asset.totalValue}
              onChange={(v) => onChange((a) => ({ ...a, totalValue: v }))}
            />

            <PercentGrid asset={asset} onChange={onChange} />

            {asset.subItems !== undefined && (
              <BreakdownPanel asset={asset} onChange={onChange} />
            )}

            <NotesField
              value={asset.notes ?? ''}
              onChange={(notes) => onChange((a) => ({ ...a, notes }))}
            />
          </div>

          {/* Right column: illustration */}
          <div className="hidden border-l border-slate-200 bg-slate-50 p-3 md:block md:w-44">
            <AssetIllustration imageKey={asset.imageKey} className="h-full w-full" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs">
          <span className={sumOff ? 'font-medium text-rose-600' : 'text-slate-500'}>
            Sum: {formatPercent(sum)} {sumOff ? '· should be 100 %' : '✓'}
          </span>
          <button onClick={onRemove} className="btn-ghost text-rose-600 hover:bg-rose-50">
            Remove asset
          </button>
        </div>
      </div>
    </div>
  );
}

function AssetTitle({ name, onRename }: { name: string; onRename: (n: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  if (editing) {
    return (
      <div className="mb-2 flex items-center gap-2">
        <input
          autoFocus
          className="field max-w-xs text-lg font-semibold"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const next = draft.trim() || name;
            onRename(next);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const next = draft.trim() || name;
              onRename(next);
              setEditing(false);
            } else if (e.key === 'Escape') {
              setDraft(name);
              setEditing(false);
            }
          }}
        />
      </div>
    );
  }

  return (
    <h3
      className="mb-2 cursor-pointer text-lg font-semibold tracking-tight text-slate-800 hover:text-slate-600"
      title="Click to rename"
      onClick={() => {
        setDraft(name);
        setEditing(true);
      }}
    >
      {name}
    </h3>
  );
}

function TotalValueField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
        Total value
      </label>
      <div className="relative mt-1">
        <input
          type="number"
          inputMode="decimal"
          className="field pr-8"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
          €
        </span>
      </div>
    </div>
  );
}

function PercentGrid({
  asset,
  onChange,
}: {
  asset: Asset;
  onChange: (mut: (a: Asset) => Asset) => void;
}) {
  const sum = PERSON_IDS.reduce((acc, p) => acc + (asset.allocations[p] ?? 0), 0);
  const sumOff = Math.abs(sum - 100) > 0.05;

  // The proportional suggestion uses the most recently edited person as the
  // anchor, leaving the others to scale. We track the last edited person in
  // local state so the suggestion target shifts with user intent.
  const [anchor, setAnchor] = useState<PersonId | null>(null);

  const suggestion = sumOff && anchor
    ? suggestProportional(asset.allocations, anchor, asset.allocations[anchor] ?? 0)
    : null;

  function setShare(person: PersonId, value: number) {
    setAnchor(person);
    onChange((a) => ({ ...a, allocations: { ...a.allocations, [person]: value } }));
  }

  function applySuggestion(person: PersonId) {
    if (!suggestion) return;
    onChange((a) => ({
      ...a,
      allocations: { ...a.allocations, [person]: roundTo(suggestion[person], 2) },
    }));
  }

  return (
    <div>
      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
        Distribution (% per person)
      </label>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {PEOPLE.map((p) => {
          const current = asset.allocations[p.id] ?? 0;
          const sug = suggestion && anchor !== p.id ? suggestion[p.id] : null;
          return (
            <PersonShareCell
              key={p.id}
              name={p.name}
              colors={p.colors}
              percent={current}
              euro={(asset.totalValue * current) / 100}
              suggestion={sug}
              onChange={(v) => setShare(p.id, v)}
              onAcceptSuggestion={() => applySuggestion(p.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function PersonShareCell({
  name,
  colors,
  percent,
  euro,
  suggestion,
  onChange,
  onAcceptSuggestion,
}: {
  name: string;
  colors: { primary: string; accent: string };
  percent: number;
  euro: number;
  suggestion: number | null;
  onChange: (v: number) => void;
  onAcceptSuggestion: () => void;
}) {
  const gradient = `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`;
  return (
    <div className="rounded-md border border-slate-200 bg-white p-2">
      <div className="mb-1 flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ background: gradient }}
          aria-hidden
        />
        <span className="text-sm font-medium text-slate-700">{name}</span>
      </div>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          className="field pr-8 text-right tabular-nums"
          value={percent}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          %
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px]">
        <span className="text-slate-500 tabular-nums">{formatEuro(euro)}</span>
        {suggestion !== null && Math.abs(suggestion - percent) > 0.01 && (
          <button
            onClick={onAcceptSuggestion}
            className="text-slate-400 italic hover:text-slate-600"
            title="Apply this value to balance to 100 %"
          >
            → {suggestion.toFixed(2)}
          </button>
        )}
      </div>
    </div>
  );
}

function BreakdownPanel({
  asset,
  onChange,
}: {
  asset: Asset;
  onChange: (mut: (a: Asset) => Asset) => void;
}) {
  const items = asset.subItems ?? [];
  const subSum = items.reduce((acc, i) => acc + (i.amount ?? 0), 0);
  const base = asset.totalValue - subSum;
  const [open, setOpen] = useState(true);

  function addItem() {
    onChange((a) => ({
      ...a,
      subItems: [...(a.subItems ?? []), { id: uid('sub'), label: 'Component', amount: 0 }],
    }));
  }
  function updateItem(id: string, mut: (i: AssetSubItem) => AssetSubItem) {
    onChange((a) => ({
      ...a,
      subItems: (a.subItems ?? []).map((i) => (i.id === id ? mut(i) : i)),
    }));
  }
  function removeItem(id: string) {
    onChange((a) => ({ ...a, subItems: (a.subItems ?? []).filter((i) => i.id !== id) }));
  }

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded-md border border-slate-200 bg-slate-50"
    >
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-slate-700">
        Breakdown
      </summary>
      <div className="border-t border-slate-200 p-3 text-sm">
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
          <span>Component</span>
          <span>Amount</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between rounded bg-white px-2 py-1">
            <span className="text-slate-600">Base value</span>
            <span className="tabular-nums text-slate-700">{formatEuro(base)}</span>
          </div>
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-2">
              <input
                className="field flex-1 text-sm"
                value={i.label}
                onChange={(e) => updateItem(i.id, (x) => ({ ...x, label: e.target.value }))}
              />
              <div className="relative w-32">
                <input
                  type="number"
                  inputMode="decimal"
                  className="field pr-6 text-right text-sm tabular-nums"
                  value={i.amount}
                  onChange={(e) =>
                    updateItem(i.id, (x) => ({ ...x, amount: Number(e.target.value) || 0 }))
                  }
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  €
                </span>
              </div>
              <button
                onClick={() => removeItem(i.id)}
                className="btn-ghost px-2 py-1 text-rose-600 hover:bg-rose-50"
                title="Remove component"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-sm">
          <button onClick={addItem} className="btn-ghost px-2 py-1 text-slate-600">
            + Add component
          </button>
          <span className="font-medium tabular-nums text-slate-800">
            Total {formatEuro(asset.totalValue)}
          </span>
        </div>
        {base < -0.5 && (
          <p className="mt-2 text-xs text-rose-600">
            Components add up to more than the total value. Increase the total or reduce a component.
          </p>
        )}
      </div>
    </details>
  );
}

function NotesField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  if (value.length === 0) {
    // collapsed by default when empty
    return (
      <details className="rounded-md border border-slate-200 bg-slate-50">
        <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-slate-700">
          Notes
        </summary>
        <div className="border-t border-slate-200 p-3">
          <input
            className="field"
            placeholder="Optional note about this asset"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </details>
    );
  }
  return (
    <details open className="rounded-md border border-slate-200 bg-slate-50">
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-slate-700">
        Notes
      </summary>
      <div className="border-t border-slate-200 p-3">
        <input
          className="field"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </details>
  );
}

function roundTo(value: number, decimals: number): number {
  const m = Math.pow(10, decimals);
  return Math.round(value * m) / m;
}
