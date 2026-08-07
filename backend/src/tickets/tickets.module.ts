import { Module } from '@nestjs/common';
import { TicketStatusesController } from './ticket-statuses.controller';
import { TicketTypesController } from './ticket-types.controller';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [TicketsController, TicketTypesController, TicketStatusesController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
