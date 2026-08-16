export function formatProjectDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(isoDate),
  );
}

export function formatCurrency(amount: number | null): string {
  if (amount === null) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Number of whole days between a chantier's planned and actual end date —
 * positive when it finished (or is running) late. Returns null until an
 * actual end date has been recorded.
 */
export function getProjectDelayDays(endDatePlanned: string | null, endDateActual: string | null): number | null {
  if (!endDatePlanned || !endDateActual) return null;
  const planned = new Date(endDatePlanned);
  const actual = new Date(endDateActual);
  return Math.ceil((actual.getTime() - planned.getTime()) / (24 * 60 * 60 * 1000));
}
