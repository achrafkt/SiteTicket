'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { AppHeader } from '@/components/tickets/AppHeader';
import { NavRail } from '@/components/tickets/NavRail';
import { useTicketStore } from '@/store/ticket-store';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const currentUser = useTicketStore((state) => state.currentUser);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !currentUser) {
      router.replace('/login');
    }
  }, [mounted, currentUser, router]);

  const isAdmin = currentUser?.roleCode === 'admin';

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100 font-sans">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <NavRail />
        <div className="flex-1 overflow-y-auto p-6">
          {!mounted || !currentUser ? null : isAdmin ? (
            children
          ) : (
            <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
              <ShieldAlert size={28} className="text-red-500" />
              <h1 className="text-lg font-semibold text-gray-900">Accès refusé</h1>
              <p className="text-sm text-gray-500">
                Cette section est réservée aux administrateurs.
              </p>
              <Link
                href="/helpdesk"
                className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Retour aux tickets
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
