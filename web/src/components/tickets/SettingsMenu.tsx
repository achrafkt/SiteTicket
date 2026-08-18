'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, User, LogOut, Bell, LayoutGrid, ShieldCheck } from 'lucide-react';
import { useTicketStore } from '@/store/ticket-store';
import { clearStoredUser } from '@/lib/current-user';

function PreferenceToggle({
  label,
  checked,
  onChange,
}: {
  label: React.ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-xs font-medium text-gray-700 hover:bg-slate-50"
    >
      {label}
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 ${
          checked ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-150 ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}

export function SettingsMenu() {
  const router = useRouter();
  const currentUser = useTicketStore((state) => state.currentUser);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const compactView = useTicketStore((state) => state.compactView);
  const setCompactView = useTicketStore((state) => state.setCompactView);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayUser = mounted ? currentUser : null;
  const isAdmin = displayUser?.roleCode === 'admin';

  function handleLogout() {
    localStorage.removeItem('site-ticket-token');
    clearStoredUser();
    useTicketStore.getState().resetSession(null);
    setOpen(false);
    router.push('/login');
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title="Réglages"
        onClick={() => setOpen((value) => !value)}
        className={`flex h-11 w-11 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-nav-bg-active/60 hover:text-white ${
          open ? 'bg-nav-bg-active text-white' : ''
        }`}
      >
        <Settings size={20} strokeWidth={1.75} />
      </button>

      {open ? (
        <div className="absolute bottom-0 left-full z-20 ml-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 text-gray-700 shadow-[0_18px_36px_rgba(15,23,42,0.16)]">
          <p className="border-b border-gray-100 px-3.5 py-2.5 text-xs text-gray-400">
            {displayUser ? `${displayUser.name} · ${displayUser.roleName}` : 'Compte'}
          </p>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push('/profile');
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium hover:bg-slate-50"
          >
            <User size={14} className="shrink-0 text-gray-400" />
            Profil
          </button>

          <p className="border-t border-gray-100 px-3.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Préférences
          </p>
          <PreferenceToggle
            label={
              <span className="flex items-center gap-2.5">
                <Bell size={14} className="shrink-0 text-gray-400" />
                Notifications par e-mail
              </span>
            }
            checked={emailNotifications}
            onChange={setEmailNotifications}
          />
          <PreferenceToggle
            label={
              <span className="flex items-center gap-2.5">
                <LayoutGrid size={14} className="shrink-0 text-gray-400" />
                Vue compacte des tickets
              </span>
            }
            checked={mounted ? compactView : false}
            onChange={setCompactView}
          />

          {isAdmin ? (
            <>
              <p className="border-t border-gray-100 px-3.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Paramètres
              </p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push('/settings/users');
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium hover:bg-slate-50"
              >
                <ShieldCheck size={14} className="shrink-0 text-gray-400" />
                Utilisateurs
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push('/settings/projects');
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium hover:bg-slate-50"
              >
                <ShieldCheck size={14} className="shrink-0 text-gray-400" />
                Chantiers
              </button>
            </>
          ) : null}

          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-2.5 border-t border-gray-100 px-3.5 py-2 pt-2 text-left text-xs font-medium hover:bg-slate-50"
          >
            <LogOut size={14} className="shrink-0 text-gray-400" />
            Déconnexion
          </button>
        </div>
      ) : null}
    </div>
  );
}
