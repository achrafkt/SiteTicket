'use client';

import { useState } from 'react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useTicketStore } from '@/store/ticket-store';
import { Dropdown } from '@/components/tickets/Dropdown';
import { ApiError } from '@/lib/api';
import { formatProjectDate } from '@/lib/project-hub-format';
import {
  createProjectTask,
  deleteProjectTask,
  updateProjectTask,
} from '@/lib/project-hub-api';
import { mapProjectHubTask } from '@/lib/project-hub-mapper';
import { PROJECT_TASK_STATUS_LABELS, type ProjectHubTask, type ProjectTaskStatusCode } from '@/types/project-hub';

const STATUS_OPTIONS = (Object.keys(PROJECT_TASK_STATUS_LABELS) as ProjectTaskStatusCode[]).map((code) => ({
  value: code,
  label: PROJECT_TASK_STATUS_LABELS[code],
}));

type ProjectTasksPanelProps = {
  projectId: string;
  tasks: ProjectHubTask[];
  canEdit: boolean;
  onChange: (tasks: ProjectHubTask[]) => void;
};

export function ProjectTasksPanel({ projectId, tasks, canEdit, onChange }: ProjectTasksPanelProps) {
  const users = useTicketStore((state) => state.users);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  async function handleCreate() {
    if (!title.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createProjectTask(projectId, {
        title: title.trim(),
        assigneeId: assigneeId || undefined,
        dueDate: dueDate || undefined,
      });
      onChange([mapProjectHubTask(created), ...tasks]);
      setTitle('');
      setAssigneeId('');
      setDueDate('');
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de créer la tâche.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(taskId: string, status: ProjectTaskStatusCode) {
    setPendingTaskId(taskId);
    try {
      const updated = await updateProjectTask(projectId, taskId, { status });
      onChange(tasks.map((task) => (task.id === taskId ? mapProjectHubTask(updated) : task)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de mettre à jour la tâche.');
    } finally {
      setPendingTaskId(null);
    }
  }

  async function handleDelete(taskId: string) {
    setPendingTaskId(taskId);
    try {
      await deleteProjectTask(projectId, taskId);
      onChange(tasks.filter((task) => task.id !== taskId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de supprimer la tâche.');
    } finally {
      setPendingTaskId(null);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p> : null}

      {tasks.length === 0 && !isCreating ? (
        <p className="py-6 text-center text-sm text-gray-400">Aucune tâche pour ce chantier.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">{task.title}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {task.assignee ? task.assignee.name : 'Non assigné'}
                  {task.dueDate ? ` · échéance ${formatProjectDate(task.dueDate)}` : ''}
                </p>
              </div>
              <Dropdown
                value={task.status}
                onChange={(value) => handleStatusChange(task.id, value as ProjectTaskStatusCode)}
                options={STATUS_OPTIONS}
                disabled={!canEdit || pendingTaskId === task.id}
                className="w-36 shrink-0"
              />
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => handleDelete(task.id)}
                  disabled={pendingTaskId === task.id}
                  className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canEdit ? (
        isCreating ? (
          <div className="space-y-2 rounded-lg border border-gray-200 p-3">
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Titre de la tâche"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
            <div className="flex items-center gap-2">
              <Dropdown
                value={assigneeId}
                onChange={setAssigneeId}
                placeholder="Assigner à"
                className="flex-1"
                options={[
                  { value: '', label: 'Non assigné' },
                  ...users.map((user) => ({ value: user.id, label: user.name, initials: user.initials, avatarUrl: user.avatarUrl })),
                ]}
              />
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!title.trim() || isSubmitting}
                className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:bg-gray-200 disabled:text-gray-400"
              >
                {isSubmitting ? <RefreshCw size={12} className="animate-spin" /> : null}
                Ajouter
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            <Plus size={14} /> Ajouter une tâche
          </button>
        )
      ) : null}
    </div>
  );
}
