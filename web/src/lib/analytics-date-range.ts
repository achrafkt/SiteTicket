import type { DateRangePreset } from '@/types/analytics';

export function presetToRange(preset: DateRangePreset): { from?: string; to?: string } {
  if (preset === 'all') return {};

  const to = new Date();
  const from = new Date();

  switch (preset) {
    case '7d':
      from.setDate(to.getDate() - 7);
      break;
    case '30d':
      from.setDate(to.getDate() - 30);
      break;
    case '90d':
      from.setDate(to.getDate() - 90);
      break;
    case 'year':
      from.setMonth(0, 1);
      from.setHours(0, 0, 0, 0);
      break;
  }

  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}
