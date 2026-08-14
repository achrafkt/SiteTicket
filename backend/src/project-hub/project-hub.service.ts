import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectHubAccessService, ProjectHubActor } from './project-hub-access.service';
import { CreateProjectHubDto } from './dto/create-project-hub.dto';
import { UpdateProjectHubDto } from './dto/update-project-hub.dto';
import { UpdateProjectProgressDto } from './dto/update-project-progress.dto';
import { CreateProjectTaskDto } from './dto/create-project-task.dto';
import { UpdateProjectTaskDto } from './dto/update-project-task.dto';
import { CreateProjectExpenseDto } from './dto/create-project-expense.dto';

const userSummarySelect = {
  id: true,
  first_name: true,
  last_name: true,
  avatar_url: true,
} as const;

const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  due_date: true,
  created_at: true,
  updated_at: true,
  assignee: { select: userSummarySelect },
  creator: { select: userSummarySelect },
} as const;

const expenseSelect = {
  id: true,
  label: true,
  amount: true,
  category: true,
  expense_date: true,
  created_at: true,
  creator: { select: userSummarySelect },
} as const;

@Injectable()
export class ProjectHubService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectHubAccessService,
  ) {}

  async findAll(actor: ProjectHubActor) {
    const filter = await this.access.visibleProjectIdsFilter(actor);
    const canSeeBudget = this.access.canSeeBudget(actor);

    const projects = await this.prisma.project.findMany({
      where: filter,
      orderBy: [{ created_at: 'desc' }],
      include: {
        _count: { select: { tasks: true, members: true } },
        expenses: canSeeBudget ? { select: { amount: true } } : false,
      },
    });

    return projects.map((project) => this.withBudgetSummary(project, canSeeBudget));
  }

  async findOne(id: string, actor: ProjectHubActor) {
    await this.access.assertCanView(id, actor);
    const canSeeBudget = this.access.canSeeBudget(actor);

    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        _count: { select: { tasks: true, members: true } },
        expenses: canSeeBudget ? { select: expenseSelect, orderBy: { expense_date: 'desc' } } : false,
        tasks: { select: taskSelect, orderBy: [{ status: 'asc' }, { created_at: 'desc' }] },
      },
    });

    if (!project) {
      throw new NotFoundException('Chantier introuvable.');
    }

    return this.withBudgetSummary(project, canSeeBudget);
  }

  async create(dto: CreateProjectHubDto, actor: ProjectHubActor) {
    this.access.assertCanManageInfo(actor);
    await this.ensureCodeIsFree(dto.code);

    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        code: dto.code,
        address: dto.address,
        client_name: dto.clientName,
        description: dto.description,
        status: dto.status,
        budget_planned: dto.budgetPlanned,
        start_date: this.toDate(dto.startDate),
        end_date_planned: this.toDate(dto.endDatePlanned),
        end_date_actual: this.toDate(dto.endDateActual),
      },
      include: { _count: { select: { tasks: true, members: true } } },
    });

    return this.withBudgetSummary(project, this.access.canSeeBudget(actor));
  }

  async update(id: string, dto: UpdateProjectHubDto, actor: ProjectHubActor) {
    this.access.assertCanManageInfo(actor);
    await this.ensureProjectExists(id);

    if (dto.code) {
      await this.ensureCodeIsFree(dto.code, id);
    }

    const project = await this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        address: dto.address,
        client_name: dto.clientName,
        description: dto.description,
        status: dto.status,
        budget_planned: dto.budgetPlanned,
        start_date: this.toDate(dto.startDate),
        end_date_planned: this.toDate(dto.endDatePlanned),
        end_date_actual: this.toDate(dto.endDateActual),
      },
      include: { _count: { select: { tasks: true, members: true } } },
    });

    return this.withBudgetSummary(project, this.access.canSeeBudget(actor));
  }

  async updateProgress(id: string, dto: UpdateProjectProgressDto, actor: ProjectHubActor) {
    await this.access.assertCanManageField(id, actor);
    await this.ensureProjectExists(id);

    const project = await this.prisma.project.update({
      where: { id },
      data: { progress_percent: dto.progressPercent },
      include: { _count: { select: { tasks: true, members: true } } },
    });

    return this.withBudgetSummary(project, this.access.canSeeBudget(actor));
  }

  async listTasks(projectId: string, actor: ProjectHubActor) {
    await this.access.assertCanView(projectId, actor);
    return this.prisma.projectTask.findMany({
      where: { project_id: projectId },
      select: taskSelect,
      orderBy: [{ status: 'asc' }, { created_at: 'desc' }],
    });
  }

  async createTask(projectId: string, dto: CreateProjectTaskDto, actor: ProjectHubActor) {
    await this.access.assertCanManageField(projectId, actor);
    await this.ensureProjectExists(projectId);

    if (dto.assigneeId) {
      await this.ensureUserExists(dto.assigneeId);
    }

    return this.prisma.projectTask.create({
      data: {
        project_id: projectId,
        title: dto.title,
        description: dto.description,
        status: dto.status,
        due_date: this.toDate(dto.dueDate),
        assignee_id: dto.assigneeId,
        created_by: actor.id,
      },
      select: taskSelect,
    });
  }

  async updateTask(
    projectId: string,
    taskId: string,
    dto: UpdateProjectTaskDto,
    actor: ProjectHubActor,
  ) {
    await this.access.assertCanManageField(projectId, actor);
    await this.ensureTaskExists(projectId, taskId);

    if (dto.assigneeId) {
      await this.ensureUserExists(dto.assigneeId);
    }

    return this.prisma.projectTask.update({
      where: { id: taskId },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        due_date: dto.dueDate === undefined ? undefined : this.toDate(dto.dueDate) ?? null,
        assignee_id: dto.assigneeId === undefined ? undefined : dto.assigneeId,
      },
      select: taskSelect,
    });
  }

  async removeTask(projectId: string, taskId: string, actor: ProjectHubActor) {
    await this.access.assertCanManageField(projectId, actor);
    await this.ensureTaskExists(projectId, taskId);
    await this.prisma.projectTask.delete({ where: { id: taskId } });
    return { success: true };
  }

  async listExpenses(projectId: string, actor: ProjectHubActor) {
    await this.access.assertCanView(projectId, actor);
    if (!this.access.canSeeBudget(actor)) {
      throw new BadRequestException('Le budget n’est pas accessible à votre rôle.');
    }

    return this.prisma.projectExpense.findMany({
      where: { project_id: projectId },
      select: expenseSelect,
      orderBy: { expense_date: 'desc' },
    });
  }

  async createExpense(
    projectId: string,
    dto: CreateProjectExpenseDto,
    actor: ProjectHubActor,
  ) {
    this.access.assertCanManageBudget(actor);
    await this.ensureProjectExists(projectId);

    return this.prisma.projectExpense.create({
      data: {
        project_id: projectId,
        label: dto.label,
        amount: dto.amount,
        category: dto.category,
        expense_date: this.toDate(dto.expenseDate) ?? undefined,
        created_by: actor.id,
      },
      select: expenseSelect,
    });
  }

  async removeExpense(projectId: string, expenseId: string, actor: ProjectHubActor) {
    this.access.assertCanManageBudget(actor);
    await this.ensureExpenseExists(projectId, expenseId);
    await this.prisma.projectExpense.delete({ where: { id: expenseId } });
    return { success: true };
  }

  // Attaches the computed budget summary (spent + écart) when the actor is
  // allowed to see it, and strips the raw planned/expenses figures otherwise
  // so the frontend never receives financial data for restricted roles.
  private withBudgetSummary<
    T extends {
      budget_planned: unknown;
      expenses?: { amount: unknown }[] | false;
    },
  >(project: T, canSeeBudget: boolean) {
    const { expenses, ...rest } = project;

    if (!canSeeBudget) {
      return { ...rest, budget_planned: null, budget_spent: null, budget_variance: null };
    }

    const spent = Array.isArray(expenses)
      ? expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
      : 0;
    const planned = rest.budget_planned === null || rest.budget_planned === undefined
      ? null
      : Number(rest.budget_planned);

    return {
      ...rest,
      budget_spent: spent,
      budget_variance: planned === null ? null : planned - spent,
    };
  }

  private async ensureProjectExists(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id }, select: { id: true } });
    if (!project) {
      throw new NotFoundException('Chantier introuvable.');
    }
  }

  private async ensureCodeIsFree(code: string, excludeId?: string) {
    const existing = await this.prisma.project.findFirst({
      where: excludeId ? { code, id: { not: excludeId } } : { code },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Ce code chantier est déjà utilisé.');
    }
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      throw new BadRequestException('Utilisateur assigné introuvable.');
    }
  }

  private async ensureTaskExists(projectId: string, taskId: string) {
    const task = await this.prisma.projectTask.findFirst({
      where: { id: taskId, project_id: projectId },
      select: { id: true },
    });
    if (!task) {
      throw new NotFoundException('Tâche introuvable.');
    }
  }

  private async ensureExpenseExists(projectId: string, expenseId: string) {
    const expense = await this.prisma.projectExpense.findFirst({
      where: { id: expenseId, project_id: projectId },
      select: { id: true },
    });
    if (!expense) {
      throw new NotFoundException('Dépense introuvable.');
    }
  }

  private toDate(value?: string) {
    return value ? new Date(value) : undefined;
  }
}
