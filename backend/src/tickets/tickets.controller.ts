import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketsService } from './tickets.service';

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
  create(@Body() createTicketDto: CreateTicketDto, @Req() req: Request) {
    const userId = (req as Request & { user?: { sub: string } }).user?.sub;
    if (!userId) {
      throw new Error('Authenticated user required');
    }
    return this.ticketsService.create(createTicketDto, userId);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateTicketDto: UpdateTicketDto,
    @Req() req: Request,
  ) {
    const userId = (req as Request & { user?: { sub: string } }).user?.sub;
    if (!userId) {
      throw new Error('Authenticated user required');
    }
    return this.ticketsService.update(id, updateTicketDto, userId);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.ticketsService.remove(id);
  }

  @Post(':id/comments')
  addComment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: Request,
  ) {
    const userId = (req as Request & { user?: { sub: string } }).user?.sub;
    if (!userId) {
      throw new Error('Authenticated user required');
    }
    return this.ticketsService.addComment(id, createCommentDto, userId);
  }
}
