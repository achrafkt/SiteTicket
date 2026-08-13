import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateLinkDto } from './dto/create-link.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { SetCustomFieldDto } from './dto/set-custom-field.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketActor, TicketsService } from './tickets.service';

function toActor(user: AuthenticatedUser): TicketActor {
  return { id: user.sub, role: user.role as RoleCode };
}

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.ticketsService.findAll(toActor(user));
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.findOne(id, toActor(user));
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

  @Post(':id/tags')
  addTag(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() createTagDto: CreateTagDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.addTag(id, createTagDto, toActor(user));
  }

  @Delete(':id/tags/:tagId')
  removeTag(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('tagId', new ParseUUIDPipe()) tagId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.removeTag(id, tagId, toActor(user));
  }

  @Post(':id/subtasks')
  addSubtask(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() createSubtaskDto: CreateSubtaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.addSubtask(id, createSubtaskDto, toActor(user));
  }

  @Patch(':id/subtasks/:subtaskId')
  updateSubtask(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('subtaskId', new ParseUUIDPipe()) subtaskId: string,
    @Body() updateSubtaskDto: UpdateSubtaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.updateSubtask(
      id,
      subtaskId,
      updateSubtaskDto,
      toActor(user),
    );
  }

  @Delete(':id/subtasks/:subtaskId')
  removeSubtask(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('subtaskId', new ParseUUIDPipe()) subtaskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.removeSubtask(id, subtaskId, toActor(user));
  }

  @Post(':id/links')
  addLink(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() createLinkDto: CreateLinkDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.addLink(id, createLinkDto, toActor(user));
  }

  @Delete(':id/links/:linkedTicketId')
  removeLink(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('linkedTicketId', new ParseUUIDPipe()) linkedTicketId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.removeLink(id, linkedTicketId, toActor(user));
  }

  @Put(':id/custom-fields')
  setCustomField(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() setCustomFieldDto: SetCustomFieldDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.setCustomField(
      id,
      setCustomFieldDto,
      toActor(user),
    );
  }

  @Delete(':id/custom-fields/:key')
  removeCustomField(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('key') key: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.removeCustomField(id, key, toActor(user));
  }
}
