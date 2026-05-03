import { useState } from 'react';
import { Asset, AssetSubItem, PERSON_IDS, PEOPLE, PersonId } from '../types';
import { useStore } from '../state/store';
import { formatEuro, formatPercent, uid } from '../lib/format';
import { suggestProportional } from '../lib/balances';
import { AssetIllustration } from './icons/AssetIllustration';
import { toneStyle } from '../lib/tones';
import { HELMHAUS_ID, WEBERHAUS_ID } from '../data/seed';

const HOUSE_IDS = new Set<string>([HELMHAUS_ID, WEBERHAUS_ID]);

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

      <div className="space-y-3" data-pdf-capture="asset-list">
        {active.assets.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            onChange={(mut) => updateAsset(asset.id, mut)}
            onRemove={() => removeAsset(asset.id)}
            isHouse={HOUSE_IDS.has(asset.id)}
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
  isHouse,
}: {
  asset: Asset;
  onChange: (mut: (a: Asset) => Asset) => void;
  onRemove: () => void;
  isHouse: boolean;
}) {
  const tone = toneStyle(asset.tone);
  const sum = PERSON_IDS.reduce((acc, p) => acc + (asset.allocations[p] ?? 0), 0);
  const sumOff = Math.abs(sum - 100) > 0.05;
  const hasBreakdown = (asset.subItems?.length ?? 0) > 0;

  return (
    <article
      className="overflow-hidden rounded-lg border shadow-sm"
      style={{ borderColor: tone.border, background: tone.bg }}
    >
      <div className="grid grid-cols-[1fr_auto] gap-0">
        {/* Left: title + value + percentages + nested breakdowns */}
        <div className="min-w-0 p-3 md:p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <AssetTitle name={asset.name} onRename={(name) => onChange((a) => ({ ...a, name }))} />
              {asset.notes && (
                <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{asset.notes}</p>
              )}
            </div>
            <button
              onClick={onRemove}
              className="btn-ghost shrink-0 px-2 py-0.5 text-rose-600 hover:bg-rose-50"
              title="Remove asset"
              aria-label="Remove asset"
            >
              ×
            </button>
          </div>

          <div className="mb-2 flex items-end gap-3">
            <TotalValueField
              value={asset.totalValue}
              onChange={(v) => onChange((a) => ({ ...a, totalValue: v }))}
            />
            <span
              className={`pill ${sumOff ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}
              title={sumOff ? 'Shares should add up to 100 %' : 'Shares add up to 100 %'}
            >
              Σ {formatPercent(sum)}
            </span>
          </div>

          <PercentGrid asset={asset} onChange={onChange} />

          {(hasBreakdown || isHouse) && (
            <BreakdownPanel asset={asset} onChange={onChange} accent={tone.accent} />
          )}

          {isHouse && (
            <InternalBreakdownPanel
              value={asset.internalBreakdown ?? ''}
              onChange={(v) => onChange((a) => ({ ...a, internalBreakdown: v }))}
              accent={tone.accent}
            />
          )}
        </div>

        {/* Right: illustration well, ~doubled width vs the previous version */}
        <div
          className="hidden border-l md:block md:w-72"
          style={{ background: tone.imageBg, borderColor: tone.border }}
        >
          <div className="flex h-full items-center justify-center p-3">
            <AssetIllustration imageKey={asset.imageKey} className="h-full w-full max-h-44" tint={tone.accent} />
          </div>
        </div>
      </div>
    </article>
  );
}

function AssetTitle({ name, onRename }: { name: string; onRename: (n: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  if (editing) {
    return (
      <input
        autoFocus
        className="field max-w-full text-base font-semibold"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          onRename(draft.trim() || name);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onRename(draft.trim() || name);
            setEditing(false);
          } else if (e.key === 'Escape') {
            setDraft(name);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      className="text-left text-base font-semibold tracking-tight text-slate-800 hover:text-slate-600 md:text-lg"
      title="Click to rename"
      onClick={() => {
        setDraft(name);
        setEditing(true);
      }}
    >
      {name}
    </button>
  );
}

function TotalValueField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">
        Total value
      </label>
      <div className="relative mt-0.5">
        <input
          type="number"
          inputMode="decimal"
          className="field w-44 pr-7 py-1.5 text-sm tabular-nums"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">
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
  const [anchor, setAnchor] = useState<PersonId | null>(null);

  const suggestion =
    sumOff && anchor
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
    <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
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
    <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
      <div className="flex items-center justify-between gap-1">
        <span className="flex items-center gap-1 text-xs font-medium text-slate-700">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: gradient }}
            aria-hidden
          />
          {name}
        </span>
        <span className="text-[10px] tabular-nums text-slate-400">{formatEuro(euro)}</span>
      </div>
      <div className="relative mt-1">
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          className="field py-1 pr-7 text-right text-sm tabular-nums"
          value={percent}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
          %
        </span>
      </div>
      {suggestion !== null && Math.abs(suggestion - percent) > 0.01 && (
        <button
          onClick={onAcceptSuggestion}
          className="mt-0.5 text-[10px] italic text-slate-400 hover:text-slate-700"
          title="Apply this value to balance to 100 %"
        >
          → {suggestion.toFixed(2)} %
        </button>
      )}
    </div>
  );
}

function BreakdownPanel({
  asset,
  onChange,
  accent,
}: {
  asset: Asset;
  onChange: (mut: (a: Asset) => Asset) => void;
  accent: string;
}) {
  const items = asset.subItems ?? [];
  const subSum = items.reduce((acc, i) => acc + (i.amount ?? 0), 0);
  const base = asset.totalValue - subSum;

  function ensureItems(): AssetSubItem[] {
    return asset.subItems ?? [];
  }
  function addItem() {
    onChange((a) => ({
      ...a,
      subItems: [...(a.subItems ?? []), { id: uid('sub'), label: 'Component', amount: 0 }],
    }));
  }
  function updateItem(id: string, mut: (i: AssetSubItem) => AssetSubItem) {
    onChange((a) => ({
      ...a,
      subItems: ensureItems().map((i) => (i.id === id ? mut(i) : i)),
    }));
  }
  function removeItem(id: string) {
    onChange((a) => ({ ...a, subItems: ensureItems().filter((i) => i.id !== id) }));
  }

  return (
    <details
      className="mt-2 rounded-md border bg-white"
      style={{ borderColor: accent + '33' }}
    >
      <summary className="cursor-pointer select-none px-3 py-1.5 text-xs font-medium text-slate-700">
        ▸ Breakdown {items.length > 0 && <span className="text-slate-400">({items.length})</span>}
      </summary>
      <div className="border-t border-slate-200 p-2 text-xs">
        <div className="space-y-1">
          <div className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
            <span className="text-slate-600">Base value</span>
            <span className="tabular-nums text-slate-700">{formatEuro(base)}</span>
          </div>
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-1.5">
              <input
                className="field flex-1 py-1 text-xs"
                value={i.label}
                onChange={(e) => updateItem(i.id, (x) => ({ ...x, label: e.target.value }))}
              />
              <div className="relative w-24">
                <input
                  type="number"
                  inputMode="decimal"
                  className="field py-1 pr-5 text-right text-xs tabular-nums"
                  value={i.amount}
                  onChange={(e) =>
                    updateItem(i.id, (x) => ({ ...x, amount: Number(e.target.value) || 0 }))
                  }
                />
                <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                  €
                </span>
              </div>
              <button
                onClick={() => removeItem(i.id)}
                className="btn-ghost px-1.5 py-0.5 text-rose-600 hover:bg-rose-50"
                title="Remove component"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 text-xs">
          <button onClick={addItem} className="btn-ghost px-2 py-0.5 text-slate-600">
            + Add component
          </button>
          <span className="font-medium tabular-nums text-slate-800">
            Total {formatEuro(asset.totalValue)}
          </span>
        </div>
        {base < -0.5 && (
          <p className="mt-1 text-[10px] text-rose-600">
            Components add up to more than the total. Increase the total or trim a component.
          </p>
        )}
      </div>
    </details>
  );
}

function InternalBreakdownPanel({
  value,
  onChange,
  accent,
}: {
  value: string;
  onChange: (v: string) => void;
  accent: string;
}) {
  return (
    <details className="mt-2 rounded-md border bg-white" style={{ borderColor: accent + '33' }}>
      <summary className="cursor-pointer select-none px-3 py-1.5 text-xs font-medium text-slate-700">
        ▸ Internal split (how the house is shared)
      </summary>
      <div className="border-t border-slate-200 p-2">
        <textarea
          className="field min-h-[80px] text-xs"
          placeholder="Free text for now — paste a detailed split-up of who lives where, who pays what, future intentions, etc. We'll add structured fields once you've shared the full description."
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
