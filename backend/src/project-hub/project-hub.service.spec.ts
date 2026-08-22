import { ForbiddenException } from '@nestjs/common';
import { PrismaClient, RoleCode } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProjectHubAccessService,
  ProjectHubActor,
} from './project-hub-access.service';
import { ProjectHubService } from './project-hub.service';

describe('ProjectHubService', () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let access: jest.Mocked<ProjectHubAccessService>;
  let service: ProjectHubService;

  const projectId = 'chantier-1';
  const chefActor: ProjectHubActor = { id: 'chef-1', role: RoleCode.chef_chantier };
  const adminActor: ProjectHubActor = { id: 'admin-1', role: RoleCode.admin };

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    access = {
      assertCanView: jest.fn(),
      assertCanManageInfo: jest.fn(),
      assertCanManageField: jest.fn(),
      assertCanManageBudget: jest.fn(),
      canSeeBudget: jest.fn(),
      visibleProjectIdsFilter: jest.fn(),
    } as unknown as jest.Mocked<ProjectHubAccessService>;

    service = new ProjectHubService(prisma as unknown as PrismaService, access);
  });

  describe('findAll()', () => {
    it('computes budget_spent and budget_variance from expenses when the role can see the budget', async () => {
      access.canSeeBudget.mockReturnValue(true);
      access.visibleProjectIdsFilter.mockResolvedValue(undefined);
      prisma.project.findMany.mockResolvedValue([
        {
          id: projectId,
          budget_planned: 1000,
          expenses: [{ amount: 150 }, { amount: 50 }],
          _count: { tasks: 2, members: 3 },
        },
      ] as never);

      const [result] = await service.findAll(adminActor);

      expect(result.budget_spent).toBe(200);
      expect(result.budget_variance).toBe(800);
    });

    it('nulls out every budget field for a role without budget visibility', async () => {
      access.canSeeBudget.mockReturnValue(false);
      access.visibleProjectIdsFilter.mockResolvedValue({
        members: { some: { user_id: chefActor.id } },
      } as never);
      prisma.project.findMany.mockResolvedValue([
        { id: projectId, budget_planned: 1000, _count: { tasks: 0, members: 1 } },
      ] as never);

      const [result] = await service.findAll(chefActor);

      expect(result.budget_planned).toBeNull();
      expect(result.budget_spent).toBeNull();
      expect(result.budget_variance).toBeNull();
      const call = prisma.project.findMany.mock.calls[0][0] as {
        include: { expenses: unknown };
      };
      expect(call.include.expenses).toBe(false);
    });

    it('scopes the query to visible chantiers for a chantier-scoped role', async () => {
      const filter = { members: { some: { user_id: chefActor.id } } };
      access.canSeeBudget.mockReturnValue(false);
      access.visibleProjectIdsFilter.mockResolvedValue(filter as never);
      prisma.project.findMany.mockResolvedValue([]);

      await service.findAll(chefActor);

      const call = prisma.project.findMany.mock.calls[0][0] as {
        where?: unknown;
      };
      expect(call.where).toEqual(filter);
    });
  });

  describe('findOne()', () => {
    it('throws NotFound when the chantier does not exist', async () => {
      access.canSeeBudget.mockReturnValue(true);
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(service.findOne(projectId, adminActor)).rejects.toThrow(
        'Chantier introuvable.',
      );
    });

    it('propagates Forbidden from assertCanView for a non-member chantier-scoped actor', async () => {
      access.assertCanView.mockRejectedValue(new ForbiddenException());

      await expect(service.findOne(projectId, chefActor)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns the chantier with tasks and a computed budget summary', async () => {
      access.canSeeBudget.mockReturnValue(true);
      prisma.project.findUnique.mockResolvedValue({
        id: projectId,
        budget_planned: 500,
        expenses: [{ amount: 100 }],
        tasks: [{ id: 'task-1' }],
        _count: { tasks: 1, members: 1 },
      } as never);

      const result = await service.findOne(projectId, adminActor);

      expect(result.budget_spent).toBe(100);
      expect(result.budget_variance).toBe(400);
    });
  });

  describe('create()', () => {
    it('throws before touching Prisma when the role cannot manage chantier info', async () => {
      access.assertCanManageInfo.mockImplementation(() => {
        throw new ForbiddenException();
      });

      await expect(
        service.create({ name: 'X', code: 'X-1' }, chefActor),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.project.create).not.toHaveBeenCalled();
    });

    it('throws BadRequest when the chantier code is already used', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'existing' } as never);

      await expect(
        service.create({ name: 'X', code: 'DUP-1' }, adminActor),
      ).rejects.toThrow('Ce code chantier est déjà utilisé.');
    });

    it('creates the chantier and attaches a budget summary', async () => {
      access.canSeeBudget.mockReturnValue(true);
      prisma.project.findFirst.mockResolvedValue(null);
      prisma.project.create.mockResolvedValue({
        id: 'new-chantier',
        budget_planned: 200,
        _count: { tasks: 0, members: 0 },
      } as never);

      const result = await service.create(
        { name: 'Nouveau chantier', code: 'NC-1' },
        adminActor,
      );

      expect(result.id).toBe('new-chantier');
      expect(result.budget_spent).toBe(0);
    });
  });

  describe('update()', () => {
    function existingProject(overrides: Record<string, unknown> = {}) {
      return {
        name: 'Ancien nom',
        code: 'OLD-1',
        address: null,
        client_name: null,
        description: null,
        status: 'actif',
        budget_planned: 1000,
        start_date: null,
        end_date_planned: null,
        end_date_actual: null,
        ...overrides,
      };
    }

    it('throws NotFound when the chantier does not exist', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(
        service.update(projectId, { name: 'X' }, adminActor),
      ).rejects.toThrow('Chantier introuvable.');
    });

    it('throws BadRequest when renaming the code to one already used by another chantier', async () => {
      prisma.project.findUnique.mockResolvedValue(existingProject() as never);
      prisma.project.findFirst.mockResolvedValue({ id: 'other-chantier' } as never);

      await expect(
        service.update(projectId, { code: 'TAKEN' }, adminActor),
      ).rejects.toThrow('Ce code chantier est déjà utilisé.');
    });

    it('logs an info_updated activity entry summarizing name and status changes', async () => {
      access.canSeeBudget.mockReturnValue(true);
      prisma.project.findUnique.mockResolvedValue(existingProject() as never);
      prisma.project.update.mockResolvedValue({
        id: projectId,
        budget_planned: 1000,
        _count: { tasks: 0, members: 0 },
      } as never);

      await service.update(
        projectId,
        { name: 'Nouveau nom', status: 'suspendu' },
        adminActor,
      );

      expect(prisma.projectActivityLogEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'info_updated' }),
        }),
      );
    });

    it('logs a separate budget_updated activity entry when budgetPlanned changes', async () => {
      access.canSeeBudget.mockReturnValue(true);
      prisma.project.findUnique.mockResolvedValue(existingProject() as never);
      prisma.project.update.mockResolvedValue({
        id: projectId,
        budget_planned: 5000,
        _count: { tasks: 0, members: 0 },
      } as never);

      await service.update(projectId, { budgetPlanned: 5000 }, adminActor);

      expect(prisma.projectActivityLogEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'budget_updated' }),
        }),
      );
    });

    it('does not log any activity when nothing in the dto actually differs from the current values', async () => {
      prisma.project.findUnique.mockResolvedValue(existingProject() as never);
      prisma.project.update.mockResolvedValue({
        id: projectId,
        budget_planned: 1000,
        _count: { tasks: 0, members: 0 },
      } as never);

      await service.update(
        projectId,
        { name: 'Ancien nom', budgetPlanned: 1000 },
        adminActor,
      );

      expect(prisma.projectActivityLogEntry.create).not.toHaveBeenCalled();
    });

    it('logs an info_updated entry when the start date changes', async () => {
      access.canSeeBudget.mockReturnValue(true);
      prisma.project.findUnique.mockResolvedValue(existingProject() as never);
      prisma.project.update.mockResolvedValue({
        id: projectId,
        budget_planned: 1000,
        _count: { tasks: 0, members: 0 },
      } as never);

      await service.update(
        projectId,
        { startDate: '2026-03-01' },
        adminActor,
      );

      const call = prisma.projectActivityLogEntry.create.mock.calls[0][0] as {
        data: { summary: string };
      };
      expect(call.data.summary).toContain('Date de début');
    });

    it('logs an info_updated entry when the address changes', async () => {
      access.canSeeBudget.mockReturnValue(true);
      prisma.project.findUnique.mockResolvedValue(
        existingProject({ address: 'Ancienne adresse' }) as never,
      );
      prisma.project.update.mockResolvedValue({
        id: projectId,
        budget_planned: 1000,
        _count: { tasks: 0, members: 0 },
      } as never);

      await service.update(
        projectId,
        { address: 'Nouvelle adresse' },
        adminActor,
      );

      const call = prisma.projectActivityLogEntry.create.mock.calls[0][0] as {
        data: { summary: string };
      };
      expect(call.data.summary).toContain('Adresse modifiée');
    });
  });

  describe('updateProgress()', () => {
    it('checks field-management access for this chantier before updating', async () => {
      access.assertCanManageField.mockRejectedValue(new ForbiddenException());

      await expect(
        service.updateProgress(projectId, { progressPercent: 50 }, chefActor),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.project.update).not.toHaveBeenCalled();
    });

    it('throws NotFound when the chantier no longer exists', async () => {
      access.assertCanManageField.mockResolvedValue(undefined);
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProgress(projectId, { progressPercent: 50 }, chefActor),
      ).rejects.toThrow('Chantier introuvable.');
    });

    it('updates the progress percentage and returns the chantier with a budget summary', async () => {
      access.assertCanManageField.mockResolvedValue(undefined);
      access.canSeeBudget.mockReturnValue(false);
      prisma.project.findUnique.mockResolvedValue({ id: projectId } as never);
      prisma.project.update.mockResolvedValue({
        id: projectId,
        budget_planned: 1000,
        _count: { tasks: 0, members: 0 },
      } as never);

      const result = await service.updateProgress(
        projectId,
        { progressPercent: 50 },
        chefActor,
      );

      expect(prisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { progress_percent: 50 } }),
      );
      expect(result.budget_planned).toBeNull();
    });
  });

  describe('listTasks()', () => {
    it('checks chantier visibility before listing tasks', async () => {
      access.assertCanView.mockRejectedValue(new ForbiddenException());

      await expect(service.listTasks(projectId, chefActor)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.projectTask.findMany).not.toHaveBeenCalled();
    });

    it('returns the chantier tasks once visibility is confirmed', async () => {
      access.assertCanView.mockResolvedValue(undefined);
      prisma.projectTask.findMany.mockResolvedValue([{ id: 'task-1' }] as never);

      const result = await service.listTasks(projectId, chefActor);

      expect(result).toEqual([{ id: 'task-1' }]);
    });
  });

  describe('createTask()', () => {
    beforeEach(() => {
      access.assertCanManageField.mockResolvedValue(undefined);
      prisma.project.findUnique.mockResolvedValue({ id: projectId } as never);
    });

    it('throws BadRequest when the assignee does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createTask(
          projectId,
          { title: 'Couler la dalle', assigneeId: 'ghost-user' },
          chefActor,
        ),
      ).rejects.toThrow('Utilisateur assigné introuvable.');
    });

    it('creates the task and logs a task_created activity entry', async () => {
      prisma.projectTask.create.mockResolvedValue({
        id: 'task-1',
        title: 'Couler la dalle',
      } as never);

      const result = await service.createTask(
        projectId,
        { title: 'Couler la dalle' },
        chefActor,
      );

      expect(result.id).toBe('task-1');
      expect(prisma.projectActivityLogEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'task_created' }),
        }),
      );
    });
  });

  describe('updateTask()', () => {
    beforeEach(() => {
      access.assertCanManageField.mockResolvedValue(undefined);
    });

    it('throws NotFound when the task does not belong to this chantier', async () => {
      prisma.projectTask.findFirst.mockResolvedValue(null);

      await expect(
        service.updateTask(
          projectId,
          'task-1',
          { status: 'done' },
          chefActor,
        ),
      ).rejects.toThrow('Tâche introuvable.');
    });

    it('logs a status-transition summary when the task status changes', async () => {
      prisma.projectTask.findFirst.mockResolvedValue({
        id: 'task-1',
        title: 'Couler la dalle',
        status: 'todo',
      } as never);
      prisma.projectTask.update.mockResolvedValue({ id: 'task-1' } as never);

      await service.updateTask(
        projectId,
        'task-1',
        { status: 'done' },
        chefActor,
      );

      const call = prisma.projectActivityLogEntry.create.mock.calls[0][0] as {
        data: { summary: string };
      };
      expect(call.data.summary).toContain('À faire');
      expect(call.data.summary).toContain('Terminée');
    });

    it('logs a generic update summary when only non-status fields change', async () => {
      prisma.projectTask.findFirst.mockResolvedValue({
        id: 'task-1',
        title: 'Couler la dalle',
        status: 'todo',
      } as never);
      prisma.projectTask.update.mockResolvedValue({ id: 'task-1' } as never);

      await service.updateTask(
        projectId,
        'task-1',
        { description: 'Zone B' },
        chefActor,
      );

      const call = prisma.projectActivityLogEntry.create.mock.calls[0][0] as {
        data: { summary: string };
      };
      expect(call.data.summary).toBe('Tâche modifiée : "Couler la dalle"');
    });

    it('validates the new assignee exists when reassigning a task', async () => {
      prisma.projectTask.findFirst.mockResolvedValue({
        id: 'task-1',
        title: 'Couler la dalle',
        status: 'todo',
      } as never);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTask(
          projectId,
          'task-1',
          { assigneeId: 'ghost-user' },
          chefActor,
        ),
      ).rejects.toThrow('Utilisateur assigné introuvable.');
      expect(prisma.projectTask.update).not.toHaveBeenCalled();
    });
  });

  describe('removeTask()', () => {
    it('removes the task and logs a task_deleted activity entry', async () => {
      access.assertCanManageField.mockResolvedValue(undefined);
      prisma.projectTask.findFirst.mockResolvedValue({
        id: 'task-1',
        title: 'Couler la dalle',
        status: 'todo',
      } as never);

      const result = await service.removeTask(projectId, 'task-1', chefActor);

      expect(result).toEqual({ success: true });
      expect(prisma.projectTask.delete).toHaveBeenCalledWith({
        where: { id: 'task-1' },
      });
      expect(prisma.projectActivityLogEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'task_deleted' }),
        }),
      );
    });
  });

  describe('listExpenses()', () => {
    it('throws BadRequest when the role cannot see the budget', async () => {
      access.assertCanView.mockResolvedValue(undefined);
      access.canSeeBudget.mockReturnValue(false);

      await expect(service.listExpenses(projectId, chefActor)).rejects.toThrow(
        'Le budget n’est pas accessible à votre rôle.',
      );
    });

    it('returns the expense list when the role can see the budget', async () => {
      access.assertCanView.mockResolvedValue(undefined);
      access.canSeeBudget.mockReturnValue(true);
      prisma.projectExpense.findMany.mockResolvedValue([
        { id: 'expense-1' },
      ] as never);

      const result = await service.listExpenses(projectId, adminActor);

      expect(result).toEqual([{ id: 'expense-1' }]);
    });
  });

  describe('createExpense()', () => {
    it('throws before touching Prisma when the role cannot manage the budget', async () => {
      access.assertCanManageBudget.mockImplementation(() => {
        throw new ForbiddenException();
      });

      await expect(
        service.createExpense(
          projectId,
          { label: 'Béton', amount: 500 },
          chefActor,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.projectExpense.create).not.toHaveBeenCalled();
    });

    it('creates the expense and logs an expense_created activity entry', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: projectId } as never);
      prisma.projectExpense.create.mockResolvedValue({
        id: 'expense-1',
        label: 'Béton',
        amount: 500,
      } as never);

      const result = await service.createExpense(
        projectId,
        { label: 'Béton', amount: 500 },
        adminActor,
      );

      expect(result.id).toBe('expense-1');
      expect(prisma.projectActivityLogEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'expense_created' }),
        }),
      );
    });
  });

  describe('removeExpense()', () => {
    it('throws NotFound when the expense does not belong to this chantier', async () => {
      prisma.projectExpense.findFirst.mockResolvedValue(null);

      await expect(
        service.removeExpense(projectId, 'expense-1', adminActor),
      ).rejects.toThrow('Dépense introuvable.');
    });

    it('removes the expense and logs an expense_deleted activity entry', async () => {
      prisma.projectExpense.findFirst.mockResolvedValue({
        id: 'expense-1',
        label: 'Béton',
        amount: 500,
      } as never);

      const result = await service.removeExpense(
        projectId,
        'expense-1',
        adminActor,
      );

      expect(result).toEqual({ success: true });
      expect(prisma.projectActivityLogEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'expense_deleted' }),
        }),
      );
    });
  });

  describe('getActivityLog()', () => {
    it('excludes budget-sensitive actions for a role without budget visibility', async () => {
      access.assertCanView.mockResolvedValue(undefined);
      access.canSeeBudget.mockReturnValue(false);
      prisma.projectActivityLogEntry.findMany.mockResolvedValue([]);

      await service.getActivityLog(projectId, chefActor);

      const call = prisma.projectActivityLogEntry.findMany.mock
        .calls[0][0] as { where: { action?: { notIn: string[] } } };
      expect(call.where.action).toEqual({
        notIn: ['budget_updated', 'expense_created', 'expense_deleted'],
      });
    });

    it('includes every action for a role with budget visibility', async () => {
      access.assertCanView.mockResolvedValue(undefined);
      access.canSeeBudget.mockReturnValue(true);
      prisma.projectActivityLogEntry.findMany.mockResolvedValue([]);

      await service.getActivityLog(projectId, adminActor);

      const call = prisma.projectActivityLogEntry.findMany.mock
        .calls[0][0] as { where: { action?: unknown } };
      expect(call.where.action).toBeUndefined();
    });
  });
});
