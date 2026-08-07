import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('ticket-statuses')
export class TicketStatusesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll() {
    return this.prisma.ticketStatus.findMany({
      orderBy: [{ sort_order: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        sort_order: true,
        is_terminal: true,
      },
    });
  }
}
