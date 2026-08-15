'use client';

import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { PRIORITY_CHART_COLORS } from '@/lib/analytics-colors';
import { TICKET_PRIORITY_LABELS } from '@/types/ticket';
import type { AnalyticsPriorityBucket } from '@/types/analytics';
import { ChartEmptyState } from '../ChartCard';

const config: ChartConfig = Object.fromEntries(
  (Object.keys(TICKET_PRIORITY_LABELS) as (keyof typeof TICKET_PRIORITY_LABELS)[]).map((priority) => [
    priority,
    { label: TICKET_PRIORITY_LABELS[priority], color: PRIORITY_CHART_COLORS[priority] },
  ]),
);

export function PriorityBarChart({ data }: { data: AnalyticsPriorityBucket[] }) {
  if (data.every((entry) => entry.count === 0)) return <ChartEmptyState />;

  const chartData = data.map((entry) => ({ ...entry, label: TICKET_PRIORITY_LABELS[entry.priority] }));

  return (
    <ChartContainer config={config} className="h-[220px] w-full">
      <BarChart data={chartData} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
        <YAxis hide allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent hideLabel indicator="dot" />} cursor={{ fill: '#f8fafc' }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={56}>
          {chartData.map((entry) => (
            <Cell key={entry.priority} fill={PRIORITY_CHART_COLORS[entry.priority]} />
          ))}
          <LabelList dataKey="count" position="top" style={{ fill: '#111827', fontSize: 12, fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
