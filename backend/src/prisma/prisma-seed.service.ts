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
        name: 'Request for Information',
        requires_approval_chain: false,
      },
      {
        code: TicketTypeCode.PUNCH,
        name: 'Punch List',
        requires_approval_chain: false,
      },
      {
        code: TicketTypeCode.CHANGE_ORDER,
        name: 'Change Order',
        requires_approval_chain: true,
      },
      {
        code: TicketTypeCode.SAFETY,
        name: 'Safety Incident',
        requires_approval_chain: true,
      },
      {
        code: TicketTypeCode.MAINTENANCE,
        name: 'Maintenance Request',
        requires_approval_chain: false,
      },
      {
        code: TicketTypeCode.SUBMITTAL,
        name: 'Technical Submittal',
        requires_approval_chain: true,
      },
      {
        code: TicketTypeCode.FIELD_ISSUE,
        name: 'Field Issue',
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
      { code: TicketStatusCode.NEW, name: 'New', sort_order: 1, is_terminal: false },
      {
        code: TicketStatusCode.ASSIGNED,
        name: 'Assigned',
        sort_order: 2,
        is_terminal: false,
      },
      {
        code: TicketStatusCode.IN_PROGRESS,
        name: 'In Progress',
        sort_order: 3,
        is_terminal: false,
      },
      {
        code: TicketStatusCode.PENDING,
        name: 'Pending',
        sort_order: 4,
        is_terminal: false,
      },
      {
        code: TicketStatusCode.RESOLVED,
        name: 'Resolved',
        sort_order: 5,
        is_terminal: false,
      },
      {
        code: TicketStatusCode.CLOSED,
        name: 'Closed',
        sort_order: 6,
        is_terminal: true,
      },
      {
        code: TicketStatusCode.REOPENED,
        name: 'Reopened',
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
}