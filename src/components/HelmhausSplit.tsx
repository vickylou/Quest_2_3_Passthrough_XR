import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Detailed Helmhaus internal-split panel — replaces the free-text
 * "Internal split" textarea on the Helmhaus asset card. Mirrors the
 * structure of the HelmHaus/helm_split.html valuation document Vicky
 * shared, converted to React + Tailwind. Numbers are hard-coded from
 * the PlanetHome 27.02.2024 estimate; this is documentation, not a
 * live calculator panel.
 *
 * Images are loaded from `public/helmhaus/` so they end up at
 * `/<base>/helmhaus/<file>.jpg` after build. Add the JPGs there and
 * they'll appear automatically.
 */

const IMG = import.meta.env.BASE_URL + 'helmhaus/';

// Appraisal anchors (PlanetHome 27.02.2024). All scaling is expressed as
// factors against these constants so the math stays readable.
const A = {
  EG_TOTAL: 601_890,
  OG_TOTAL: 463_670,
  OG_LISA: 128_110,
  OG_VICKY: 335_560,
  PRAXIS_FULL: 138_210,
  PRAXIS_HALF: 69_105,
  DG_FULL: 56_820,
  DG_HALF: 28_410,
  LISA_GARAGE: 26_250,
  VICKY_GARAGE: 32_670,
  ALLG_HALF: 841,
  HELMHAUS_TOTAL: 1_321_141,
} as const;

const PACKAGE_TARGET = 150_000;

interface Scales {
  // editable totals (one per editable card)
  egTotal: number;
  setEgTotal: (n: number) => void;
  ogLisa: number;
  setOgLisa: (n: number) => void;
  ogVicky: number;
  setOgVicky: (n: number) => void;
  praxisFull: number;
  setPraxisFull: (n: number) => void;
  dgFull: number;
  setDgFull: (n: number) => void;
  garageTotal: number;
  setGarageTotal: (n: number) => void;
  lisaGarage: number;
  vickyGarage: number;
  reset: () => void;
  // per-card scale factors (ratio of current card total ÷ appraisal total)
  s_eg: number;
  s_ol: number;
  s_ov: number;
  s_p: number;
  s_d: number;
  s_g: number;
  // derived
  ogTotal: number;
  praxisHalf: number;
  dgHalf: number;
  package_: number;
  lisaTotal: number;
  vickyTotal: number;
  helmhausTotal: number;
}

const ScaleCtx = createContext<Scales | null>(null);

function useScales(): Scales {
  const ctx = useContext(ScaleCtx);
  if (!ctx) throw new Error('useScales outside ScaleCtx');
  return ctx;
}

const fmt = (n: number) =>
  '€ ' +
  n.toLocaleString('de-DE', {
    maximumFractionDigits: 0,
  });

export function HelmhausSplit() {
  const [egTotal, setEgTotal] = useState<number>(A.EG_TOTAL);
  const [ogLisa, setOgLisa] = useState<number>(A.OG_LISA);
  const [ogVicky, setOgVicky] = useState<number>(A.OG_VICKY);
  const [praxisFull, setPraxisFull] = useState<number>(A.PRAXIS_FULL);
  const [dgFull, setDgFull] = useState<number>(A.DG_FULL);
  const [garageTotal, setGarageTotal] = useState<number>(A.LISA_GARAGE + A.VICKY_GARAGE);

  const scales: Scales = useMemo(() => {
    const s_eg = egTotal / A.EG_TOTAL;
    const s_ol = ogLisa / A.OG_LISA;
    const s_ov = ogVicky / A.OG_VICKY;
    const s_p = praxisFull / A.PRAXIS_FULL;
    const s_d = dgFull / A.DG_FULL;
    const garageBase = A.LISA_GARAGE + A.VICKY_GARAGE; // 58_920
    const s_g = garageTotal / garageBase;
    // Split the garage total back into Lisa / Vicky shares using the
    // appraisal ratios (Lisa ½ Garage = 26,250; Vicky ½ Garage + Lager =
    // 32,670; Lisa share ≈ 44.5 %).
    const lisaGarage = garageTotal * (A.LISA_GARAGE / garageBase);
    const vickyGarage = garageTotal * (A.VICKY_GARAGE / garageBase);
    const ogTotal = ogLisa + ogVicky;
    const praxisHalf = praxisFull / 2;
    const dgHalf = dgFull / 2;
    const package_ = praxisHalf + dgHalf + ogLisa;
    const lisaTotal =
      egTotal + ogLisa + praxisFull + lisaGarage + dgFull + A.ALLG_HALF;
    const vickyTotal = ogVicky + vickyGarage + A.ALLG_HALF;
    const helmhausTotal = lisaTotal + vickyTotal;
    return {
      egTotal,
      setEgTotal,
      ogLisa,
      setOgLisa,
      ogVicky,
      setOgVicky,
      praxisFull,
      setPraxisFull,
      dgFull,
      setDgFull,
      garageTotal,
      setGarageTotal,
      lisaGarage,
      vickyGarage,
      reset: () => {
        setEgTotal(A.EG_TOTAL);
        setOgLisa(A.OG_LISA);
        setOgVicky(A.OG_VICKY);
        setPraxisFull(A.PRAXIS_FULL);
        setDgFull(A.DG_FULL);
        setGarageTotal(A.LISA_GARAGE + A.VICKY_GARAGE);
      },
      s_eg,
      s_ol,
      s_ov,
      s_p,
      s_d,
      s_g,
      ogTotal,
      praxisHalf,
      dgHalf,
      package_,
      lisaTotal,
      vickyTotal,
      helmhausTotal,
    };
  }, [egTotal, ogLisa, ogVicky, praxisFull, dgFull, garageTotal]);

  return (
    <ScaleCtx.Provider value={scales}>
    <div className="space-y-4 text-sm leading-relaxed text-slate-800">
      <Header />
      <Hero />
      <Section num={1} title="Bereichs-Schätzung">
        <BreakdownExplanation />
      </Section>
      <Section num={2} title="Aufteilung">
        <Legend />
        <FloorEG />
        <FloorOG />
        <FloorKGPraxis />
        <FloorKGGarage />
        <FloorDG />
        <TotalOverview />
      </Section>
      <Explanations />
      <Section num={3} title="Ansichten vom Haus">
        <Views />
      </Section>
      <DetailedTable />
    </div>
    <FloatingIndicators />
    </ScaleCtx.Provider>
  );
}

/**
 * Always-visible status panel that follows the mouse cursor on desktop
 * (so it's always near where the user is editing) and falls back to a
 * fixed bottom-right pin on touch devices where there is no cursor.
 * Shows the live Σ Helmhaus and Buyout-Paket vs. their targets.
 */
