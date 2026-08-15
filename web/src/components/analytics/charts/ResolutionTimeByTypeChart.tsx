'use client';

import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { TYPE_CHART_COLORS } from '@/lib/analytics-colors';
import { formatHours } from '@/lib/analytics-format';
import type { AnalyticsResolutionByTypeBucket } from '@/types/analytics';
import { ChartEmptyState } from '../ChartCard';

export function ResolutionTimeByTypeChart({ data }: { data: AnalyticsResolutionByTypeBucket[] }) {
  if (data.length === 0) return <ChartEmptyState message="Aucun ticket résolu sur cette période." />;

  const config: ChartConfig = Object.fromEntries(
    data.map((entry) => [entry.typeCode, { label: entry.typeName, color: TYPE_CHART_COLORS[entry.typeCode] }]),
  );

  const height = Math.max(180, data.length * 34);

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="typeName"
          tickLine={false}
          axisLine={false}
          width={140}
          tick={{ fontSize: 11, fill: '#6b7280' }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel
              indicator="dot"
              formatter={(value) => (
                <span className="font-mono font-medium tabular-nums text-gray-900">
                  {formatHours(Number(value))}
                </span>
              )}
            />
          }
          cursor={{ fill: '#f8fafc' }}
        />
        <Bar dataKey="avgHours" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((entry) => (
            <Cell key={entry.typeCode} fill={TYPE_CHART_COLORS[entry.typeCode]} />
          ))}
          <LabelList
            dataKey="avgHours"
            position="right"
            formatter={(value) => formatHours(typeof value === 'number' ? value : null)}
            style={{ fill: '#111827', fontSize: 12, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
