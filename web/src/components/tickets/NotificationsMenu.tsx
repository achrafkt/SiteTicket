'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { useTicketStore } from '@/store/ticket-store';
import { NOTIFICATION_ICONS, NOTIFICATION_ICON_STYLES } from './notification-visuals';
import type { Notification } from '@/types/notification';

const POLL_INTERVAL_MS = 45_000;

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
  const Icon = NOTIFICATION_ICONS[notification.type] ?? Bell;

  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      className={`flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-gray-50 ${
        notification.read ? '' : 'bg-blue-50/40'
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${NOTIFICATION_ICON_STYLES[notification.type] ?? 'bg-gray-100 text-gray-500'}`}
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
        <span className="mt-0.5 line-clamp-2 text-xs text-gray-500">{notification.message}</span>
        <span className="mt-1 block text-[11px] text-gray-400">{formatRelativeTime(notification.createdAt)}</span>
      </span>
    </button>
  );
}

function NotificationSection({
  label,
  notifications,
  onOpen,
}: {
  label: string | null;
  notifications: Notification[];
  onOpen: (notification: Notification) => void;
}) {
  if (notifications.length === 0) return null;

  return (
    <div>
      {label ? (
        <p className="px-3.5 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      ) : null}
      <div className="divide-y divide-gray-50">
        {notifications.map((notification) => (
          <NotificationRow key={notification.id} notification={notification} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

export function NotificationsMenu() {
  const router = useRouter();
  const notifications = useTicketStore((state) => state.notifications);
  const markNotificationRead = useTicketStore((state) => state.markNotificationRead);
  const markAllNotificationsRead = useTicketStore((state) => state.markAllNotificationsRead);
  const refreshNotifications = useTicketStore((state) => state.refreshNotifications);
  const setActiveTicketId = useTicketStore((state) => state.setActiveTicketId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const unread = notifications.filter((notification) => !notification.read);
  const read = notifications.filter((notification) => notification.read);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const interval = setInterval(refreshNotifications, POLL_INTERVAL_MS);
    window.addEventListener('focus', refreshNotifications);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refreshNotifications);
    };
  }, [refreshNotifications]);

  function handleOpenNotification(notification: Notification) {
    markNotificationRead(notification.id);
    setOpen(false);
    if (notification.target?.kind === 'ticket') {
      router.push('/helpdesk');
      setActiveTicketId(notification.target.ticketId);
    } else if (notification.target?.kind === 'project') {
      router.push(`/projects/${notification.target.projectId}`);
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
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-104 max-w-[90vw] overflow-hidden rounded-xl border border-slate-200 bg-white text-gray-700 shadow-[0_18px_36px_rgba(15,23,42,0.16)]">
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
            <div className="max-h-96 overflow-y-auto">
              <NotificationSection
                label={read.length > 0 ? 'Non lues' : null}
                notifications={unread}
                onOpen={handleOpenNotification}
              />
              <NotificationSection
                label={unread.length > 0 ? 'Précédentes' : null}
                notifications={read}
                onOpen={handleOpenNotification}
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
