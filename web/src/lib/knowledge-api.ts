import { apiFetch } from './api';

export type ApiKnowledgeCategory = {
  id: string;
  code: string;
  name: string;
  sort_order: number;
};

export type ApiKnowledgeArticle = {
  id: string;
  title: string;
  content: string;
  category: { id: string; code: string; name: string };
  visible_roles: string[];
  needs_review: boolean;
  valid_until: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  source_ticket_id: string | null;
  source_ticket_reference: string | null;
  author: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string | null;
  };
  created_at: string;
  updated_at: string;
};

export type CreateKnowledgeArticlePayload = {
  categoryId: string;
  title: string;
  content: string;
  visibleRoles?: string[];
  needsReview?: boolean;
  validUntil?: string;
  sourceTicketId?: string;
};

export type UpdateKnowledgeArticlePayload = Omit<
  Partial<CreateKnowledgeArticlePayload>,
  'validUntil'
> & {
  validUntil?: string | null;
};

export function getKnowledgeCategories() {
  return apiFetch<ApiKnowledgeCategory[]>('/knowledge/categories');
}

export function getKnowledgeArticles() {
  return apiFetch<ApiKnowledgeArticle[]>('/knowledge/articles');
}

export function getKnowledgeArticle(id: string) {
  return apiFetch<ApiKnowledgeArticle>(`/knowledge/articles/${id}`);
}

export function createKnowledgeArticle(payload: CreateKnowledgeArticlePayload) {
  return apiFetch<ApiKnowledgeArticle>('/knowledge/articles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateKnowledgeArticle(id: string, payload: UpdateKnowledgeArticlePayload) {
  return apiFetch<ApiKnowledgeArticle>(`/knowledge/articles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteKnowledgeArticle(id: string) {
  return apiFetch<{ success: boolean }>(`/knowledge/articles/${id}`, {
    method: 'DELETE',
  });
}

export const ALLOWED_KNOWLEDGE_FILE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
export const MAX_KNOWLEDGE_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export function uploadKnowledgeArticleFile(id: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return apiFetch<ApiKnowledgeArticle>(`/knowledge/articles/${id}/file`, {
    method: 'POST',
    body: formData,
  });
}

export function removeKnowledgeArticleFile(id: string) {
  return apiFetch<ApiKnowledgeArticle>(`/knowledge/articles/${id}/file`, {
    method: 'DELETE',
  });
}
