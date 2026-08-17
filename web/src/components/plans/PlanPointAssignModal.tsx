'use client';

import { useState } from 'react';
import {
  ClipboardList,
  FileCheck,
  FileQuestion,
  Hammer,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Wrench,
  X,
} from 'lucide-react';
import { useTicketStore } from '@/store/ticket-store';
import type { TicketTypeCode } from '@/types/ticket';

// Mirrors AppHeader's private CREATE_OPTION_ICONS — kept local rather than
// exported since it's a small, presentation-only lookup.
const CREATE_OPTION_ICONS: Record<TicketTypeCode, React.ElementType> = {
  RFI: FileQuestion,
  PUNCH: ClipboardList,
  CHANGE_ORDER: RefreshCw,
  SAFETY: ShieldAlert,
  MAINTENANCE: Wrench,
  SUBMITTAL: FileCheck,
  FIELD_ISSUE: Hammer,
};

type PlanPointAssignModalProps = {
  projectId: string;
  planId: string;
  planX: number;
  planY: number;
  planPage: number | null;
  onClose: () => void;
};

export function PlanPointAssignModal({
  projectId,
  planId,
  planX,
  planY,
  planPage,
  onClose,
}: PlanPointAssignModalProps) {
  const tickets = useTicketStore((state) => state.tickets);
  const types = useTicketStore((state) => state.types);
  const setTicketPlanPin = useTicketStore((state) => state.setTicketPlanPin);
  const setActiveTicketId = useTicketStore((state) => state.setActiveTicketId);
  const toggleDetailsPanel = useTicketStore((state) => state.toggleDetailsPanel);
  const openCreateTicketPanel = useTicketStore((state) => state.openCreateTicketPanel);
  const [search, setSearch] = useState('');

  const term = search.trim().toLowerCase();
  const candidates = tickets
    .filter((ticket) => ticket.project.id === projectId)
    .filter(
      (ticket) =>
        !term ||
        ticket.title.toLowerCase().includes(term) ||
        ticket.reference.toLowerCase().includes(term),
    )
    .slice(0, 8);

  function assignExisting(ticketId: string) {
    setTicketPlanPin(ticketId, { planId, planX, planY, planPage });
    setActiveTicketId(ticketId);
    toggleDetailsPanel(true);
    onClose();
  }

  function createNew(typeId: string) {
    openCreateTicketPanel(typeId, undefined, { projectId, planId, planX, planY, planPage });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={onClose}>
      <section
        className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Épingler un ticket ici</h2>
            <p className="mt-0.5 text-xs text-gray-400">Choisissez un ticket existant ou créez-en un nouveau</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Ticket existant
            </p>
            <div className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2 py-1.5">
              <Search size={13} className="text-gray-400" />
              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un ticket de ce chantier..."
                className="w-full text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
            <div className="mt-1.5 max-h-48 overflow-y-auto">
              {candidates.length === 0 ? (
                <p className="px-1 py-1.5 text-xs text-gray-400">Aucun ticket trouvé.</p>
              ) : (
                candidates.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => assignExisting(ticket.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    <MapPin size={13} className="shrink-0 text-gray-400" />
                    <span className="font-medium text-gray-700">{ticket.reference}</span>
                    <span className="min-w-0 flex-1 truncate text-gray-500">{ticket.title}</span>
                    {ticket.planId ? (
                      <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                        déjà épinglé
                      </span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Ou créer un nouveau ticket
            </p>
            <div className="space-y-1">
              {types.map((type) => {
                const Icon = CREATE_OPTION_ICONS[type.code] ?? FileQuestion;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => createNew(type.id)}
                    className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Icon size={15} className="shrink-0 text-gray-400" />
                    {type.name}
                    <Plus size={13} className="ml-auto shrink-0 text-gray-300" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
