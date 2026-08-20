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
  Req,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MulterExceptionFilter } from '../common/filters/multer-exception.filter';
import {
  ALLOWED_AVATAR_MIME_TYPES,
  MAX_AVATAR_SIZE_BYTES,
} from '../common/uploads.constants';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('assignable')
  findAssignable() {
    return this.usersService.findAssignable();
  }

  // These "me" routes must stay declared before the ":id" routes below —
  // Nest/Express matches routes in registration order, and ":id" would
  // otherwise swallow "/users/me" (id="me") first.
  @Get('me')
  findMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findOne(user.sub);
  }

  @Patch('me')
  updateProfile(
    @Body() updateProfileDto: UpdateProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.updateProfile(user.sub, updateProfileDto);
  }

  @Post('me/avatar')
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_AVATAR_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Type de fichier non supporté (JPEG, PNG ou WebP uniquement).',
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni.');
    }
    return this.usersService.updateAvatar(user.sub, file);
  }

  @Delete('me/avatar')
  removeAvatar(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.removeAvatar(user.sub);
  }

  @Post('me/password')
  changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.changePassword(user.sub, changePasswordDto);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: Request,
  ) {
    const actorId = (req as Request & { user?: { sub: string } }).user?.sub;
    if (!actorId) {
      throw new Error('Authenticated user required');
    }
    return this.usersService.update(id, updateUserDto, actorId);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    const actorId = (req as Request & { user?: { sub: string } }).user?.sub;
    if (!actorId) {
      throw new Error('Authenticated user required');
    }
    return this.usersService.remove(id, actorId);
  }
}
