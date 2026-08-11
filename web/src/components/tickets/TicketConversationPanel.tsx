'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Mail,
  Eye,
  MoreHorizontal,
  X,
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  Image as ImageIcon,
  Paperclip,
  Send,
  ChevronDown,
  ChevronRight,
  Lock,
  BookTemplate,
  Braces,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useTicketStore } from '@/store/ticket-store';
import { useTicketCollaboration } from '@/hooks/useTicketCollaboration';
import { ALLOWED_ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_SIZE_BYTES } from '@/lib/tickets-api';
import { canDeleteAttachment } from '@/lib/ticket-permissions';
import { Avatar } from './Avatar';
import { AttachmentThumb } from './AttachmentThumb';
import { formatDateTime } from './ticket-visuals';
import type { Ticket, TicketMessage } from '@/types/ticket';

type ReplyTab = 'public' | 'private';

const REPLY_TEMPLATES = [
  {
    id: 'tpl-1',
    label: 'Réserve levée — modèle standard',
    body: 'Bonjour,\n\nLa réserve mentionnée a été traitée et levée. Merci de valider la clôture du ticket.\n\nCordialement,',
  },
  {
    id: 'tpl-2',
    label: 'Demande de précision MOE',
    body: "Bonjour,\n\nPourriez-vous nous apporter une précision technique sur ce point avant de poursuivre l'intervention ?\n\nCordialement,",
  },
  {
    id: 'tpl-3',
    label: 'Relance sous 48h',
    body: 'Bonjour,\n\nSans retour de votre part, nous nous permettons de relancer ce ticket. Merci de nous répondre sous 48h.\n\nCordialement,',
  },
];

const MACRO_VARIABLES = [
  { id: 'var-1', label: 'Nom du chantier', token: '{{nom_chantier}}' },
  { id: 'var-2', label: "Date d'échéance", token: '{{date_echeance}}' },
  { id: 'var-3', label: 'Nom du destinataire', token: '{{nom_destinataire}}' },
  { id: 'var-4', label: 'Numéro de ticket', token: '{{numero_ticket}}' },
];

