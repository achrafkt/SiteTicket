'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, ExternalLink, FileText, Paperclip, Pencil, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import type { ApiRole } from '@/lib/admin-api';
import {
  ALLOWED_KNOWLEDGE_FILE_MIME_TYPES,
  MAX_KNOWLEDGE_FILE_SIZE_BYTES,
} from '@/lib/knowledge-api';
import { getArticleFreshness } from '@/lib/knowledge-rules';
import { useTicketStore } from '@/store/ticket-store';
import { Avatar } from '@/components/tickets/Avatar';
import { formatDateTime, formatFileSize } from '@/components/tickets/ticket-visuals';
import { CATEGORY_ICONS } from './knowledge-visuals';
import { FreshnessBadge } from './FreshnessBadge';
import type { KnowledgeArticle } from '@/types/knowledge';

type ArticleDetailProps = {
  article: KnowledgeArticle | null;
  roles: ApiRole[];
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  onUploadFile: (file: File) => void;
  onRemoveFile: () => void;
  isUploadingFile: boolean;
  fileError: string | null;
};

export function ArticleDetail({
  article,
  roles,
  canManage,
  onEdit,
  onDelete,
  isDeleting,
  onUploadFile,
  onRemoveFile,
  isUploadingFile,
  fileError,
}: ArticleDetailProps) {
  const router = useRouter();
  const setActiveTicketId = useTicketStore((state) => state.setActiveTicketId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);

  if (!article) {
    return (
      <section className="flex flex-1 items-center justify-center text-sm text-gray-400">
        Sélectionnez un article pour afficher son contenu.
      </section>
    );
  }

  const Icon = CATEGORY_ICONS[article.category.code];
  const freshness = getArticleFreshness(article.validUntil, article.needsReview);
  const visibleRoleNames =
    article.visibleRoles.length === 0
      ? 'Tous les rôles'
      : article.visibleRoles
          .map((code) => roles.find((role) => role.code === code)?.name ?? code)
          .join(', ');

  function handleFileSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    setFileValidationError(null);

    if (!ALLOWED_KNOWLEDGE_FILE_MIME_TYPES.includes(file.type)) {
      setFileValidationError('Type de fichier non supporté.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_KNOWLEDGE_FILE_SIZE_BYTES) {
      setFileValidationError('Taille maximale : 20 Mo.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    onUploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <section className="helpdesk-scroll flex-1 overflow-y-auto bg-white">
      <div className="mx-auto max-w-2xl p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <Icon size={14} />
            {article.category.name}
          </div>
          {canManage ? (
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={onEdit}
                className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                <Pencil size={13} /> Modifier
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {isDeleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Supprimer
              </button>
            </div>
          ) : null}
        </div>

        <h1 className="text-xl font-semibold text-gray-900">{article.title}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <FreshnessBadge status={freshness} />
          {article.validUntil ? (
            <span className="text-xs text-gray-400">
              Valide jusqu&apos;au {formatDateTime(article.validUntil).split(' ')[0]}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-2 border-y border-gray-100 py-3">
          <Avatar initials={article.author.initials} avatarUrl={article.author.avatarUrl} />
          <div className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">{article.author.name}</span> · mis à jour le{' '}
            {formatDateTime(article.updatedAt)}
          </div>
        </div>

        <div className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{article.content}</div>

        <div className="mt-6">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Fichier joint
          </p>
          {article.fileUrl ? (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
              <FileText size={16} className="shrink-0 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-700">{article.fileName}</p>
                {article.fileSize ? (
                  <p className="text-[11px] text-gray-400">{formatFileSize(article.fileSize)}</p>
                ) : null}
              </div>
              <a
                href={article.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Télécharger"
                className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <Download size={15} />
              </a>
              {canManage ? (
                <button
                  type="button"
                  onClick={onRemoveFile}
                  title="Retirer le fichier"
                  className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <X size={15} />
                </button>
              ) : null}
            </div>
          ) : canManage ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_KNOWLEDGE_FILE_MIME_TYPES.join(',')}
                onChange={(event) => handleFileSelected(event.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingFile}
                className="flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 disabled:opacity-50"
              >
                {isUploadingFile ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
                Joindre un fichier
              </button>
              <p className="mt-1 text-[11px] text-gray-400">PDF, Word, Excel ou image. 20 Mo maximum.</p>
              {fileValidationError || fileError ? (
                <p className="mt-1 text-[11px] text-red-600">{fileValidationError ?? fileError}</p>
              ) : null}
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-gray-400">
              <Paperclip size={13} /> Aucun fichier joint.
            </p>
          )}
        </div>

        <div className="mt-6 border-t border-gray-100 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Visibilité</p>
          <p className="mt-1.5 text-sm text-gray-600">{visibleRoleNames}</p>
        </div>

        {article.sourceTicketId ? (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Origine</p>
            <button
              type="button"
              onClick={() => {
                setActiveTicketId(article.sourceTicketId);
                router.push('/helpdesk');
              }}
              className="mt-1.5 flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
            >
              <ExternalLink size={13} />
              Créé depuis le ticket {article.sourceTicketReference ?? article.sourceTicketId}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
