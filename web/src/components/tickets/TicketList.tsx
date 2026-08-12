'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal, ChevronDown, Check } from 'lucide-react';
import {
  filterTicketsByView,
  useTicketStore,
  getEffectiveViewsSidebarWidth,
  VIEWS_SIDEBAR_DEFAULT_WIDTH,
} from '@/store/ticket-store';
import { TicketCard } from './TicketCard';

const BASE_LIST_WIDTH = 336;

const VIEW_TITLES: Record<string, string> = {
  my_tickets: 'Mes tickets',
  past_due: 'En retard',
  high_priority: 'Priorité haute',
  unassigned: 'Non assignés',
  all_tickets: 'Tous les tickets',
  my_reserves_to_lift: 'Mes réserves à lever',
  rfi_waiting_moe: 'RFI en attente MOE',
  overdue_by_lot: 'En retard par lot',
};

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

type SortKey = 'recent' | 'priority' | 'dueDate';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Plus récents' },
  { key: 'priority', label: 'Priorité' },
  { key: 'dueDate', label: "Date d'échéance" },
];

export function TicketList() {
  const tickets = useTicketStore((state) => state.tickets);
  const activeView = useTicketStore((state) => state.activeView);
  const activeTicketId = useTicketStore((state) => state.activeTicketId);
  const setActiveTicketId = useTicketStore((state) => state.setActiveTicketId);
  const searchTerm = useTicketStore((state) => state.searchTerm);
  const setSearchTerm = useTicketStore((state) => state.setSearchTerm);
  const currentUserId = useTicketStore((state) => state.currentUser?.id ?? null);
  const viewsSidebarWidth = useTicketStore((state) => state.viewsSidebarWidth);
  const listWidth =
    BASE_LIST_WIDTH + (VIEWS_SIDEBAR_DEFAULT_WIDTH - getEffectiveViewsSidebarWidth(viewsSidebarWidth));

  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const [isSortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSortMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setSortMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSortMenuOpen]);

  const filteredTickets = useMemo(() => {
    const byView = filterTicketsByView(tickets, activeView, currentUserId);
    const bySearch = !searchTerm.trim()
      ? byView
      : byView.filter((ticket) => {
          const term = searchTerm.toLowerCase();
          return (
            ticket.title.toLowerCase().includes(term) ||
            ticket.reference.toLowerCase().includes(term) ||
            (ticket.lot ?? '').toLowerCase().includes(term)
          );
        });

    const sorted = [...bySearch];
    if (sortBy === 'priority') {
      sorted.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    } else if (sortBy === 'dueDate') {
      sorted.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } else {
      sorted.sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
    }
    return sorted;
  }, [tickets, activeView, searchTerm, sortBy, currentUserId]);

  function toggleCheck(id: string) {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <section
      style={{ width: listWidth }}
      className="flex h-full shrink-0 flex-col border-r border-gray-100 bg-white"
    >
      <div className="border-b border-gray-100 p-3.5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-1 text-sm font-semibold text-gray-900 hover:text-gray-700"
          >
            {VIEW_TITLES[activeView] ?? 'Tickets'}
            <ChevronDown size={15} />
          </button>

          <div className="relative" ref={sortMenuRef}>
            <button
              type="button"
              title="Trier la liste"
              onClick={() => setSortMenuOpen((value) => !value)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 hover:text-gray-600 ${
                isSortMenuOpen ? 'bg-gray-100 text-gray-600' : 'text-gray-400'
              }`}
            >
              <SlidersHorizontal size={15} />
            </button>
            {isSortMenuOpen ? (
              <div className="absolute right-0 top-full z-10 mt-1.5 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Trier par
                </p>
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setSortBy(option.key);
                      setSortMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                  >
                    {option.label}
                    {sortBy === option.key ? <Check size={13} className="text-blue-600" /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
          <Search size={15} className="text-gray-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Rechercher un ticket..."
            className="w-full text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
          />
        </div>

        {checkedIds.size > 0 ? (
          <div className="mt-2.5 flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-700">
            <span>{checkedIds.size} sélectionné(s)</span>
            <button type="button" onClick={() => setCheckedIds(new Set())} className="font-medium underline">
              Effacer
            </button>
          </div>
        ) : null}
      </div>

      <div className="helpdesk-scroll flex-1 divide-y divide-gray-100 overflow-y-auto">
        {filteredTickets.length === 0 ? (
          <p className="p-4 text-sm text-gray-400">Aucun ticket dans cette vue.</p>
        ) : (
          filteredTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              isSelected={ticket.id === activeTicketId}
              isChecked={checkedIds.has(ticket.id)}
              onSelect={() => setActiveTicketId(ticket.id)}
              onToggleCheck={() => toggleCheck(ticket.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}
