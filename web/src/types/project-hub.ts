import type { ProjectStatusCode } from '@/lib/admin-api';

export type ProjectTaskStatusCode = 'todo' | 'in_progress' | 'done';

export type ProjectHubUserSummary = {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
};

export type ProjectHubTask = {
  id: string;
  title: string;
  description: string | null;
  status: ProjectTaskStatusCode;
  dueDate: string | null;
  assignee: ProjectHubUserSummary | null;
  creator: ProjectHubUserSummary;
  createdAt: string;
  updatedAt: string;
};

export type ProjectHubExpense = {
  id: string;
  label: string;
  amount: number;
  category: string | null;
  expenseDate: string;
  createdAt: string;
  creator: ProjectHubUserSummary;
};

export type ProjectHub = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  clientName: string | null;
  description: string | null;
  status: ProjectStatusCode;
  progressPercent: number;
  budgetPlanned: number | null;
  budgetSpent: number | null;
  budgetVariance: number | null;
  startDate: string | null;
  endDatePlanned: string | null;
  endDateActual: string | null;
  createdAt: string;
  taskCount: number;
  memberCount: number;
  tasks?: ProjectHubTask[];
  expenses?: ProjectHubExpense[];
};

export const PROJECT_TASK_STATUS_LABELS: Record<ProjectTaskStatusCode, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminée',
};
