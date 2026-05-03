import { Asset } from '../../types';

interface Props {
  imageKey?: Asset['imageKey'];
  className?: string;
  tint?: string;
}

const DEFAULT_TINT = '#475569'; // slate-600

export function AssetIllustration({ imageKey, className, tint = DEFAULT_TINT }: Props) {
  const stroke = tint;
  const fill = `${tint}1a`; // ~10% opacity

  switch (imageKey) {
    case 'house':
      return <HouseSVG className={className} stroke={stroke} fill={fill} />;
    case 'plot':
      return <PlotSVG className={className} stroke={stroke} fill={fill} />;
    case 'cash':
      return <CashSVG className={className} stroke={stroke} fill={fill} />;
    case 'field':
      return <FieldSVG className={className} stroke={stroke} fill={fill} />;
    default:
      return <HouseSVG className={className} stroke={stroke} fill={fill} />;
  }
}

interface SVGProps {
  className?: string;
  stroke: string;
  fill: string;
}

function HouseSVG({ className, stroke, fill }: SVGProps) {
  return (
    <svg viewBox="0 0 120 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="0" y="0" width="120" height="100" rx="8" fill={fill} />
      <g fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 50 L60 22 L100 50" />
        <path d="M28 50 L28 80 L92 80 L92 50" />
        <rect x="50" y="58" width="20" height="22" />
        <line x1="50" y1="69" x2="70" y2="69" />
        <rect x="34" y="56" width="10" height="10" />
        <rect x="76" y="56" width="10" height="10" />
        <line x1="14" y1="80" x2="106" y2="80" strokeWidth="2" />
      </g>
    </svg>
  );
}

function PlotSVG({ className, stroke, fill }: SVGProps) {
  return (
    <svg viewBox="0 0 120 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="0" y="0" width="120" height="100" rx="8" fill={fill} />
      <g fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="20" y="20" width="80" height="60" />
        <line x1="20" y1="40" x2="100" y2="40" strokeDasharray="3 3" />
        <line x1="20" y1="60" x2="100" y2="60" strokeDasharray="3 3" />
        <line x1="50" y1="20" x2="50" y2="80" strokeDasharray="3 3" />
        <line x1="80" y1="20" x2="80" y2="80" strokeDasharray="3 3" />
        <circle cx="20" cy="20" r="3" fill={stroke} />
        <circle cx="100" cy="20" r="3" fill={stroke} />
        <circle cx="20" cy="80" r="3" fill={stroke} />
        <circle cx="100" cy="80" r="3" fill={stroke} />
      </g>
    </svg>
  );
}

function CashSVG({ className, stroke, fill }: SVGProps) {
  return (
    <svg viewBox="0 0 120 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="0" y="0" width="120" height="100" rx="8" fill={fill} />
      <g fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="14" y="58" width="92" height="26" rx="3" />
        <rect x="20" y="48" width="92" height="26" rx="3" />
        <rect x="26" y="38" width="80" height="26" rx="3" />
        <circle cx="66" cy="51" r="6" />
        <text x="66" y="55" fontFamily="serif" fontSize="9" fontWeight="bold" textAnchor="middle" stroke="none" fill={stroke}>€</text>
      </g>
    </svg>
  );
}

function FieldSVG({ className, stroke, fill }: SVGProps) {
  return (
    <svg viewBox="0 0 120 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="0" y="0" width="120" height="100" rx="8" fill={fill} />
      <g fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 70 Q30 56 60 64 T120 60" />
        <path d="M0 80 Q30 70 60 76 T120 74" />
        <path d="M10 90 Q40 84 70 88 T120 86" />
        <circle cx="92" cy="32" r="8" />
        <line x1="34" y1="62" x2="36" y2="56" />
        <line x1="46" y1="64" x2="48" y2="58" />
        <line x1="58" y1="64" x2="60" y2="58" />
        <line x1="70" y1="64" x2="72" y2="58" />
      </g>
    </svg>
  );
}
