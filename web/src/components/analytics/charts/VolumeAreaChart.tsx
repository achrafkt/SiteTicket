'use client';

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { VOLUME_SERIES_COLORS } from '@/lib/analytics-colors';
import { formatWeekBucket } from '@/lib/analytics-format';
import type { AnalyticsVolumeBucket } from '@/types/analytics';
import { ChartEmptyState } from '../ChartCard';

const config: ChartConfig = {
  created: { label: 'Créés', color: VOLUME_SERIES_COLORS.created },
  resolved: { label: 'Résolus', color: VOLUME_SERIES_COLORS.resolved },
};

export function VolumeAreaChart({ data }: { data: AnalyticsVolumeBucket[] }) {
  if (data.length === 0 || data.every((entry) => entry.created === 0 && entry.resolved === 0)) {
    return <ChartEmptyState />;
  }

  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="analytics-volume-created" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={VOLUME_SERIES_COLORS.created} stopOpacity={0.18} />
            <stop offset="100%" stopColor={VOLUME_SERIES_COLORS.created} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="analytics-volume-resolved" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={VOLUME_SERIES_COLORS.resolved} stopOpacity={0.18} />
            <stop offset="100%" stopColor={VOLUME_SERIES_COLORS.resolved} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="bucket"
          tickFormatter={formatWeekBucket}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          minTickGap={24}
        />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} width={28} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => formatWeekBucket(String(value))} />} />
        <Area
          type="monotone"
          dataKey="created"
          stroke={VOLUME_SERIES_COLORS.created}
          strokeWidth={2}
          fill="url(#analytics-volume-created)"
        />
        <Area
          type="monotone"
          dataKey="resolved"
          stroke={VOLUME_SERIES_COLORS.resolved}
          strokeWidth={2}
          fill="url(#analytics-volume-resolved)"
        />
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
}
