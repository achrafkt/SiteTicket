import { Controller, Delete, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CopilotConversationsService } from './copilot-conversations.service';

@Controller('copilot/conversations')
export class CopilotConversationsController {
  constructor(private readonly conversations: CopilotConversationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.conversations.listForUser(user.sub);
  }

  @Get(':id')
  getOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.conversations.getOwned(id, user.sub);
  }

  @Delete(':id')
  delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.conversations.delete(id, user.sub);
  }
}
