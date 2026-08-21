import { Injectable, NotFoundException } from '@nestjs/common';
import { CopilotMessageRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const TITLE_MAX_LENGTH = 80;
const LIST_LIMIT = 100;

function deriveTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim();
  return trimmed.length > TITLE_MAX_LENGTH
    ? `${trimmed.slice(0, TITLE_MAX_LENGTH).trimEnd()}…`
    : trimmed;
}

// Every method here takes userId from the authenticated request (never from
// client input) and scopes its Prisma query by it — same pattern as
// NotificationsService.findForUser/markRead. A conversation belonging to
// another user is treated as not found, never as forbidden, so its
// existence is never confirmed to a non-owner.
@Injectable()
export class CopilotConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string) {
    return this.prisma.copilotConversation.findMany({
      where: { user_id: userId },
      orderBy: { updated_at: 'desc' },
      take: LIST_LIMIT,
      select: { id: true, title: true, created_at: true, updated_at: true },
    });
  }

  async getOwned(id: string, userId: string) {
    const conversation = await this.prisma.copilotConversation.findFirst({
      where: { id, user_id: userId },
      select: {
        id: true,
        title: true,
        created_at: true,
        updated_at: true,
        messages: {
          orderBy: { created_at: 'asc' },
          select: { id: true, role: true, content: true, created_at: true },
        },
      },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation introuvable.');
    }
    return conversation;
  }

  async delete(id: string, userId: string) {
    const result = await this.prisma.copilotConversation.deleteMany({
      where: { id, user_id: userId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Conversation introuvable.');
    }
    return { success: true };
  }

  create(userId: string, firstMessage: string) {
    return this.prisma.copilotConversation.create({
      data: { user_id: userId, title: deriveTitle(firstMessage) },
      select: { id: true, title: true, created_at: true, updated_at: true },
    });
  }

  appendMessage(conversationId: string, role: CopilotMessageRole, content: string) {
    return this.prisma.$transaction([
      this.prisma.copilotMessage.create({
        data: { conversation_id: conversationId, role, content },
      }),
      this.prisma.copilotConversation.update({
        where: { id: conversationId },
        data: { updated_at: new Date() },
      }),
    ]);
  }
}
