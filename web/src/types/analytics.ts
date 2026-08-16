import type { TicketPriority, TicketStatusCode, TicketTypeCode } from './ticket';

export type AnalyticsProjectRef = {
  id: string;
  name: string;
  code: string;
};

export type AnalyticsKpis = {
  total: number;
  open: number;
  resolutionRate: number;
  avgResolutionHours: number | null;
  overdue: number;
};

export type AnalyticsStatusBucket = {
  statusCode: TicketStatusCode;
  statusName: string;
  count: number;
};

export type AnalyticsVolumeBucket = {
  bucket: string;
  created: number;
  resolved: number;
};

export type AnalyticsPriorityBucket = {
  priority: TicketPriority;
  count: number;
};

export type AnalyticsTypeBucket = {
  typeCode: TicketTypeCode;
  typeName: string;
  count: number;
};

export type AnalyticsResolutionByTypeBucket = {
  typeCode: TicketTypeCode;
  typeName: string;
  avgHours: number;
};

export type AnalyticsAssigneeBucket = {
  personId: string | null;
  name: string;
  count: number;
};

export type AnalyticsProjectBucket = {
  projectId: string;
  projectName: string;
  open: number;
  resolved: number;
};

export type AnalyticsBudgetBucket = {
  projectId: string;
  projectName: string;
  planned: number | null;
  spent: number;
  variance: number | null;
};

export type AnalyticsImpactBucket = {
  projectId: string;
  projectName: string;
  costImpactTotal: number;
  scheduleImpactDaysTotal: number;
};

export type AnalyticsResponse = {
  visibleProjects: AnalyticsProjectRef[];
  kpis: AnalyticsKpis;
  byStatus: AnalyticsStatusBucket[];
  volumeOverTime: AnalyticsVolumeBucket[];
  byPriority: AnalyticsPriorityBucket[];
  byType: AnalyticsTypeBucket[];
  avgResolutionByType: AnalyticsResolutionByTypeBucket[];
  byAssignee: AnalyticsAssigneeBucket[];
  byProject: AnalyticsProjectBucket[];
  budgetByProject: AnalyticsBudgetBucket[] | null;
  impactByProject: AnalyticsImpactBucket[] | null;
};

export type AnalyticsQuery = {
  projectId?: string;
  from?: string;
  to?: string;
  ticketTypeId?: string;
};

export type DateRangePreset = '7d' | '30d' | '90d' | 'year' | 'all';

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  '90d': '90 derniers jours',
  year: 'Cette année',
  all: 'Tout',
};
