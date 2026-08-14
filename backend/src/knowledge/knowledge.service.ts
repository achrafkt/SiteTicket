import { basename, join } from 'path';
import { unlink } from 'fs/promises';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { canManageKnowledge } from '../common/permissions/knowledge-permissions';
import { UPLOADS_DIR, UPLOADS_URL_PREFIX } from '../common/uploads.constants';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKnowledgeArticleDto } from './dto/create-knowledge-article.dto';
import { UpdateKnowledgeArticleDto } from './dto/update-knowledge-article.dto';

export interface KnowledgeActor {
  id: string;
  role: RoleCode;
}

const articleSelect = {
  id: true,
  title: true,
  content: true,
  visible_roles: true,
  needs_review: true,
  valid_until: true,
  file_url: true,
  file_name: true,
  file_type: true,
  file_size: true,
  source_ticket_id: true,
  source_ticket_reference: true,
  created_at: true,
  updated_at: true,
  category: {
    select: { id: true, code: true, name: true },
  },
  author: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      avatar_url: true,
    },
  },
} as const;

function isVisible(visibleRoles: RoleCode[], actor: KnowledgeActor): boolean {
  if (canManageKnowledge(actor.role)) return true;
  return visibleRoles.length === 0 || visibleRoles.includes(actor.role);
}

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  findCategories() {
    return this.prisma.knowledgeCategory.findMany({
      orderBy: [{ sort_order: 'asc' }],
    });
  }

  async findAllArticles(actor: KnowledgeActor) {
    const articles = await this.prisma.knowledgeArticle.findMany({
      orderBy: [{ updated_at: 'desc' }],
      select: articleSelect,
    });

    return articles.filter((article) =>
      isVisible(article.visible_roles, actor),
    );
  }

  async findOneArticle(id: string, actor: KnowledgeActor) {
    const article = await this.prisma.knowledgeArticle.findUnique({
      where: { id },
      select: articleSelect,
    });

    if (!article || !isVisible(article.visible_roles, actor)) {
      throw new NotFoundException('Article introuvable.');
    }

    return article;
  }

  async createArticle(dto: CreateKnowledgeArticleDto, actor: KnowledgeActor) {
    await this.ensureCategoryExists(dto.categoryId);
    const sourceTicket = await this.findSourceTicket(dto.sourceTicketId);

    return this.prisma.knowledgeArticle.create({
      data: {
        category_id: dto.categoryId,
        title: dto.title,
        content: dto.content,
        visible_roles: dto.visibleRoles ?? [],
        needs_review: dto.needsReview ?? false,
        valid_until: dto.validUntil ? new Date(dto.validUntil) : undefined,
        source_ticket_id: sourceTicket?.id,
        source_ticket_reference: sourceTicket?.ticket_number,
        created_by: actor.id,
      },
      select: articleSelect,
    });
  }

  // Best-effort: a stale/deleted ticket id shouldn't block article creation,
  // it just means the trace-back is skipped.
  private async findSourceTicket(sourceTicketId?: string) {
    if (!sourceTicketId) return null;

    return this.prisma.ticket.findUnique({
      where: { id: sourceTicketId },
      select: { id: true, ticket_number: true },
    });
  }

  async updateArticle(id: string, dto: UpdateKnowledgeArticleDto) {
    await this.ensureArticleExists(id);

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    return this.prisma.knowledgeArticle.update({
      where: { id },
      data: {
        category_id: dto.categoryId,
        title: dto.title,
        content: dto.content,
        visible_roles: dto.visibleRoles,
        needs_review: dto.needsReview,
        valid_until:
          dto.validUntil === undefined
            ? undefined
            : dto.validUntil === null
              ? null
              : new Date(dto.validUntil),
      },
      select: articleSelect,
    });
  }

  async removeArticle(id: string) {
    const article = await this.ensureArticleExists(id);

    await this.prisma.knowledgeArticle.delete({ where: { id } });

    if (article.file_url) {
      await this.deleteFileFromDisk(article.file_url);
    }

    return { success: true };
  }

  async setArticleFile(id: string, file: Express.Multer.File) {
    const article = await this.ensureArticleExists(id);

    if (article.file_url) {
      await this.deleteFileFromDisk(article.file_url);
    }

    return this.prisma.knowledgeArticle.update({
      where: { id },
      data: {
        file_url: `${UPLOADS_URL_PREFIX}/${file.filename}`,
        file_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
      },
      select: articleSelect,
    });
  }

  async removeArticleFile(id: string) {
    const article = await this.ensureArticleExists(id);

    if (!article.file_url) {
      throw new BadRequestException("Cet article n'a pas de fichier joint.");
    }

    await this.deleteFileFromDisk(article.file_url);

    return this.prisma.knowledgeArticle.update({
      where: { id },
      data: {
        file_url: null,
        file_name: null,
        file_type: null,
        file_size: null,
      },
      select: articleSelect,
    });
  }

  private async deleteFileFromDisk(fileUrl: string) {
    try {
      await unlink(join(UPLOADS_DIR, basename(fileUrl)));
    } catch {
      // best-effort cleanup: file may already be missing on disk
    }
  }

  private async ensureCategoryExists(categoryId: string) {
    const category = await this.prisma.knowledgeCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new BadRequestException(
        'La catégorie sélectionnée est introuvable.',
      );
    }
  }

  private async ensureArticleExists(id: string) {
    const article = await this.prisma.knowledgeArticle.findUnique({
      where: { id },
      select: { id: true, file_url: true },
    });

    if (!article) {
      throw new NotFoundException('Article introuvable.');
    }

    return article;
  }
}
