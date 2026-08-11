import { Module } from '@nestjs/common';
import { TicketAttachmentsController } from './ticket-attachments.controller';
import { TicketStatusesController } from './ticket-statuses.controller';
import { TicketTypesController } from './ticket-types.controller';
import { TicketsController } from './tickets.controller';
import { TicketsPermissionsService } from './tickets-permissions.service';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [
    TicketsController,
    TicketTypesController,
    TicketStatusesController,
    TicketAttachmentsController,
  ],
  providers: [TicketsService, TicketsPermissionsService],
  exports: [TicketsService, TicketsPermissionsService],
})
export class TicketsModule {}
