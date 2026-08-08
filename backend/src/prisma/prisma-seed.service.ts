import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
  ProjectStatus,
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
    await this.seedAdminUser();
    await this.seedDemoTicket();
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
      { code: TicketStatusCode.NEW, name: 'Nouveau', sort_order: 1, is_terminal: false },
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
      },
      create: {
        name: 'Demo Construction Project',
        code: 'DEMO-001',
        client_name: 'Internal Demo Client',
        status: ProjectStatus.actif,
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
}