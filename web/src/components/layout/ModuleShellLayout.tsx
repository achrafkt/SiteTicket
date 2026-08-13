'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/tickets/AppHeader';
import { NavRail } from '@/components/tickets/NavRail';
import { useTicketStore } from '@/store/ticket-store';

export function ModuleShellLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100 font-sans">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <NavRail />
        <div className="flex-1 overflow-y-auto rounded-t-[20px] bg-white">
          {!mounted || !currentUser ? null : children}
        </div>
      </div>
    </div>
  );
}
