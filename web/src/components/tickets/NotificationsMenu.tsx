'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  UserCheck,
  MessageSquare,
  ArrowRightLeft,
  AlarmClock,
  AtSign,
  Inbox,
} from 'lucide-react';
import { useTicketStore } from '@/store/ticket-store';
import type { Notification, NotificationEventType } from '@/types/notification';

const EVENT_ICONS: Record<NotificationEventType, React.ElementType> = {
  TICKET_ASSIGNED: UserCheck,
  NEW_COMMENT: MessageSquare,
  STATUS_CHANGED: ArrowRightLeft,
  DUE_SOON: AlarmClock,
  MENTION: AtSign,
};

const EVENT_ICON_STYLES: Record<NotificationEventType, string> = {
  TICKET_ASSIGNED: 'bg-blue-50 text-blue-600',
  NEW_COMMENT: 'bg-violet-50 text-violet-600',
  STATUS_CHANGED: 'bg-amber-50 text-amber-600',
  DUE_SOON: 'bg-red-50 text-red-600',
  MENTION: 'bg-emerald-50 text-emerald-600',
};

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMinutes = Math.round(diffMs / 60_000);

  if (diffMinutes < 1) return "à l'instant";
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `il y a ${diffHours} h`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `il y a ${diffDays} j`;

  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(isoDate));
}

function NotificationRow({ notification, onOpen }: { notification: Notification; onOpen: (notification: Notification) => void }) {
  const Icon = EVENT_ICONS[notification.type] ?? Bell;

  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      className={`flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-gray-50 ${
        notification.read ? '' : 'bg-blue-50/40'
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${EVENT_ICON_STYLES[notification.type] ?? 'bg-gray-100 text-gray-500'}`}
      >
        <Icon size={15} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className={`truncate text-sm ${notification.read ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'}`}>
            {notification.title}
          </span>
          {notification.read ? null : <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />}
        </span>
        <span className="mt-0.5 block truncate text-xs text-gray-500">{notification.message}</span>
        <span className="mt-1 block text-[11px] text-gray-400">{formatRelativeTime(notification.createdAt)}</span>
      </span>
    </button>
  );
}

export function NotificationsMenu() {
  const router = useRouter();
  const notifications = useTicketStore((state) => state.notifications);
  const markNotificationRead = useTicketStore((state) => state.markNotificationRead);
  const markAllNotificationsRead = useTicketStore((state) => state.markAllNotificationsRead);
  const setActiveTicketId = useTicketStore((state) => state.setActiveTicketId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleOpenNotification(notification: Notification) {
    markNotificationRead(notification.id);
    setOpen(false);
    if (notification.target?.kind === 'ticket') {
      router.push('/helpdesk');
      setActiveTicketId(notification.target.ticketId);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title="Notifications"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-white/80 transition-colors duration-200 hover:bg-white/14 hover:text-white"
      >
        <Bell size={18} strokeWidth={1.75} />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white text-gray-700 shadow-[0_18px_36px_rgba(15,23,42,0.16)]">
          <div className="flex items-center justify-between border-b border-gray-100 px-3.5 py-2.5">
            <p className="text-sm font-semibold text-gray-900">
              Notifications {unreadCount > 0 ? <span className="text-gray-400">({unreadCount})</span> : null}
            </p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => markAllNotificationsRead()}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <CheckCheck size={13} />
                Tout marquer comme lu
              </button>
            ) : null}
          </div>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <Inbox size={22} className="text-gray-300" />
              <p className="text-xs text-gray-400">Aucune notification pour le moment.</p>
            </div>
          ) : (
            <div className="max-h-96 divide-y divide-gray-50 overflow-y-auto">
              {notifications.map((notification) => (
                <NotificationRow key={notification.id} notification={notification} onOpen={handleOpenNotification} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
