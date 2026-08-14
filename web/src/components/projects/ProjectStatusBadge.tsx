import {
  PROJECT_STATUS_ICON_BG_CLASSES,
  PROJECT_STATUS_ICON_CLASSES,
  PROJECT_STATUS_ICONS,
  PROJECT_STATUS_LABELS,
  type ProjectStatusCode,
} from '@/lib/admin-api';

export function ProjectStatusBadge({ status }: { status: ProjectStatusCode }) {
  const Icon = PROJECT_STATUS_ICONS[status];

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 py-1 pl-1 pr-2.5 text-xs font-medium text-gray-700">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${PROJECT_STATUS_ICON_BG_CLASSES[status]}`}
      >
        <Icon size={12} strokeWidth={2.5} className={PROJECT_STATUS_ICON_CLASSES[status]} />
      </span>
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}
