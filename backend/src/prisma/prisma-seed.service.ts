import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
  KnowledgeCategoryCode,
  ProjectStatus,
  ProjectTaskStatus,
  RoleCode,
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
    await this.seedDemoTicket();
    await this.seedDemoKnowledgeArticles();
    await this.seedDemoRoleUsers();
    await this.seedDemoProjectHub();
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

  // One demo account per role most concerned by the Projets/Chantiers
  // module, so RBAC can be exercised by logging in as each of them without
  // going through the admin user-creation screen first.
  private async seedDemoRoleUsers() {
    const password = process.env.DEMO_USER_PASSWORD ?? 'Demo1234!';
    const passwordHash = await bcrypt.hash(password, 10);

    const demoUsers = [
      { role: RoleCode.moa, email: 'moa.demo@site-ticket.local', first_name: 'Marie', last_name: 'Owner (MOA)' },
      { role: RoleCode.moe, email: 'moe.demo@site-ticket.local', first_name: 'Julien', last_name: 'Design (MOE)' },
      {
        role: RoleCode.conducteur_travaux,
        email: 'conducteur.demo@site-ticket.local',
        first_name: 'Karim',
        last_name: 'Conducteur',
      },
      {
        role: RoleCode.chef_chantier,
        email: 'chef.demo@site-ticket.local',
        first_name: 'Sophie',
        last_name: 'Chef de chantier',
      },
    ];

    const project = await this.prisma.project.findUnique({
      where: { code: 'DEMO-001' },
      select: { id: true },
    });

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

      if (project) {
        await this.prisma.projectMember.upsert({
          where: { project_id_user_id: { project_id: project.id, user_id: user.id } },
          update: {},
          create: { project_id: project.id, user_id: user.id, role_on_project: demoUser.role },
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
}
