'use client';

import { Cell, Pie, PieChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { STATUS_CHART_COLORS } from '@/lib/analytics-colors';
import type { AnalyticsStatusBucket } from '@/types/analytics';
import { ChartEmptyState } from '../ChartCard';

export function StatusDonutChart({ data }: { data: AnalyticsStatusBucket[] }) {
  const populated = data.filter((entry) => entry.count > 0);
  if (populated.length === 0) return <ChartEmptyState />;

  const config: ChartConfig = Object.fromEntries(
    populated.map((entry) => [entry.statusCode, { label: entry.statusName, color: STATUS_CHART_COLORS[entry.statusCode] }]),
  );

  return (
    <div className="flex items-center gap-6">
      <ChartContainer config={config} className="h-[220px] w-[220px] shrink-0">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel indicator="dot" />} />
          <Pie
            data={populated}
            dataKey="count"
            nameKey="statusCode"
            innerRadius={62}
            outerRadius={92}
            paddingAngle={2}
            cornerRadius={3}
            strokeWidth={0}
          >
            {populated.map((entry) => (
              <Cell key={entry.statusCode} fill={STATUS_CHART_COLORS[entry.statusCode]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      <ul className="flex flex-1 flex-col gap-2">
        {populated.map((entry) => (
          <li key={entry.statusCode} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-gray-600">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: STATUS_CHART_COLORS[entry.statusCode] }}
              />
              <span className="truncate">{entry.statusName}</span>
            </span>
            <span className="font-mono font-semibold tabular-nums text-gray-900">{entry.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
