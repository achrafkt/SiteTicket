import { apiFetch } from './api';
import type { ProjectStatusCode } from './admin-api';

export type ApiProjectHubUserSummary = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
};

export type ApiProjectHubTask = {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  due_date: string | null;
  assignee: ApiProjectHubUserSummary | null;
  creator: ApiProjectHubUserSummary;
  created_at: string;
  updated_at: string;
};

export type ApiProjectHubExpense = {
  id: string;
  label: string;
  amount: string | number;
  category: string | null;
  expense_date: string;
  created_at: string;
  creator: ApiProjectHubUserSummary;
};

export type ApiProjectHub = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  client_name: string | null;
  description: string | null;
  status: ProjectStatusCode;
  progress_percent: number;
  budget_planned: string | number | null;
  budget_spent: string | number | null;
  budget_variance: string | number | null;
  start_date: string | null;
  end_date_planned: string | null;
  end_date_actual: string | null;
  created_at: string;
  _count: { tasks: number; members: number };
  tasks?: ApiProjectHubTask[];
  expenses?: ApiProjectHubExpense[];
};

export type CreateProjectHubPayload = {
  name: string;
  code: string;
  address?: string;
  clientName?: string;
  description?: string;
  status?: ProjectStatusCode;
  budgetPlanned?: number;
  startDate?: string;
  endDatePlanned?: string;
  endDateActual?: string;
};

export type UpdateProjectHubPayload = Partial<CreateProjectHubPayload>;

export type CreateProjectTaskPayload = {
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done';
  dueDate?: string;
  assigneeId?: string;
};

export type UpdateProjectTaskPayload = Partial<CreateProjectTaskPayload> & {
  assigneeId?: string | null;
};

export type CreateProjectExpensePayload = {
  label: string;
  amount: number;
  category?: string;
  expenseDate?: string;
};

export function getProjectHubs() {
  return apiFetch<ApiProjectHub[]>('/project-hub');
}

export function getProjectHub(id: string) {
  return apiFetch<ApiProjectHub>(`/project-hub/${id}`);
}

export function createProjectHub(payload: CreateProjectHubPayload) {
  return apiFetch<ApiProjectHub>('/project-hub', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateProjectHub(id: string, payload: UpdateProjectHubPayload) {
  return apiFetch<ApiProjectHub>(`/project-hub/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function updateProjectHubProgress(id: string, progressPercent: number) {
  return apiFetch<ApiProjectHub>(`/project-hub/${id}/progress`, {
    method: 'PATCH',
    body: JSON.stringify({ progressPercent }),
  });
}

export function createProjectTask(projectId: string, payload: CreateProjectTaskPayload) {
  return apiFetch<ApiProjectHubTask>(`/project-hub/${projectId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateProjectTask(
  projectId: string,
  taskId: string,
  payload: UpdateProjectTaskPayload,
) {
  return apiFetch<ApiProjectHubTask>(`/project-hub/${projectId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteProjectTask(projectId: string, taskId: string) {
  return apiFetch<{ success: boolean }>(`/project-hub/${projectId}/tasks/${taskId}`, {
    method: 'DELETE',
  });
}

export function createProjectExpense(projectId: string, payload: CreateProjectExpensePayload) {
  return apiFetch<ApiProjectHubExpense>(`/project-hub/${projectId}/expenses`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteProjectExpense(projectId: string, expenseId: string) {
  return apiFetch<{ success: boolean }>(`/project-hub/${projectId}/expenses/${expenseId}`, {
    method: 'DELETE',
  });
}
