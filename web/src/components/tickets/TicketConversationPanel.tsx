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
  Pencil,
} from 'lucide-react';
import { useTicketStore } from '@/store/ticket-store';
import { useTicketCollaboration } from '@/hooks/useTicketCollaboration';
import { ALLOWED_ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_SIZE_BYTES } from '@/lib/tickets-api';
import {
  canDeleteAttachment,
  canDeleteComment,
  canEditComment,
  canViewInternalComments,
} from '@/lib/ticket-permissions';
import { canManageKnowledge } from '@/lib/knowledge-permissions';
import { hasBroadProjectView } from '@/lib/project-hub-permissions';
import { getProjectMembers } from '@/lib/admin-api';
import { mapPerson } from '@/lib/ticket-mapper';
import { looksLikeRichTextHtml, stripHtmlToText } from '@/lib/html-text';
import { sanitizeCommentHtmlForRender } from '@/lib/sanitize-comment-html';
import { Avatar } from './Avatar';
import { AttachmentThumb } from './AttachmentThumb';
import { formatDateTime } from './ticket-visuals';
import type { Person, Ticket, TicketMessage } from '@/types/ticket';

type ReplyTab = 'public' | 'private';
type ToolbarMenu = 'template' | 'macro' | 'link' | null;

const MAX_INLINE_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_INLINE_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isComposerEmpty(html: string): boolean {
  const hasImage = /<img[\s>]/i.test(html);
  if (hasImage) return false;
  return stripHtmlToText(html).length === 0;
}

function normalizeLinkUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

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

