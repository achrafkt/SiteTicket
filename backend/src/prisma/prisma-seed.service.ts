import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
  KnowledgeCategoryCode,
  Prisma,
  ProjectStatus,
  ProjectTaskStatus,
  RoleCode,
  TicketPriority,
  TicketStatusCode,
  TicketTypeCode,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaSeedService implements OnApplicationBootstrap {
  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    await this.seedRoles();
    await this.seedTicketTypes();
    await this.seedTicketStatuses();
    await this.seedKnowledgeCategories();
    await this.seedAdminUser();
    await this.seedSecondDemoProject();
    await this.seedDemoTicket();
    await this.seedDemoKnowledgeArticles();
    await this.seedDemoRoleUsers();
    await this.seedDemoProjectHub();
    await this.seedDemoAnalyticsTickets();
  }

  private async seedRoles() {
    const roles = [
      {
        code: RoleCode.admin,
        name: 'Administrator',
        description: 'Full access to the platform.',
      },
      { code: RoleCode.moa, name: 'MOA', description: 'Owner representative.' },
      { code: RoleCode.moe, name: 'MOE', description: 'Design lead.' },
      {
        code: RoleCode.conducteur_travaux,
        name: 'Conducteur de travaux',
        description: 'Construction manager.',
      },
      {
        code: RoleCode.chef_chantier,
        name: 'Chef de chantier',
        description: 'Site supervisor.',
      },
      {
        code: RoleCode.sous_traitant,
        name: 'Sous-traitant',
        description: 'Subcontractor profile.',
      },
      { code: RoleCode.qse, name: 'QSE', description: 'Quality and safety.' },
      {
        code: RoleCode.observateur,
        name: 'Observateur',
        description: 'Read-only access.',
      },
    ];

    for (const role of roles) {
      await this.prisma.role.upsert({
        where: { code: role.code },
        update: {
          name: role.name,
          description: role.description,
        },
        create: role,
      });
    }
  }

  private async seedTicketTypes() {
    const ticketTypes = [
      {
        code: TicketTypeCode.RFI,
        name: "Demande d'information",
        requires_approval_chain: false,
      },
      {
        code: TicketTypeCode.PUNCH,
        name: 'Réserve',
        requires_approval_chain: false,
      },
      {
        code: TicketTypeCode.CHANGE_ORDER,
        name: 'Ordre de modification',
        requires_approval_chain: true,
      },
      {
        code: TicketTypeCode.SAFETY,
        name: 'Incident sécurité',
        requires_approval_chain: true,
      },
      {
        code: TicketTypeCode.MAINTENANCE,
        name: 'Demande de maintenance',
        requires_approval_chain: false,
      },
      {
        code: TicketTypeCode.SUBMITTAL,
        name: 'Soumission technique',
        requires_approval_chain: true,
      },
      {
        code: TicketTypeCode.FIELD_ISSUE,
        name: 'Problème de chantier',
        requires_approval_chain: false,
      },
    ];

    for (const ticketType of ticketTypes) {
      await this.prisma.ticketType.upsert({
        where: { code: ticketType.code },
        update: {
          name: ticketType.name,
          requires_approval_chain: ticketType.requires_approval_chain,
        },
        create: ticketType,
      });
    }
  }

  private async seedTicketStatuses() {
    const statuses = [
      {
        code: TicketStatusCode.NEW,
        name: 'Nouveau',
        sort_order: 1,
        is_terminal: false,
      },
      {
        code: TicketStatusCode.ASSIGNED,
        name: 'Assigné',
        sort_order: 2,
        is_terminal: false,
      },
      {
        code: TicketStatusCode.IN_PROGRESS,
        name: 'En cours',
        sort_order: 3,
        is_terminal: false,
      },
      {
        code: TicketStatusCode.PENDING,
        name: 'En attente',
        sort_order: 4,
        is_terminal: false,
      },
      {
        code: TicketStatusCode.RESOLVED,
        name: 'Résolu',
        sort_order: 5,
        is_terminal: false,
      },
      {
        code: TicketStatusCode.CLOSED,
        name: 'Clôturé',
        sort_order: 6,
        is_terminal: true,
      },
      {
        code: TicketStatusCode.REOPENED,
        name: 'Réouvert',
        sort_order: 7,
        is_terminal: false,
      },
    ];

    for (const status of statuses) {
      await this.prisma.ticketStatus.upsert({
        where: { code: status.code },
        update: {
          name: status.name,
          sort_order: status.sort_order,
          is_terminal: status.is_terminal,
        },
        create: status,
      });
    }
  }

  private async seedKnowledgeCategories() {
    const categories = [
      {
        code: KnowledgeCategoryCode.PROCEDURE,
        name: 'Procédures',
        sort_order: 1,
      },
      {
        code: KnowledgeCategoryCode.SAFETY_SHEET,
        name: 'Fiches sécurité',
        sort_order: 2,
      },
      {
        code: KnowledgeCategoryCode.TECHNICAL_STANDARD,
        name: 'Normes techniques',
        sort_order: 3,
      },
      {
        code: KnowledgeCategoryCode.DOCUMENT_TEMPLATE,
        name: 'Modèles de documents',
        sort_order: 4,
      },
      {
        code: KnowledgeCategoryCode.EQUIPMENT_SHEET,
        name: 'Fiches matériel',
        sort_order: 5,
      },
      { code: KnowledgeCategoryCode.FAQ, name: 'FAQ métier', sort_order: 6 },
    ];

    for (const category of categories) {
      await this.prisma.knowledgeCategory.upsert({
        where: { code: category.code },
        update: { name: category.name, sort_order: category.sort_order },
        create: category,
      });
    }
  }

  private async seedAdminUser() {
    const adminRole = await this.prisma.role.findUnique({
      where: { code: RoleCode.admin },
    });

    if (!adminRole) {
      return;
    }

    const email = process.env.ADMIN_EMAIL ?? 'admin@site-ticket.local';
    const password = process.env.ADMIN_PASSWORD ?? 'Admin1234!';
    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.user.upsert({
      where: { email },
      update: {
        role_id: adminRole.id,
        first_name: 'Site',
        last_name: 'Admin',
        is_active: true,
      },
      create: {
        role_id: adminRole.id,
        first_name: 'Site',
        last_name: 'Admin',
        email,
        password_hash: passwordHash,
        is_active: true,
      },
    });

    await this.prisma.project.upsert({
      where: { code: 'DEMO-001' },
      update: {
        name: 'Demo Construction Project',
        status: ProjectStatus.actif,
        address: '12 rue des Chantiers, 69000 Lyon',
        description: 'Construction neuve — 48 logements collectifs R+4.',
        progress_percent: 35,
        budget_planned: 2_450_000,
        start_date: new Date('2026-01-06'),
        end_date_planned: new Date('2026-11-30'),
      },
      create: {
        name: 'Demo Construction Project',
        code: 'DEMO-001',
        client_name: 'Internal Demo Client',
        address: '12 rue des Chantiers, 69000 Lyon',
        description: 'Construction neuve — 48 logements collectifs R+4.',
        status: ProjectStatus.actif,
        progress_percent: 35,
        budget_planned: 2_450_000,
        start_date: new Date('2026-01-06'),
        end_date_planned: new Date('2026-11-30'),
      },
    });
  }

  // A 2nd chantier so per-chantier charts (répartition, budget) have more
  // than one bar to compare, and so RBAC scoping can be exercised: chef de
  // chantier/sous-traitant/qse are each attached to only one of the two.
  private async seedSecondDemoProject() {
    const project = await this.prisma.project.upsert({
      where: { code: 'DEMO-002' },
      update: {
        name: 'Réhabilitation Îlot Sud',
        status: ProjectStatus.actif,
        address: '5 avenue des Ateliers, 69003 Lyon',
        description: 'Réhabilitation lourde — bureaux et commerces en pied d’immeuble.',
        progress_percent: 58,
        budget_planned: 1_180_000,
        start_date: new Date('2025-11-03'),
        end_date_planned: new Date('2026-09-30'),
      },
      create: {
        name: 'Réhabilitation Îlot Sud',
        code: 'DEMO-002',
        client_name: 'Foncière Sud Immo',
        address: '5 avenue des Ateliers, 69003 Lyon',
        description: 'Réhabilitation lourde — bureaux et commerces en pied d’immeuble.',
        status: ProjectStatus.actif,
        progress_percent: 58,
        budget_planned: 1_180_000,
        start_date: new Date('2025-11-03'),
        end_date_planned: new Date('2026-09-30'),
      },
    });

    const adminUser = await this.prisma.user.findUnique({
      where: { email: process.env.ADMIN_EMAIL ?? 'admin@site-ticket.local' },
      select: { id: true },
    });
    if (!adminUser) return;

    const existingExpenses = await this.prisma.projectExpense.count({ where: { project_id: project.id } });
    if (existingExpenses === 0) {
      await this.prisma.projectExpense.createMany({
        data: [
          {
            project_id: project.id,
            label: 'Désamiantage plateau R+1',
            amount: 47_500,
            category: 'Travaux préparatoires',
            expense_date: new Date('2026-06-12'),
            created_by: adminUser.id,
          },
          {
            project_id: project.id,
            label: 'Location base vie chantier — S1 2026',
            amount: 21_300,
            category: 'Location matériel',
            expense_date: new Date('2026-07-20'),
            created_by: adminUser.id,
          },
          {
            project_id: project.id,
            label: 'Menuiseries extérieures — façade rue',
            amount: 138_900,
            category: 'Matériaux',
            expense_date: new Date('2026-08-01'),
            created_by: adminUser.id,
          },
        ],
      });
    }
  }

  private async seedDemoTicket() {
    const ticketNumber = 'TKT-DEMO-0001';

    const existing = await this.prisma.ticket.findUnique({
      where: { ticket_number: ticketNumber },
      select: { id: true },
    });

    if (existing) {
      return;
    }

    const project = await this.prisma.project.findUnique({
      where: { code: 'DEMO-001' },
      select: { id: true },
    });

    const ticketType = await this.prisma.ticketType.findUnique({
      where: { code: TicketTypeCode.PUNCH },
      select: { id: true },
    });

    const status = await this.prisma.ticketStatus.findUnique({
      where: { code: TicketStatusCode.NEW },
      select: { id: true },
    });

    const adminUser = await this.prisma.user.findUnique({
      where: { email: process.env.ADMIN_EMAIL ?? 'admin@site-ticket.local' },
      select: { id: true },
    });

    if (!project || !ticketType || !status || !adminUser) {
      return;
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        ticket_number: ticketNumber,
        project_id: project.id,
        ticket_type_id: ticketType.id,
        status_id: status.id,
        title: 'Fissure visible sur voile béton R+2 — zone escalier B',
        description:
          "Une fissure d'environ 40 cm a été constatée sur le voile béton du R+2, à proximité de la cage d'escalier B. Nécessite une expertise avant fermeture du lot.",
        priority: 'high',
        location_zone: 'LOT-216',
        trade: 'Gros œuvre',
        created_by: adminUser.id,
      },
    });

    await this.prisma.ticketStatusHistory.create({
      data: {
        ticket_id: ticket.id,
        to_status_id: status.id,
        changed_by: adminUser.id,
        comment: 'Ticket créé',
      },
    });

    await this.prisma.ticketComment.create({
      data: {
        ticket_id: ticket.id,
        user_id: adminUser.id,
        comment_text:
          'Bonjour, merci de valider si cette fissure est structurelle ou superficielle avant la coulée du R+3.',
        is_internal: false,
      },
    });
  }

  private async seedDemoKnowledgeArticles() {
    const adminUser = await this.prisma.user.findUnique({
      where: { email: process.env.ADMIN_EMAIL ?? 'admin@site-ticket.local' },
      select: { id: true },
    });

    if (!adminUser) {
      return;
    }

    const categories = await this.prisma.knowledgeCategory.findMany({
      select: { id: true, code: true },
    });
    const categoryId = (code: KnowledgeCategoryCode) =>
      categories.find((category) => category.code === code)?.id;

    const now = new Date();
    const in15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const articles: Array<{
      title: string;
      categoryCode: KnowledgeCategoryCode;
      content: string;
      visible_roles: RoleCode[];
      needs_review: boolean;
      valid_until: Date | null;
    }> = [
      {
        title: 'Procédure de réception de livraison béton',
        categoryCode: KnowledgeCategoryCode.PROCEDURE,
        content:
          "1. Contrôler le bon de livraison (formulation, quantité, heure de départ centrale).\n2. Vérifier le délai de transport (max 90 min sauf retardateur de prise).\n3. Réaliser le cône d'Abrams si doute sur la consistance.\n4. Prélever les éprouvettes de contrôle si lot soumis à essai.\n5. Consigner la livraison dans le carnet de chantier.",
        visible_roles: [],
        needs_review: false,
        valid_until: null,
      },
      {
        title: 'Consignes port des EPI en zone chantier',
        categoryCode: KnowledgeCategoryCode.SAFETY_SHEET,
        content:
          "Casque, chaussures de sécurité et gilet haute visibilité obligatoires sur l'ensemble de l'emprise chantier. Protection auditive et lunettes obligatoires en zone de découpe. Tout manquement constaté doit être signalé au QSE et fait l'objet d'un rappel immédiat.",
        visible_roles: [],
        needs_review: false,
        valid_until: in15Days,
      },
      {
        title: 'DTU 13.3 — Dallages, synthèse des points de vigilance',
        categoryCode: KnowledgeCategoryCode.TECHNICAL_STANDARD,
        content:
          "Rappel des exigences du DTU 13.3 sur les dallages à usage industriel ou assimilé : épaisseur minimale, treillis soudé, joints de dilatation tous les 25 à 35 m², traitement de surface selon classe d'exposition. Se référer à la version en vigueur pour toute application contractuelle.",
        visible_roles: [
          RoleCode.admin,
          RoleCode.conducteur_travaux,
          RoleCode.moe,
        ],
        needs_review: false,
        valid_until: oneYearAgo,
      },
      {
        title: 'Modèle de PV de réception de travaux',
        categoryCode: KnowledgeCategoryCode.DOCUMENT_TEMPLATE,
        content:
          'Trame standard à utiliser pour toute réception de travaux : identification du chantier et du lot, liste contradictoire des réserves, date de levée prévisionnelle, signatures MOA/MOE/entreprise. Joindre le fichier modèle à cet article.',
        visible_roles: [],
        needs_review: true,
        valid_until: null,
      },
      {
        title: 'Fiche VGP — Grue à tour',
        categoryCode: KnowledgeCategoryCode.EQUIPMENT_SHEET,
        content:
          'La Vérification Générale Périodique (VGP) des grues à tour est due tous les 6 mois. Elle doit être réalisée par un organisme agréé et consignée dans le registre de sécurité. Toute grue dont la VGP est expirée doit être immobilisée immédiatement.',
        visible_roles: [],
        needs_review: false,
        valid_until: now,
      },
      {
        title: 'Qui valide un ordre de service ?',
        categoryCode: KnowledgeCategoryCode.FAQ,
        content:
          "Un ordre de service est émis par la maîtrise d'œuvre (MOE) et notifié à l'entreprise concernée. Il doit être contresigné pour prise d'effet. En cas de désaccord, l'entreprise dispose d'un délai contractuel pour formuler ses réserves.",
        visible_roles: [],
        needs_review: false,
        valid_until: null,
      },
    ];

    for (const article of articles) {
      const catId = categoryId(article.categoryCode);
      if (!catId) continue;

      const existing = await this.prisma.knowledgeArticle.findFirst({
        where: { title: article.title },
        select: { id: true },
      });
      if (existing) continue;

      await this.prisma.knowledgeArticle.create({
        data: {
          category_id: catId,
          title: article.title,
          content: article.content,
          visible_roles: article.visible_roles,
          needs_review: article.needs_review,
          valid_until: article.valid_until,
          created_by: adminUser.id,
        },
      });
    }
  }

  // One demo account per role, so RBAC (project-hub budget visibility,
  // ticket/analytics chantier scoping) can be exercised by logging in as
  // each of them without going through the admin user-creation screen first.
  // Membership is deliberately split across the two demo chantiers: roles
  // with broad view (moa/moe/conducteur_travaux) don't need it, but
  // chef_chantier/sous_traitant/qse are each scoped to only one chantier so
  // that "ne voit que son/ses chantier(s)" is actually testable, and
  // observateur is on both to exercise the "restricted but multi-chantier" case.
  private async seedDemoRoleUsers() {
    const password = process.env.DEMO_USER_PASSWORD ?? 'Demo1234!';
    const passwordHash = await bcrypt.hash(password, 10);

    const demoUsers = [
      { role: RoleCode.moa, email: 'moa.demo@site-ticket.local', first_name: 'Marie', last_name: 'Owner (MOA)', projects: ['DEMO-001'] },
      { role: RoleCode.moe, email: 'moe.demo@site-ticket.local', first_name: 'Julien', last_name: 'Design (MOE)', projects: ['DEMO-001'] },
      {
        role: RoleCode.conducteur_travaux,
        email: 'conducteur.demo@site-ticket.local',
        first_name: 'Karim',
        last_name: 'Conducteur',
        projects: ['DEMO-001', 'DEMO-002'],
      },
      {
        role: RoleCode.chef_chantier,
        email: 'chef.demo@site-ticket.local',
        first_name: 'Sophie',
        last_name: 'Chef de chantier',
        projects: ['DEMO-001'],
      },
      {
        role: RoleCode.sous_traitant,
        email: 'soustraitant.demo@site-ticket.local',
        first_name: 'Yassine',
        last_name: 'Sous-traitant',
        projects: ['DEMO-001'],
      },
      {
        role: RoleCode.qse,
        email: 'qse.demo@site-ticket.local',
        first_name: 'Nadia',
        last_name: 'QSE',
        projects: ['DEMO-002'],
      },
      {
        role: RoleCode.observateur,
        email: 'observateur.demo@site-ticket.local',
        first_name: 'Paul',
        last_name: 'Observateur',
        projects: ['DEMO-001', 'DEMO-002'],
      },
    ];

    const projects = await this.prisma.project.findMany({
      where: { code: { in: ['DEMO-001', 'DEMO-002'] } },
      select: { id: true, code: true },
    });
    const projectByCode = new Map(projects.map((project) => [project.code, project.id]));

    for (const demoUser of demoUsers) {
      const role = await this.prisma.role.findUnique({ where: { code: demoUser.role } });
      if (!role) continue;

      const user = await this.prisma.user.upsert({
        where: { email: demoUser.email },
        update: { role_id: role.id, first_name: demoUser.first_name, last_name: demoUser.last_name },
        create: {
          role_id: role.id,
          first_name: demoUser.first_name,
          last_name: demoUser.last_name,
          email: demoUser.email,
          password_hash: passwordHash,
          is_active: true,
        },
      });

      for (const code of demoUser.projects) {
        const projectId = projectByCode.get(code);
        if (!projectId) continue;

        await this.prisma.projectMember.upsert({
          where: { project_id_user_id: { project_id: projectId, user_id: user.id } },
          update: {},
          create: { project_id: projectId, user_id: user.id, role_on_project: demoUser.role },
        });
      }
    }
  }

  private async seedDemoProjectHub() {
    const project = await this.prisma.project.findUnique({
      where: { code: 'DEMO-001' },
      select: { id: true },
    });
    const adminUser = await this.prisma.user.findUnique({
      where: { email: process.env.ADMIN_EMAIL ?? 'admin@site-ticket.local' },
      select: { id: true },
    });
    const chefChantier = await this.prisma.user.findUnique({
      where: { email: 'chef.demo@site-ticket.local' },
      select: { id: true },
    });

    if (!project || !adminUser) {
      return;
    }

    const existingTasks = await this.prisma.projectTask.count({ where: { project_id: project.id } });
    if (existingTasks === 0) {
      await this.prisma.projectTask.createMany({
        data: [
          {
            project_id: project.id,
            title: 'Coulage voile béton R+2 — zone escalier B',
            description: 'Reprise après validation du bureau de contrôle sur la fissure signalée.',
            status: ProjectTaskStatus.in_progress,
            due_date: new Date('2026-08-22'),
            assignee_id: chefChantier?.id,
            created_by: adminUser.id,
          },
          {
            project_id: project.id,
            title: 'Réception livraison ferraillage R+3',
            status: ProjectTaskStatus.todo,
            due_date: new Date('2026-08-18'),
            assignee_id: chefChantier?.id,
            created_by: adminUser.id,
          },
          {
            project_id: project.id,
            title: 'Contrôle sécurité échafaudages façade nord',
            status: ProjectTaskStatus.done,
            created_by: adminUser.id,
          },
        ],
      });
    }

    const existingExpenses = await this.prisma.projectExpense.count({ where: { project_id: project.id } });
    if (existingExpenses === 0) {
      await this.prisma.projectExpense.createMany({
        data: [
          {
            project_id: project.id,
            label: 'Location grue à tour — juillet',
            amount: 18_500,
            category: 'Location matériel',
            expense_date: new Date('2026-07-31'),
            created_by: adminUser.id,
          },
          {
            project_id: project.id,
            label: 'Livraison béton — lots R+1 à R+2',
            amount: 64_200,
            category: 'Matériaux',
            expense_date: new Date('2026-08-05'),
            created_by: adminUser.id,
          },
          {
            project_id: project.id,
            label: 'Main d’œuvre gros œuvre — juillet',
            amount: 92_000,
            category: 'Main d’œuvre',
            expense_date: new Date('2026-07-31'),
            created_by: adminUser.id,
          },
        ],
      });
    }
  }

  // Enough varied ticket history (both chantiers, all types/statuses/
  // priorities, ~5 months of created_at spread, plausible resolution times)
  // for the Analytics dashboard's charts to show real signal instead of
  // near-empty demo data. Idempotent via the TKT-ANLY- ticket_number prefix.
  private async seedDemoAnalyticsTickets() {
    const TICKET_NUMBER_PREFIX = 'TKT-ANLY-';
    const existingCount = await this.prisma.ticket.count({
      where: { ticket_number: { startsWith: TICKET_NUMBER_PREFIX } },
    });
    if (existingCount > 0) return;

    const projects = await this.prisma.project.findMany({
      where: { code: { in: ['DEMO-001', 'DEMO-002'] } },
      select: { id: true, code: true },
    });
    const ticketTypes = await this.prisma.ticketType.findMany({ select: { id: true, code: true } });
    const statuses = await this.prisma.ticketStatus.findMany({ select: { id: true, code: true } });
    const adminUser = await this.prisma.user.findUnique({
      where: { email: process.env.ADMIN_EMAIL ?? 'admin@site-ticket.local' },
      select: { id: true },
    });

    if (!adminUser || projects.length === 0 || ticketTypes.length === 0 || statuses.length === 0) {
      return;
    }

    const assignableUsers = await this.prisma.user.findMany({
      where: {
        email: {
          in: [
            'chef.demo@site-ticket.local',
            'soustraitant.demo@site-ticket.local',
            'conducteur.demo@site-ticket.local',
            'moe.demo@site-ticket.local',
            'qse.demo@site-ticket.local',
          ],
        },
      },
      select: { id: true },
    });
    if (assignableUsers.length === 0) return;

    const projectByCode = new Map(projects.map((project) => [project.code, project]));
    const typeByCode = new Map(ticketTypes.map((type) => [type.code, type]));
    const statusByCode = new Map(statuses.map((status) => [status.code, status]));

    const TYPE_CYCLE: TicketTypeCode[] = [
      TicketTypeCode.RFI,
      TicketTypeCode.PUNCH,
      TicketTypeCode.SAFETY,
      TicketTypeCode.MAINTENANCE,
      TicketTypeCode.FIELD_ISSUE,
      TicketTypeCode.SUBMITTAL,
      TicketTypeCode.CHANGE_ORDER,
    ];

    const RESOLUTION_HOURS_BY_TYPE: Record<TicketTypeCode, number> = {
      [TicketTypeCode.SAFETY]: 14,
      [TicketTypeCode.FIELD_ISSUE]: 36,
      [TicketTypeCode.PUNCH]: 60,
      [TicketTypeCode.MAINTENANCE]: 40,
      [TicketTypeCode.RFI]: 80,
      [TicketTypeCode.SUBMITTAL]: 130,
      [TicketTypeCode.CHANGE_ORDER]: 190,
    };

    const DUE_DAYS_BY_TYPE: Record<TicketTypeCode, number> = {
      [TicketTypeCode.SAFETY]: 3,
      [TicketTypeCode.FIELD_ISSUE]: 5,
      [TicketTypeCode.PUNCH]: 10,
      [TicketTypeCode.MAINTENANCE]: 7,
      [TicketTypeCode.RFI]: 14,
      [TicketTypeCode.SUBMITTAL]: 21,
      [TicketTypeCode.CHANGE_ORDER]: 30,
    };

    const TITLES_BY_TYPE: Record<TicketTypeCode, string[]> = {
      [TicketTypeCode.RFI]: [
        "Précision attendue sur détail d'étanchéité",
        'Question sur calepinage carrelage hall',
        'Clarification cotes plan de coffrage',
      ],
      [TicketTypeCode.PUNCH]: [
        'Reprise peinture cage escalier',
        'Finition joint carrelage sanitaires',
        "Défaut d'aplomb cloison bureau",
      ],
      [TicketTypeCode.CHANGE_ORDER]: [
        'Modification tracé réseau CVC',
        'Ajout prise réseau salle serveur',
        'Changement revêtement sol accueil',
      ],
      [TicketTypeCode.SAFETY]: [
        'Garde-corps manquant trémie',
        'Stockage produits inflammables non conforme',
        'Absence de balisage zone de fouille',
      ],
      [TicketTypeCode.MAINTENANCE]: [
        'Panne compresseur base vie',
        'Entretien nacelle élévatrice',
        'Remplacement filtre groupe électrogène',
      ],
      [TicketTypeCode.SUBMITTAL]: [
        'Fiche technique menuiseries alu à valider',
        'Note de calcul structure à soumettre',
        'Échantillon revêtement façade à approuver',
      ],
      [TicketTypeCode.FIELD_ISSUE]: [
        'Infiltration eau sous-sol après pluie',
        'Réseau existant non répertorié rencontré',
        'Accès chantier bloqué par livraison voisine',
      ],
    };

    const STATUS_CYCLE: TicketStatusCode[] = [
      TicketStatusCode.CLOSED,
      TicketStatusCode.RESOLVED,
      TicketStatusCode.IN_PROGRESS,
      TicketStatusCode.CLOSED,
      TicketStatusCode.NEW,
      TicketStatusCode.ASSIGNED,
      TicketStatusCode.RESOLVED,
      TicketStatusCode.PENDING,
      TicketStatusCode.IN_PROGRESS,
      TicketStatusCode.REOPENED,
      TicketStatusCode.CLOSED,
      TicketStatusCode.RESOLVED,
    ];

    const PRIORITY_CYCLE: TicketPriority[] = [
      'medium',
      'high',
      'low',
      'medium',
      'critical',
      'high',
      'medium',
      'low',
    ];

    const TRADES = ['Gros œuvre', 'Second œuvre', 'Électricité', 'Plomberie', 'Façade'];

    const now = new Date();
    const TOTAL_TICKETS = 50;
    const ticketsData: Prisma.TicketCreateManyInput[] = [];

    for (let i = 0; i < TOTAL_TICKETS; i += 1) {
      const projectCode = i % 3 === 2 ? 'DEMO-002' : 'DEMO-001';
      const project = projectByCode.get(projectCode);
      const typeCode = TYPE_CYCLE[i % TYPE_CYCLE.length];
      const type = typeByCode.get(typeCode);
      if (!project || !type) continue;

      const createdAt = new Date(now.getTime() - (150 - i * 3) * 24 * 60 * 60 * 1000);
      createdAt.setHours(8 + (i % 9), (i * 7) % 60, 0, 0);

      let statusCode = STATUS_CYCLE[i % STATUS_CYCLE.length];
      const resolutionHours = RESOLUTION_HOURS_BY_TYPE[typeCode] + (i % 6) * 8;
      let resolvedAt: Date | null = null;
      let closedAt: Date | null = null;

      if (statusCode === TicketStatusCode.RESOLVED || statusCode === TicketStatusCode.CLOSED) {
        const candidateResolvedAt = new Date(createdAt.getTime() + resolutionHours * 60 * 60 * 1000);
        if (candidateResolvedAt >= now) {
          // Too recently created to plausibly already be resolved — keep it open instead.
          statusCode = TicketStatusCode.IN_PROGRESS;
        } else {
          resolvedAt = candidateResolvedAt;
          if (statusCode === TicketStatusCode.CLOSED) {
            let candidateClosedAt = new Date(resolvedAt.getTime() + (24 + (i % 4) * 12) * 60 * 60 * 1000);
            if (candidateClosedAt >= now) {
              candidateClosedAt = new Date(now.getTime() - 60 * 60 * 1000);
            }
            closedAt = candidateClosedAt;
          }
        }
      }

      const status = statusByCode.get(statusCode);
      if (!status) continue;

      const dueDate = new Date(createdAt.getTime() + DUE_DAYS_BY_TYPE[typeCode] * 24 * 60 * 60 * 1000);
      const priority = PRIORITY_CYCLE[i % PRIORITY_CYCLE.length];
      const assignee = i % 6 === 5 ? null : assignableUsers[i % assignableUsers.length];
      const titles = TITLES_BY_TYPE[typeCode];
      const title = `${titles[i % titles.length]} — lot ${String((i % 12) + 1).padStart(2, '0')}`;

      ticketsData.push({
        ticket_number: `${TICKET_NUMBER_PREFIX}${String(i + 1).padStart(3, '0')}`,
        project_id: project.id,
        ticket_type_id: type.id,
        status_id: status.id,
        title,
        priority,
        location_zone: `LOT-${100 + (i % 12) * 4}`,
        trade: TRADES[i % TRADES.length],
        created_by: adminUser.id,
        assigned_to: assignee?.id,
        due_date: dueDate,
        resolved_at: resolvedAt,
        closed_at: closedAt,
        created_at: createdAt,
      });
    }

    await this.prisma.ticket.createMany({ data: ticketsData });
  }
}
