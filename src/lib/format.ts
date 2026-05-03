const eurFormatter = new Intl.NumberFormat('en-CH', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const pctFormatter = new Intl.NumberFormat('en-CH', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const compactNumber = new Intl.NumberFormat('en-CH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatEuro(value: number): string {
  if (!isFinite(value)) return '—';
  return eurFormatter.format(Math.round(value));
}

export function formatPercent(value: number): string {
  if (!isFinite(value)) return '—';
  return `${pctFormatter.format(value)} %`;
}

export function formatSignedEuro(value: number): string {
  if (!isFinite(value)) return '—';
  const rounded = Math.round(value);
  if (rounded === 0) return formatEuro(0);
  const sign = rounded > 0 ? '+' : '−';
  return `${sign}${eurFormatter.format(Math.abs(rounded))}`;
}

/**
 * Compact euro format for the always-visible balance bar.
 *   1_180_000      → "1.18 M €"
 *   345_200        → "345.20 K €"
 *   999            → "999.00 €"
 *   -1_500_000     → "−1.50 M €"
 * Always 2 decimals after the comma. The € sits at the end with a thin space.
 */
export function formatEuroCompact(value: number): string {
  if (!isFinite(value)) return '—';
  const sign = value < 0 ? '−' : '';
  const abs = Math.abs(value);
  let body: string;
  if (abs >= 1_000_000) {
    body = `${compactNumber.format(abs / 1_000_000)} M`;
  } else if (abs >= 1_000) {
    body = `${compactNumber.format(abs / 1_000)} K`;
  } else {
    body = compactNumber.format(abs);
  }
  return `${sign}${body} €`;
}

export function formatSignedEuroCompact(value: number): string {
  if (!isFinite(value)) return '—';
  if (Math.round(value) === 0) return formatEuroCompact(0);
  const sign = value > 0 ? '+' : '−';
  return `${sign}${formatEuroCompact(Math.abs(value)).replace(/^[−-]/, '')}`;
}

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}
