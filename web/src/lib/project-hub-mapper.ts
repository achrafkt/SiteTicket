import { resolveAvatarUrl } from './api';
import type {
  ApiProjectHub,
  ApiProjectHubExpense,
  ApiProjectHubTask,
  ApiProjectHubUserSummary,
} from './project-hub-api';
import type { ProjectHub, ProjectHubExpense, ProjectHubTask, ProjectHubUserSummary } from '@/types/project-hub';

function toNumberOrNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function mapUserSummary(user: ApiProjectHubUserSummary): ProjectHubUserSummary {
  return {
    id: user.id,
    name: `${user.first_name} ${user.last_name}`,
    initials: `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase(),
    avatarUrl: resolveAvatarUrl(user.avatar_url),
  };
}

export function mapProjectHubTask(task: ApiProjectHubTask): ProjectHubTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    dueDate: task.due_date,
    assignee: task.assignee ? mapUserSummary(task.assignee) : null,
    creator: mapUserSummary(task.creator),
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  };
}

export function mapProjectHubExpense(expense: ApiProjectHubExpense): ProjectHubExpense {
  return {
    id: expense.id,
    label: expense.label,
    amount: Number(expense.amount),
    category: expense.category,
    expenseDate: expense.expense_date,
    createdAt: expense.created_at,
    creator: mapUserSummary(expense.creator),
  };
}

export function mapProjectHub(project: ApiProjectHub): ProjectHub {
  return {
    id: project.id,
    name: project.name,
    code: project.code,
    address: project.address,
    clientName: project.client_name,
    description: project.description,
    status: project.status,
    progressPercent: project.progress_percent,
    budgetPlanned: toNumberOrNull(project.budget_planned),
    budgetSpent: toNumberOrNull(project.budget_spent),
    budgetVariance: toNumberOrNull(project.budget_variance),
    startDate: project.start_date,
    endDatePlanned: project.end_date_planned,
    endDateActual: project.end_date_actual,
    createdAt: project.created_at,
    taskCount: project._count.tasks,
    memberCount: project._count.members,
    tasks: project.tasks?.map(mapProjectHubTask),
    expenses: project.expenses?.map(mapProjectHubExpense),
  };
}
