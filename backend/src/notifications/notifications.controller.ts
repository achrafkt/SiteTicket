import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @Query() query: ListNotificationsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.findForUser(user.sub, query);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.countUnread(user.sub);
  }

  @Patch(':id/read')
  markRead(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.markRead(id, user.sub);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(user.sub);
  }
}
