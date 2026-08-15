'use client';

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { PROJECT_SERIES_COLORS } from '@/lib/analytics-colors';
import type { AnalyticsProjectBucket } from '@/types/analytics';
import { ChartEmptyState } from '../ChartCard';

const config: ChartConfig = {
  open: { label: 'Ouverts', color: PROJECT_SERIES_COLORS.open },
  resolved: { label: 'Résolus', color: PROJECT_SERIES_COLORS.resolved },
};

export function ProjectPerformanceChart({ data }: { data: AnalyticsProjectBucket[] }) {
  if (data.length === 0) return <ChartEmptyState />;

  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="projectName"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: '#6b7280' }}
        />
        <YAxis hide allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: '#f8fafc' }} />
        <Bar dataKey="open" fill={PROJECT_SERIES_COLORS.open} radius={[4, 4, 0, 0]} maxBarSize={44}>
          <LabelList dataKey="open" position="top" style={{ fill: '#111827', fontSize: 11, fontWeight: 600 }} />
        </Bar>
        <Bar dataKey="resolved" fill={PROJECT_SERIES_COLORS.resolved} radius={[4, 4, 0, 0]} maxBarSize={44}>
          <LabelList dataKey="resolved" position="top" style={{ fill: '#111827', fontSize: 11, fontWeight: 600 }} />
        </Bar>
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  );
}
