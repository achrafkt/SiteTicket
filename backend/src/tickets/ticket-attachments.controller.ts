import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleCode } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { MulterExceptionFilter } from '../common/filters/multer-exception.filter';
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
} from '../common/uploads.constants';
import { TicketActor, TicketsService } from './tickets.service';

function toActor(user: AuthenticatedUser): TicketActor {
  return { id: user.sub, role: user.role as RoleCode };
}

@Controller('tickets/:ticketId/attachments')
export class TicketAttachmentsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Type de fichier non supporté (images ou PDF uniquement).',
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  upload(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('commentId') commentId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni.');
    }

    return this.ticketsService.addAttachment(
      ticketId,
      file,
      commentId,
      user.sub,
    );
  }

  @Delete(':attachmentId')
  remove(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @Param('attachmentId', new ParseUUIDPipe()) attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.removeAttachment(
      ticketId,
      attachmentId,
      toActor(user),
    );
  }
}
