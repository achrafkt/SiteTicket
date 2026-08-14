'use client';

import { useMemo, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { formatShortDate } from '@/components/tickets/ticket-visuals';
import { getArticleFreshness } from '@/lib/knowledge-rules';
import { CATEGORY_ICONS } from './knowledge-visuals';
import { FreshnessBadge } from './FreshnessBadge';
import type { KnowledgeArticle } from '@/types/knowledge';

type ArticleListProps = {
  articles: KnowledgeArticle[];
  activeArticleId: string | null;
  onSelect: (id: string) => void;
  canManage: boolean;
  onCreate: () => void;
};

export function ArticleList({ articles, activeArticleId, onSelect, canManage, onCreate }: ArticleListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredArticles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = !term
      ? articles
      : articles.filter(
          (article) =>
            article.title.toLowerCase().includes(term) || article.content.toLowerCase().includes(term),
        );
    return [...filtered].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [articles, searchTerm]);

  return (
    <section className="flex h-full w-[360px] shrink-0 flex-col border-r border-gray-100 bg-white">
      <div className="border-b border-gray-100 p-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">{filteredArticles.length} article(s)</h2>
          {canManage ? (
            <button
              type="button"
              onClick={onCreate}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              <Plus size={13} /> Nouvel article
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
          <Search size={15} className="text-gray-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Rechercher un article..."
            className="w-full text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="helpdesk-scroll flex-1 divide-y divide-gray-100 overflow-y-auto">
        {filteredArticles.length === 0 ? (
          <p className="p-4 text-sm text-gray-400">Aucun article.</p>
        ) : (
          filteredArticles.map((article) => {
            const Icon = CATEGORY_ICONS[article.category.code];
            const freshness = getArticleFreshness(article.validUntil, article.needsReview);
            const isSelected = article.id === activeArticleId;

            return (
              <button
                key={article.id}
                type="button"
                onClick={() => onSelect(article.id)}
                className={`flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors ${
                  isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Icon size={13} />
                  <span className="truncate">{article.category.name}</span>
                </div>
                <p className="truncate text-sm font-medium text-gray-900">{article.title}</p>
                <div className="flex items-center gap-2">
                  <FreshnessBadge status={freshness} />
                  <span className="text-[11px] text-gray-400">
                    Mis à jour le {formatShortDate(article.updatedAt)}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
