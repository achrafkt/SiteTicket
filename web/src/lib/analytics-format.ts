export function formatHours(hours: number | null): string {
  if (hours === null) return '—';
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} j`;
}

export function formatWeekBucket(bucket: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(bucket));
}

export function formatPercent(value: number): string {
  return `${value}%`;
}

export function formatDays(days: number): string {
  const sign = days > 0 ? '+' : '';
  return `${sign}${days} j`;
}
