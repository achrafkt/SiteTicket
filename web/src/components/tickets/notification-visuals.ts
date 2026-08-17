import type { ElementType } from 'react';
import { AlarmClock, ArrowRightLeft, AtSign, UserCheck, UserMinus, UserPlus } from 'lucide-react';
import type { NotificationEventType } from '@/types/notification';

export const NOTIFICATION_ICONS: Record<NotificationEventType, ElementType> = {
  TICKET_ASSIGNED: UserCheck,
  STATUS_CHANGED: ArrowRightLeft,
  MENTION: AtSign,
  DUE_SOON: AlarmClock,
  PROJECT_MEMBER_ADDED: UserPlus,
  PROJECT_MEMBER_REMOVED: UserMinus,
};

export const NOTIFICATION_ICON_STYLES: Record<NotificationEventType, string> = {
  TICKET_ASSIGNED: 'bg-blue-50 text-blue-600',
  STATUS_CHANGED: 'bg-amber-50 text-amber-600',
  MENTION: 'bg-emerald-50 text-emerald-600',
  DUE_SOON: 'bg-red-50 text-red-600',
  PROJECT_MEMBER_ADDED: 'bg-violet-50 text-violet-600',
  PROJECT_MEMBER_REMOVED: 'bg-slate-100 text-slate-600',
};
