'use client';

import { useState } from 'react';
import { ChevronDown, Headset, LayoutGrid } from 'lucide-react';
import { filterTicketsByView, useTicketStore, type ViewKey } from '@/store/ticket-store';

type ViewItem = {
  key: ViewKey;
  label: string;
};

const PRIMARY_VIEWS: ViewItem[] = [
  { key: 'my_tickets', label: 'Mes tickets' },
  { key: 'past_due', label: 'En retard' },
  { key: 'high_priority', label: 'Priorité haute' },
  { key: 'unassigned', label: 'Non assignés' },
  { key: 'all_tickets', label: 'Tous les tickets' },
];

export function ViewsSidebar() {
  const [isPrimaryOpen, setIsPrimaryOpen] = useState(true);
  const tickets = useTicketStore((state) => state.tickets);
  const activeView = useTicketStore((state) => state.activeView);
  const setActiveView = useTicketStore((state) => state.setActiveView);
  const currentUserId = useTicketStore((state) => state.currentUser?.id ?? null);

  function countFor(view: ViewKey) {
    return filterTicketsByView(tickets, view, currentUserId).length;
  }

  function renderItem(item: ViewItem) {
    const isActive = activeView === item.key;
    const count = countFor(item.key);

    return (
      <button
        key={item.key}
        type="button"
        onClick={() => setActiveView(item.key)}
        className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm transition-all duration-200 ${
          isActive
            ? 'bg-blue-600 font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.28)]'
            : 'font-medium text-slate-700 hover:bg-white hover:text-slate-900 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)]'
        }`}
      >
        <span className="truncate">{item.label}</span>
        <span
          className={`min-w-9 rounded-full px-2.5 py-1 text-center text-xs font-semibold tabular-nums transition-colors duration-150 ${
            isActive
              ? 'bg-white/20 text-white'
              : 'bg-slate-200/70 text-slate-500 group-hover:bg-slate-100'
          }`}
        >
          {count.toLocaleString('en-US')}
        </span>
      </button>
    );
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-100 p-4">
      <div className="flex flex-col rounded-[20px] bg-[#f4f6f9] px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
        <button
          type="button"
          onClick={() => setIsPrimaryOpen((prev) => !prev)}
          aria-expanded={isPrimaryOpen}
          className="flex w-full items-center gap-2.5 rounded-xl bg-[#e8edf3] px-3 py-2.5 text-left"
        >
          <ChevronDown
            size={13}
            className={`text-slate-500 transition-transform duration-200 ${
              isPrimaryOpen ? 'rotate-0' : '-rotate-90'
            }`}
          />
          <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-600">
            Vues des tickets
          </span>
        </button>

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
            isPrimaryOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <nav className="flex flex-col gap-2.5 px-2 pb-2 pt-3">
              {PRIMARY_VIEWS.map(renderItem)}
            </nav>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-slate-200 px-2 pt-4">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 transition-all duration-200 hover:bg-white hover:text-slate-700 hover:shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
          >
            <Headset size={16} className="shrink-0 text-slate-500" />
            <span>Chats en direct</span>
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 transition-all duration-200 hover:bg-white hover:text-slate-700 hover:shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
          >
            <LayoutGrid size={16} className="shrink-0 text-slate-500" />
            <span>Tableaux</span>
          </button>
        </div>
      </div>
    </aside>
  );
}