function FloatingIndicators() {
  const { helmhausTotal, package_, reset } = useScales();
  const helmDiff = helmhausTotal - A.HELMHAUS_TOTAL;
  const packDiff = package_ - PACKAGE_TARGET;
  const helmGood = Math.abs(helmDiff) < 50;
  const packGood = Math.abs(packDiff) < 50;

  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    function onMove(e: MouseEvent) {
      setCursor({ x: e.clientX, y: e.clientY });
    }
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Box dimensions (approximate — used to keep it within the viewport).
  const W = 250;
  const H = 110;
  const positionStyle: React.CSSProperties = cursor
    ? (() => {
        // Default offset: 18 px right + below the cursor. If that would
        // overflow the viewport, flip to left/above.
        let x = cursor.x + 18;
        let y = cursor.y + 18;
        if (x + W > window.innerWidth - 8) x = cursor.x - W - 18;
        if (y + H > window.innerHeight - 8) y = cursor.y - H - 18;
        x = Math.max(8, x);
        y = Math.max(8, y);
        return { left: x, top: y };
      })()
    : { right: 12, bottom: 12 };

  return (
    <div
      className="pointer-events-none fixed z-50 max-w-[calc(100vw-1rem)]"
      style={positionStyle}
    >
      <div className="pointer-events-auto rounded-lg border border-slate-300 bg-white/95 p-2.5 text-xs shadow-2xl backdrop-blur md:p-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Helmhaus-Bilanz
          </span>
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
          >
            ↺ Reset
          </button>
        </div>
        <div className="space-y-0.5 tabular-nums">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Σ</span>
            <strong className="flex-1 text-right">{fmt(helmhausTotal)}</strong>
            <span className={helmGood ? 'text-emerald-700' : 'text-rose-700'}>
              {helmGood ? '✓' : `${helmDiff >= 0 ? '+' : ''}${fmt(helmDiff)}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Buy</span>
            <strong className="flex-1 text-right">{fmt(package_)}</strong>
            <span className={packGood ? 'text-emerald-700' : 'text-rose-700'}>
              {packGood ? '✓' : `${packDiff >= 0 ? '+' : ''}${fmt(packDiff)}`}
            </span>
          </div>
        </div>
        <div className="mt-1 text-[10px] text-slate-400">
          Ziel Σ {fmt(A.HELMHAUS_TOTAL)} · Buy {fmt(PACKAGE_TARGET)}
        </div>
      </div>
    </div>
  );
}

function Views() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <ViewTile file="view-nw.jpg" title="Nord-West" desc="Straßenseite · Eingang + Garage" />
      <ViewTile file="view-se.jpg" title="Süd-Ost" desc="Gartenseite · steiles Walmdach" />
      <ViewTile file="view-sw.jpg" title="Süd-West" desc="Hangseite · Balkon West" />
    </div>
  );
}

function ViewTile({ file, title, desc }: { file: string; title: string; desc: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <FloorImage src={IMG + file} alt={title} />
      <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        <strong className="text-slate-800">{title}</strong> · {desc}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="text-center">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Erbschaft · Helm Haus · Uderns
      </div>
      <h2 className="m-0 text-xl font-bold tracking-tight md:text-2xl">
        Bereichs-Schätzung &amp; physische Aufteilung
      </h2>
      <div className="mt-1 text-xs text-slate-500">
        Lisa &amp; Vicky · ~72/28 Aufteilung (Restausgleich via Baugrund) · Stand 27.04.2026
      </div>
    </div>
  );
}

function Hero() {
  return (
    <div
      className="rounded-2xl border border-amber-200 p-4 shadow-sm md:p-6"
      style={{ background: 'linear-gradient(135deg, #fdf8ec 0%, #fbf2dc 100%)' }}
    >
      <div className="flex flex-col gap-3">
        <div
          className="flex flex-col items-start gap-2 rounded-xl border-2 border-amber-200 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
          style={{ background: 'linear-gradient(90deg, #fbf2dc 0%, #fdf8ec 100%)' }}
        >
          <div className="flex-1">
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-amber-700">
              Verkehrswert (Schätzung 27.02.2024)
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              PlanetHome · Sachwertverfahren · inkl. DG (unausgebaut)
            </div>
          </div>
          <div className="text-2xl font-bold tabular-nums text-amber-700 md:text-3xl">
            {fmt(1_321_141)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  num,
  title,
  children,
}: {
  num: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mt-6 flex items-center gap-2 text-lg font-bold tracking-tight">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
          {num}
        </span>
        {title}
      </h3>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

function BreakdownExplanation() {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm leading-relaxed">
        <strong>Der Verkehrswert {fmt(1_321_141)} setzt sich aus 4 Komponenten zusammen:</strong>
      </p>
      <div className="mt-3 grid gap-1.5 text-sm">
        <ComponentLine
          label="① Gebäude"
          color="#6a8aa6"
          desc="das Haus selbst (Praxis, Garage, EG, OG, DG)"
          value={fmt(581_200)}
        />
        <ComponentLine
          label="② Außenanlagen"
          color="#c98b3a"
          desc="Terrassen, Bepflanzung, Balkone, Garten-Bauten"
          value={fmt(30_000)}
        />
        <ComponentLine
          label="③ Grundstück"
          color="#a06a4e"
          desc="das nackte Land (727 m² × € 800/m²)"
          value={fmt(581_600)}
        />
        <ComponentLine
          label="④ Marktanpassung"
          color="#b08a3e"
          desc="+10 % Sanierungen / −10 % Fluss-Nähe"
          value={'+' + fmt(128_341)}
        />
      </div>
      <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed">
        <strong style={{ color: '#6a8aa6' }}>① Gebäude</strong> +{' '}
        <strong style={{ color: '#c98b3a' }}>② Außenanlagen</strong> ={' '}
        <strong>Bauten / Anlagen auf dem Grund</strong> (Sachwert ohne Boden) — {fmt(581_200)} +{' '}
        {fmt(30_000)} = <strong>{fmt(611_200)}</strong>{' '}
        <span className="text-slate-500">
          (davon {fmt(700)} allgemein-nutzbarer Garten · {fmt(610_500)} Etagen-Sachwert)
        </span>
      </div>
      <div className="mt-2 border-t border-slate-200 pt-2 text-[11px] text-slate-500">
        Hinweis: ② und ③ sind zwei verschiedene Kategorien — ② sind Bauten/Anlagen <em>auf</em> dem
        Grund, ③ ist der Wert des Grundes selbst. ① + ② werden zusammen pro Etage betrachtet, weil
        sie räumlich zusammengehören.
      </div>
    </div>
  );
}

function ComponentLine({
  label,
  color,
  desc,
  value,
}: {
  label: string;
  color: string;
  desc: string;
  value: string;
}) {
  return (
    <div className="text-sm">
      <span className="inline-block min-w-[140px]" style={{ color }}>
        <strong>{label}</strong>
      </span>{' '}
      = {desc} — <strong>{value}</strong>
    </div>
  );
}

function Legend() {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="m-0 mb-3 text-sm font-bold">Aufteilungs-Übersicht</h4>
      <div className="grid gap-2 md:grid-cols-2">
        <div
          className="flex items-start gap-3 rounded-lg border-l-4 px-3 py-2.5 text-xs"
          style={{ background: '#d9e9f7', borderLeftColor: '#5a8fd6' }}
        >
          <div className="flex shrink-0 gap-1 pt-0.5">
            <span className="block h-4 w-4 rounded border border-blue-400" style={{ background: '#a4c3e3' }} />
            <span className="block h-4 w-4 rounded border border-green-600" style={{ background: '#b8d8a8' }} />
          </div>
          <div>
            <strong style={{ color: '#2d5a8c' }}>Lisa bekommt die größere Wohnung</strong>
            <div className="mt-1 text-[11px] leading-relaxed text-slate-500">
              ganzes EG + Teile vom OG + Dachgeschoss + Kellergeschoss (Praxis + halbe Garage)
              <br />
              <strong>Blau</strong> = Wohnung · <strong>Grün</strong> = Garten-Anteil + Terrasse SW
            </div>
          </div>
        </div>
        <div
          className="flex items-start gap-3 rounded-lg border-l-4 px-3 py-2.5 text-xs"
          style={{ background: '#f4eecf', borderLeftColor: '#c9b65d' }}
        >
          <div className="flex shrink-0 gap-1 pt-0.5">
            <span className="block h-4 w-4 rounded border border-yellow-600" style={{ background: '#e3d68f' }} />
            <span className="block h-4 w-4 rounded border border-purple-400" style={{ background: '#dcb4d6' }} />
          </div>
          <div>
            <strong style={{ color: '#7a6620' }}>Vicky bekommt die kleinere Wohnung</strong>
            <div className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Teil vom OG + halbe Garage + Lager (KG)
              <br />
              <strong>Gelb</strong> = Wohnung · <strong>Rosa</strong> = Garten-Anteil + Terrasse NO + Balkone
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FloorCard({
  badge,
  badgeColor,
  title,
  subtitle,
  totalValue,
  totalNote,
  image,
  imageAlt,
  colorLegend,
  children,
}: {
  badge: string;
  badgeColor: string;
  title: string;
  subtitle?: string;
  totalValue: React.ReactNode;
  totalNote?: React.ReactNode;
  image?: string;
  imageAlt?: string;
  colorLegend?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3">
        <span
          className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold tracking-wide text-slate-600"
          style={{ borderColor: badgeColor }}
        >
          {badge}
        </span>
        <h4 className="m-0 flex-1 text-sm font-medium text-slate-500">
          {title}{' '}
          {subtitle && (
            <small className="font-normal text-slate-400">({subtitle})</small>
          )}
        </h4>
        <div className="text-base font-bold tabular-nums text-amber-700 md:text-lg">
          {totalValue}
          {totalNote}
        </div>
      </div>
      <div
        className={`grid gap-3 ${image ? 'grid-cols-1 md:grid-cols-[1fr_280px]' : 'grid-cols-1'}`}
      >
        <div className="space-y-2">{children}</div>
        {image && (
          <div>
            <FloorImage src={IMG + image} alt={imageAlt ?? badge} />
            {colorLegend && (
              <details className="mt-2">
                <summary className="cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  🎨 Farb-Erklärung
                </summary>
                <ul className="m-0 mt-1 list-none rounded-md bg-slate-50 p-3 text-xs">
                  {colorLegend}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EditableTotal({
  value,
  onChange,
  color = '#b45309',
  size = 'lg',
}: {
  value: number;
  onChange: (n: number) => void;
  color?: string;
  size?: 'sm' | 'lg';
}) {
  // stopPropagation prevents tapping the input from also toggling the
  // <details> ancestor — a real footgun when the EditableTotal sits in a
  // <summary>.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const dim =
    size === 'sm'
      ? 'w-24 px-2 py-0.5 text-sm md:w-28'
      : 'w-32 px-2 py-1 text-base md:w-40 md:text-lg';
  return (
    <div className="flex items-center gap-1.5" onClick={stop}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">€</span>
      <input
        type="number"
        step={1000}
        inputMode="numeric"
        className={`field text-right font-bold tabular-nums ${dim}`}
        style={{ color }}
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        onFocus={(e) => e.currentTarget.select()}
        onClick={stop}
        onMouseDown={stop}
        onKeyDown={(e) => {
          // prevent Space / Enter from toggling the parent <details>
          if (e.key === ' ' || e.key === 'Enter') stop(e);
        }}
        title="Editable — Lisa- / Vicky-Gesamt aktualisieren sich automatisch"
      />
    </div>
  );
}

function FloorImage({ src, alt }: { src: string; alt: string }) {
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="block">
      <img
        src={src}
        alt={alt}
        className="block w-full max-h-60 cursor-zoom-in rounded-md border border-slate-200 bg-white object-contain"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
          const sib = (e.currentTarget.parentElement as HTMLElement).appendChild(
            document.createElement('div')
          );
          sib.className =
            'flex h-32 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400 px-3 text-center';
          sib.textContent = `📷 Bild fehlt: ${src.split('/').pop()}`;
        }}
      />
    </a>
  );
}

function LegendItem({ color, border, children }: { color: string; border: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 border-b border-dotted border-slate-200/60 py-1 last:border-b-0">
      <span
        className="mt-0.5 inline-block h-3.5 w-3.5 shrink-0 rounded-sm"
        style={{ background: color, border: `1px solid ${border}` }}
      />
      <span>{children}</span>
    </li>
  );
}

function PartySection({
  side,
  label,
  value,
  children,
}: {
  side: 'lisa' | 'vicky';
  label: string;
  value: React.ReactNode;
  children: React.ReactNode;
}) {
  const colors =
    side === 'lisa'
      ? { bg: '#d9e9f7', border: '#5a8fd6', text: '#2d5a8c' }
      : { bg: '#f4eecf', border: '#c9b65d', text: '#7a6620' };
  return (
    <details
      className="helm-disclosure rounded-lg border"
      style={{ background: colors.bg, borderColor: colors.border }}
    >
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm">
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: colors.text }}>
          {label}
        </span>
        <span className="font-bold tabular-nums" style={{ color: colors.text }}>
          {value}
        </span>
      </summary>
      <div className="space-y-2 border-t border-slate-200 bg-white/60 p-2.5">{children}</div>
    </details>
  );
}

function SubExp({
  label,
  smallLabel,
  value,
  children,
}: {
  label: string;
  smallLabel?: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <details className="helm-disclosure rounded-md border border-slate-200 bg-white">
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-xs">
        <span className="text-slate-700">
          {label}
          {smallLabel && <small className="ml-1 font-normal text-slate-500">{smallLabel}</small>}
        </span>
        <span className="font-bold tabular-nums">{value}</span>
      </summary>
      {children && (
        <div className="space-y-1 border-t border-dashed border-slate-200 px-3 py-2 text-xs">
          {children}
        </div>
      )}
    </details>
  );
}

function SubRow({ name, value }: { name: React.ReactNode; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-dotted border-slate-200/60 py-1 last:border-b-0">
      <span className="text-slate-500">{name}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}

function Calc({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600 tabular-nums">
      {children}
    </div>
  );
}

function ColorDot({ color, border }: { color: string; border: string }) {
  return (
    <span
      className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle"
      style={{ background: color, border: `1px solid ${border}` }}
    />
  );
}

function FloorEG() {
  const { egTotal, setEgTotal, s_eg } = useScales();
  const m = (n: number) => n * s_eg;
  return (
    <FloorCard
      badge="EG · Erdgeschoss"
      badgeColor="#6a9a5a"
      title="Gesamtwert"
      totalValue={<EditableTotal value={egTotal} onChange={setEgTotal} />}
      image="eg.jpg"
      imageAlt="EG mit allen Farben"
      colorLegend={
        <>
          <LegendItem color="#a4c3e3" border="#5a8fd6">Blau = Lisa-Wohnung (komplett)</LegendItem>
          <LegendItem color="#b8d8a8" border="#6a9a5a">Grün = Lisa-Garten-Anteil</LegendItem>
          <LegendItem color="#dcb4d6" border="#b07ac0">
            Rosa = Vicky-Garten + Terrasse NO{' '}
            <small className="text-slate-500">(im EG-Niveau, gehört zur OG-Wohnung)</small>
          </LegendItem>
        </>
      }
    >
      <PartySection side="lisa" label="Lisa-Gesamt EG (blau)" value={fmt(egTotal)}>
        <SubExp
          label="Gebäude-Anteil EG"
          smallLabel="(Wohnung + Außen)"
          value={fmt(m(250_400))}
        >
          <SubRow
            name={
              <>
                <ColorDot color="#a4c3e3" border="#5a8fd6" />
                Wohnfläche · 103 m² (blau)
              </>
            }
            value={fmt(m(238_000))}
          />
          <details className="helm-disclosure mt-2 rounded-md border border-green-600/40" style={{ background: '#e7f0e0' }}>
            <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#3d5e2e' }}>
                Außen gesamt (grün) · ~365 m²
              </span>
              <span className="font-bold tabular-nums" style={{ color: '#3d5e2e' }}>
                {fmt(m(12_400))}
              </span>
            </summary>
            <div className="border-t border-dashed border-slate-200 px-3 py-2 text-xs">
              <SubRow
                name={
                  <>
                    <ColorDot color="#b8d8a8" border="#6a9a5a" />
                    Terrasse SW · ~35 m²
                  </>
                }
                value={fmt(m(7_400))}
              />
              <SubRow
                name={
                  <>
                    <ColorDot color="#b8d8a8" border="#6a9a5a" />
                    Garten EG · ~330 m²
                  </>
                }
                value={fmt(m(5_000))}
              />
            </div>
          </details>
        </SubExp>
        <SubExp
          label="Boden-Anteil EG"
          smallLabel="(49,5 % vom Sachwert)"
          value={fmt(m(287_950))}
        >
          <Calc>
            EG-Sachwert: <strong>{fmt(m(250_400))}</strong> (Wohnung {fmt(m(238_000))} + Außen {fmt(m(12_400))})
            <br />
            Boden-Anteil (49,5 % vom Sachwert): <strong>{fmt(m(287_950))}</strong>
          </Calc>
        </SubExp>
        <SubExp label="Markt-Anteil EG" smallLabel="(49,5 % vom Markt)" value={fmt(m(63_540))}>
          <Calc>
            Markt-Anteil (49,5 %): <strong>{fmt(m(63_540))}</strong>
          </Calc>
        </SubExp>
      </PartySection>
    </FloorCard>
  );
}

function FloorOG() {
  const { ogTotal, ogLisa, setOgLisa, ogVicky, setOgVicky } = useScales();
  return (
    <FloorCard
      badge="OG · Obergeschoss"
      badgeColor="#b07ac0"
      title="Gesamtwert"
      subtitle="= Lisa-Teil + Vicky-Teil"
      totalValue={fmt(ogTotal)}
      image="og.jpg"
      imageAlt="OG mit allen Farben"
      colorLegend={
        <>
          <LegendItem color="#a4c3e3" border="#5a8fd6">
            Blau = Lisa-Anteil{' '}
            <small className="text-slate-500">(Zimmer + Bad + Gang/Stiege + Vorr. + AR)</small>
          </LegendItem>
          <LegendItem color="#e3d68f" border="#c9b65d">Gelb = Vicky-Wohnung</LegendItem>
          <LegendItem color="#b8d8a8" border="#6a9a5a">
            Grün = Lisa-Garten <small className="text-slate-500">(im EG-Niveau, hier mitgezeigt)</small>
          </LegendItem>
          <LegendItem color="#dcb4d6" border="#b07ac0">Rosa = Vicky-Garten + Terrasse NO + Balkone</LegendItem>
        </>
      }
    >
      <PartySection
        side="lisa"
        label="Lisa-Teil OG (blau) · ~30 m²"
        value={<EditableTotal value={ogLisa} onChange={setOgLisa} color="#2d5a8c" size="sm" />}
      >
        <SubExp label="Gebäude-Anteil Lisa-OG" smallLabel="(Wohnung)" value={fmt(53_300)}>
          <SubRow
            name={
              <>
                <ColorDot color="#a4c3e3" border="#5a8fd6" />
                Wohnung-Anteil · ~30 m² (blau)
              </>
            }
            value={fmt(53_300)}
          />
        </SubExp>
        <SubExp
          label="Boden-Anteil Lisa-OG"
          smallLabel="(10,5 % vom gew. Sachwert)"
          value={fmt(61_290)}
        >
          <Calc>
            Lisa-OG-Sachwert: <strong>{fmt(53_300)}</strong>
            <br />
            Anteil am gew. Sachwert: 53.300 / 505.800 = <strong>10,5 %</strong>
            <br />
            Boden-Anteil: 10,5 % × {fmt(581_600)} = <strong>{fmt(61_290)}</strong>
          </Calc>
        </SubExp>
        <SubExp
          label="Markt-Anteil Lisa-OG"
          smallLabel="(10,5 % vom Markt)"
          value={fmt(13_520)}
        >
          <Calc>
            Anteil am gew. Sachwert: <strong>10,5 %</strong>
            <br />
            Markt-Anteil: 10,5 % × {fmt(128_341)} = <strong>{fmt(13_520)}</strong>
          </Calc>
        </SubExp>
      </PartySection>

      <PartySection
        side="vicky"
        label="Vicky-Gesamt OG (gelb + rosa)"
        value={<EditableTotal value={ogVicky} onChange={setOgVicky} color="#7a6620" size="sm" />}
      >
        <SubExp
          label="Gebäude-Anteil Vicky-OG"
          smallLabel="(Wohnung + Außen)"
          value={fmt(139_600)}
        >
          <SubRow
            name={
              <>
                <ColorDot color="#e3d68f" border="#c9b65d" />
                Wohnung-Anteil · ~69 m² (gelb)
              </>
            }
            value={fmt(122_700)}
          />
          <details className="helm-disclosure mt-2 rounded-md border border-purple-400/40" style={{ background: '#f0e0ec' }}>
            <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#6e3a76' }}>
                Außen gesamt (rosa) · ~220 m²
              </span>
              <span className="font-bold tabular-nums" style={{ color: '#6e3a76' }}>
                {fmt(16_900)}
              </span>
            </summary>
            <div className="border-t border-dashed border-slate-200 px-3 py-2 text-xs">
              <SubRow
                name={
                  <>
                    <ColorDot color="#dcb4d6" border="#b07ac0" />
                    Terrasse NO · ~50 m²
                  </>
                }
                value={fmt(10_600)}
              />
              <SubRow
                name={
                  <>
                    <ColorDot color="#dcb4d6" border="#b07ac0" />
                    Garten OG · ~150 m²
                  </>
                }
                value={fmt(2_300)}
              />
              <SubRow
                name={
                  <>
                    <ColorDot color="#dcb4d6" border="#b07ac0" />
                    Balkone West + Ost · ~20 m²
                  </>
                }
                value={fmt(4_000)}
              />
            </div>
          </details>
        </SubExp>
        <SubExp
          label="Boden-Anteil Vicky-OG"
          smallLabel="(27,6 % vom gew. Sachwert)"
          value={fmt(160_530)}
        >
          <Calc>
            Vicky-OG-Sachwert: <strong>{fmt(139_600)}</strong>
            <br />
            Anteil am gew. Sachwert: 139.600 / 505.800 = <strong>27,6 %</strong>
            <br />
            Boden-Anteil: 27,6 % × {fmt(581_600)} = <strong>{fmt(160_530)}</strong>
          </Calc>
        </SubExp>
        <SubExp
          label="Markt-Anteil Vicky-OG"
          smallLabel="(27,6 % vom Markt)"
          value={fmt(35_430)}
        >
          <Calc>
            Anteil am gew. Sachwert: <strong>27,6 %</strong>
            <br />
            Markt-Anteil: 27,6 % × {fmt(128_341)} = <strong>{fmt(35_430)}</strong>
          </Calc>
        </SubExp>
      </PartySection>
    </FloorCard>
  );
}

function FloorKGPraxis() {
  const { praxisFull, setPraxisFull } = useScales();
  return (
    <FloorCard
      badge="KG · Praxis"
      badgeColor="#6a8aa6"
      title="Gesamtwert"
      subtitle="nur Praxis, ohne Garage"
      totalValue={<EditableTotal value={praxisFull} onChange={setPraxisFull} />}
      image="kg.jpg"
      imageAlt="KG gefärbt · Praxis blau"
      colorLegend={
        <>
          <LegendItem color="#a4c3e3" border="#5a8fd6">Blau = Praxis-Räume (Lisa) · ~115 m²</LegendItem>
          <li className="text-[11px] italic text-slate-500">Garage und Lager rechts → siehe nächste Karte</li>
        </>
      }
    >
      <PartySection side="lisa" label="Lisa-Anteil KG-Praxis (blau) · ~115 m²" value={fmt(praxisFull)}>
        <SubExp
          label="Gebäude-Anteil Praxis"
          smallLabel="(leer bewertet, ~€ 706/m²)"
          value={fmt(81_200)}
        >
          <SubRow
            name={
              <>
                <ColorDot color="#a4c3e3" border="#5a8fd6" />
                Praxis-Räume · ~115 m² (blau)
              </>
            }
            value={fmt(81_200)}
          />
        </SubExp>
        <SubExp
          label="Boden-Anteil Praxis"
          smallLabel="(8,0 % vom gew. Sachwert)"
          value={fmt(46_700)}
        >
          <Calc>
            Praxis-Sachwert: <strong>{fmt(81_200)}</strong>
            <br />
            Anteil am gew. Sachwert (Faktor 0,5): 40.600 / 505.800 = <strong>8,0 %</strong>
            <br />
            Boden-Anteil: 8,0 % × {fmt(581_600)} = <strong>{fmt(46_700)}</strong>
          </Calc>
        </SubExp>
        <SubExp label="Markt-Anteil Praxis" smallLabel="(8,0 % vom Markt)" value={fmt(10_310)}>
          <Calc>
            Anteil am gew. Sachwert: <strong>8,0 %</strong>
            <br />
            Markt-Anteil: 8,0 % × {fmt(128_341)} = <strong>{fmt(10_310)}</strong>
          </Calc>
        </SubExp>
      </PartySection>
    </FloorCard>
  );
}

function FloorKGGarage() {
  const { garageTotal, setGarageTotal } = useScales();
  return (
    <FloorCard
      badge="KG · Garage"
      badgeColor="#8a7a6a"
      title="Gesamtwert"
      subtitle="Garage halbiert + Lager Vicky"
      totalValue={<EditableTotal value={garageTotal} onChange={setGarageTotal} />}
      image="kg.jpg"
      imageAlt="KG · Garage halbiert + Lager"
      colorLegend={
        <>
          <LegendItem color="#a4c3e3" border="#5a8fd6">Blau = ½ Garage (Lisa) · ~20,5 m²</LegendItem>
          <LegendItem color="#e3d68f" border="#c9b65d">Gelb = ½ Garage + Lager (Vicky) · ~25,7 m²</LegendItem>
        </>
      }
    >
      <PartySection side="lisa" label="Lisa-Anteil Garage (blau) · ~20,5 m²" value={fmt(26_250)}>
        <SubExp
          label="Gebäude-Anteil Lisa-Garage"
          smallLabel="(½ Garage)"
          value={fmt(20_500)}
        >
          <SubRow
            name={
              <>
                <ColorDot color="#a4c3e3" border="#5a8fd6" />
                Garage Lisa (½) · ~20,5 m²
              </>
            }
            value={fmt(20_500)}
          />
        </SubExp>
        <SubExp
          label="Boden-Anteil Lisa-Garage"
          smallLabel="(0,81 % vom gew. Sachwert)"
          value={fmt(4_710)}
        >
          <Calc>
            Lisa-Garage-Sachwert: <strong>{fmt(20_500)}</strong>
            <br />
            Anteil am gew. Sachwert (Faktor 0,2): 4.100 / 505.800 = <strong>0,81 %</strong>
            <br />
            Boden-Anteil: 0,81 % × {fmt(581_600)} = <strong>{fmt(4_710)}</strong>
          </Calc>
        </SubExp>
        <SubExp
          label="Markt-Anteil Lisa-Garage"
          smallLabel="(0,81 % vom Markt)"
          value={fmt(1_040)}
        >
          <Calc>
            Anteil am gew. Sachwert: <strong>0,81 %</strong>
            <br />
            Markt-Anteil: 0,81 % × {fmt(128_341)} = <strong>{fmt(1_040)}</strong>
          </Calc>
        </SubExp>
      </PartySection>

      <PartySection side="vicky" label="Vicky-Anteil Garage (gelb) · ~25,7 m²" value={fmt(32_670)}>
        <SubExp
          label="Gebäude-Anteil Vicky-Garage"
          smallLabel="(½ Garage + Lager)"
          value={fmt(25_500)}
        >
          <SubRow
            name={
              <>
                <ColorDot color="#e3d68f" border="#c9b65d" />
                Garage Vicky (½) · ~20,5 m²
              </>
            }
            value={fmt(20_500)}
          />
          <SubRow
            name={
              <>
                <ColorDot color="#e3d68f" border="#c9b65d" />
                Lager · 5,18 m² (gelb)
              </>
            }
            value={fmt(5_000)}
          />
        </SubExp>
        <SubExp
          label="Boden-Anteil Vicky-Garage"
          smallLabel="(1,01 % vom gew. Sachwert)"
          value={fmt(5_870)}
        >
          <Calc>
            Vicky-Garage-Sachwert: <strong>{fmt(25_500)}</strong> (½ Garage {fmt(20_500)} + Lager{' '}
            {fmt(5_000)})
            <br />
            Anteil am gew. Sachwert (Faktor 0,2 für beide): 5.100 / 505.800 ={' '}
            <strong>1,01 %</strong>
            <br />
            Boden-Anteil: 1,01 % × {fmt(581_600)} = <strong>{fmt(5_870)}</strong>
          </Calc>
        </SubExp>
        <SubExp
          label="Markt-Anteil Vicky-Garage"
          smallLabel="(1,01 % vom Markt)"
          value={fmt(1_300)}
        >
          <Calc>
            Anteil am gew. Sachwert: <strong>1,01 %</strong>
            <br />
            Markt-Anteil: 1,01 % × {fmt(128_341)} = <strong>{fmt(1_300)}</strong>
          </Calc>
        </SubExp>
      </PartySection>
    </FloorCard>
  );
}

function FloorDG() {
  const { dgFull, setDgFull } = useScales();
  return (
    <div
      className="rounded-xl border p-4 shadow-sm"
      style={{
        background: 'linear-gradient(135deg, #fff8ec 0%, #fdf2db 100%)',
        borderColor: '#f5e3c5',
      }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3">
        <span
          className="rounded-md border bg-white px-3 py-1 text-xs font-bold tracking-wide"
          style={{ color: '#c98b3a', borderColor: '#c98b3a' }}
        >
          DG · Dachgeschoss
        </span>
        <h4 className="m-0 flex-1 text-sm font-medium text-slate-500">Gesamtwert</h4>
        <EditableTotal value={dgFull} onChange={setDgFull} color="#c98b3a" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_280px]">
        <div className="space-y-2">
        <PartySection side="lisa" label="Lisa-Anteil DG (blau) · ~120 m² brutto" value={fmt(dgFull)}>
          <SubExp
            label="Gebäude-Anteil DG"
            smallLabel="(Bauwerk-Substanz)"
            value={fmt(40_000)}
          >
            <SubRow
              name={
                <>
                  <ColorDot color="#a4c3e3" border="#5a8fd6" />
                  Bauwerk-Wert (Substanz + Ausbauoption)
                </>
              }
              value={fmt(40_000)}
            />
            <SubRow name="Bruttofläche" value="~120 m²" />
            <SubRow name="Ausbaubar (mit Dachschräge)" value="~40–50 m²" />
            <SubRow name="Erschließung" value="via OG-Aufgang (Lisa-Stiege)" />
          </SubExp>
          <SubExp
            label="Boden-Anteil DG"
            smallLabel="(2,4 % vom gew. Sachwert)"
            value={fmt(13_780)}
          >
            <Calc>
              DG-Sachwert: <strong>{fmt(40_000)}</strong>
              <br />
              Anteil am gew. Sachwert (Faktor 0,3): 12.000 / 505.800 = <strong>2,4 %</strong>
              <br />
              Boden-Anteil: 2,4 % × {fmt(581_600)} = <strong>{fmt(13_780)}</strong>
            </Calc>
          </SubExp>
          <SubExp label="Markt-Anteil DG" smallLabel="(2,4 % vom Markt)" value={fmt(3_040)}>
            <Calc>
              Anteil am gew. Sachwert: <strong>2,4 %</strong>
              <br />
              Markt-Anteil: 2,4 % × {fmt(128_341)} = <strong>{fmt(3_040)}</strong>
            </Calc>
          </SubExp>
        </PartySection>
        <div className="rounded-md bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
          <strong>So wie es ist ({fmt(40_000)}):</strong> Bauwerk-Substanz + Ausbauoption für ~40–50
          m² Wohnfläche · im Sachwert {fmt(581_200)} enthalten.
          <br />
          <strong>Höhe:</strong> Steiles Walmdach · volle Raumhöhe nur im mittleren Drittel · für
          volle 120 m² wäre Dachanhebung/Gauben nötig.
        </div>
        </div>
        <div>
          <FloorImage src={IMG + 'dg.jpg'} alt="DG Grundriss · unausgebaut" />
          <details className="mt-2">
            <summary className="cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              🎨 Farb-Erklärung
            </summary>
            <ul className="m-0 mt-1 list-none rounded-md bg-slate-50 p-3 text-xs">
              <LegendItem color="#a4c3e3" border="#5a8fd6">
                Blau = Lisa-Anteil <small className="text-slate-500">(noch nicht eingefärbt im Plan)</small>
              </LegendItem>
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}

function TotalOverview() {
  const { lisaTotal, vickyTotal, helmhausTotal, package_, reset } = useScales();
  const lisaPct = helmhausTotal > 0 ? (lisaTotal / helmhausTotal) * 100 : 0;
  const vickyPct = helmhausTotal > 0 ? (vickyTotal / helmhausTotal) * 100 : 0;
  const helmhausDiff = helmhausTotal - A.HELMHAUS_TOTAL;
  const packageDiff = package_ - PACKAGE_TARGET;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="m-0 mb-3 text-base font-bold">Gesamt-Übersicht — Aufteilung Lisa + Vicky</h4>
      <div className="grid gap-4 md:grid-cols-2">
        <PartyTotal
          side="lisa"
          name="Lisa"
          pct={`~${lisaPct.toFixed(0)} % Anteil`}
          total={fmt(lisaTotal)}
          gebaeudeTotal={fmt(445_750)}
          bodenTotal={fmt(414_840)}
          marktTotal={fmt(91_540)}
          gebaeudeBreakdown={[
            { label: 'EG (Wohnung + Außen)', value: fmt(250_400) },
            { label: 'OG · Lisa-Teil (Wohnung)', value: fmt(53_300) },
            { label: 'KG · Lisa-Anteil (Praxis + ½ Garage)', value: fmt(101_700) },
            { label: 'DG (Bauwerk-Substanz)', value: fmt(40_000) },
            { label: 'Garten allgemein 50 %', value: fmt(350) },
          ]}
          bodenCalc={
            <>
              Lisa-Anteil am Sachwert: <strong>~71,3 %</strong>
              <br />
              Boden-Anteil: 71,3 % × {fmt(581_600)} = <strong>{fmt(414_840)}</strong>
              <br />
              <em>
                (EG {fmt(287_950)} + OG-Lisa {fmt(61_290)} + KG-Lisa {fmt(51_410)} + DG{' '}
                {fmt(13_780)} + ½Allg {fmt(410)})
              </em>
            </>
          }
          marktCalc={
            <>
              Lisa-Anteil am Sachwert: <strong>~71,3 %</strong>
              <br />
              Markt-Anteil: 71,3 % × {fmt(128_341)} = <strong>{fmt(91_540)}</strong>
              <br />
              <em>
                (EG {fmt(63_540)} + OG-Lisa {fmt(13_520)} + KG-Lisa {fmt(11_350)} + DG {fmt(3_040)}{' '}
                + ½Allg {fmt(90)})
              </em>
            </>
          }
        />
        <PartyTotal
          side="vicky"
          name="Vicky"
          pct={`~${vickyPct.toFixed(0)} % Anteil`}
          total={fmt(vickyTotal)}
          gebaeudeTotal={fmt(165_450)}
          bodenTotal={fmt(166_810)}
          marktTotal={fmt(36_820)}
          gebaeudeBreakdown={[
            { label: 'OG · Vicky-Teil (Wohnung + Außen)', value: fmt(139_600) },
            { label: 'KG · Vicky-Anteil (½ Garage + Lager)', value: fmt(25_500) },
            { label: 'Garten allgemein 50 %', value: fmt(350) },
          ]}
          bodenCalc={
            <>
              Vicky-Anteil am Sachwert: <strong>~28,7 %</strong>
              <br />
              Boden-Anteil: 28,7 % × {fmt(581_600)} = <strong>{fmt(166_810)}</strong>
              <br />
              <em>
                (OG-Vicky {fmt(160_530)} + KG-Vicky {fmt(5_870)} + ½Allg {fmt(410)})
              </em>
            </>
          }
          marktCalc={
            <>
              Vicky-Anteil am Sachwert: <strong>~28,7 %</strong>
              <br />
              Markt-Anteil: 28,7 % × {fmt(128_341)} = <strong>{fmt(36_820)}</strong>
              <br />
              <em>
                (OG-Vicky {fmt(35_430)} + KG-Vicky {fmt(1_300)} + ½Allg {fmt(90)})
              </em>
            </>
          }
        />
      </div>

      <div
        className="mt-4 rounded-xl border-2 border-amber-500 px-4 py-3 text-center"
        style={{ background: 'linear-gradient(135deg, #fdf8ec 0%, #fbf2dc 100%)' }}
      >
        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
          Σ Lisa + Vicky = Verkehrswert
        </div>
        <div className="mt-1.5 flex flex-wrap items-baseline justify-center gap-2">
          <span className="text-sm font-bold" style={{ color: '#2d5a8c' }}>
            {fmt(lisaTotal)}
          </span>
          <span className="text-slate-500">+</span>
          <span className="text-sm font-bold" style={{ color: '#7a6620' }}>
            {fmt(vickyTotal)}
          </span>
          <span className="text-slate-500">=</span>
          <span className="text-2xl font-bold tabular-nums text-amber-700">
            {fmt(helmhausTotal)}
          </span>
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Schätzungs-Verkehrswert {fmt(A.HELMHAUS_TOTAL)} ·{' '}
          <span className={Math.abs(helmhausDiff) < 50 ? 'text-emerald-700' : 'text-rose-700'}>
            Differenz {helmhausDiff >= 0 ? '+' : ''}
            {fmt(helmhausDiff)}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs">
          <span>
            Buyout-Paket (½ Praxis + ½ DG + OG-Lisa):{' '}
            <strong className="tabular-nums">{fmt(package_)}</strong>
          </span>
          <span
            className={Math.abs(packageDiff) < 50 ? 'text-emerald-700' : 'text-rose-700'}
          >
            Ziel {fmt(PACKAGE_TARGET)}{' · '}
            {Math.abs(packageDiff) < 50 ? '✓' : `Δ ${fmt(packageDiff)}`}
          </span>
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
          >
            ↺ Zurücksetzen
          </button>
        </div>
      </div>
    </div>
  );
}

function PartyTotal({
  side,
  name,
  pct,
  total,
  gebaeudeTotal,
  bodenTotal,
  marktTotal,
  gebaeudeBreakdown,
  bodenCalc,
  marktCalc,
}: {
  side: 'lisa' | 'vicky';
  name: string;
  pct: string;
  total: string;
  gebaeudeTotal: string;
  bodenTotal: string;
  marktTotal: string;
  gebaeudeBreakdown: { label: string; value: string }[];
  bodenCalc: React.ReactNode;
  marktCalc: React.ReactNode;
}) {
  const colors =
    side === 'lisa'
      ? {
          gradient: 'linear-gradient(135deg, #d9e9f7 0%, #e8f1de 100%)',
          border: '#5a8fd6',
          text: '#2d5a8c',
        }
      : {
          gradient: 'linear-gradient(135deg, #f4eecf 0%, #f0e0ec 100%)',
          border: '#c9b65d',
          text: '#7a6620',
        };
  return (
    <div
      className="rounded-xl border-2 p-4"
      style={{ background: colors.gradient, borderColor: colors.border }}
    >
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {name} · {pct}
      </div>
      <h5 className="m-0 mt-1 text-base font-bold" style={{ color: colors.text }}>
        {name}-Gesamt
      </h5>
      <div className="mt-1 text-2xl font-bold tabular-nums">{total}</div>
      <div className="text-xs text-slate-500">Gebäude + Boden + Markt + Allgemein-Garten</div>

      <div className="mt-3 space-y-2">
        <SubExp
          label="Gebäude-Anteil gesamt"
          smallLabel="(inkl. Außen + Allgemein 50 %)"
          value={gebaeudeTotal}
        >
          {gebaeudeBreakdown.map((row, i) => (
            <SubRow key={i} name={row.label} value={row.value} />
          ))}
        </SubExp>
        <SubExp label="Boden-Anteil gesamt" value={bodenTotal}>
          <Calc>{bodenCalc}</Calc>
        </SubExp>
        <SubExp label="Markt-Anteil gesamt" value={marktTotal}>
          <Calc>{marktCalc}</Calc>
        </SubExp>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 rounded-md bg-black/5 px-3 py-2 text-sm font-bold">
        <span>{name}-Gesamt</span>
        <span className="tabular-nums">{total}</span>
      </div>
    </div>
  );
}

function Explanations() {
  return (
    <div>
      <h3 className="mt-6 text-base font-bold">📚 Erklärungen &amp; Hintergrund</h3>
      <div className="mt-2 space-y-2">
        <ExplainDrop title="ⓘ Wie kommen die EG- und OG-Wohnungswerte zustande? (Aufschlag-Logik)">
          <p>
            <strong>Warum ist das EG pro m² teurer als das OG?</strong>
          </p>
          <ul className="ml-4 mt-2 list-disc space-y-1 text-xs">
            <li>
              <strong style={{ color: '#2d5a8c' }}>EG (Hauptwohnetage):</strong> direkter Garten-/Terrassen-Zugang
              vom Wohnzimmer · barrierefrei (Eltern-Wohn-tauglich) · klassisch die "schönere"
              Wohnetage
            </li>
            <li>
              <strong style={{ color: '#7a6620' }}>OG:</strong> nur indirekter Garten-Zugang über das
              Hauptstiegenhaus · separater Eingang aber Treppen erforderlich · sonst gleichwertige
              Wohnung mit eigenem Garten- + Terrassen-Anteil
            </li>
          </ul>
          <p className="mt-3">
            <strong>Aufschlag-Optionen</strong> — der Aufschlag ist der Prozentsatz, um den der
            EG-m²-Preis höher ist als der OG-m²-Preis:
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-300 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-2 py-1.5 text-left">Aufschlag</th>
                  <th className="px-2 py-1.5 text-right">EG/m²</th>
                  <th className="px-2 py-1.5 text-right">OG/m²</th>
                  <th className="px-2 py-1.5 text-right">EG total</th>
                  <th className="px-2 py-1.5 text-right">OG total</th>
                  <th className="px-2 py-1.5 text-left">wann sinnvoll</th>
                </tr>
              </thead>
              <tbody>
                <AufschlagRow
                  pct="0 %"
                  egPerM={fmt(2_011)}
                  ogPerM={fmt(2_011)}
                  egTotal={fmt(207_100)}
                  ogTotal={fmt(199_100)}
                  note="beide gleich · untypisch"
                />
                <AufschlagRow
                  pct="15 %"
                  egPerM={fmt(2_190)}
                  ogPerM={fmt(1_904)}
                  egTotal={fmt(225_600)}
                  ogTotal={fmt(188_500)}
                  note="milder Aufschlag"
                />
                <AufschlagRow
                  pct="30 % ✓"
                  egPerM={fmt(2_311)}
                  ogPerM={fmt(1_778)}
                  egTotal={fmt(238_000)}
                  ogTotal={fmt(176_000)}
                  note="aktuell gewählt · Standard für EG mit Garten"
                  active
                />
                <AufschlagRow
                  pct="50 %"
                  egPerM={fmt(2_450)}
                  ogPerM={fmt(1_633)}
                  egTotal={fmt(252_400)}
                  ogTotal={fmt(161_700)}
                  note="starker Aufschlag"
                />
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Bei jeder Variante bleibt EG + OG = {fmt(414_000)} (Wohnungs-Anteil aus dem Gebäudewert).
            Der Aufschlag verteilt diesen Wert nur unterschiedlich auf EG und OG.
          </p>
        </ExplainDrop>

        <ExplainDrop title="ⓘ Wie funktioniert die Marktanpassung von € 128.341?">
          <p>
            Die Marktanpassung {fmt(128_341)} wirkt <strong>nicht nur auf das Grundstück</strong>,
            sondern auf den <strong>gesamten Sachwert</strong> (Gebäude + Außenanlagen + Boden ={' '}
            {fmt(1_192_800)}).
          </p>
          <Calc>
            Sachwert {fmt(1_192_800)} × 1,1076 = Verkehrswert {fmt(1_321_141)}
            <br />↑ Marktanpassungs-Faktor (+10,76 %)
          </Calc>
          <p className="mt-2">
            Der Gutachter hat netto <strong>+10,76 %</strong> angewendet:
          </p>
          <ul className="ml-4 list-disc space-y-1 text-xs">
            <li>
              <strong>+10 %</strong> allgemeiner Markt-Aufschlag (Sanierungsbedarf eingepreist)
            </li>
            <li>
              <strong>−10 %</strong> Abschlag wegen Fluss-Nähe (Gefahrenzone)
            </li>
            <li>→ Netto bleibt ein kleiner positiver Rest = {fmt(128_341)}</li>
          </ul>
          <p className="mt-2 text-xs">
            Wenn Lisa und Vicky den Sachwert teilen (~71 % / ~29 %), wird die Marktanpassung
            automatisch im selben Verhältnis aufgeteilt:
            <br />
            <strong style={{ color: '#2d5a8c' }}>Lisa: ~71 % × {fmt(128_341)} = {fmt(91_540)}</strong>
            <br />
            <strong style={{ color: '#7a6620' }}>Vicky: ~29 % × {fmt(128_341)} = {fmt(36_820)}</strong>
          </p>
        </ExplainDrop>

        <ExplainDrop title="📐 Wie wird der Bodenwert € 581.600 auf die Etagen verteilt?">
          <p>
            Der Bodenwert wird nach <strong>gewichtetem Wert-Anteil</strong> jeder Etage am Sachwert
            verteilt. Wohn-Etagen tragen voll mit (Faktor 1,0), Praxis (0,5), Garage/Lager (0,2) und
            DG (0,3) tragen weniger.
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-300 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-2 py-1.5 text-left">Etage / Anteil</th>
                  <th className="px-2 py-1.5 text-right">Sachwert</th>
                  <th className="px-2 py-1.5 text-right">Anteil</th>
                  <th className="px-2 py-1.5 text-right">Boden-Anteil</th>
                </tr>
              </thead>
              <tbody>
                <BodenRow
                  label="KG · Praxis + ½ Garage (Lisa)"
                  side="lisa"
                  sachwert={fmt(101_700)}
                  pct="8,8 %"
                  boden={fmt(51_410)}
                />
                <BodenRow
                  label="KG · ½ Garage + Lager (Vicky)"
                  side="vicky"
                  sachwert={fmt(25_500)}
                  pct="1,01 %"
                  boden={fmt(5_870)}
                />
                <BodenRow
                  label="EG · Wohnung + Außen (Lisa)"
                  side="lisa"
                  sachwert={fmt(250_400)}
                  pct="49,5 %"
                  boden={fmt(287_950)}
                />
                <BodenRow
                  label="OG · Lisa-Teil (blau)"
                  side="lisa"
                  sachwert={fmt(53_300)}
                  pct="10,5 %"
                  boden={fmt(61_290)}
                />
                <BodenRow
                  label="OG · Vicky-Teil (gelb + rosa)"
                  side="vicky"
                  sachwert={fmt(139_600)}
                  pct="27,6 %"
                  boden={fmt(160_530)}
                />
                <BodenRow
                  label="DG (Lisa)"
                  side="lisa"
                  sachwert={fmt(40_000)}
                  pct="2,4 %"
                  boden={fmt(13_780)}
                />
                <tr className="border-t-2 border-amber-500 bg-amber-50 font-bold">
                  <td className="px-2 py-1.5">Σ Sachwert / Boden</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmt(610_500)}</td>
                  <td className="px-2 py-1.5 text-right">100 %</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmt(580_830)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] italic text-slate-500">
            Σ Boden hier {fmt(580_830)} + {fmt(820)} (Allgemein-Garten) = {fmt(581_650)} ≈ {fmt(581_600)}{' '}
            ✓ (kleine Rundungen)
          </p>
          <p className="mt-2 text-xs text-slate-500">
            <strong>Warum nach gewichtetem Wert?</strong> Eine Wohnetage trägt Boden voll mit (Faktor
            1,0). Praxis (0,5) und Garage/Lager (0,2) tragen weniger. Das DG (0,3) trägt nur
            teilweise, weil es den Boden nicht direkt belastet (über EG+OG erschlossen).
            <br />
            <strong>Konsequenz:</strong> Die EG (höchster Wohnwert) bekommt 49,5 % des Bodens, das
            DG nur 2,4 %.
          </p>
        </ExplainDrop>

        <ExplainDrop title="🛋️ Ausstattungs-Aufschlag — warum nicht angewendet?">
          <p>
            Schätzer wenden manchmal einen <strong>Ausstattungs-Aufschlag</strong> an, wenn eine
            Wohnung deutlich besser ausgestattet ist als der Standard (höherwertige Böden, Bäder,
            Küche, mit-übergebenes Inventar). Das ist ein <strong>separater Hebel</strong> vom
            Etage-Aufschlag (30 % EG vs OG, der die Garten-Anbindung abbildet).
          </p>
          <p className="mt-2">
            <strong>Warum nicht angewendet:</strong> Bei diesem Haus ist die EG-Wohnung tatsächlich
            schöner eingerichtet. Aber der bestehende 30-%-Etage-Aufschlag liefert <em>bereits</em>{' '}
            einen klaren EG-vs-OG-Unterschied:
          </p>
          <Calc>
            <strong>EG-Total: {fmt(601_890)}</strong> · <strong>OG-Total: {fmt(463_670)}</strong> ·
            Differenz: <strong style={{ color: '#b08a3e' }}>{fmt(138_220)}</strong>
          </Calc>
          <p className="mt-2 text-xs text-slate-500">
            Ein zusätzlicher Ausstattungs-Aufschlag (z.B. +15 %) würde diese Differenz auf ~{fmt(225_000)}{' '}
            vergrößern — möglicherweise zu stark.
          </p>
        </ExplainDrop>
      </div>
    </div>
  );
}

function AufschlagRow({
  pct,
  egPerM,
  ogPerM,
  egTotal,
  ogTotal,
  note,
  active,
}: {
  pct: string;
  egPerM: string;
  ogPerM: string;
  egTotal: string;
  ogTotal: string;
  note: string;
  active?: boolean;
}) {
  return (
    <tr
      className={
        active
          ? 'border-2 border-amber-500 bg-amber-50 font-bold'
          : 'border-b border-dashed border-slate-200'
      }
    >
      <td className="px-2 py-1.5">
        <strong>{pct}</strong>
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums">{egPerM}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{ogPerM}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{egTotal}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{ogTotal}</td>
      <td className={`px-2 py-1.5 ${active ? 'text-amber-700' : 'text-slate-500'}`}>{note}</td>
    </tr>
  );
}

function BodenRow({
  label,
  side,
  sachwert,
  pct,
  boden,
}: {
  label: string;
  side: 'lisa' | 'vicky';
  sachwert: string;
  pct: string;
  boden: string;
}) {
  const color = side === 'lisa' ? '#2d5a8c' : '#7a6620';
  return (
    <tr className="border-b border-dashed border-slate-200">
      <td className="px-2 py-1.5">{label}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{sachwert}</td>
      <td className="px-2 py-1.5 text-right">{pct}</td>
      <td className="px-2 py-1.5 text-right tabular-nums" style={{ color }}>
        {boden}
      </td>
    </tr>
  );
}

function ExplainDrop({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details
      className="overflow-hidden rounded-xl border shadow-sm"
      style={{
        background: 'linear-gradient(135deg, #fdfbf6 0%, #f7f1e3 100%)',
        borderColor: '#f4ead2',
      }}
    >
      <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-amber-700">
        {title}
      </summary>
      <div className="space-y-2 px-4 pb-4 text-xs leading-relaxed">{children}</div>
    </details>
  );
}

function DetailedTable() {
  return (
    <details className="rounded-xl border border-amber-200 bg-amber-50/50 shadow-sm">
      <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-amber-700">
        📊 Detaillierte Bereichs-Tabelle (klicken zum Ausklappen)
      </summary>
      <div className="overflow-x-auto px-4 pb-4">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-300 text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-2 py-2 text-left">Bereich</th>
              <th className="px-2 py-2 text-left">Lage</th>
              <th className="px-2 py-2 text-right">Fläche</th>
              <th className="px-2 py-2 text-right">Wert</th>
            </tr>
          </thead>
          <tbody>
            <BereichRow tag="praxis" name="Tierarztpraxis" lage="KG" area="~115 m²" value={fmt(81_200)} note='"leer" bewertet' />
            <BereichRow
              tag="garage"
              name="Garage"
              lage="KG"
              area="41 m²"
              value={fmt(41_000)}
              note="halbiert · je € 20.500"
            />
            <BereichRow
              tag="garage"
              name="Lager"
              lage="KG"
              area="5,18 m²"
              value={fmt(5_000)}
              note="→ Vicky"
            />
            <BereichRow
              tag="eg"
              name="Wohnung Erdgeschoss"
              lage="EG"
              area="103 m²"
              value={fmt(238_000)}
              note="€ 2.311/m²"
            />
            <BereichRow
              tag="og"
              name="Wohnung Obergeschoss"
              lage="OG"
              area="99 m²"
              value={fmt(176_000)}
              note="€ 1.778/m²"
            />
            <BereichRow
              tag="dg"
              name="Dachgeschoss"
              lage="DG"
              area="~120 m² brutto"
              value={fmt(40_000)}
              note="unausgebaut · Substanz + Ausbauoption"
            />
            <SubtotalRow label="Zwischensumme Gebäude (inkl. DG)" value={fmt(581_200)} />
            <BereichRow tag="eg" name="Terrasse Süd-West" lage="EG außen" area="~35 m²" value={fmt(7_400)} note="→ EG" />
            <BereichRow tag="og" name="Terrasse Nord-Ost" lage="OG außen" area="~50 m²" value={fmt(10_600)} note="→ OG" />
            <BereichRow
              tag="og"
              name="Balkone OG (West + Ost)"
              lage="OG außen"
              area="~20 m²"
              value={fmt(4_000)}
              note="→ OG"
            />
            <BereichRow
              tag="eg"
              name="Garten EG-Anteil"
              lage="EG außen"
              area="~330 m²"
              value={fmt(5_000)}
              note="grüne Fläche · → EG"
            />
            <BereichRow
              tag="og"
              name="Garten OG-Anteil"
              lage="OG außen"
              area="~150 m²"
              value={fmt(2_300)}
              note="rosa Fläche · → OG"
            />
            <BereichRow
              tag="allg"
              name="Garten allgemein"
              lage="außen"
              area="~47 m²"
              value={fmt(700)}
              note="geteilt"
            />
            <SubtotalRow label="Zwischensumme Außenanlagen" value={fmt(30_000)} />
            <BereichRow
              tag="boden"
              name="Grundstück (Bodenwert)"
              lage="gesamt"
              area="727 m²"
              value={fmt(581_600)}
            />
            <SubtotalRow label="Zwischensumme Sachwert" value={fmt(1_192_800)} />
            <tr className="text-slate-500 italic">
              <td colSpan={3} className="px-2 py-1.5">
                Marktanpassung netto (+10 % Sanierungen / −10 % Fluss-Nähe)
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">+{fmt(128_341)}</td>
            </tr>
            <tr
              className="border-t-2 border-slate-800 font-bold"
              style={{ background: '#f4ead2' }}
            >
              <td colSpan={3} className="px-2 py-2">
                Verkehrswert (Schätzung) — inkl. DG (unausgebaut)
              </td>
              <td className="px-2 py-2 text-right tabular-nums">{fmt(1_321_141)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="px-4 pb-4 text-[11px] text-slate-500">
        Methode: Sachwertverfahren · Gutachterin: Annalisa Sanzi (PlanetHome Immobilien Austria) ·
        27.02.2024 · Das DG ist als Bauwerk im Sachwert bereits enthalten.
      </div>
    </details>
  );
}

function BereichRow({
  tag,
  name,
  lage,
  area,
  value,
  note,
}: {
  tag: 'praxis' | 'garage' | 'eg' | 'og' | 'dg' | 'allg' | 'boden';
  name: string;
  lage: string;
  area: string;
  value: string;
  note?: string;
}) {
  const tagColor: Record<string, string> = {
    praxis: '#6a8aa6',
    garage: '#8a7a6a',
    eg: '#6a9a5a',
    og: '#b07ac0',
    dg: '#c98b3a',
    allg: '#9a9a9a',
    boden: '#a06a4e',
  };
  return (
    <tr className="border-b border-slate-200">
      <td className="px-2 py-1.5">
        <span
          className="mr-1.5 inline-block h-2 w-2 rounded-full"
          style={{ background: tagColor[tag] }}
        />
        <strong>{name}</strong>
        {note && <small className="ml-1 text-slate-500">· {note}</small>}
      </td>
      <td className="px-2 py-1.5">{lage}</td>
      <td className="px-2 py-1.5 text-right text-slate-500 tabular-nums">{area}</td>
      <td className="px-2 py-1.5 text-right font-bold tabular-nums">{value}</td>
    </tr>
  );
}

function SubtotalRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-dashed border-slate-300 bg-slate-50 font-bold">
      <td colSpan={3} className="px-2 py-1.5">
        {label}
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums">{value}</td>
    </tr>
  );
}

/**
 * Interactive adjustment tool. Lets the user experiment with different card
 * Gesamtwert values, the EG/OG-Aufschlag percentage, and the target
 * Verkehrswert — and see for each card a "Vorschlag" of what its value
 * would have to be to balance the calculation. The displayed numbers in
 * the cards above don't change; this is a separate playground at the
 * bottom for "what-if" exploration.
 */
const DEFAULT_CARD_VALUES = {
  eg: 601_890,
  ogLisa: 128_110,
  ogVicky: 335_560,
  praxis: 138_210,
  lisaGarage: 26_250,
  vickyGarageLager: 32_670,
  dg: 56_820,
  allg: 1_700,
};

type CardKey = keyof typeof DEFAULT_CARD_VALUES;

const CARD_LABELS: Record<CardKey, string> = {
  eg: 'EG · Erdgeschoss',
  ogLisa: 'OG · Lisa-Teil (~30 m²)',
  ogVicky: 'OG · Vicky-Teil (~69 m² + Außen)',
  praxis: 'KG · Praxis',
  lisaGarage: 'KG · Lisa-Garage (½)',
  vickyGarageLager: 'KG · Vicky-Garage (½) + Lager',
  dg: 'DG · Dachgeschoss',
  allg: 'Garten allgemein',
};

const CARD_TONE: Record<CardKey, string> = {
  eg: '#6a9a5a',
  ogLisa: '#5a8fd6',
  ogVicky: '#c9b65d',
  praxis: '#6a8aa6',
  lisaGarage: '#5a8fd6',
  vickyGarageLager: '#c9b65d',
  dg: '#c98b3a',
  allg: '#9a9a9a',
};

function AdjustmentTool() {
  const [target, setTarget] = useState(1_321_141);
  const [aufschlag, setAufschlag] = useState(30);
  const [values, setValues] = useState<Record<CardKey, number>>(DEFAULT_CARD_VALUES);

  const total = (Object.values(values) as number[]).reduce((a, b) => a + b, 0);
  const diff = total - target;

  // Per-card suggestion: what would this card need to be so that ALL the
  // current values sum to the target? (= target − sum of all OTHER cards.)
  function suggestionForBalance(key: CardKey): number {
    const otherSum = (Object.entries(values) as [CardKey, number][])
      .filter(([k]) => k !== key)
      .reduce((acc, [, v]) => acc + v, 0);
    return target - otherSum;
  }

  // EG/OG ratio suggestion. The "30 % Aufschlag" means EG €/m² is 30 % more
  // than OG €/m². Across the totals (EG 103 m² vs OG 99 m²) this works out
  // to: EG_total / OG_total = (1 + Aufschlag/100) × (103 / 99). With the
  // remaining cards (Praxis / Garage / DG / Allg) held at user values, EG
  // and OG split the leftover Verkehrswert by that ratio.
  const egPlusOg =
    target -
    values.praxis -
    values.lisaGarage -
    values.vickyGarageLager -
    values.dg -
    values.allg;
  const egToOgRatio = (1 + aufschlag / 100) * (103 / 99);
  const ogTotalSuggested = egPlusOg / (1 + egToOgRatio);
  const egTotalSuggested = egToOgRatio * ogTotalSuggested;
  // Split OG total Lisa / Vicky in the same proportion as the original
  // valuation (≈ 27.6 % Lisa / 72.4 % Vicky — Vicky's share is bigger
  // because she gets the OG Außen / Balkone too).
  const ogLisaShare =
    DEFAULT_CARD_VALUES.ogLisa /
    (DEFAULT_CARD_VALUES.ogLisa + DEFAULT_CARD_VALUES.ogVicky);
  const ogLisaSuggested = ogTotalSuggested * ogLisaShare;
  const ogVickySuggested = ogTotalSuggested * (1 - ogLisaShare);

  const ratioSuggestions: Partial<Record<CardKey, number>> = {
    eg: egTotalSuggested,
    ogLisa: ogLisaSuggested,
    ogVicky: ogVickySuggested,
  };

  function setValue(key: CardKey, n: number) {
    setValues((v) => ({ ...v, [key]: n }));
  }

  function reset() {
    setTarget(1_321_141);
    setAufschlag(30);
    setValues(DEFAULT_CARD_VALUES);
  }

  return (
    <section
      className="rounded-xl border border-amber-200 p-4 shadow-sm"
      style={{ background: 'linear-gradient(135deg, #fdf8ec 0%, #fbf2dc 100%)' }}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 flex items-center gap-2 text-base font-bold">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
            🧮
          </span>
          Anpassungs-Werkzeug
        </h3>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          ↺ Zurücksetzen
        </button>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Spielwiese: ändere den Verkehrswert, den Aufschlag oder einzelne Karten-Werte und sieh, welche
        Werte die anderen Karten dann hätten, damit sich alles ausgleicht. Die Werte der Karten oben
        bleiben unverändert.
      </p>

      <div className="grid gap-2 md:grid-cols-2">
        <NumberField
          label="Verkehrswert (Ziel)"
          value={target}
          onChange={setTarget}
          suffix="€"
        />
        <NumberField
          label="EG/OG-Aufschlag"
          value={aufschlag}
          onChange={setAufschlag}
          suffix="%"
          step={1}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 text-xs">
        <span>
          Σ aktuell: <strong className="tabular-nums">{fmt(total)}</strong>
        </span>
        <span>
          Soll: <strong className="tabular-nums">{fmt(target)}</strong>
        </span>
        <span
          className={`tabular-nums font-bold ${
            Math.abs(diff) < 50 ? 'text-emerald-700' : 'text-rose-700'
          }`}
        >
          Differenz: {diff >= 0 ? '+' : ''}
          {fmt(diff)}
        </span>
      </div>

      <div className="mt-3 space-y-1.5">
        {(Object.keys(values) as CardKey[]).map((key) => {
          const balanceSugg = suggestionForBalance(key);
          const ratioSugg = ratioSuggestions[key];
          return (
            <div
              key={key}
              className="rounded-md border bg-white px-3 py-2"
              style={{ borderColor: CARD_TONE[key] + '66' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: CARD_TONE[key] }}
                  />
                  {CARD_LABELS[key]}
                </div>
                <NumberField
                  label=""
                  value={values[key]}
                  onChange={(n) => setValue(key, n)}
                  suffix="€"
                  compact
                />
              </div>
              <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-slate-500">
                <SuggestionLine
                  label="Vorschlag (Σ ausgleichen)"
                  value={balanceSugg}
                  onApply={() => setValue(key, Math.round(balanceSugg))}
                />
                {ratioSugg !== undefined && (
                  <SuggestionLine
                    label={`Vorschlag (${aufschlag}% Aufschlag)`}
                    value={ratioSugg}
                    onApply={() => setValue(key, Math.round(ratioSugg))}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  step = 1000,
  compact,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  step?: number;
  compact?: boolean;
}) {
  return (
    <div className={compact ? '' : 'flex flex-col'}>
      {label && (
        <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type="number"
          step={step}
          inputMode="numeric"
          className={`field py-1 pr-7 text-right tabular-nums ${compact ? 'w-32 text-sm' : 'w-full text-sm'}`}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          onFocus={(e) => e.currentTarget.select()}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function SuggestionLine({
  label,
  value,
  onApply,
}: {
  label: string;
  value: number;
  onApply: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{label}:</span>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onApply}
        className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-amber-800 hover:bg-amber-100"
        title="Klicken um anzuwenden"
      >
        {fmt(value)} →
      </button>
    </span>
  );
}
