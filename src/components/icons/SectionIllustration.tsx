interface Props {
  className?: string;
  tint?: string;
}

const DEFAULT_TINT = '#475569'; // slate-600

/**
 * Small line-art illustrations used in the top-right corner of the
 * non-asset section cards (Direct payments, Corrections). Visually paired
 * with the AssetIllustration set so the page reads as a consistent grid
 * of "thing-with-icon" cards.
 */
export function SectionIllustration({
  kind,
  className,
  tint = DEFAULT_TINT,
}: Props & { kind: 'transfer' | 'correction' }) {
  const stroke = tint;
  const fill = `${tint}1a`; // ~10% opacity
  return kind === 'transfer' ? (
    <TransferSVG className={className} stroke={stroke} fill={fill} />
  ) : (
    <CorrectionSVG className={className} stroke={stroke} fill={fill} />
  );
}

interface SVGProps {
  className?: string;
  stroke: string;
  fill: string;
}

function TransferSVG({ className, stroke, fill }: SVGProps) {
  // Two stylised figures with paired arrows in opposite directions
  // between them — read as "money moves between people".
  return (
    <svg viewBox="0 0 120 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="0" y="0" width="120" height="100" rx="8" fill={fill} />
      <g fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Left figure */}
        <circle cx="22" cy="32" r="7" />
        <path d="M10 70 Q22 50 34 70" />
        {/* Right figure */}
        <circle cx="98" cy="32" r="7" />
        <path d="M86 70 Q98 50 110 70" />
        {/* Arrow → (top) */}
        <path d="M40 44 L80 44" />
        <path d="M74 39 L80 44 L74 49" />
        {/* Arrow ← (bottom) */}
        <path d="M80 56 L40 56" />
        <path d="M46 51 L40 56 L46 61" />
        {/* € coin in centre */}
        <circle cx="60" cy="80" r="7" />
        <text
          x="60"
          y="84"
          fontFamily="serif"
          fontSize="9"
          fontWeight="bold"
          textAnchor="middle"
          stroke="none"
          fill={stroke}
        >
          €
        </text>
      </g>
    </svg>
  );
}

function CorrectionSVG({ className, stroke, fill }: SVGProps) {
  // Balance scales — adjustments / fairness corrections.
  return (
    <svg viewBox="0 0 120 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="0" y="0" width="120" height="100" rx="8" fill={fill} />
      <g fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Pillar */}
        <line x1="60" y1="20" x2="60" y2="86" />
        <path d="M48 86 L72 86" strokeWidth="2" />
        {/* Beam */}
        <line x1="22" y1="30" x2="98" y2="30" />
        {/* Left pan strings + bowl */}
        <line x1="32" y1="30" x2="22" y2="50" />
        <line x1="32" y1="30" x2="42" y2="50" />
        <path d="M16 50 Q32 64 48 50" />
        {/* Right pan strings + bowl (slightly higher = unbalanced) */}
        <line x1="88" y1="30" x2="78" y2="46" />
        <line x1="88" y1="30" x2="98" y2="46" />
        <path d="M72 46 Q88 60 104 46" />
        {/* Knob on top */}
        <circle cx="60" cy="20" r="3" fill={stroke} />
      </g>
    </svg>
  );
}
