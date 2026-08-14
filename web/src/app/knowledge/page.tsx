'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTicketStore } from '@/store/ticket-store';
import { ApiError } from '@/lib/api';
import { getRoles, type ApiRole } from '@/lib/admin-api';
import {
  deleteKnowledgeArticle,
  getKnowledgeArticles,
  getKnowledgeCategories,
  removeKnowledgeArticleFile,
  uploadKnowledgeArticleFile,
} from '@/lib/knowledge-api';
import { mapKnowledgeArticle, mapKnowledgeCategory } from '@/lib/knowledge-mapper';
import { canManageKnowledge } from '@/lib/knowledge-permissions';
import { ArticleDetail } from '@/components/knowledge/ArticleDetail';
import { ArticleEditorPanel } from '@/components/knowledge/ArticleEditorPanel';
import { ArticleList } from '@/components/knowledge/ArticleList';
import { CategorySidebar } from '@/components/knowledge/CategorySidebar';
import type { KnowledgeArticle, KnowledgeCategory } from '@/types/knowledge';

export default function KnowledgePage() {
  const currentUser = useTicketStore((state) => state.currentUser);
  const canManage = canManageKnowledge(currentUser);

  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [isEditorOpen, setEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [categoriesData, articlesData, rolesData] = await Promise.all([
        getKnowledgeCategories(),
        getKnowledgeArticles(),
        getRoles(),
      ]);
      const mappedArticles = articlesData.map(mapKnowledgeArticle);
      setCategories(categoriesData.map(mapKnowledgeCategory));
      setArticles(mappedArticles);
      setRoles(rolesData);
      setActiveArticleId((current) => current ?? mappedArticles[0]?.id ?? null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Impossible de charger la base de connaissances.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const visibleArticles = useMemo(
    () => (activeCategoryId ? articles.filter((article) => article.category.id === activeCategoryId) : articles),
    [articles, activeCategoryId],
  );

  const activeArticle = articles.find((article) => article.id === activeArticleId) ?? null;

  function handleArticleSaved(article: KnowledgeArticle) {
    setArticles((current) => {
      const exists = current.some((existing) => existing.id === article.id);
      return exists ? current.map((existing) => (existing.id === article.id ? article : existing)) : [article, ...current];
    });
    setActiveArticleId(article.id);
    setEditorOpen(false);
    setEditingArticle(null);
  }

  async function handleDelete() {
    if (!activeArticle) return;
    const confirmed = window.confirm(`Supprimer définitivement l'article "${activeArticle.title}" ?`);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteKnowledgeArticle(activeArticle.id);
      setArticles((current) => current.filter((article) => article.id !== activeArticle.id));
      setActiveArticleId(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Impossible de supprimer l'article.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleUploadFile(file: File) {
    if (!activeArticle) return;
    setIsUploadingFile(true);
    setFileError(null);
    try {
      const updated = mapKnowledgeArticle(await uploadKnowledgeArticleFile(activeArticle.id, file));
      setArticles((current) => current.map((article) => (article.id === updated.id ? updated : article)));
    } catch (err) {
      setFileError(err instanceof ApiError ? err.message : "Impossible d'envoyer le fichier.");
    } finally {
      setIsUploadingFile(false);
    }
  }

  async function handleRemoveFile() {
    if (!activeArticle) return;
    setFileError(null);
    try {
      const updated = mapKnowledgeArticle(await removeKnowledgeArticleFile(activeArticle.id));
      setArticles((current) => current.map((article) => (article.id === updated.id ? updated : article)));
    } catch (err) {
      setFileError(err instanceof ApiError ? err.message : 'Impossible de supprimer le fichier.');
    }
  }

  return (
    <div className="flex h-full gap-4 overflow-hidden">
      <CategorySidebar
        categories={categories}
        articles={articles}
        activeCategoryId={activeCategoryId}
        onSelect={setActiveCategoryId}
      />

      <div className="flex flex-1 overflow-hidden rounded-[10px] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-400">
            <RefreshCw size={16} className="animate-spin" />
            Chargement de la base de connaissances...
          </div>
        ) : loadError && articles.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-gray-500">
            <p className="text-red-600">{loadError}</p>
            <button
              type="button"
              onClick={load}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Réessayer
            </button>
          </div>
        ) : (
          <>
            <ArticleList
              articles={visibleArticles}
              activeArticleId={activeArticleId}
              onSelect={setActiveArticleId}
              canManage={canManage}
              onCreate={() => {
                setEditingArticle(null);
                setEditorOpen(true);
              }}
            />
            <ArticleDetail
              article={activeArticle}
              roles={roles}
              canManage={canManage}
              onEdit={() => {
                setEditingArticle(activeArticle);
                setEditorOpen(true);
              }}
              onDelete={handleDelete}
              isDeleting={isDeleting}
              onUploadFile={handleUploadFile}
              onRemoveFile={handleRemoveFile}
              isUploadingFile={isUploadingFile}
              fileError={fileError}
            />
          </>
        )}
      </div>

      {isEditorOpen ? (
        <ArticleEditorPanel
          categories={categories}
          roles={roles}
          article={editingArticle}
          onClose={() => {
            setEditorOpen(false);
            setEditingArticle(null);
          }}
          onSaved={handleArticleSaved}
        />
      ) : null}
    </div>
  );
}
