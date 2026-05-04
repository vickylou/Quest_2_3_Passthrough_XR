import { useState } from 'react';
import { Asset, AssetSubItem, PERSON_IDS, PEOPLE, PersonId } from '../types';
import { useIsActiveReadOnly, useStore } from '../state/store';
import { formatEuro, formatEuroCompact, formatPercent, uid } from '../lib/format';
import { suggestProportional } from '../lib/balances';
import { AssetIllustration } from './icons/AssetIllustration';
import { HelmhausSplit } from './HelmhausSplit';
import { toneStyle } from '../lib/tones';
import { HELMHAUS_ID, WEBERHAUS_ID } from '../data/seed';
import { isCanonicalAsset } from '../state/persistence';

const HOUSE_IDS = new Set<string>([HELMHAUS_ID, WEBERHAUS_ID]);

export function AssetTable() {
  const active = useStore((s) => s.scenarios[s.activeId]);
  const updateAsset = useStore((s) => s.updateAsset);
  const removeAsset = useStore((s) => s.removeAsset);
  const addAsset = useStore((s) => s.addAsset);
  const readOnly = useIsActiveReadOnly();

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Assets</h2>
        {!readOnly && (
          <button onClick={addAsset} className="btn">+ Asset</button>
        )}
      </div>

      <div className="space-y-3" data-pdf-capture="asset-list">
        {active.assets.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            onChange={(mut) => updateAsset(asset.id, mut)}
            onRemove={() => removeAsset(asset.id)}
            isHouse={HOUSE_IDS.has(asset.id)}
            readOnly={readOnly}
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
  readOnly,
}: {
  asset: Asset;
  onChange: (mut: (a: Asset) => Asset) => void;
  onRemove: () => void;
  isHouse: boolean;
  readOnly: boolean;
}) {
  const tone = toneStyle(asset.tone);
  const sum = PERSON_IDS.reduce((acc, p) => acc + (asset.allocations[p] ?? 0), 0);
  const sumOff = Math.abs(sum - 100) > 0.05;
  const hasBreakdown = (asset.subItems?.length ?? 0) > 0;

  return (
    <article
      className="w-full overflow-hidden rounded-lg border shadow-sm"
      style={{ borderColor: tone.border, background: tone.bg }}
    >
      {/* Single column on phone (mobile illustration sits inline on the
          right of the title/value block); two-column on md+ where the
          right column hosts a full-height illustration well. */}
      <div className="grid grid-cols-1 gap-0 md:grid-cols-[1fr_auto]">
        {/* Left: title + value + percentages + nested breakdowns */}
        <div className="min-w-0 p-3 md:p-4">
          {/* Header / total / mobile illustration share a 2-column row on
              phone so the image takes a small slice in the top-right
              corner alongside title, notes, and total value. On md+ this
              collapses to a single column because the illustration moves
              into its own outer grid column. */}
          <div className="mb-2 flex items-start gap-3 md:block">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <AssetTitle
                    name={asset.name}
                    onRename={(name) => onChange((a) => ({ ...a, name }))}
                    readOnly={readOnly}
                  />
                  {asset.notes && (
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{asset.notes}</p>
                  )}
                </div>
                {!readOnly && !isCanonicalAsset(asset.id) && (
                  <button
                    onClick={onRemove}
                    className="btn-ghost shrink-0 px-2 py-0.5 text-rose-600 hover:bg-rose-50"
                    title="Remove asset"
                    aria-label="Remove asset"
                  >
                    ×
                  </button>
                )}
              </div>

              <TotalValueField
                value={asset.totalValue}
                onChange={(v) => onChange((a) => ({ ...a, totalValue: v }))}
                readOnly={readOnly}
                sum={sum}
                sumOff={sumOff}
              />
            </div>

            {/* Mobile-only illustration: roughly square thumbnail in the
                top-right corner, height matches title + notes + total
                value block via flex stretch. Hidden on md+ because the
                desktop illustration lives in its own column on the right. */}
            <div
              className="flex w-40 shrink-0 items-center justify-center self-stretch overflow-hidden rounded-md md:hidden"
              style={{ background: tone.imageBg }}
              aria-hidden
            >
              <AssetIllustration
                imageKey={asset.imageKey}
                className="h-full w-full max-h-32 p-1"
                tint={tone.accent}
              />
            </div>
          </div>

          <div className="mt-3">
            <PercentGrid asset={asset} onChange={onChange} readOnly={readOnly} valueColor={tone.pillText} />
          </div>

          {(hasBreakdown || isHouse) && (
            <BreakdownPanel asset={asset} onChange={onChange} accent={tone.accent} readOnly={readOnly} />
          )}

          {isHouse && asset.id === HELMHAUS_ID && (
            <details
              className="mt-2 rounded-md border bg-white"
              style={{ borderColor: tone.accent + '33' }}
            >
              <summary className="cursor-pointer select-none px-3 py-1.5 text-xs font-medium text-slate-700">
                ▸ Internal split (how the house is shared) — Bereichs-Schätzung
              </summary>
              <div className="border-t border-slate-200 p-3 md:p-4">
                <HelmhausSplit />
              </div>
            </details>
          )}

          {isHouse && asset.id !== HELMHAUS_ID && (
            <InternalBreakdownPanel
              value={asset.internalBreakdown ?? ''}
              onChange={(v) => onChange((a) => ({ ...a, internalBreakdown: v }))}
              accent={tone.accent}
              readOnly={readOnly}
            />
          )}
        </div>

        {/* Desktop-only illustration well (full card height). */}
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

function AssetTitle({
  name,
  onRename,
  readOnly,
}: {
  name: string;
  onRename: (n: string) => void;
  readOnly: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  if (readOnly) {
    return (
      <span className="text-base font-semibold tracking-tight text-slate-800 md:text-lg">
        {name}
      </span>
    );
  }

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

function TotalValueField({
  value,
  onChange,
  readOnly,
  sum,
  sumOff,
}: {
  value: number;
  onChange: (v: number) => void;
  readOnly: boolean;
  sum: number;
  sumOff: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Total value
        </label>
        <span
          className={`pill px-1.5 py-0 text-[9px] ${
            sumOff ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
          }`}
          title={sumOff ? 'Shares should add up to 100 %' : 'Shares add up to 100 %'}
        >
          Σ {formatPercent(sum)}
        </span>
      </div>
      <div className="relative mt-0.5">
        <input
          type="number"
          inputMode="decimal"
          className="field w-32 pr-7 py-1.5 text-sm tabular-nums disabled:bg-slate-50 disabled:text-slate-600 md:w-44"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          onFocus={(e) => e.currentTarget.select()}
          disabled={readOnly}
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
  readOnly,
  valueColor,
}: {
  asset: Asset;
  onChange: (mut: (a: Asset) => Asset) => void;
  readOnly: boolean;
  valueColor: string;
}) {
  const sum = PERSON_IDS.reduce((acc, p) => acc + (asset.allocations[p] ?? 0), 0);
  const sumOff = Math.abs(sum - 100) > 0.05;
  const [anchor, setAnchor] = useState<PersonId | null>(null);

  const suggestion =
    sumOff && anchor && !readOnly
      ? suggestProportional(asset.allocations, anchor, asset.allocations[anchor] ?? 0)
      : null;

  function setShare(person: PersonId, value: number) {
    setAnchor(person);
    onChange((a) => ({ ...a, allocations: { ...a.allocations, [person]: value } }));
  }

  /**
   * Applying a suggestion now writes all non-anchor allocations in one go.
   * If we updated only the cell whose suggestion was clicked, the OTHER
   * cells' suggestions would immediately recompute against the new total
   * and the user would be sent on a back-and-forth loop. Clicking any one
   * suggestion therefore commits the full proposed split.
   */
  function applySuggestion() {
    if (!suggestion) return;
    onChange((a) => ({
      ...a,
      allocations: {
        ...a.allocations,
        ...Object.fromEntries(
          PERSON_IDS.filter((p) => p !== anchor).map((p) => [p, roundTo(suggestion[p], 2)])
        ),
      } as Asset['allocations'],
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
            onAcceptSuggestion={applySuggestion}
            readOnly={readOnly}
            valueColor={valueColor}
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
  readOnly,
  valueColor,
}: {
  name: string;
  colors: { primary: string; accent: string };
  percent: number;
  euro: number;
  suggestion: number | null;
  onChange: (v: number) => void;
  onAcceptSuggestion: () => void;
  readOnly: boolean;
  valueColor: string;
}) {
  const gradient = `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
      <div className="flex items-center justify-between gap-1">
        <span className="flex min-w-0 items-center gap-1 text-xs font-medium text-slate-700">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: gradient }}
            aria-hidden
          />
          <span className="truncate">{name}</span>
        </span>
        {/* Compact format on mobile keeps the cell from overflowing on narrow
            screens; full format reads better on desktop. The value uses the
            card's tone (pillText) so each asset's per-person € reads in a
            darker shade of that card's colour family. */}
        <span
          className="shrink-0 text-xs font-semibold tabular-nums md:hidden"
          style={{ color: valueColor }}
        >
          {formatEuroCompact(euro)}
        </span>
        <span
          className="hidden shrink-0 text-sm font-semibold tabular-nums md:inline"
          style={{ color: valueColor }}
        >
          {formatEuro(euro)}
        </span>
      </div>
      <div className="relative mt-1">
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          className="field py-1 pr-7 text-right text-sm tabular-nums disabled:bg-slate-50 disabled:text-slate-600"
          value={percent}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          onFocus={(e) => e.currentTarget.select()}
          disabled={readOnly}
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
          %
        </span>
      </div>
      {/* Reserve a fixed slot for the suggestion line so accepting a hint
          doesn't shrink the grid and shift the whole card upward — and
          preventDefault on mousedown keeps focus on the percent input
          so the iOS keyboard doesn't dismiss-and-reopen on every tap. */}
      <div className="mt-0.5 h-3.5 leading-none">
        {suggestion !== null && Math.abs(suggestion - percent) > 0.01 && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onAcceptSuggestion}
            className="text-[10px] italic text-slate-400 hover:text-slate-700"
            title="Apply this value to balance to 100 %"
          >
            → {suggestion.toFixed(2)} %
          </button>
        )}
      </div>
    </div>
  );
}

function BreakdownPanel({
  asset,
  onChange,
  accent,
  readOnly,
}: {
  asset: Asset;
  onChange: (mut: (a: Asset) => Asset) => void;
  accent: string;
  readOnly: boolean;
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
                className="field flex-1 py-1 text-xs disabled:bg-slate-50 disabled:text-slate-600"
                value={i.label}
                onChange={(e) => updateItem(i.id, (x) => ({ ...x, label: e.target.value }))}
                disabled={readOnly}
              />
              <div className="relative w-24">
                <input
                  type="number"
                  inputMode="decimal"
                  className="field py-1 pr-5 text-right text-xs tabular-nums disabled:bg-slate-50 disabled:text-slate-600"
                  value={i.amount}
                  onChange={(e) =>
                    updateItem(i.id, (x) => ({ ...x, amount: Number(e.target.value) || 0 }))
                  }
                  onFocus={(e) => e.currentTarget.select()}
                  disabled={readOnly}
                />
                <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                  €
                </span>
              </div>
              {!readOnly && (
                <button
                  onClick={() => removeItem(i.id)}
                  className="btn-ghost px-1.5 py-0.5 text-rose-600 hover:bg-rose-50"
                  title="Remove component"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 text-xs">
          {!readOnly ? (
            <button onClick={addItem} className="btn-ghost px-2 py-0.5 text-slate-600">
              + Add component
            </button>
          ) : (
            <span />
          )}
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
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  accent: string;
  readOnly: boolean;
}) {
  return (
    <details className="mt-2 rounded-md border bg-white" style={{ borderColor: accent + '33' }}>
      <summary className="cursor-pointer select-none px-3 py-1.5 text-xs font-medium text-slate-700">
        ▸ Internal split (how the house is shared)
      </summary>
      <div className="border-t border-slate-200 p-2">
        <textarea
          className="field min-h-[80px] text-xs disabled:bg-slate-50 disabled:text-slate-600"
          placeholder="Free text for now — paste a detailed split-up of who lives where, who pays what, future intentions, etc. We'll add structured fields once you've shared the full description."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
        />
      </div>
    </details>
  );
}

function roundTo(value: number, decimals: number): number {
  const m = Math.pow(10, decimals);
  return Math.round(value * m) / m;
}
