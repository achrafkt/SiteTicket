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
  Patch,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleCode } from '@prisma/client';
import { diskStorage } from 'multer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { MulterExceptionFilter } from '../common/filters/multer-exception.filter';
import { KNOWLEDGE_MANAGER_ROLES } from '../common/permissions/knowledge-permissions';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  ALLOWED_KNOWLEDGE_FILE_MIME_TYPES,
  MAX_KNOWLEDGE_FILE_SIZE_BYTES,
  UPLOADS_DIR,
} from '../common/uploads.constants';
import { CreateKnowledgeArticleDto } from './dto/create-knowledge-article.dto';
import { UpdateKnowledgeArticleDto } from './dto/update-knowledge-article.dto';
import { KnowledgeActor, KnowledgeService } from './knowledge.service';

function toActor(user: AuthenticatedUser): KnowledgeActor {
  return { id: user.sub, role: user.role as RoleCode };
}

@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get('categories')
  findCategories() {
    return this.knowledgeService.findCategories();
  }

  @Get('articles')
  findAllArticles(@CurrentUser() user: AuthenticatedUser) {
    return this.knowledgeService.findAllArticles(toActor(user));
  }

  @Get('articles/:id')
  findOneArticle(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.knowledgeService.findOneArticle(id, toActor(user));
  }

  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_MANAGER_ROLES)
  @Post('articles')
  createArticle(
    @Body() createDto: CreateKnowledgeArticleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.knowledgeService.createArticle(createDto, toActor(user));
  }

  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_MANAGER_ROLES)
  @Patch('articles/:id')
  updateArticle(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateDto: UpdateKnowledgeArticleDto,
  ) {
    return this.knowledgeService.updateArticle(id, updateDto);
  }

  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_MANAGER_ROLES)
  @Delete('articles/:id')
  removeArticle(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.knowledgeService.removeArticle(id);
  }

  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_MANAGER_ROLES)
  @Post('articles/:id/file')
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, callback) => {
          callback(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_KNOWLEDGE_FILE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_KNOWLEDGE_FILE_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException('Type de fichier non supporté.'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  setArticleFile(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni.');
    }

    return this.knowledgeService.setArticleFile(id, file);
  }

  @UseGuards(RolesGuard)
  @Roles(...KNOWLEDGE_MANAGER_ROLES)
  @Delete('articles/:id/file')
  removeArticleFile(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.knowledgeService.removeArticleFile(id);
  }
}
