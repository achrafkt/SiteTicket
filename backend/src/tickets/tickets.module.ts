import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectHubAccessService } from '../project-hub/project-hub-access.service';
import { TicketAttachmentsController } from './ticket-attachments.controller';
import { TicketStatusesController } from './ticket-statuses.controller';
import { TicketTypesController } from './ticket-types.controller';
import { TicketsController } from './tickets.controller';
import { TicketsPermissionsService } from './tickets-permissions.service';
import { TicketsService } from './tickets.service';

@Module({
  imports: [NotificationsModule],
  controllers: [
    TicketsController,
    TicketTypesController,
    TicketStatusesController,
    TicketAttachmentsController,
  ],
  providers: [TicketsService, TicketsPermissionsService, ProjectHubAccessService],
  exports: [TicketsService, TicketsPermissionsService],
})
export class TicketsModule {}
