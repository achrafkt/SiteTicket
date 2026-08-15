'use client';

// Minimal, hand-ported version of shadcn/ui's `chart` component
// (https://ui.shadcn.com/docs/components/chart), wired directly to Recharts.
// Scoped intentionally to this one directory: it's the only shadcn/ui entry
// point in the app, reserved for the Analytics page's charts — everywhere
// else keeps using the project's own component system.
import * as React from 'react';
import * as RechartsPrimitive from 'recharts';

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    color?: string;
  }
>;

type ChartContextProps = { config: ChartConfig };

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error('Chart components must be used within a <ChartContainer />');
  }
  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
}) {
  const reactId = React.useId();
  const chartId = `chart-${id ?? reactId.replace(/:/g, '')}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          "flex aspect-auto justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-gray-500 [&_.recharts-cartesian-grid_line]:stroke-gray-100 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-gray-200 [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-sector]:outline-none [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const entries = Object.entries(config).filter(([, cfg]) => cfg.color);
  if (entries.length === 0) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `[data-chart="${id}"]{${entries
          .map(([key, cfg]) => `--color-${key}:${cfg.color};`)
          .join('')}}`,
      }}
    />
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

// Recharts injects active/payload/label/coordinate at runtime through
// cloneElement when this is used as a Tooltip `content` element — they're
// deliberately all optional here (not derived from Recharts' own internal
// TooltipContentProps, which marks them required and breaks `<X />` JSX use).
type TooltipPayloadItem = {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string | Array<number | string>;
  color?: string;
  payload?: Record<string, unknown>;
};

type ChartTooltipContentProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: React.ReactNode;
  labelFormatter?: (label: React.ReactNode, payload: TooltipPayloadItem[]) => React.ReactNode;
  formatter?: (
    value: TooltipPayloadItem['value'],
    name: TooltipPayloadItem['name'],
    item: TooltipPayloadItem,
    index: number,
    payload: TooltipPayloadItem['payload'],
  ) => React.ReactNode;
  className?: string;
  indicator?: 'line' | 'dot' | 'dashed';
  hideLabel?: boolean;
  hideIndicator?: boolean;
  color?: string;
};

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = 'dot',
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  formatter,
  color,
}: ChartTooltipContentProps) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  const tooltipLabel = !hideLabel ? (labelFormatter ? labelFormatter(label, payload) : label) : null;

  return (
    <div
      className={cn(
        'grid min-w-[10rem] gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg',
        className,
      )}
    >
      {tooltipLabel ? <div className="font-medium text-gray-900">{tooltipLabel}</div> : null}
      <div className="grid gap-1">
        {payload.map((item, index) => {
          const key = String(item.dataKey ?? item.name ?? 'value');
          const itemConfig = config[key];
          const indicatorColor = color ?? item.color;

          return (
            <div key={item.dataKey ?? index} className="flex w-full items-center gap-2">
              {formatter && item.value !== undefined && item.name !== undefined ? (
                formatter(item.value, item.name, item, index, item.payload)
              ) : (
                <>
                  {!hideIndicator && (
                    <span
                      className={cn(
                        'shrink-0 rounded-[2px]',
                        indicator === 'dot' && 'h-2.5 w-2.5',
                        indicator === 'line' && 'h-0.5 w-3',
                        indicator === 'dashed' && 'h-0 w-3 border-t-2 border-dashed bg-transparent',
                      )}
                      style={{
                        backgroundColor: indicator === 'dashed' ? undefined : indicatorColor,
                        borderColor: indicatorColor,
                      }}
                    />
                  )}
                  <div className="flex flex-1 items-center justify-between gap-3 leading-none">
                    <span className="text-gray-500">{itemConfig?.label ?? item.name}</span>
                    <span className="font-mono font-medium tabular-nums text-gray-900">
                      {typeof item.value === 'number' ? item.value.toLocaleString('fr-FR') : item.value}
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

type LegendPayloadItem = {
  value?: string;
  dataKey?: string | number;
  color?: string;
};

function ChartLegendContent({
  className,
  payload,
}: {
  className?: string;
  payload?: LegendPayloadItem[];
}) {
  const { config } = useChart();

  if (!payload?.length) return null;

  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-4 pt-3', className)}>
      {payload.map((item) => {
        const key = String(item.dataKey ?? item.value ?? 'value');
        const itemConfig = config[key];

        return (
          <div key={item.value} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
            {itemConfig?.label ?? item.value}
          </div>
        );
      })}
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, useChart };
