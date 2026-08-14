export type KnowledgeCategoryCode =
  | 'PROCEDURE'
  | 'SAFETY_SHEET'
  | 'TECHNICAL_STANDARD'
  | 'DOCUMENT_TEMPLATE'
  | 'EQUIPMENT_SHEET'
  | 'FAQ';

export type KnowledgeCategory = {
  id: string;
  code: KnowledgeCategoryCode;
  name: string;
  sortOrder: number;
};

export type KnowledgeFreshness = 'valid' | 'to_review' | 'expiring_soon' | 'expired';

export type KnowledgeArticle = {
  id: string;
  title: string;
  content: string;
  category: { id: string; code: KnowledgeCategoryCode; name: string };
  visibleRoles: string[];
  needsReview: boolean;
  validUntil: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  sourceTicketId: string | null;
  sourceTicketReference: string | null;
  author: { id: string; name: string; initials: string; avatarUrl: string | null };
  createdAt: string;
  updatedAt: string;
};