function MessageItem({
  message,
  ticketId,
  isJustSent,
}: {
  message: TicketMessage;
  ticketId: string;
  isJustSent: boolean;
}) {
  const currentUser = useTicketStore((state) => state.currentUser);
  const deleteTicketAttachment = useTicketStore((state) => state.deleteTicketAttachment);
  const updateComment = useTicketStore((state) => state.updateComment);
  const deleteComment = useTicketStore((state) => state.deleteComment);
  const [collapsed, setCollapsed] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.body);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isLong = stripHtmlToText(message.body).length > 220;
  const isRichHtml = looksLikeRichTextHtml(message.body);

  // The 15-minute edit/delete window can lapse while this panel stays open;
  // re-evaluate periodically so the action menu doesn't keep offering a
  // control that the server would now reject.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  if (message.deletedAt) {
    return (
      <div className="rounded-lg border border-gray-100 bg-white p-3">
        <div className="flex items-center gap-2">
          <Avatar initials={message.authorInitials} avatarUrl={message.authorAvatarUrl} size="md" />
          <p className="text-sm font-medium text-gray-900">{message.authorName}</p>
          <span className="text-xs text-gray-400">{formatDateTime(message.createdAt)}</span>
        </div>
        <p className="mt-2 text-sm italic text-gray-400">Commentaire supprimé</p>
      </div>
    );
  }

  const canEdit = canEditComment(currentUser, message);
  const canDelete = canDeleteComment(currentUser, message);

  async function handleSaveEdit() {
    if (isComposerEmpty(editValue)) return;
    setIsSavingEdit(true);
    const result = await updateComment(ticketId, message.id, editValue);
    setIsSavingEdit(false);
    if (result) setIsEditing(false);
  }

  async function handleDelete() {
    const confirmed = window.confirm('Supprimer ce commentaire ? Cette action est irréversible.');
    if (!confirmed) return;

    setIsMenuOpen(false);
    setIsDeleting(true);
    await deleteComment(ticketId, message.id);
    setIsDeleting(false);
  }

  return (
    <div
      className={`rounded-lg border p-3 transition-shadow duration-1000 ${
        message.isInternal ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-white'
      } ${isJustSent ? 'ring-2 ring-blue-400 ring-offset-1' : 'ring-0 ring-transparent'}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Avatar initials={message.authorInitials} avatarUrl={message.authorAvatarUrl} size="md" />
          <div>
            <p className="text-sm font-medium text-gray-900">{message.authorName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {formatDateTime(message.createdAt)}
            {message.editedAt ? ` · modifié ${formatDateTime(message.editedAt)}` : ''}
          </span>
          {isLong ? (
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="text-gray-400 hover:text-gray-600"
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
          ) : null}
          {(canEdit || canDelete) && !isEditing ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                title="Actions"
                onClick={() => setIsMenuOpen((value) => !value)}
                disabled={isDeleting}
                className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
              >
                {isDeleting ? <RefreshCw size={14} className="animate-spin" /> : <MoreHorizontal size={14} />}
              </button>
              {isMenuOpen ? (
                <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditValue(message.body);
                        setIsEditing(true);
                        setIsMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil size={14} /> Modifier
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} /> Supprimer
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {message.isInternal ? (
        <span className="mt-2 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
          <Lock size={10} /> Commentaire privé
        </span>
      ) : null}

      {isEditing ? (
        <div className="mt-2">
          <textarea
            value={editValue}
            onChange={(event) => setEditValue(event.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-200 p-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
          />
          <div className="mt-1.5 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={isSavingEdit || isComposerEmpty(editValue)}
              className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={isSavingEdit}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : !collapsed ? (
        isRichHtml ? (
          <div
            className="rich-message-body mt-2 whitespace-pre-wrap text-sm text-gray-700"
            dangerouslySetInnerHTML={{ __html: sanitizeCommentHtmlForRender(message.body) }}
          />
        ) : (
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{message.body}</p>
        )
      ) : null}

      {!isEditing && !collapsed && message.attachments.length > 0 ? (
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

type MentionState = { query: string; range: Range; rect: DOMRect };

const MENTION_ROW_HEIGHT_PX = 34;
const MENTION_MENU_MAX_HEIGHT_PX = 240;

// "ad" should surface "Adil Belhaj" but not e.g. "Khadija Sbai" (which merely
// contains "ad" mid-word) — match against the start of the first name or the
// start of the last name, not an anywhere-substring of the full name.
function matchesMentionQuery(name: string, query: string): boolean {
  if (!query) return true;
  const [firstName, ...rest] = name.split(' ');
  const lastName = rest.join(' ');
  return firstName.toLowerCase().startsWith(query) || lastName.toLowerCase().startsWith(query);
}

export function TicketConversationPanel({ ticket }: { ticket: Ticket }) {
  const currentUser = useTicketStore((state) => state.currentUser);
  const users = useTicketStore((state) => state.users);
  const addComment = useTicketStore((state) => state.addComment);
  const isSubmittingComment = useTicketStore((state) => state.isSubmittingComment);
  const commentError = useTicketStore((state) => state.commentError);
  const uploadTicketAttachment = useTicketStore((state) => state.uploadTicketAttachment);
  const deleteTicket = useTicketStore((state) => state.deleteTicket);
  const toggleKnowledgePanel = useTicketStore((state) => state.toggleKnowledgePanel);
  const toggleDetailsPanel = useTicketStore((state) => state.toggleDetailsPanel);
  const isDetailsPanelOpen = useTicketStore((state) => state.isDetailsPanelOpen);

  const canSeeInternalComments = canViewInternalComments(currentUser);
  const canAddToKnowledge = canManageKnowledge(currentUser);

  const [tab, setTab] = useState<ReplyTab>('public');
  const [body, setBody] = useState('');
  const [addToKnowledge, setAddToKnowledge] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<ToolbarMenu>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isActionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [isDeletingTicket, setIsDeletingTicket] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false });
  const [justSentCommentId, setJustSentCommentId] = useState<string | null>(null);
  const [mentionState, setMentionState] = useState<MentionState | null>(null);
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
  const [projectMembers, setProjectMembers] = useState<Person[]>([]);
  const mentionMenuRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const previousVisibleStateRef = useRef<{ ticketId: string; count: number }>({
    ticketId: ticket.id,
    count: 0,
  });

  const { activeEditor, announceEditing, takeControl, simulateRemoteEditor } = useTicketCollaboration(
    ticket.id,
    { id: currentUser?.id ?? '', name: currentUser?.name ?? '' },
  );

  function updateActiveFormats() {
    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode ?? null;
    if (!anchorNode || !editorRef.current?.contains(anchorNode)) {
      setActiveFormats({ bold: false, italic: false, underline: false });
      return;
    }
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    });
  }

  useEffect(() => {
    if (isComposerEmpty(body)) return;
    announceEditing();
    const timeout = setTimeout(() => setDraftSavedAt(new Date().toISOString()), 800);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body]);

  const isBlockedByOtherEditor = useMemo(
    () => activeEditor !== null && activeEditor.userId !== currentUser?.id,
    [activeEditor, currentUser?.id],
  );

  const visibleMessages = useMemo(
    () => ticket.messages.filter((message) => canSeeInternalComments || !message.isInternal),
    [ticket.messages, canSeeInternalComments],
  );

  useEffect(() => {
    let cancelled = false;
    getProjectMembers(ticket.project.id)
      .then((members) => {
        if (!cancelled) setProjectMembers(members.map((member) => mapPerson(member.user)));
      })
      .catch(() => {
        if (!cancelled) setProjectMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ticket.project.id]);

  // Who can actually be @mentioned: explicit chantier members, plus roles
  // with cross-chantier oversight (admin/MOA/MOE/conducteur de travaux) who
  // see every chantier elsewhere in the app without a ProjectMember row —
  // mirrors notifyMention()'s scoping on the backend so the autocomplete
  // never offers someone who won't actually get notified.
  const mentionableUsers = useMemo(() => {
    const memberIds = new Set(projectMembers.map((person) => person.id));
    const broadViewUsers = users.filter((user) => !memberIds.has(user.id) && hasBroadProjectView(user));
    return [...projectMembers, ...broadViewUsers];
  }, [projectMembers, users]);

  const mentionCandidates = useMemo(() => {
    if (!mentionState) return [];
    const query = mentionState.query.trim().toLowerCase();
    return mentionableUsers.filter(
      (user) => user.id !== currentUser?.id && matchesMentionQuery(user.name, query),
    );
  }, [mentionState, mentionableUsers, currentUser?.id]);

  // Classic dropdown flip: open below the caret by default, but if there isn't
  // enough room before the viewport bottom (and there's more room above),
  // open upward instead — same idea as the browser's native <select>.
  const mentionMenuStyle = useMemo(() => {
    if (!mentionState || mentionCandidates.length === 0) return null;
    const estimatedHeight = Math.min(
      mentionCandidates.length * MENTION_ROW_HEIGHT_PX + 8,
      MENTION_MENU_MAX_HEIGHT_PX,
    );
    const spaceBelow = window.innerHeight - mentionState.rect.bottom;
    const openAbove = spaceBelow < estimatedHeight + 8 && mentionState.rect.top > estimatedHeight + 8;

    return {
      position: 'fixed' as const,
      left: mentionState.rect.left,
      top: openAbove ? mentionState.rect.top - estimatedHeight - 4 : mentionState.rect.bottom + 4,
      maxHeight: MENTION_MENU_MAX_HEIGHT_PX,
    };
  }, [mentionState, mentionCandidates.length]);

  useEffect(() => {
    if (!mentionState) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        mentionMenuRef.current &&
        !mentionMenuRef.current.contains(event.target as Node) &&
        !editorRef.current?.contains(event.target as Node)
      ) {
        setMentionState(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mentionState]);

  useEffect(() => {
    const previous = previousVisibleStateRef.current;
    const sameTicket = previous.ticketId === ticket.id;
    const grew = visibleMessages.length > previous.count;
    if (sameTicket && grew) {
      messagesScrollRef.current?.scrollTo({
        top: messagesScrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    previousVisibleStateRef.current = { ticketId: ticket.id, count: visibleMessages.length };
  }, [ticket.id, visibleMessages.length]);

  useEffect(() => {
    if (!justSentCommentId) return;
    const timeout = setTimeout(() => setJustSentCommentId(null), 1200);
    return () => clearTimeout(timeout);
  }, [justSentCommentId]);

  useEffect(() => {
    document.addEventListener('selectionchange', updateActiveFormats);
    return () => document.removeEventListener('selectionchange', updateActiveFormats);
  }, []);

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

  function syncBodyFromEditor() {
    setBody(editorRef.current?.innerHTML ?? '');
  }

  // Looks for an unfinished "@query" right before the caret (in the current
  // text node only — mentions are typed in a single burst, never split
  // across nodes) and opens the suggestion popover for it.
  function detectMentionTrigger() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
      setMentionState(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    if (!editorRef.current?.contains(node) || node.nodeType !== Node.TEXT_NODE) {
      setMentionState(null);
      return;
    }

    const text = node.textContent ?? '';
    const offset = range.startOffset;
    const uptoCursor = text.slice(0, offset);
    const atIndex = uptoCursor.lastIndexOf('@');
    if (atIndex === -1) {
      setMentionState(null);
      return;
    }

    const query = uptoCursor.slice(atIndex + 1);
    const charBeforeAt = atIndex > 0 ? uptoCursor[atIndex - 1] : '';
    if (/\s/.test(query) || (charBeforeAt && !/\s/.test(charBeforeAt))) {
      setMentionState(null);
      return;
    }

    const mentionRange = document.createRange();
    mentionRange.setStart(node, atIndex);
    mentionRange.setEnd(node, offset);
    setMentionState({ query, range: mentionRange, rect: range.getBoundingClientRect() });
    setMentionActiveIndex(0);
  }

  function insertMention(user: { id: string; name: string }) {
    if (!mentionState) return;
    const selection = window.getSelection();
    if (!selection) return;

    selection.removeAllRanges();
    selection.addRange(mentionState.range);
    document.execCommand(
      'insertHTML',
      false,
      `<span data-mention-user-id="${user.id}">@${escapeHtml(user.name)}</span>&nbsp;`,
    );
    syncBodyFromEditor();
    setMentionState(null);
    editorRef.current?.focus();
  }

  function saveSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current?.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  }

  function restoreSelection() {
    const selection = window.getSelection();
    if (!selection || !editorRef.current) return;

    selection.removeAllRanges();
    if (savedRangeRef.current) {
      selection.addRange(savedRangeRef.current);
    } else {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection.addRange(range);
    }
  }

  function insertHtmlAtCursor(html: string) {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand('insertHTML', false, html);
    syncBodyFromEditor();
  }

  function handleFormatMouseDown(event: React.MouseEvent, command: 'bold' | 'italic' | 'underline') {
    event.preventDefault();
    document.execCommand(command);
    syncBodyFromEditor();
    updateActiveFormats();
  }

  function handleToolbarMenuMouseDown(event: React.MouseEvent) {
    event.preventDefault();
    saveSelection();
  }

  function handleEditorKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (mentionState && mentionCandidates.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setMentionActiveIndex((index) => (index + 1) % mentionCandidates.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setMentionActiveIndex((index) => (index - 1 + mentionCandidates.length) % mentionCandidates.length);
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        insertMention(mentionCandidates[mentionActiveIndex]);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setMentionState(null);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  function handleEditorPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    syncBodyFromEditor();
  }

  function insertTemplate(templateBody: string) {
    insertHtmlAtCursor(escapeHtml(templateBody).replace(/\n/g, '<br>'));
    setOpenMenu(null);
  }

  function insertVariable(token: string) {
    insertHtmlAtCursor(escapeHtml(token));
    setOpenMenu(null);
  }

  function handleInsertLink() {
    const url = normalizeLinkUrl(linkUrl);
    if (!url) {
      setLinkError('URL invalide. Utilisez http(s):// ou mailto:.');
      return;
    }

    editorRef.current?.focus();
    restoreSelection();
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      document.execCommand('createLink', false, url);
    } else {
      document.execCommand(
        'insertHTML',
        false,
        `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`,
      );
    }
    syncBodyFromEditor();
    setOpenMenu(null);
    setLinkUrl('');
    setLinkError(null);
  }

  function handleInlineImageSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];

    if (!ALLOWED_INLINE_IMAGE_MIME_TYPES.includes(file.type)) {
      setFileError('Types acceptés pour une image insérée : JPEG, PNG, WebP.');
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_INLINE_IMAGE_SIZE_BYTES) {
      setFileError('Taille maximale pour une image insérée : 2 Mo.');
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }

    setFileError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : null;
      if (dataUrl) {
        insertHtmlAtCursor(`<img src="${dataUrl}" alt="${escapeHtml(file.name)}" style="max-width:100%;height:auto" />`);
      }
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) imageInputRef.current.value = '';
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
    if (isComposerEmpty(body) || isSubmittingComment) return;

    const comment = await addComment(ticket.id, body, canSeeInternalComments && tab === 'private');

    if (comment) {
      setJustSentCommentId(comment.id);

      if (pendingFiles.length > 0) {
        setIsUploadingFiles(true);
        for (const file of pendingFiles) {
          await uploadTicketAttachment(ticket.id, file, comment.id);
        }
        setIsUploadingFiles(false);
        setPendingFiles([]);
      }

      if (editorRef.current) editorRef.current.innerHTML = '';
      setBody('');
      setDraftSavedAt(null);

      if (addToKnowledge && canAddToKnowledge) {
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

      <div ref={messagesScrollRef} className="helpdesk-scroll flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {visibleMessages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            ticketId={ticket.id}
            isJustSent={message.id === justSentCommentId}
          />
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
            {canSeeInternalComments ? (
              <button
                type="button"
                onClick={() => setTab('private')}
                className={`rounded px-3 py-1.5 ${
                  tab === 'private' ? 'bg-amber-100 text-amber-800' : 'text-gray-500'
                }`}
              >
                Commentaire privé
              </button>
            ) : null}
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
            <button
              type="button"
              onMouseDown={(event) => handleFormatMouseDown(event, 'bold')}
              aria-pressed={activeFormats.bold}
              className={`rounded p-1 hover:bg-gray-100 ${
                activeFormats.bold ? 'bg-blue-100 text-blue-700' : ''
              }`}
              title="Gras"
            >
              <Bold size={14} />
            </button>
            <button
              type="button"
              onMouseDown={(event) => handleFormatMouseDown(event, 'italic')}
              aria-pressed={activeFormats.italic}
              className={`rounded p-1 hover:bg-gray-100 ${
                activeFormats.italic ? 'bg-blue-100 text-blue-700' : ''
              }`}
              title="Italique"
            >
              <Italic size={14} />
            </button>
            <button
              type="button"
              onMouseDown={(event) => handleFormatMouseDown(event, 'underline')}
              aria-pressed={activeFormats.underline}
              className={`rounded p-1 hover:bg-gray-100 ${
                activeFormats.underline ? 'bg-blue-100 text-blue-700' : ''
              }`}
              title="Souligné"
            >
              <Underline size={14} />
            </button>

            <div className="relative">
              <button
                type="button"
                onMouseDown={handleToolbarMenuMouseDown}
                onClick={() => setOpenMenu((current) => (current === 'link' ? null : 'link'))}
                className={`rounded p-1 hover:bg-gray-100 ${openMenu === 'link' ? 'bg-gray-100 text-gray-700' : ''}`}
                title="Lien"
              >
                <LinkIcon size={14} />
              </button>
              {openMenu === 'link' ? (
                <div className="absolute left-0 top-full z-10 mt-1 w-64 rounded-md border border-gray-200 bg-white p-2 shadow-lg">
                  <label className="mb-1 block text-[11px] font-medium text-gray-500">URL du lien</label>
                  <input
                    type="text"
                    value={linkUrl}
                    autoFocus
                    onChange={(event) => {
                      setLinkUrl(event.target.value);
                      setLinkError(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleInsertLink();
                      }
                    }}
                    placeholder="https://exemple.com"
                    className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                  />
                  {linkError ? <p className="mt-1 text-[11px] text-red-600">{linkError}</p> : null}
                  <div className="mt-2 flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenu(null);
                        setLinkUrl('');
                        setLinkError(null);
                      }}
                      className="rounded px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertLink}
                      className="rounded bg-blue-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-blue-700"
                    >
                      Insérer
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => handleInlineImageSelected(event.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                saveSelection();
              }}
              onClick={() => imageInputRef.current?.click()}
              className="rounded p-1 hover:bg-gray-100"
              title="Insérer une image dans le texte"
            >
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
                onMouseDown={handleToolbarMenuMouseDown}
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
                onMouseDown={handleToolbarMenuMouseDown}
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

          <div
            ref={editorRef}
            contentEditable={!isBlockedByOtherEditor}
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            data-placeholder={tab === 'public' ? 'Ajouter une réponse...' : 'Ajouter une note interne...'}
            onInput={() => {
              syncBodyFromEditor();
              detectMentionTrigger();
            }}
            onKeyDown={handleEditorKeyDown}
            onKeyUp={(event) => {
              updateActiveFormats();
              if (!['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(event.key)) {
                detectMentionTrigger();
              }
            }}
            onPaste={handleEditorPaste}
            onMouseUp={() => {
              updateActiveFormats();
              setMentionState(null);
            }}
            onFocus={() => {
              saveSelection();
              updateActiveFormats();
            }}
            onBlur={saveSelection}
            className={`rich-editor min-h-[72px] w-full px-3 py-2 text-sm focus:outline-none ${
              isBlockedByOtherEditor ? 'pointer-events-none bg-gray-50 text-gray-400' : ''
            }`}
          />

          {mentionState && mentionMenuStyle ? (
            <div
              ref={mentionMenuRef}
              style={mentionMenuStyle}
              className="z-30 w-56 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
            >
              {mentionCandidates.map((user, index) => (
                <button
                  key={user.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    insertMention(user);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs ${
                    index === mentionActiveIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Avatar initials={user.initials} avatarUrl={user.avatarUrl} size="sm" />
                  {user.name}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
            {canAddToKnowledge ? (
              <label className="flex items-center gap-1.5 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={addToKnowledge}
                  onChange={(event) => setAddToKnowledge(event.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300"
                />
                Ajouter à la base de connaissances
              </label>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={handleSend}
              disabled={isComposerEmpty(body) || isBlockedByOtherEditor || isSubmittingComment || isUploadingFiles}
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
