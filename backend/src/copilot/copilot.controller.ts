import { Body, Controller, Post, Res } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CopilotActor } from './copilot-tools.service';
import { CopilotService } from './copilot.service';
import { SendCopilotMessageDto } from './dto/send-copilot-message.dto';

function toActor(user: AuthenticatedUser): CopilotActor {
  return { id: user.sub, role: user.role as RoleCode };
}

@Controller('copilot')
export class CopilotController {
  constructor(private readonly copilotService: CopilotService) {}

  @Post('messages')
  async sendMessage(
    @Body() dto: SendCopilotMessageDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const actor = toActor(user);

    const allowed = await this.copilotService.checkAndConsumeQuota(actor.id);
    if (!allowed) {
      res.status(429).json({
        message:
          'Vous avez atteint la limite quotidienne de messages du copilote. Merci de réessayer demain.',
      });
      return;
    }

    await this.copilotService.streamReply(
      actor,
      dto.message,
      dto.conversationId,
      res,
    );
  }
}
