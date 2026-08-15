'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { BUDGET_SERIES_COLORS } from '@/lib/analytics-colors';
import { formatCurrency } from '@/lib/project-hub-format';
import type { AnalyticsBudgetBucket } from '@/types/analytics';
import { ChartEmptyState } from '../ChartCard';

const config: ChartConfig = {
  planned: { label: 'Prévisionnel', color: BUDGET_SERIES_COLORS.planned },
  spent: { label: 'Dépensé', color: BUDGET_SERIES_COLORS.spent },
};

export function BudgetChart({ data }: { data: AnalyticsBudgetBucket[] }) {
  if (data.length === 0) return <ChartEmptyState message="Aucun chantier avec un budget à afficher." />;

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
                formatter={(value, name) => (
                  <div className="flex flex-1 items-center justify-between gap-3">
                    <span className="text-gray-500">{name === 'planned' ? 'Prévisionnel' : 'Dépensé'}</span>
                    <span className="font-mono font-medium tabular-nums text-gray-900">
                      {formatCurrency(Number(value))}
                    </span>
                  </div>
                )}
              />
            }
            cursor={{ fill: '#f8fafc' }}
          />
          <Bar dataKey="planned" fill={BUDGET_SERIES_COLORS.planned} radius={[4, 4, 0, 0]} maxBarSize={44} />
          <Bar dataKey="spent" fill={BUDGET_SERIES_COLORS.spent} radius={[4, 4, 0, 0]} maxBarSize={44} />
          <ChartLegend content={<ChartLegendContent />} />
        </BarChart>
      </ChartContainer>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {data.map((entry) => (
          <li
            key={entry.projectId}
            className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-sm"
          >
            <span className="truncate text-gray-600">{entry.projectName}</span>
            <span
              className={`shrink-0 font-semibold ${
                entry.variance !== null && entry.variance < 0 ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {entry.variance === null ? '—' : formatCurrency(entry.variance)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
