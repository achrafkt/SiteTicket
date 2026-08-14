'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useTicketStore } from '@/store/ticket-store';
import { ApiError } from '@/lib/api';
import { stripHtmlToText } from '@/lib/html-text';
import { createKnowledgeArticle, getKnowledgeCategories } from '@/lib/knowledge-api';
import { mapKnowledgeCategory } from '@/lib/knowledge-mapper';
import { canManageKnowledge } from '@/lib/knowledge-permissions';
import { Dropdown } from './Dropdown';
import type { Ticket } from '@/types/ticket';
import type { KnowledgeCategory } from '@/types/knowledge';

type Draft = {
  title: string;
  content: string;
  categoryId: string;
  validUntil: string;
};

function draftKey(ticketId: string): string {
  return `kb-draft:${ticketId}`;
}

function loadDraft(ticketId: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(ticketId));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function CreateKnowledgePanel({ ticket }: { ticket: Ticket }) {
  const currentUser = useTicketStore((state) => state.currentUser);
  const toggleKnowledgePanel = useTicketStore((state) => state.toggleKnowledgePanel);
  const canManage = canManageKnowledge(currentUser);

  const draft = loadDraft(ticket.id);
  const lastMessage = ticket.messages[ticket.messages.length - 1] ?? null;

  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [title, setTitle] = useState(draft?.title ?? ticket.title);
  const [content, setContent] = useState(draft?.content ?? (lastMessage ? stripHtmlToText(lastMessage.body) : ''));
  const [categoryId, setCategoryId] = useState(draft?.categoryId ?? '');
  const [validUntil, setValidUntil] = useState(draft?.validUntil ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [savedDraftAt, setSavedDraftAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await getKnowledgeCategories();
        if (cancelled) return;
        const mapped = data.map(mapKnowledgeCategory);
        setCategories(mapped);
        setCategoryId((current) => current || mapped[0]?.id || '');
      } catch {
        // best-effort: dropdown stays empty, submit stays disabled until retried
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [canManage]);

  if (!canManage) {
    return (
      <aside className="flex h-full w-[320px] shrink-0 flex-col items-center justify-center gap-3 border-l border-gray-100 bg-white p-6 text-center">
        <p className="text-sm text-gray-500">
          Votre rôle ne permet pas de créer des articles dans la base de connaissances.
        </p>
        <button
          type="button"
          onClick={() => toggleKnowledgePanel(false)}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          Retour
        </button>
      </aside>
    );
  }

  const canSubmit = categoryId.length > 0 && title.trim().length > 0 && content.trim().length > 0 && !isSaving;

  function saveDraftLocally() {
    try {
      localStorage.setItem(draftKey(ticket.id), JSON.stringify({ title, content, categoryId, validUntil }));
      setSavedDraftAt(Date.now());
    } catch {
      // best-effort: localStorage may be unavailable (private mode, quota)
    }
  }

  function clearDraft() {
    try {
      localStorage.removeItem(draftKey(ticket.id));
    } catch {
      // best-effort
    }
  }

  async function handleCreateArticle() {
    if (!canSubmit) return;
    setIsSaving(true);
    setError(null);
    try {
      await createKnowledgeArticle({
        categoryId,
        title: title.trim(),
        content: content.trim(),
        validUntil: validUntil || undefined,
        sourceTicketId: ticket.id,
      });
      clearDraft();
      toggleKnowledgePanel(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de créer l'article.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-gray-100 bg-white">
      <div className="border-b border-gray-100 p-3">
        <button
          type="button"
          onClick={() => toggleKnowledgePanel(false)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={15} /> Retour
        </button>
      </div>

      <div className="helpdesk-scroll flex-1 space-y-4 overflow-y-auto p-4">
        <h2 className="text-base font-semibold text-gray-900">Créer une nouvelle fiche</h2>
        <p className="-mt-2 text-xs text-gray-400">
          Pré-rempli à partir du ticket {ticket.reference} — relisez avant d&apos;enregistrer.
        </p>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Titre / question *
          </label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Réponse *
          </label>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={8}
            className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-gray-400">
            Astuce : les réponses courtes et précises fonctionnent mieux.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Catégorie *
          </label>
          <Dropdown
            value={categoryId}
            onChange={setCategoryId}
            placeholder="Sélectionner une catégorie"
            options={categories.map((category) => ({ value: category.id, label: category.name }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Expiration
          </label>
          <input
            type="date"
            value={validUntil}
            onChange={(event) => setValidUntil(event.target.value)}
            className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none"
          />
        </div>
      </div>

      <div className="border-t border-gray-100 p-3">
        {error ? <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p> : null}
        {savedDraftAt ? <p className="mb-2 text-xs text-emerald-600">Brouillon enregistré localement.</p> : null}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={saveDraftLocally}
            className="flex-1 rounded-md border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Enregistrer en brouillon local
          </button>
          <button
            type="button"
            onClick={handleCreateArticle}
            disabled={!canSubmit}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-blue-600 py-2 text-sm font-medium text-white disabled:bg-gray-200 disabled:text-gray-400"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : null}
            Enregistrer dans la BDC
          </button>
        </div>
      </div>
    </aside>
  );
}
