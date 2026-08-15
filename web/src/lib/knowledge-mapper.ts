import { API_URL, resolveAvatarUrl } from './api';
import type { ApiKnowledgeArticle, ApiKnowledgeCategory } from './knowledge-api';
import type { KnowledgeArticle, KnowledgeCategory } from '@/types/knowledge';

export function mapKnowledgeCategory(category: ApiKnowledgeCategory): KnowledgeCategory {
  return {
    id: category.id,
    code: category.code as KnowledgeCategory['code'],
    name: category.name,
    sortOrder: category.sort_order,
  };
}

export function mapKnowledgeArticle(article: ApiKnowledgeArticle): KnowledgeArticle {
  return {
    id: article.id,
    title: article.title,
    content: article.content,
    category: {
      id: article.category.id,
      code: article.category.code as KnowledgeArticle['category']['code'],
      name: article.category.name,
    },
    visibleRoles: article.visible_roles,
    needsReview: article.needs_review,
    validUntil: article.valid_until,
    fileUrl: article.file_url ? `${API_URL}${article.file_url}` : null,
    fileName: article.file_name,
    fileType: article.file_type,
    fileSize: article.file_size,
    sourceTicketId: article.source_ticket_id,
    sourceTicketReference: article.source_ticket_reference,
    author: {
      id: article.author.id,
      name: `${article.author.first_name} ${article.author.last_name}`,
      initials: `${article.author.first_name[0] ?? ''}${article.author.last_name[0] ?? ''}`.toUpperCase(),
      avatarUrl: resolveAvatarUrl(article.author.avatar_url),
    },
    createdAt: article.created_at,
    updatedAt: article.updated_at,
  };
}
