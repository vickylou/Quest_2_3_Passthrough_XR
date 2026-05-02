const eurFormatter = new Intl.NumberFormat('de-CH', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const pctFormatter = new Intl.NumberFormat('de-CH', {
  minimumFractionDigits: 0,
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

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}
