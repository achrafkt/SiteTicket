import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketActor, TicketsService } from './tickets.service';

function toActor(user: AuthenticatedUser): TicketActor {
  return { id: user.sub, role: user.role as RoleCode };
}

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  findAll() {
    return this.ticketsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.ticketsService.findOne(id);
  }

  @Post()
  create(
    @Body() createTicketDto: CreateTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.create(createTicketDto, toActor(user));
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateTicketDto: UpdateTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.update(id, updateTicketDto, toActor(user));
  }

  @Delete(':id')
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.remove(id, toActor(user));
  }

  @Post(':id/comments')
  addComment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.addComment(id, createCommentDto, toActor(user));
  }
}
