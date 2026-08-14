import type { ElementType } from 'react';
import {
  BookOpen,
  ClipboardList,
  FileText,
  HelpCircle,
  ShieldAlert,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
} from 'lucide-react';
import type { KnowledgeCategoryCode } from '@/types/knowledge';
import type { KnowledgeFreshness } from '@/types/knowledge';

export const CATEGORY_ICONS: Record<KnowledgeCategoryCode, ElementType> = {
  PROCEDURE: ClipboardList,
  SAFETY_SHEET: ShieldAlert,
  TECHNICAL_STANDARD: BookOpen,
  DOCUMENT_TEMPLATE: FileText,
  EQUIPMENT_SHEET: Wrench,
  FAQ: HelpCircle,
};

export const FRESHNESS_LABELS: Record<KnowledgeFreshness, string> = {
  valid: 'Validé',
  to_review: 'À revoir',
  expiring_soon: 'Expire bientôt',
  expired: 'Expiré',
};

export const FRESHNESS_BADGE_CLASSES: Record<KnowledgeFreshness, string> = {
  valid: 'bg-emerald-50 text-emerald-700',
  to_review: 'bg-amber-50 text-amber-700',
  expiring_soon: 'bg-orange-50 text-orange-700',
  expired: 'bg-red-50 text-red-700',
};

export const FRESHNESS_ICONS: Record<KnowledgeFreshness, ElementType> = {
  valid: CheckCircle2,
  to_review: AlertTriangle,
  expiring_soon: Clock,
  expired: XCircle,
};
