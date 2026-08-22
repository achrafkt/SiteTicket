import { PrismaClient, RoleCode } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { KnowledgeActor, KnowledgeService } from './knowledge.service';

describe('KnowledgeService', () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let storage: jest.Mocked<StorageService>;
  let service: KnowledgeService;

  const managerActor: KnowledgeActor = { id: 'qse-1', role: RoleCode.qse };
  const nonManagerActor: KnowledgeActor = {
    id: 'sous-traitant-1',
    role: RoleCode.sous_traitant,
  };

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    storage = {
      remove: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    service = new KnowledgeService(prisma as unknown as PrismaService, storage);
  });

  describe('visibility (findAllArticles / findOneArticle)', () => {
    it('returns every article to a KNOWLEDGE_MANAGER_ROLES actor regardless of visible_roles', async () => {
      prisma.knowledgeArticle.findMany.mockResolvedValue([
        { id: 'a1', visible_roles: [RoleCode.chef_chantier] },
        { id: 'a2', visible_roles: [] },
      ] as never);

      const result = await service.findAllArticles(managerActor);

      expect(result.map((a) => a.id)).toEqual(['a1', 'a2']);
    });

    it('filters out articles whose visible_roles excludes a non-manager actor role, but keeps public ones', async () => {
      prisma.knowledgeArticle.findMany.mockResolvedValue([
        { id: 'restricted', visible_roles: [RoleCode.chef_chantier] },
        { id: 'public', visible_roles: [] },
        { id: 'allowed', visible_roles: [RoleCode.sous_traitant] },
      ] as never);

      const result = await service.findAllArticles(nonManagerActor);

      expect(result.map((a) => a.id)).toEqual(['public', 'allowed']);
    });

    it('throws NotFound when the article does not exist', async () => {
      prisma.knowledgeArticle.findUnique.mockResolvedValue(null);

      await expect(
        service.findOneArticle('missing', managerActor),
      ).rejects.toThrow('Article introuvable.');
    });

    it('throws NotFound (masking existence) when the article exists but is not visible to the actor role', async () => {
      prisma.knowledgeArticle.findUnique.mockResolvedValue({
        id: 'restricted',
        visible_roles: [RoleCode.chef_chantier],
      } as never);

      await expect(
        service.findOneArticle('restricted', nonManagerActor),
      ).rejects.toThrow('Article introuvable.');
    });

    it('returns the article when it is visible to the actor role', async () => {
      prisma.knowledgeArticle.findUnique.mockResolvedValue({
        id: 'public',
        visible_roles: [],
      } as never);

      const result = await service.findOneArticle('public', nonManagerActor);

      expect(result).toEqual({ id: 'public', visible_roles: [] });
    });
  });

  describe('createArticle()', () => {
    function baseDto() {
      return {
        categoryId: 'category-1',
        title: 'Procédure échafaudage',
        content: 'Contenu détaillé...',
      };
    }

    beforeEach(() => {
      prisma.knowledgeCategory.findUnique.mockResolvedValue({
        id: 'category-1',
      } as never);
    });

    it('throws BadRequest when the category does not exist', async () => {
      prisma.knowledgeCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.createArticle(baseDto(), managerActor),
      ).rejects.toThrow('La catégorie sélectionnée est introuvable.');
    });

    it('creates the article with no source ticket reference when sourceTicketId is omitted', async () => {
      prisma.knowledgeArticle.create.mockResolvedValue({
        id: 'article-1',
      } as never);

      await service.createArticle(baseDto(), managerActor);

      expect(prisma.ticket.findUnique).not.toHaveBeenCalled();
      const call = prisma.knowledgeArticle.create.mock.calls[0][0] as {
        data: { source_ticket_id?: string; source_ticket_reference?: string };
      };
      expect(call.data.source_ticket_id).toBeUndefined();
      expect(call.data.source_ticket_reference).toBeUndefined();
    });

    it('resolves and denormalizes the ticket number when sourceTicketId matches a real ticket', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        ticket_number: 'TKT-2026-0007',
      } as never);
      prisma.knowledgeArticle.create.mockResolvedValue({
        id: 'article-1',
      } as never);

      await service.createArticle(
        { ...baseDto(), sourceTicketId: 'ticket-1' },
        managerActor,
      );

      const call = prisma.knowledgeArticle.create.mock.calls[0][0] as {
        data: { source_ticket_id?: string; source_ticket_reference?: string };
      };
      expect(call.data.source_ticket_id).toBe('ticket-1');
      expect(call.data.source_ticket_reference).toBe('TKT-2026-0007');
    });

    it('silently skips the source reference when sourceTicketId points to a ticket that no longer exists', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);
      prisma.knowledgeArticle.create.mockResolvedValue({
        id: 'article-1',
      } as never);

      await expect(
        service.createArticle(
          { ...baseDto(), sourceTicketId: 'stale-ticket' },
          managerActor,
        ),
      ).resolves.toEqual({ id: 'article-1' });

      const call = prisma.knowledgeArticle.create.mock.calls[0][0] as {
        data: { source_ticket_id?: string };
      };
      expect(call.data.source_ticket_id).toBeUndefined();
    });
  });

  describe('updateArticle()', () => {
    it('throws NotFound when the article does not exist', async () => {
      prisma.knowledgeArticle.findUnique.mockResolvedValue(null);

      await expect(
        service.updateArticle('missing', { title: 'X' }),
      ).rejects.toThrow('Article introuvable.');
    });

    it('throws BadRequest when reassigning to a category that does not exist', async () => {
      prisma.knowledgeArticle.findUnique.mockResolvedValue({
        id: 'article-1',
        file_url: null,
      } as never);
      prisma.knowledgeCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.updateArticle('article-1', { categoryId: 'ghost-category' }),
      ).rejects.toThrow('La catégorie sélectionnée est introuvable.');
    });

    it('updates the article without a category check when categoryId is omitted', async () => {
      prisma.knowledgeArticle.findUnique.mockResolvedValue({
        id: 'article-1',
        file_url: null,
      } as never);
      prisma.knowledgeArticle.update.mockResolvedValue({
        id: 'article-1',
        title: 'Nouveau titre',
      } as never);

      const result = await service.updateArticle('article-1', {
        title: 'Nouveau titre',
      });

      expect(prisma.knowledgeCategory.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'article-1', title: 'Nouveau titre' });
    });
  });

  describe('removeArticle()', () => {
    it('throws NotFound when the article does not exist', async () => {
      prisma.knowledgeArticle.findUnique.mockResolvedValue(null);

      await expect(service.removeArticle('missing')).rejects.toThrow(
        'Article introuvable.',
      );
    });

    it('removes the article and its attached file from storage', async () => {
      prisma.knowledgeArticle.findUnique.mockResolvedValue({
        id: 'article-1',
        file_url: 'https://storage/doc.pdf',
      } as never);

      const result = await service.removeArticle('article-1');

      expect(result).toEqual({ success: true });
      expect(storage.remove).toHaveBeenCalledWith('https://storage/doc.pdf');
    });

    it('removes the article without touching storage when it has no attached file', async () => {
      prisma.knowledgeArticle.findUnique.mockResolvedValue({
        id: 'article-1',
        file_url: null,
      } as never);

      await service.removeArticle('article-1');

      expect(storage.remove).not.toHaveBeenCalled();
    });
  });

  describe('setArticleFile()', () => {
    const file = {
      buffer: Buffer.from('x'),
      mimetype: 'application/pdf',
      originalname: 'doc.pdf',
      size: 10,
    } as Express.Multer.File;

    it('removes the previous file from storage before saving the new one', async () => {
      prisma.knowledgeArticle.findUnique.mockResolvedValue({
        id: 'article-1',
        file_url: 'https://storage/old.pdf',
      } as never);
      storage.save.mockResolvedValue('https://storage/doc.pdf');
      prisma.knowledgeArticle.update.mockResolvedValue({
        id: 'article-1',
      } as never);

      await service.setArticleFile('article-1', file);

      expect(storage.remove).toHaveBeenCalledWith('https://storage/old.pdf');
      expect(storage.save).toHaveBeenCalledWith(
        file.buffer,
        file.mimetype,
        file.originalname,
      );
    });

    it('saves directly without calling remove when the article had no previous file', async () => {
      prisma.knowledgeArticle.findUnique.mockResolvedValue({
        id: 'article-1',
        file_url: null,
      } as never);
      storage.save.mockResolvedValue('https://storage/doc.pdf');
      prisma.knowledgeArticle.update.mockResolvedValue({
        id: 'article-1',
      } as never);

      await service.setArticleFile('article-1', file);

      expect(storage.remove).not.toHaveBeenCalled();
    });
  });

  describe('removeArticleFile()', () => {
    it('throws BadRequest when the article has no file attached', async () => {
      prisma.knowledgeArticle.findUnique.mockResolvedValue({
        id: 'article-1',
        file_url: null,
      } as never);

      await expect(service.removeArticleFile('article-1')).rejects.toThrow(
        "Cet article n'a pas de fichier joint.",
      );
    });

    it('removes the file from storage and clears the file fields', async () => {
      prisma.knowledgeArticle.findUnique.mockResolvedValue({
        id: 'article-1',
        file_url: 'https://storage/doc.pdf',
      } as never);
      prisma.knowledgeArticle.update.mockResolvedValue({
        id: 'article-1',
        file_url: null,
      } as never);

      await service.removeArticleFile('article-1');

      expect(storage.remove).toHaveBeenCalledWith('https://storage/doc.pdf');
      expect(prisma.knowledgeArticle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ file_url: null }),
        }),
      );
    });
  });
});
