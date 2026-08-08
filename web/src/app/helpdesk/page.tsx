'use client';

import { useEffect, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { AppHeader } from '@/components/tickets/AppHeader';
import { NavRail } from '@/components/tickets/NavRail';
import { ViewsSidebar } from '@/components/tickets/ViewsSidebar';
import { TicketList } from '@/components/tickets/TicketList';
import { TicketConversationPanel } from '@/components/tickets/TicketConversationPanel';
import { TicketDetailsPanel } from '@/components/tickets/TicketDetailsPanel';
import { CreateKnowledgePanel } from '@/components/tickets/CreateKnowledgePanel';
import { CreateTicketPanel } from '@/components/tickets/CreateTicketPanel';
import { useTicketStore } from '@/store/ticket-store';

export default function HelpdeskPage() {
  const tickets = useTicketStore((state) => state.tickets);
  const activeTicketId = useTicketStore((state) => state.activeTicketId);
  const isKnowledgePanelOpen = useTicketStore((state) => state.isKnowledgePanelOpen);
  const isDetailsPanelOpen = useTicketStore((state) => state.isDetailsPanelOpen);
  const isCreatePanelOpen = useTicketStore((state) => state.isCreatePanelOpen);
  const isLoading = useTicketStore((state) => state.isLoading);
  const error = useTicketStore((state) => state.error);
  const loadInitialData = useTicketStore((state) => state.loadInitialData);

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === activeTicketId) ?? null,
    [tickets, activeTicketId],
  );

  return (
    <div className="helpdesk-shell flex flex-col  bg-slate-200 font-sans">
      <AppHeader />

      <div className="flex flex-1 overflow-hidden">
        <NavRail />

        <div className="flex flex-1 gap-4 overflow-hidden p-4">
          <ViewsSidebar />

          <div className="flex flex-1 overflow-hidden rounded-[10px] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-400">
                <RefreshCw size={16} className="animate-spin" />
                Chargement des tickets...
              </div>
            ) : error ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-gray-500">
                <p className="text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={() => loadInitialData()}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Réessayer
                </button>
              </div>
            ) : (
              <>
                <TicketList />

                {isCreatePanelOpen ? (
                  <CreateTicketPanel />
                ) : activeTicket ? (
                  <>
                    <TicketConversationPanel key={activeTicket.id} ticket={activeTicket} />
                    {isKnowledgePanelOpen ? (
                      <CreateKnowledgePanel ticket={activeTicket} />
                    ) : isDetailsPanelOpen ? (
                      <TicketDetailsPanel ticket={activeTicket} />
                    ) : null}
                  </>
                ) : (
                  <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
                    {tickets.length === 0
                      ? 'Aucun ticket pour le moment.'
                      : 'Sélectionnez un ticket pour afficher son détail.'}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}