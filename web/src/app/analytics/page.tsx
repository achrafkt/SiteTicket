'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDot, Clock, RefreshCw, Ticket as TicketIcon } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { getAnalytics } from '@/lib/analytics-api';
import { getTicketTypes } from '@/lib/tickets-api';
import { mapType } from '@/lib/ticket-mapper';
import { presetToRange } from '@/lib/analytics-date-range';
import { formatHours, formatPercent } from '@/lib/analytics-format';
import { AnalyticsFilterBar } from '@/components/analytics/AnalyticsFilterBar';
import { KpiCard } from '@/components/analytics/KpiCard';
import { ChartCard } from '@/components/analytics/ChartCard';
import { StatusDonutChart } from '@/components/analytics/charts/StatusDonutChart';
import { VolumeAreaChart } from '@/components/analytics/charts/VolumeAreaChart';
import { PriorityBarChart } from '@/components/analytics/charts/PriorityBarChart';
import { TypeBarChart } from '@/components/analytics/charts/TypeBarChart';
import { ResolutionTimeByTypeChart } from '@/components/analytics/charts/ResolutionTimeByTypeChart';
import { AssigneeWorkloadChart } from '@/components/analytics/charts/AssigneeWorkloadChart';
import { ProjectPerformanceChart } from '@/components/analytics/charts/ProjectPerformanceChart';
import { BudgetChart } from '@/components/analytics/charts/BudgetChart';
import type { AnalyticsResponse, DateRangePreset } from '@/types/analytics';
import type { TicketType } from '@/types/ticket';

export default function AnalyticsPage() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DateRangePreset>('90d');
  const [ticketTypeId, setTicketTypeId] = useState<string | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTicketTypes()
      .then((types) => setTicketTypes(types.map(mapType)))
      .catch(() => setTicketTypes([]));
  }, []);

  const range = useMemo(() => presetToRange(datePreset), [datePreset]);

  const fetchAnalytics = useCallback(() => {
    setIsLoading(true);
    setError(null);
    getAnalytics({ projectId: projectId ?? undefined, ticketTypeId: ticketTypeId ?? undefined, ...range })
      .then((response) => setData(response))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Impossible de charger les statistiques.');
      })
      .finally(() => setIsLoading(false));
    // `range` is derived from datePreset each render — depending on the preset
    // directly would refetch on every render since presetToRange returns a
    // new object each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, ticketTypeId, datePreset]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto pb-8">
      <AnalyticsFilterBar
        projects={data?.visibleProjects ?? []}
        ticketTypes={ticketTypes}
        projectId={projectId}
        onProjectChange={setProjectId}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        ticketTypeId={ticketTypeId}
        onTicketTypeChange={setTicketTypeId}
      />

      {isLoading && !data ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-400">
          <RefreshCw size={16} className="animate-spin" />
          Chargement des statistiques...
        </div>
      ) : error && !data ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-gray-500">
          <p className="text-red-600">{error}</p>
          <button
            type="button"
            onClick={fetchAnalytics}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      ) : data ? (
        <div className={`flex flex-col gap-5 transition-opacity ${isLoading ? 'opacity-60' : 'opacity-100'}`}>
          <div className="flex flex-wrap gap-3">
            <KpiCard label="Total tickets" value={String(data.kpis.total)} icon={TicketIcon} />
            <KpiCard label="Tickets ouverts" value={String(data.kpis.open)} icon={CircleDot} />
            <KpiCard label="Taux de résolution" value={formatPercent(data.kpis.resolutionRate)} icon={CheckCircle2} />
            <KpiCard label="Résolution moyenne" value={formatHours(data.kpis.avgResolutionHours)} icon={Clock} />
            <KpiCard
              label="Tickets en retard"
              value={String(data.kpis.overdue)}
              icon={AlertTriangle}
              tone={data.kpis.overdue > 0 ? 'danger' : 'default'}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
            <ChartCard title="Répartition par statut" className="xl:col-span-2">
              <StatusDonutChart data={data.byStatus} />
            </ChartCard>
            <ChartCard
              title="Volume de tickets dans le temps"
              subtitle="Créés vs résolus, par semaine"
              className="xl:col-span-3"
            >
              <VolumeAreaChart data={data.volumeOverTime} />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartCard title="Répartition par priorité">
              <PriorityBarChart data={data.byPriority} />
            </ChartCard>
            <ChartCard title="Répartition par type de ticket">
              <TypeBarChart data={data.byType} />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartCard title="Temps moyen de résolution par type">
              <ResolutionTimeByTypeChart data={data.avgResolutionByType} />
            </ChartCard>
            <ChartCard title="Charge de travail par assigné" subtitle="Nombre de tickets par personne">
              <AssigneeWorkloadChart data={data.byAssignee} />
            </ChartCard>
          </div>

          <ChartCard title="Performance par chantier" subtitle="Tickets ouverts vs résolus">
            <ProjectPerformanceChart data={data.byProject} />
          </ChartCard>

          {data.budgetByProject ? (
            <ChartCard title="Budget par chantier" subtitle="Prévisionnel vs dépensé">
              <BudgetChart data={data.budgetByProject} />
            </ChartCard>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