function MessageItem({ message, ticketId }: { message: TicketMessage; ticketId: string }) {
  const currentUser = useTicketStore((state) => state.currentUser);
  const deleteTicketAttachment = useTicketStore((state) => state.deleteTicketAttachment);
  const [collapsed, setCollapsed] = useState(false);
  const isLong = message.body.length > 220;

  return (
    <div
      className={`rounded-lg border p-3 ${
        message.isInternal ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-white'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Avatar initials={message.authorInitials} size="md" />
          <div>
            <p className="text-sm font-medium text-gray-900">{message.authorName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{formatDateTime(message.createdAt)}</span>
          {isLong ? (
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="text-gray-400 hover:text-gray-600"
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
          ) : null}
        </div>
      </div>

      {message.isInternal ? (
        <span className="mt-2 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
          <Lock size={10} /> Commentaire privé
        </span>
      ) : null}

      {!collapsed ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{message.body}</p>
      ) : null}

      {!collapsed && message.attachments.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {message.attachments.map((attachment) => {
            const canRemove = canDeleteAttachment(currentUser, attachment.uploadedBy.id);
            return (
              <AttachmentThumb
                key={attachment.id}
                fileName={attachment.fileName}
                fileType={attachment.fileType}
                fileSize={attachment.fileSize}
                fileUrl={attachment.fileUrl}
                onRemove={() => deleteTicketAttachment(ticketId, attachment.id)}
                disabled={!canRemove}
                disabledReason={
                  canRemove ? undefined : 'Votre rôle ne permet pas de supprimer cette pièce jointe.'
                }
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function TicketConversationPanel({ ticket }: { ticket: Ticket }) {
  const currentUser = useTicketStore((state) => state.currentUser);
  const addComment = useTicketStore((state) => state.addComment);
  const isSubmittingComment = useTicketStore((state) => state.isSubmittingComment);
  const commentError = useTicketStore((state) => state.commentError);
  const uploadTicketAttachment = useTicketStore((state) => state.uploadTicketAttachment);
  const deleteTicket = useTicketStore((state) => state.deleteTicket);
  const toggleKnowledgePanel = useTicketStore((state) => state.toggleKnowledgePanel);
  const toggleDetailsPanel = useTicketStore((state) => state.toggleDetailsPanel);
  const isDetailsPanelOpen = useTicketStore((state) => state.isDetailsPanelOpen);

  const [tab, setTab] = useState<ReplyTab>('public');
  const [body, setBody] = useState('');
  const [addToKnowledge, setAddToKnowledge] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<'template' | 'macro' | null>(null);
  const [isActionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [isDeletingTicket, setIsDeletingTicket] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  const { activeEditor, announceEditing, takeControl, simulateRemoteEditor } = useTicketCollaboration(
    ticket.id,
    { id: currentUser?.id ?? '', name: currentUser?.name ?? '' },
  );

  useEffect(() => {
    if (!body.trim()) return;
    announceEditing();
    const timeout = setTimeout(() => setDraftSavedAt(new Date().toISOString()), 800);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body]);

  const isBlockedByOtherEditor = useMemo(
    () => activeEditor !== null && activeEditor.userId !== currentUser?.id,
    [activeEditor, currentUser?.id],
  );

  useEffect(() => {
    if (!openMenu) return;
    function handleClickOutside(event: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenu]);

  useEffect(() => {
    if (!isActionsMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setActionsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isActionsMenuOpen]);

  async function handleDeleteTicket() {
    const confirmed = window.confirm(
      `Supprimer définitivement le ticket "${ticket.title}" ? Cette action est irréversible.`,
    );
    if (!confirmed) return;

    setActionsMenuOpen(false);
    setIsDeletingTicket(true);
    await deleteTicket(ticket.id);
    setIsDeletingTicket(false);
  }

  function insertTemplate(templateBody: string) {
    setBody((current) => (current.trim() ? `${current}\n\n${templateBody}` : templateBody));
    setOpenMenu(null);
  }

  function insertVariable(token: string) {
    setBody((current) => `${current}${token}`);
    setOpenMenu(null);
  }

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList) return;
    setFileError(null);

    const accepted: File[] = [];
    for (const file of Array.from(fileList)) {
      if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type)) {
        setFileError('Types acceptés : images (JPEG, PNG, WebP) ou PDF.');
        continue;
      }
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        setFileError('Taille maximale : 10 Mo par fichier.');
        continue;
      }
      accepted.push(file);
    }

    setPendingFiles((current) => [...current, ...accepted]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removePendingFile(index: number) {
    setPendingFiles((current) => current.filter((_, i) => i !== index));
  }

  async function handleSend() {
    if (!body.trim() || isSubmittingComment) return;

    const comment = await addComment(ticket.id, body, tab === 'private');

    if (comment) {
      if (pendingFiles.length > 0) {
        setIsUploadingFiles(true);
        for (const file of pendingFiles) {
          await uploadTicketAttachment(ticket.id, file, comment.id);
        }
        setIsUploadingFiles(false);
        setPendingFiles([]);
      }

      setBody('');
      setDraftSavedAt(null);

      if (addToKnowledge) {
        toggleKnowledgePanel(true);
      }
    }
  }

  return (
    <section className="flex h-full min-w-[420px] flex-1 flex-col bg-gray-50">
      <header className="flex items-start justify-between border-b border-gray-100 bg-white px-5 py-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-gray-900">{ticket.title}</h1>
          <p className="mt-0.5 text-xs text-gray-400">
            {ticket.reference} • ID {ticket.id} • Créé le {formatDateTime(ticket.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-gray-400">
          <button type="button" title="Email" className="rounded-md p-1.5 hover:bg-gray-100 hover:text-gray-600">
            <Mail size={16} />
          </button>
          <span title="Observateurs" className="flex items-center gap-1 rounded-md px-1.5 py-1.5 text-xs">
            <Eye size={16} /> {ticket.watchersCount}
          </span>
          <div className="relative" ref={actionsMenuRef}>
            <button
              type="button"
              title="Actions"
              onClick={() => setActionsMenuOpen((value) => !value)}
              disabled={isDeletingTicket}
              className="rounded-md p-1.5 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
            >
              {isDeletingTicket ? <RefreshCw size={16} className="animate-spin" /> : <MoreHorizontal size={16} />}
            </button>
            {isActionsMenuOpen ? (
              <div className="absolute right-0 top-full z-20 mt-1.5 w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={handleDeleteTicket}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} /> Supprimer le ticket
                </button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            title={isDetailsPanelOpen ? 'Réduire le panneau' : 'Afficher le panneau'}
            onClick={() => toggleDetailsPanel()}
            className="rounded-md p-1.5 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="helpdesk-scroll flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {ticket.messages.map((message) => (
          <MessageItem key={message.id} message={message} ticketId={ticket.id} />
        ))}
      </div>

      <div className="border-t border-gray-100 bg-white px-5 py-3">
        {isBlockedByOtherEditor ? (
          <div className="mb-2 flex items-center justify-between rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
            <span>
              ⚠ {activeEditor?.userName} est en train de modifier ce brouillon
            </span>
            <button type="button" onClick={takeControl} className="font-medium underline">
              Prendre le contrôle
            </button>
          </div>
        ) : null}

        <div className="mb-2 flex items-center justify-between">
          <div className="flex gap-1 rounded-md bg-gray-100 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setTab('public')}
              className={`rounded px-3 py-1.5 ${
                tab === 'public' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Réponse publique
            </button>
            <button
              type="button"
              onClick={() => setTab('private')}
              className={`rounded px-3 py-1.5 ${
                tab === 'private' ? 'bg-amber-100 text-amber-800' : 'text-gray-500'
              }`}
            >
              Commentaire privé
            </button>
          </div>

          {draftSavedAt ? (
            <span className="text-[11px] text-gray-400">Brouillon enregistré</span>
          ) : null}

          {process.env.NODE_ENV !== 'production' ? (
            <button
              type="button"
              onClick={() =>
                simulateRemoteEditor({ userId: 'demo-user', userName: 'Sophie Marchand' })
              }
              className="text-[11px] text-gray-300 hover:text-gray-500"
              title="Démo locale : simuler un autre éditeur"
            >
              (démo collaboration)
            </button>
          ) : null}
        </div>

        <div className={`rounded-lg border ${tab === 'private' ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center gap-1 border-b border-gray-100 px-2 py-1.5 text-gray-400" ref={toolbarRef}>
            <button type="button" className="rounded p-1 hover:bg-gray-100" title="Gras">
              <Bold size={14} />
            </button>
            <button type="button" className="rounded p-1 hover:bg-gray-100" title="Italique">
              <Italic size={14} />
            </button>
            <button type="button" className="rounded p-1 hover:bg-gray-100" title="Souligné">
              <Underline size={14} />
            </button>
            <button type="button" className="rounded p-1 hover:bg-gray-100" title="Lien">
              <LinkIcon size={14} />
            </button>
            <button type="button" className="rounded p-1 hover:bg-gray-100" title="Image">
              <ImageIcon size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => handleFilesSelected(event.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded p-1 hover:bg-gray-100"
              title="Pièce jointe"
            >
              <Paperclip size={14} />
            </button>

            <span className="mx-1 h-4 w-px bg-gray-200" />

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu((current) => (current === 'template' ? null : 'template'))}
                className={`rounded p-1 hover:bg-gray-100 ${openMenu === 'template' ? 'bg-gray-100 text-gray-700' : ''}`}
                title="Insérer un modèle de réponse"
              >
                <BookTemplate size={14} />
              </button>
              {openMenu === 'template' ? (
                <div className="absolute left-0 top-full z-10 mt-1 w-64 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                  {REPLY_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => insertTemplate(template.body)}
                      className="block w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu((current) => (current === 'macro' ? null : 'macro'))}
                className={`rounded p-1 hover:bg-gray-100 ${openMenu === 'macro' ? 'bg-gray-100 text-gray-700' : ''}`}
                title="Insérer une macro / variable"
              >
                <Braces size={14} />
              </button>
              {openMenu === 'macro' ? (
                <div className="absolute left-0 top-full z-10 mt-1 w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                  {MACRO_VARIABLES.map((variable) => (
                    <button
                      key={variable.id}
                      type="button"
                      onClick={() => insertVariable(variable.token)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <span>{variable.label}</span>
                      <code className="text-[11px] text-gray-400">{variable.token}</code>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {fileError ? <p className="px-3 pt-2 text-xs text-red-600">{fileError}</p> : null}

          {pendingFiles.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-b border-gray-100 px-3 py-2">
              {pendingFiles.map((file, index) => (
                <AttachmentThumb
                  key={`${file.name}-${index}`}
                  fileName={file.name}
                  fileType={file.type}
                  fileSize={file.size}
                  onRemove={() => removePendingFile(index)}
                  disabled={isUploadingFiles}
                />
              ))}
            </div>
          ) : null}

          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            disabled={isBlockedByOtherEditor}
            rows={3}
            placeholder={
              tab === 'public' ? 'Ajouter une réponse...' : 'Ajouter une note interne...'
            }
            className="w-full resize-none px-3 py-2 text-sm focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
          />

          <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
            <label className="flex items-center gap-1.5 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={addToKnowledge}
                onChange={(event) => setAddToKnowledge(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300"
              />
              Ajouter à la base de connaissances
            </label>

            <button
              type="button"
              onClick={handleSend}
              disabled={!body.trim() || isBlockedByOtherEditor || isSubmittingComment || isUploadingFiles}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white disabled:bg-gray-200 disabled:text-gray-400"
              title="Envoyer"
            >
              {isSubmittingComment || isUploadingFiles ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
            </button>
          </div>

          {commentError ? (
            <p className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{commentError}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
