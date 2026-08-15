import { apiFetch } from './api';
import type { AnalyticsQuery, AnalyticsResponse } from '@/types/analytics';

export function getAnalytics(query: AnalyticsQuery) {
  const params = new URLSearchParams();
  if (query.projectId) params.set('projectId', query.projectId);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.ticketTypeId) params.set('ticketTypeId', query.ticketTypeId);

  const queryString = params.toString();
  return apiFetch<AnalyticsResponse>(`/analytics/tickets${queryString ? `?${queryString}` : ''}`);
}
