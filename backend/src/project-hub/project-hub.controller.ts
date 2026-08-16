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
import { CreateProjectExpenseDto } from './dto/create-project-expense.dto';
import { CreateProjectHubDto } from './dto/create-project-hub.dto';
import { CreateProjectTaskDto } from './dto/create-project-task.dto';
import { UpdateProjectHubDto } from './dto/update-project-hub.dto';
import { UpdateProjectProgressDto } from './dto/update-project-progress.dto';
import { UpdateProjectTaskDto } from './dto/update-project-task.dto';
import { ProjectHubActor } from './project-hub-access.service';
import { ProjectHubService } from './project-hub.service';

function toActor(user: AuthenticatedUser): ProjectHubActor {
  return { id: user.sub, role: user.role as RoleCode };
}

@Controller('project-hub')
export class ProjectHubController {
  constructor(private readonly projectHubService: ProjectHubService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.projectHubService.findAll(toActor(user));
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectHubService.findOne(id, toActor(user));
  }

  @Post()
  create(
    @Body() dto: CreateProjectHubDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectHubService.create(dto, toActor(user));
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProjectHubDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectHubService.update(id, dto, toActor(user));
  }

  @Patch(':id/progress')
  updateProgress(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProjectProgressDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectHubService.updateProgress(id, dto, toActor(user));
  }

  @Get(':id/tasks')
  listTasks(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectHubService.listTasks(id, toActor(user));
  }

  @Post(':id/tasks')
  createTask(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateProjectTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectHubService.createTask(id, dto, toActor(user));
  }

  @Patch(':id/tasks/:taskId')
  updateTask(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Body() dto: UpdateProjectTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectHubService.updateTask(id, taskId, dto, toActor(user));
  }

  @Delete(':id/tasks/:taskId')
  removeTask(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectHubService.removeTask(id, taskId, toActor(user));
  }

  @Get(':id/activity')
  getActivityLog(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectHubService.getActivityLog(id, toActor(user));
  }

  @Get(':id/expenses')
  listExpenses(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectHubService.listExpenses(id, toActor(user));
  }

  @Post(':id/expenses')
  createExpense(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateProjectExpenseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectHubService.createExpense(id, dto, toActor(user));
  }

  @Delete(':id/expenses/:expenseId')
  removeExpense(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('expenseId', new ParseUUIDPipe()) expenseId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectHubService.removeExpense(id, expenseId, toActor(user));
  }
}
