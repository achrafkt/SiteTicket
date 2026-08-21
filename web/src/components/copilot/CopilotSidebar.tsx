'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import {
  deleteCopilotConversation,
  listCopilotConversations,
  type CopilotConversationSummary,
} from '@/lib/copilot-api';

function formatConversationDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export function CopilotSidebar({
  activeConversationId,
  onSelect,
  onNewConversation,
  refreshKey,
}: {
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
  refreshKey: number;
}) {
  const [conversations, setConversations] = useState<CopilotConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    setIsLoading(true);
    listCopilotConversations()
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    // refreshKey is bumped by the parent after each completed exchange so
    // the list reorders/updates without a manual reload.
  }, [refresh, refreshKey]);

  async function handleDelete(event: React.MouseEvent, id: string) {
    event.stopPropagation();
    if (!window.confirm('Supprimer cette conversation ?')) return;

    const previous = conversations;
    setConversations((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteCopilotConversation(id);
    } catch {
      setConversations(previous);
      return;
    }
    if (activeConversationId === id) {
      onNewConversation();
    }
  }

  return (
    <div className="flex w-60 shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-3">
        <button
          type="button"
          onClick={onNewConversation}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:border-nav-accent/40 hover:bg-nav-bg-active/5"
        >
          <Plus size={14} />
          Nouvelle conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <p className="px-2 py-4 text-center text-xs text-gray-400">Chargement…</p>
        ) : conversations.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-gray-400">
            Aucune conversation pour l&apos;instant.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(conversation.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect(conversation.id);
                    }
                  }}
                  className={`group flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                    activeConversationId === conversation.id
                      ? 'bg-nav-bg-active/10 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <MessageSquare size={13} className="shrink-0 text-gray-400" />
                  <span className="flex-1 truncate">
                    {conversation.title || 'Nouvelle conversation'}
                  </span>
                  <span className="shrink-0 text-[10px] text-gray-400">
                    {formatConversationDate(conversation.updated_at)}
                  </span>
                  <button
                    type="button"
                    onClick={(event) => void handleDelete(event, conversation.id)}
                    title="Supprimer"
                    className="shrink-0 rounded p-0.5 text-gray-300 opacity-0 transition-colors hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
