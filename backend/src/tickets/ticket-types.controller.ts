import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('ticket-types')
export class TicketTypesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll() {
    return this.prisma.ticketType.findMany({
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        requires_approval_chain: true,
      },
    });
  }
}
