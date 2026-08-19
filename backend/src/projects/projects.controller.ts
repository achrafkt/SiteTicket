import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import type { ProjectHubActor } from '../project-hub/project-hub-access.service';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

function toActor(user: AuthenticatedUser): ProjectHubActor {
  return { id: user.sub, role: user.role as RoleCode };
}

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.findAll(toActor(user));
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.findOne(id, toActor(user));
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.projectsService.remove(id);
  }

  @Get(':id/members')
  findMembers(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.findMembers(id, toActor(user));
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post(':id/members')
  addMember(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddProjectMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.addMember(id, dto, user.sub);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id/members/:userId')
  removeMember(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.removeMember(id, userId, user.sub);
  }
}
