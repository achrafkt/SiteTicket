'use client';

import { useEffect, useState } from 'react';
import type { ElementType } from 'react';
import { Info, ListChecks, RefreshCw, Receipt, Users, Wallet } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { getProjectActivityLog } from '@/lib/project-hub-api';
import { mapProjectActivityEntry } from '@/lib/project-hub-mapper';
import type { ProjectActivityAction, ProjectActivityEntry } from '@/types/project-hub';

type ActivityCategory = 'info' | 'budget' | 'task' | 'expense' | 'member';

// Colored category icons, mirroring the icon/iconClassName/iconBgClassName
// pattern used for chantier statuses (PROJECT_STATUS_ICONS in lib/admin-api.ts)
// and ticket priorities (ticket-visuals.ts) — no plain colored dots.
const ACTIVITY_CATEGORY: Record<ProjectActivityAction, ActivityCategory> = {
  info_updated: 'info',
  budget_updated: 'budget',
  task_created: 'task',
  task_updated: 'task',
  task_deleted: 'task',
  expense_created: 'expense',
  expense_deleted: 'expense',
  member_added: 'member',
  member_role_updated: 'member',
  member_removed: 'member',
};

const ACTIVITY_CATEGORY_ICONS: Record<ActivityCategory, ElementType> = {
  info: Info,
  budget: Wallet,
  task: ListChecks,
  expense: Receipt,
  member: Users,
};

const ACTIVITY_CATEGORY_ICON_CLASSES: Record<ActivityCategory, string> = {
  info: 'text-blue-600',
  budget: 'text-indigo-600',
  task: 'text-teal-600',
  expense: 'text-amber-600',
  member: 'text-purple-600',
};

const ACTIVITY_CATEGORY_ICON_BG_CLASSES: Record<ActivityCategory, string> = {
  info: 'bg-blue-50',
  budget: 'bg-indigo-50',
  task: 'bg-teal-50',
  expense: 'bg-amber-50',
  member: 'bg-purple-50',
};

function formatTime(isoDate: string): string {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(isoDate));
}

function formatDateGroupLabel(isoDate: string): string {
  const date = new Date(isoDate);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "Aujourd'hui";
  if (isSameDay(date, yesterday)) return 'Hier';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function groupEntriesByDay(entries: ProjectActivityEntry[]): { label: string; entries: ProjectActivityEntry[] }[] {
  const groups: { label: string; entries: ProjectActivityEntry[] }[] = [];

  for (const entry of entries) {
    const label = formatDateGroupLabel(entry.createdAt);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.entries.push(entry);
    } else {
      groups.push({ label, entries: [entry] });
    }
  }

  return groups;
}

export function ProjectActivityLog({ projectId }: { projectId: string }) {
  const [entries, setEntries] = useState<ProjectActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getProjectActivityLog(projectId);
      setEntries(data.map(mapProjectActivityEntry));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de charger l'activité.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (isLoading) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-gray-400">
        <RefreshCw size={12} className="animate-spin" /> Chargement de l&apos;activité...
      </p>
    );
  }

  if (error) {
    return <p className="text-xs text-red-600">{error}</p>;
  }

  if (entries.length === 0) {
    return <p className="text-xs text-gray-400">Aucune activité pour ce chantier.</p>;
  }

  const groups = groupEntriesByDay(entries);

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{group.label}</p>
          <ul>
            {group.entries.map((entry) => {
              const category = ACTIVITY_CATEGORY[entry.action];
              const Icon = ACTIVITY_CATEGORY_ICONS[category];
              return (
                <li key={entry.id} className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-gray-50">
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${ACTIVITY_CATEGORY_ICON_BG_CLASSES[category]}`}
                  >
                    <Icon size={14} strokeWidth={2.25} className={ACTIVITY_CATEGORY_ICON_CLASSES[category]} />
                  </span>
                  <p className="min-w-0 flex-1 text-sm leading-snug text-gray-700">
                    <strong className="font-medium text-gray-900">{entry.actor.name}</strong> — {entry.summary}
                  </p>
                  <span className="mt-0.5 shrink-0 text-xs tabular-nums text-gray-400">
                    {formatTime(entry.createdAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
