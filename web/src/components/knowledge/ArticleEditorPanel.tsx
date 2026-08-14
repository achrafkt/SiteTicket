'use client';

import { useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Dropdown } from '@/components/tickets/Dropdown';
import { FieldLabel } from '@/components/settings/FieldLabel';
import { ApiError } from '@/lib/api';
import type { ApiRole } from '@/lib/admin-api';
import { createKnowledgeArticle, updateKnowledgeArticle } from '@/lib/knowledge-api';
import { mapKnowledgeArticle } from '@/lib/knowledge-mapper';
import type { KnowledgeArticle, KnowledgeCategory } from '@/types/knowledge';

type ArticleEditorPanelProps = {
  categories: KnowledgeCategory[];
  roles: ApiRole[];
  article: KnowledgeArticle | null;
  onClose: () => void;
  onSaved: (article: KnowledgeArticle) => void;
};

export function ArticleEditorPanel({ categories, roles, article, onClose, onSaved }: ArticleEditorPanelProps) {
  const isEditing = article !== null;
  const [categoryId, setCategoryId] = useState(article?.category.id ?? categories[0]?.id ?? '');
  const [title, setTitle] = useState(article?.title ?? '');
  const [content, setContent] = useState(article?.content ?? '');
  const [visibleRoles, setVisibleRoles] = useState<string[]>(article?.visibleRoles ?? []);
  const [needsReview, setNeedsReview] = useState(article?.needsReview ?? false);
  const [validUntil, setValidUntil] = useState(article?.validUntil?.slice(0, 10) ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = categoryId.length > 0 && title.trim().length > 0 && content.trim().length > 0 && !isSubmitting;

  function toggleRole(code: string) {
    setVisibleRoles((current) =>
      current.includes(code) ? current.filter((existing) => existing !== code) : [...current, code],
    );
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        categoryId,
        title: title.trim(),
        content: content.trim(),
        visibleRoles,
        needsReview,
        validUntil: validUntil || null,
      };
      const apiArticle = isEditing
        ? await updateKnowledgeArticle(article.id, payload)
        : await createKnowledgeArticle({ ...payload, validUntil: validUntil || undefined });
      onSaved(mapKnowledgeArticle(apiArticle));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'enregistrer l'article.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30" onClick={onClose}>
      <section
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? "Modifier l'article" : 'Nouvel article'}
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">
              Visible par tous par défaut, sauf restriction de rôles ci-dessous
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <FieldLabel>Catégorie *</FieldLabel>
            <Dropdown
              value={categoryId}
              onChange={setCategoryId}
              options={categories.map((category) => ({ value: category.id, label: category.name }))}
            />
          </div>

          <div>
            <FieldLabel>Titre *</FieldLabel>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>

          <div>
            <FieldLabel>Contenu *</FieldLabel>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={10}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>

          <div>
            <FieldLabel>Date d&apos;expiration</FieldLabel>
            <input
              type="date"
              value={validUntil}
              onChange={(event) => setValidUntil(event.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Pour les contenus qui périment (normes, VGP...). Laisser vide sinon.
            </p>
          </div>

          <label className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2">
            <span className="text-sm text-gray-700">Marquer &laquo; à revoir &raquo;</span>
            <input
              type="checkbox"
              checked={needsReview}
              onChange={(event) => setNeedsReview(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
          </label>

          <div>
            <FieldLabel>Visible par (rôles)</FieldLabel>
            <div className="space-y-1.5">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={visibleRoles.includes(role.code)}
                    onChange={() => toggleRole(role.code)}
                    className="h-3.5 w-3.5 rounded border-gray-300"
                  />
                  {role.name}
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-gray-400">
              Aucune case cochée = visible par tous les rôles.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 px-5 py-3">
          {error ? <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p> : null}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-200 disabled:text-gray-400"
            >
              {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : null}
              {isEditing ? 'Enregistrer' : "Créer l'article"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
