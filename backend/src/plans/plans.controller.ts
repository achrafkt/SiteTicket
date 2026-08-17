import { randomUUID } from 'crypto';
import { extname } from 'path';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleCode } from '@prisma/client';
import { diskStorage } from 'multer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { MulterExceptionFilter } from '../common/filters/multer-exception.filter';
import {
  ALLOWED_PLAN_MIME_TYPES,
  MAX_PLAN_SIZE_BYTES,
  UPLOADS_DIR,
} from '../common/uploads.constants';
import { ProjectHubAccessService } from '../project-hub/project-hub-access.service';
import { PlansService } from './plans.service';

@Controller('projects/:projectId/plans')
export class PlansController {
  constructor(
    private readonly plansService: PlansService,
    private readonly access: ProjectHubAccessService,
  ) {}

  @Get()
  async findAll(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.access.assertCanView(projectId, {
      id: user.sub,
      role: user.role as RoleCode,
    });
    return this.plansService.findAllForProject(projectId);
  }

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
      limits: { fileSize: MAX_PLAN_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_PLAN_MIME_TYPES.includes(file.mimetype)) {
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
  async create(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name: string | undefined,
    @Body('discipline') discipline: string | undefined,
    @Body('version') version: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.access.assertCanManageField(projectId, {
      id: user.sub,
      role: user.role as RoleCode,
    });

    if (!file) {
      throw new BadRequestException('Aucun fichier fourni.');
    }

    return this.plansService.create(
      projectId,
      file,
      { name, discipline, version },
      user.sub,
    );
  }

  @Delete(':planId')
  async remove(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('planId', new ParseUUIDPipe()) planId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.access.assertCanManageField(projectId, {
      id: user.sub,
      role: user.role as RoleCode,
    });

    return this.plansService.remove(projectId, planId);
  }
}
