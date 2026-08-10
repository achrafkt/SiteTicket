import { randomUUID } from 'crypto';
import { extname } from 'path';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { diskStorage } from 'multer';
import { MulterExceptionFilter } from '../common/filters/multer-exception.filter';
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
  UPLOADS_DIR,
} from '../common/uploads.constants';
import { TicketsService } from './tickets.service';

@Controller('tickets/:ticketId/attachments')
export class TicketAttachmentsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, callback) => {
          callback(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.mimetype)) {
          callback(new BadRequestException("Type de fichier non supporté (images ou PDF uniquement)."), false);
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
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni.');
    }

    const userId = (req as Request & { user?: { sub: string } }).user?.sub;
    if (!userId) {
      throw new Error('Authenticated user required');
    }

    return this.ticketsService.addAttachment(ticketId, file, commentId, userId);
  }

  @Delete(':attachmentId')
  remove(
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @Param('attachmentId', new ParseUUIDPipe()) attachmentId: string,
  ) {
    return this.ticketsService.removeAttachment(ticketId, attachmentId);
  }
}
