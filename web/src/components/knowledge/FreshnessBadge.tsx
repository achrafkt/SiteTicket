import { FRESHNESS_BADGE_CLASSES, FRESHNESS_ICONS, FRESHNESS_LABELS } from './knowledge-visuals';
import type { KnowledgeFreshness } from '@/types/knowledge';

export function FreshnessBadge({ status }: { status: KnowledgeFreshness }) {
  const Icon = FRESHNESS_ICONS[status];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${FRESHNESS_BADGE_CLASSES[status]}`}
    >
      <Icon size={11} /> {FRESHNESS_LABELS[status]}
    </span>
  );
}
