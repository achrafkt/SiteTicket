'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { IMPACT_SERIES_COLORS } from '@/lib/analytics-colors';
import { formatDays } from '@/lib/analytics-format';
import { formatCurrency } from '@/lib/project-hub-format';
import type { AnalyticsImpactBucket } from '@/types/analytics';
import { ChartEmptyState } from '../ChartCard';

const config: ChartConfig = {
  costImpactTotal: { label: 'Impact coût cumulé', color: IMPACT_SERIES_COLORS.cost },
};

export function ImpactChart({ data }: { data: AnalyticsImpactBucket[] }) {
  if (data.length === 0) {
    return <ChartEmptyState message="Aucun ticket avec un impact coût ou délai renseigné." />;
  }

  return (
    <div className="space-y-4">
      <ChartContainer config={config} className="h-[240px] w-full">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="projectName" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            width={56}
            tickFormatter={(value) => formatCurrency(Number(value))}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => (
                  <div className="flex flex-1 items-center justify-between gap-3">
                    <span className="text-gray-500">Impact coût cumulé</span>
                    <span className="font-mono font-medium tabular-nums text-gray-900">
                      {formatCurrency(Number(value))}
                    </span>
                  </div>
                )}
              />
            }
            cursor={{ fill: '#f8fafc' }}
          />
          <Bar
            dataKey="costImpactTotal"
            fill={IMPACT_SERIES_COLORS.cost}
            radius={[4, 4, 0, 0]}
            maxBarSize={44}
          />
        </BarChart>
      </ChartContainer>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {data.map((entry) => (
          <li
            key={entry.projectId}
            className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-sm"
          >
            <span className="truncate text-gray-600">{entry.projectName}</span>
            <span className="flex shrink-0 items-center gap-2 font-semibold">
              <span className="text-red-600">{formatCurrency(entry.costImpactTotal)}</span>
              <span
                className={entry.scheduleImpactDaysTotal > 0 ? 'text-amber-600' : 'text-gray-400'}
                title="Retard cumulé induit"
              >
                {formatDays(entry.scheduleImpactDaysTotal)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
