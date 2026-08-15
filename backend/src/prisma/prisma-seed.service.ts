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

// Demo company: a BTP (construction) firm operating in Marrakech. All demo
// users, chantiers, tickets and knowledge base content below are themed
// consistently around that context so the app can be explored/demoed in a
// realistic, fully-populated state.

interface DemoUserSeed {
  role: RoleCode;
  email: string;
  first_name: string;
  last_name: string;
}

// Several accounts per role (never just one) so RBAC scoping is exercisable
// with more than a single example per role. Emails follow prenom.nom@site-ticket.local.
const MARRAKECH_USERS: DemoUserSeed[] = [
  { role: RoleCode.admin, email: 'youssef.elamrani@site-ticket.local', first_name: 'Youssef', last_name: 'El Amrani' },

  { role: RoleCode.moa, email: 'hind.benjelloun@site-ticket.local', first_name: 'Hind', last_name: 'Benjelloun' },
  { role: RoleCode.moa, email: 'karim.tazi@site-ticket.local', first_name: 'Karim', last_name: 'Tazi' },
  { role: RoleCode.moa, email: 'salma.berrada@site-ticket.local', first_name: 'Salma', last_name: 'Berrada' },
  { role: RoleCode.moa, email: 'omar.squalli@site-ticket.local', first_name: 'Omar', last_name: 'Squalli' },

  { role: RoleCode.moe, email: 'mehdi.alaoui@site-ticket.local', first_name: 'Mehdi', last_name: 'Alaoui' },
  { role: RoleCode.moe, email: 'ghita.idrissi@site-ticket.local', first_name: 'Ghita', last_name: 'Idrissi' },
  { role: RoleCode.moe, email: 'anas.bennani@site-ticket.local', first_name: 'Anas', last_name: 'Bennani' },

  { role: RoleCode.conducteur_travaux, email: 'rachid.filali@site-ticket.local', first_name: 'Rachid', last_name: 'Filali' },
  { role: RoleCode.conducteur_travaux, email: 'amine.chraibi@site-ticket.local', first_name: 'Amine', last_name: 'Chraibi' },
  { role: RoleCode.conducteur_travaux, email: 'nabil.ouahbi@site-ticket.local', first_name: 'Nabil', last_name: 'Ouahbi' },
  { role: RoleCode.conducteur_travaux, email: 'zineb.lahlou@site-ticket.local', first_name: 'Zineb', last_name: 'Lahlou' },

  { role: RoleCode.chef_chantier, email: 'hicham.bakkali@site-ticket.local', first_name: 'Hicham', last_name: 'Bakkali' },
  { role: RoleCode.chef_chantier, email: 'said.mansouri@site-ticket.local', first_name: 'Said', last_name: 'Mansouri' },
  { role: RoleCode.chef_chantier, email: 'khalid.rifai@site-ticket.local', first_name: 'Khalid', last_name: 'Rifai' },
  { role: RoleCode.chef_chantier, email: 'younes.sbai@site-ticket.local', first_name: 'Younes', last_name: 'Sbai' },

  { role: RoleCode.sous_traitant, email: 'aziz.kabbaj@site-ticket.local', first_name: 'Aziz', last_name: 'Kabbaj' },
  { role: RoleCode.sous_traitant, email: 'bilal.zniber@site-ticket.local', first_name: 'Bilal', last_name: 'Zniber' },
  { role: RoleCode.sous_traitant, email: 'reda.elkhatib@site-ticket.local', first_name: 'Reda', last_name: 'El Khatib' },
  { role: RoleCode.sous_traitant, email: 'fouad.guessous@site-ticket.local', first_name: 'Fouad', last_name: 'Guessous' },
  { role: RoleCode.sous_traitant, email: 'imane.cherkaoui@site-ticket.local', first_name: 'Imane', last_name: 'Cherkaoui' },

  { role: RoleCode.qse, email: 'loubna.elouazzani@site-ticket.local', first_name: 'Loubna', last_name: 'El Ouazzani' },
  { role: RoleCode.qse, email: 'adil.belhaj@site-ticket.local', first_name: 'Adil', last_name: 'Belhaj' },
  { role: RoleCode.qse, email: 'wafaa.bouzoubaa@site-ticket.local', first_name: 'Wafaa', last_name: 'Bouzoubaa' },

  { role: RoleCode.observateur, email: 'meryem.elfassi@site-ticket.local', first_name: 'Meryem', last_name: 'El Fassi' },
  { role: RoleCode.observateur, email: 'tarik.guerraoui@site-ticket.local', first_name: 'Tarik', last_name: 'Guerraoui' },
  { role: RoleCode.observateur, email: 'khadija.sbai@site-ticket.local', first_name: 'Khadija', last_name: 'Sbai' },
];

interface MarrakechProjectSeed {
  code: string;
  name: string;
  neighborhood: string;
  address: string;
  client_name: string;
  description: string;
  status: ProjectStatus;
  progress_percent: number;
  budget_planned: number;
  start_date: string;
  end_date_planned: string;
  end_date_actual?: string;
  // Emails referencing MARRAKECH_USERS, used both for ProjectMember rows and
  // for picking plausible ticket authors/assignees per chantier.
  moa: string;
  moe: string;
  conducteur: string;
  chef: string;
  sousTraitants: [string, string];
  qse: string;
  observateurs: string[];
}

// A dozen chantiers spread across Marrakech neighborhoods, with varied
// statuses/budgets/progress/dates so listing/filtering/analytics screens
// have real signal. Each chantier's team is hand-assigned across the role
// pools above (rather than pure round-robin) so ProjectMember rows are
// balanced across every conducteur/chef/sous-traitant/qse/observateur.
const MARRAKECH_PROJECTS: MarrakechProjectSeed[] = [
  {
    code: 'MRK-001',
    name: 'Résidence Al Manar',
    neighborhood: 'Guéliz',
    address: 'Avenue Mohammed V, Guéliz, Marrakech',
    client_name: 'Atlas Al Madina Promotion',
    description: 'Construction neuve — résidence R+6, 90 logements collectifs avec commerces en rez-de-chaussée.',
    status: ProjectStatus.actif,
    progress_percent: 45,
    budget_planned: 32_000_000,
    start_date: '2025-09-01',
    end_date_planned: '2026-12-15',
    moa: 'salma.berrada@site-ticket.local',
    moe: 'mehdi.alaoui@site-ticket.local',
    conducteur: 'rachid.filali@site-ticket.local',
    chef: 'hicham.bakkali@site-ticket.local',
    sousTraitants: ['aziz.kabbaj@site-ticket.local', 'fouad.guessous@site-ticket.local'],
    qse: 'loubna.elouazzani@site-ticket.local',
    observateurs: ['meryem.elfassi@site-ticket.local'],
  },
  {
    code: 'MRK-002',
    name: 'Villa Zahrat Al Hivernage',
    neighborhood: 'Hivernage',
    address: 'Rue des Temples, Hivernage, Marrakech',
    client_name: 'Hind Benjelloun',
    description: 'Villa individuelle haut standing R+1 avec piscine, jardin paysager et dépendances.',
    status: ProjectStatus.actif,
    progress_percent: 68,
    budget_planned: 6_500_000,
    start_date: '2025-12-01',
    end_date_planned: '2026-09-30',
    moa: 'hind.benjelloun@site-ticket.local',
    moe: 'ghita.idrissi@site-ticket.local',
    conducteur: 'amine.chraibi@site-ticket.local',
    chef: 'said.mansouri@site-ticket.local',
    sousTraitants: ['bilal.zniber@site-ticket.local', 'imane.cherkaoui@site-ticket.local'],
    qse: 'adil.belhaj@site-ticket.local',
    observateurs: ['tarik.guerraoui@site-ticket.local'],
  },
  {
    code: 'MRK-003',
    name: 'Centre Commercial Menara Gate',
    neighborhood: 'Semlalia',
    address: 'Route de Casablanca, Semlalia, Marrakech',
    client_name: 'Ocre Immobilier',
    description: 'Centre commercial R+2 avec parking souterrain et food court.',
    status: ProjectStatus.preparation,
    progress_percent: 8,
    budget_planned: 95_000_000,
    start_date: '2026-06-01',
    end_date_planned: '2028-03-31',
    moa: 'omar.squalli@site-ticket.local',
    moe: 'anas.bennani@site-ticket.local',
    conducteur: 'nabil.ouahbi@site-ticket.local',
    chef: 'khalid.rifai@site-ticket.local',
    sousTraitants: ['reda.elkhatib@site-ticket.local', 'aziz.kabbaj@site-ticket.local'],
    qse: 'wafaa.bouzoubaa@site-ticket.local',
    observateurs: ['khadija.sbai@site-ticket.local'],
  },
  {
    code: 'MRK-004',
    name: 'École Internationale Agdal',
    neighborhood: 'Agdal',
    address: "Avenue Abdelkrim El Khattabi, Agdal, Marrakech",
    client_name: 'Groupe Scolaire Al Massar',
    description: "Construction d'un groupe scolaire primaire et collège, R+3, avec gymnase.",
    status: ProjectStatus.actif,
    progress_percent: 55,
    budget_planned: 21_000_000,
    start_date: '2025-08-15',
    end_date_planned: '2026-10-30',
    moa: 'salma.berrada@site-ticket.local',
    moe: 'mehdi.alaoui@site-ticket.local',
    conducteur: 'zineb.lahlou@site-ticket.local',
    chef: 'younes.sbai@site-ticket.local',
    sousTraitants: ['fouad.guessous@site-ticket.local', 'bilal.zniber@site-ticket.local'],
    qse: 'loubna.elouazzani@site-ticket.local',
    observateurs: ['meryem.elfassi@site-ticket.local'],
  },
  {
    code: 'MRK-005',
    name: 'Riad Dar Chamaa — Restauration',
    neighborhood: 'Médina',
    address: 'Derb El Bahia, Médina, Marrakech',
    client_name: 'Karim Tazi',
    description: "Restauration d'un riad traditionnel en maison d'hôtes — patio, zellige, tadelakt.",
    status: ProjectStatus.actif,
    progress_percent: 30,
    budget_planned: 3_200_000,
    start_date: '2026-02-10',
    end_date_planned: '2026-11-15',
    moa: 'karim.tazi@site-ticket.local',
    moe: 'ghita.idrissi@site-ticket.local',
    conducteur: 'rachid.filali@site-ticket.local',
    chef: 'hicham.bakkali@site-ticket.local',
    sousTraitants: ['imane.cherkaoui@site-ticket.local', 'reda.elkhatib@site-ticket.local'],
    qse: 'adil.belhaj@site-ticket.local',
    observateurs: ['tarik.guerraoui@site-ticket.local'],
  },
  {
    code: 'MRK-006',
    name: 'Extension Résidentielle Palmeraie Golf',
    neighborhood: 'Palmeraie',
    address: 'Circuit de la Palmeraie, Marrakech',
    client_name: 'Palmeraie Développement SA',
    description: "Extension d'un domaine résidentiel — villas golf et club house.",
    status: ProjectStatus.suspendu,
    progress_percent: 20,
    budget_planned: 48_000_000,
    start_date: '2025-05-01',
    end_date_planned: '2027-01-31',
    moa: 'omar.squalli@site-ticket.local',
    moe: 'anas.bennani@site-ticket.local',
    conducteur: 'amine.chraibi@site-ticket.local',
    chef: 'said.mansouri@site-ticket.local',
    sousTraitants: ['aziz.kabbaj@site-ticket.local', 'fouad.guessous@site-ticket.local'],
    qse: 'wafaa.bouzoubaa@site-ticket.local',
    observateurs: ['khadija.sbai@site-ticket.local'],
  },
  {
    code: 'MRK-007',
    name: "Complexe Sportif Route de l'Ourika",
    neighborhood: "Route de l'Ourika",
    address: "Route de l'Ourika, Km 8, Marrakech",
    client_name: 'Commune Urbaine de Marrakech',
    description: 'Complexe sportif avec terrains multisports et piscine semi-olympique.',
    status: ProjectStatus.preparation,
    progress_percent: 5,
    budget_planned: 27_500_000,
    start_date: '2026-09-01',
    end_date_planned: '2027-12-31',
    moa: 'salma.berrada@site-ticket.local',
    moe: 'mehdi.alaoui@site-ticket.local',
    conducteur: 'nabil.ouahbi@site-ticket.local',
    chef: 'khalid.rifai@site-ticket.local',
    sousTraitants: ['reda.elkhatib@site-ticket.local', 'bilal.zniber@site-ticket.local'],
    qse: 'loubna.elouazzani@site-ticket.local',
    observateurs: ['meryem.elfassi@site-ticket.local'],
  },
  {
    code: 'MRK-008',
    name: 'Résidence Targa Verde',
    neighborhood: 'Targa',
    address: 'Avenue Allal Al Fassi, Targa, Marrakech',
    client_name: 'Kasbah Invest',
    description: 'Résidence intermédiaire R+4, 120 logements, avec espaces verts.',
    status: ProjectStatus.actif,
    progress_percent: 62,
    budget_planned: 15_800_000,
    start_date: '2025-07-01',
    end_date_planned: '2026-08-30',
    moa: 'karim.tazi@site-ticket.local',
    moe: 'ghita.idrissi@site-ticket.local',
    conducteur: 'zineb.lahlou@site-ticket.local',
    chef: 'younes.sbai@site-ticket.local',
    sousTraitants: ['imane.cherkaoui@site-ticket.local', 'aziz.kabbaj@site-ticket.local'],
    qse: 'adil.belhaj@site-ticket.local',
    observateurs: ['tarik.guerraoui@site-ticket.local'],
  },
  {
    code: 'MRK-009',
    name: 'Villa Amelkis Panorama',
    neighborhood: 'Amelkis',
    address: 'Golf Amelkis, Marrakech',
    client_name: 'Omar Squalli',
    description: 'Villa golf avec dépendances, court de padel et pool house.',
    status: ProjectStatus.actif,
    progress_percent: 80,
    budget_planned: 9_400_000,
    start_date: '2025-10-01',
    end_date_planned: '2026-07-31',
    moa: 'omar.squalli@site-ticket.local',
    moe: 'anas.bennani@site-ticket.local',
    conducteur: 'rachid.filali@site-ticket.local',
    chef: 'hicham.bakkali@site-ticket.local',
    sousTraitants: ['fouad.guessous@site-ticket.local', 'reda.elkhatib@site-ticket.local'],
    qse: 'wafaa.bouzoubaa@site-ticket.local',
    observateurs: ['khadija.sbai@site-ticket.local'],
  },
  {
    code: 'MRK-010',
    name: 'Immeuble de Bureaux Sidi Youssef',
    neighborhood: 'Sidi Youssef Ben Ali',
    address: 'Avenue Hassan II, Sidi Youssef Ben Ali, Marrakech',
    client_name: 'Groupe Immobilier Anfa Marrakech',
    description: 'Immeuble de bureaux R+5 avec parking en sous-sol.',
    status: ProjectStatus.actif,
    progress_percent: 38,
    budget_planned: 22_300_000,
    start_date: '2025-11-15',
    end_date_planned: '2026-12-20',
    moa: 'salma.berrada@site-ticket.local',
    moe: 'mehdi.alaoui@site-ticket.local',
    conducteur: 'amine.chraibi@site-ticket.local',
    chef: 'said.mansouri@site-ticket.local',
    sousTraitants: ['aziz.kabbaj@site-ticket.local', 'imane.cherkaoui@site-ticket.local'],
    qse: 'loubna.elouazzani@site-ticket.local',
    observateurs: ['meryem.elfassi@site-ticket.local'],
  },
  {
    code: 'MRK-011',
    name: 'Rénovation Marché Couvert Médina',
    neighborhood: 'Médina',
    address: 'Place Bab Ftouh, Médina, Marrakech',
    client_name: 'Commune Urbaine de Marrakech',
    description: 'Réhabilitation du marché couvert — structure, toiture, réseaux.',
    status: ProjectStatus.termine,
    progress_percent: 100,
    budget_planned: 5_100_000,
    start_date: '2025-01-10',
    end_date_planned: '2025-11-30',
    end_date_actual: '2025-12-10',
    moa: 'omar.squalli@site-ticket.local',
    moe: 'ghita.idrissi@site-ticket.local',
    conducteur: 'nabil.ouahbi@site-ticket.local',
    chef: 'khalid.rifai@site-ticket.local',
    sousTraitants: ['bilal.zniber@site-ticket.local', 'reda.elkhatib@site-ticket.local'],
    qse: 'adil.belhaj@site-ticket.local',
    observateurs: ['tarik.guerraoui@site-ticket.local'],
  },
  {
    code: 'MRK-012',
    name: 'Résidence Massira Jardins',
    neighborhood: 'Massira',
    address: 'Avenue Mohammed VI, Massira, Marrakech',
    client_name: 'Foncière Al Boustane',
    description: 'Résidence collective R+5, 80 logements, avec parking.',
    status: ProjectStatus.actif,
    progress_percent: 15,
    budget_planned: 26_000_000,
    start_date: '2026-03-01',
    end_date_planned: '2027-05-31',
    moa: 'salma.berrada@site-ticket.local',
    moe: 'anas.bennani@site-ticket.local',
    conducteur: 'zineb.lahlou@site-ticket.local',
    chef: 'younes.sbai@site-ticket.local',
    sousTraitants: ['fouad.guessous@site-ticket.local', 'imane.cherkaoui@site-ticket.local'],
    qse: 'wafaa.bouzoubaa@site-ticket.local',
    observateurs: ['khadija.sbai@site-ticket.local'],
  },
];

@Injectable()
export class PrismaSeedService implements OnApplicationBootstrap {
  private readonly adminEmail = process.env.ADMIN_EMAIL ?? 'admin@site-ticket.local';

  constructor(private readonly prisma: PrismaService) {}

  // DiceBear (free, no API key) — "notionists" is a polished, illustrated
  // portrait style (Notion-like), seeded by email so each account gets a
  // stable, unique avatar across seed re-runs.
  private buildAvatarUrl(seed: string): string {
    return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}`;
  }

  async onApplicationBootstrap() {
    await this.seedRoles();
    await this.seedTicketTypes();
    await this.seedTicketStatuses();
    await this.seedKnowledgeCategories();
    await this.seedAdminUser();
    await this.seedMarrakechUsers();
    await this.seedMarrakechProjects();
    await this.seedMarrakechProjectMembers();
    await this.seedMarrakechProjectHub();
    await this.seedMarrakechTickets();
    await this.seedMarrakechKnowledgeArticles();
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

  // Technical/system administrator account, kept independent of the named
  // Marrakech staff below so ADMIN_EMAIL/ADMIN_PASSWORD always resolve to a
  // working superuser account regardless of the demo dataset.
  private async seedAdminUser() {
    const adminRole = await this.prisma.role.findUnique({
      where: { code: RoleCode.admin },
    });

    if (!adminRole) {
      return;
    }

    const password = process.env.ADMIN_PASSWORD ?? 'Admin1234!';
    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.user.upsert({
      where: { email: this.adminEmail },
      update: {
        role_id: adminRole.id,
        first_name: 'Site',
        last_name: 'Admin',
        is_active: true,
        avatar_url: this.buildAvatarUrl(this.adminEmail),
      },
      create: {
        role_id: adminRole.id,
        first_name: 'Site',
        last_name: 'Admin',
        email: this.adminEmail,
        password_hash: passwordHash,
        is_active: true,
        avatar_url: this.buildAvatarUrl(this.adminEmail),
      },
    });
  }

  // One account per named Marrakech staff/client member, several per role,
  // sharing a single demo password (DEMO_USER_PASSWORD).
  private async seedMarrakechUsers() {
    const password = process.env.DEMO_USER_PASSWORD ?? 'Demo1234!';
    const passwordHash = await bcrypt.hash(password, 10);

    for (const demoUser of MARRAKECH_USERS) {
      const role = await this.prisma.role.findUnique({ where: { code: demoUser.role } });
      if (!role) continue;

      await this.prisma.user.upsert({
        where: { email: demoUser.email },
        update: {
          role_id: role.id,
          first_name: demoUser.first_name,
          last_name: demoUser.last_name,
          avatar_url: this.buildAvatarUrl(demoUser.email),
        },
        create: {
          role_id: role.id,
          first_name: demoUser.first_name,
          last_name: demoUser.last_name,
          email: demoUser.email,
          password_hash: passwordHash,
          is_active: true,
          avatar_url: this.buildAvatarUrl(demoUser.email),
        },
      });
    }
  }

  private async seedMarrakechProjects() {
    for (const project of MARRAKECH_PROJECTS) {
      const data = {
        name: project.name,
        status: project.status,
        address: project.address,
        client_name: project.client_name,
        description: project.description,
        progress_percent: project.progress_percent,
        budget_planned: project.budget_planned,
        start_date: new Date(project.start_date),
        end_date_planned: new Date(project.end_date_planned),
        end_date_actual: project.end_date_actual ? new Date(project.end_date_actual) : null,
      };

      await this.prisma.project.upsert({
        where: { code: project.code },
        update: data,
        create: { ...data, code: project.code },
      });
    }
  }

  // Field roles (chef_chantier/sous_traitant/qse/observateur) are strictly
  // scoped to chantiers via ProjectMember, so this is what actually makes
  // "chef de chantier ne voit que son chantier" testable. moa/moe/conducteur
  // have broad project-hub visibility regardless, but are still attached
  // here for a coherent "who's on this chantier" team view.
  private async seedMarrakechProjectMembers() {
    const users = await this.prisma.user.findMany({ select: { id: true, email: true } });
    const userIdByEmail = new Map(users.map((u) => [u.email, u.id]));

    const projects = await this.prisma.project.findMany({
      where: { code: { in: MARRAKECH_PROJECTS.map((p) => p.code) } },
      select: { id: true, code: true },
    });
    const projectIdByCode = new Map(projects.map((p) => [p.code, p.id]));

    for (const project of MARRAKECH_PROJECTS) {
      const projectId = projectIdByCode.get(project.code);
      if (!projectId) continue;

      const members: Array<{ email: string; roleOnProject: string }> = [
        { email: project.moa, roleOnProject: 'Maîtrise d’ouvrage' },
        { email: project.moe, roleOnProject: 'Maîtrise d’œuvre' },
        { email: project.conducteur, roleOnProject: 'Conducteur de travaux' },
        { email: project.chef, roleOnProject: 'Chef de chantier' },
        { email: project.sousTraitants[0], roleOnProject: 'Sous-traitant' },
        { email: project.sousTraitants[1], roleOnProject: 'Sous-traitant' },
        { email: project.qse, roleOnProject: 'QSE' },
        ...project.observateurs.map((email) => ({ email, roleOnProject: 'Observateur' })),
      ];

      for (const member of members) {
        const userId = userIdByEmail.get(member.email);
        if (!userId) continue;

        await this.prisma.projectMember.upsert({
          where: { project_id_user_id: { project_id: projectId, user_id: userId } },
          update: { role_on_project: member.roleOnProject },
          create: { project_id: projectId, user_id: userId, role_on_project: member.roleOnProject },
        });
      }
    }
  }

  // A handful of tasks and expenses per chantier so the project hub isn't
  // empty for any of the twelve demo chantiers.
  private async seedMarrakechProjectHub() {
    const users = await this.prisma.user.findMany({ select: { id: true, email: true } });
    const userIdByEmail = new Map(users.map((u) => [u.email, u.id]));

    const projects = await this.prisma.project.findMany({
      where: { code: { in: MARRAKECH_PROJECTS.map((p) => p.code) } },
      select: { id: true, code: true },
    });
    const projectIdByCode = new Map(projects.map((p) => [p.code, p.id]));

    const TASK_TITLES: Array<{ title: string; status: ProjectTaskStatus }> = [
      { title: 'Contrôle qualité coffrage voiles porteurs', status: ProjectTaskStatus.in_progress },
      { title: 'Réception livraison matériaux gros œuvre', status: ProjectTaskStatus.todo },
      { title: 'Coordination lots techniques (élec/plomberie)', status: ProjectTaskStatus.todo },
      { title: 'Suivi levée des réserves bureau de contrôle', status: ProjectTaskStatus.done },
    ];

    const EXPENSE_LABELS: Array<{ label: string; category: string; ratio: number }> = [
      { label: 'Location grue à tour', category: 'Location matériel', ratio: 0.006 },
      { label: 'Achat ciment, sable et agrégats', category: 'Matériaux', ratio: 0.012 },
      { label: 'Main d’œuvre gros œuvre', category: 'Main d’œuvre', ratio: 0.018 },
      { label: 'Location base vie chantier', category: 'Location matériel', ratio: 0.004 },
    ];

    for (const [index, project] of MARRAKECH_PROJECTS.entries()) {
      const projectId = projectIdByCode.get(project.code);
      const creatorId = userIdByEmail.get(project.conducteur);
      const assigneeId = userIdByEmail.get(project.chef);
      if (!projectId || !creatorId) continue;

      const existingTasks = await this.prisma.projectTask.count({ where: { project_id: projectId } });
      if (existingTasks === 0) {
        const projectStart = new Date(project.start_date);
        await this.prisma.projectTask.createMany({
          data: TASK_TITLES.slice(0, 3).map((task, taskIndex) => ({
            project_id: projectId,
            title: task.title,
            status: task.status,
            due_date: new Date(projectStart.getTime() + (30 + taskIndex * 20 + index) * 24 * 60 * 60 * 1000),
            assignee_id: assigneeId,
            created_by: creatorId,
          })),
        });
      }

      const existingExpenses = await this.prisma.projectExpense.count({ where: { project_id: projectId } });
      if (existingExpenses === 0) {
        const projectStart = new Date(project.start_date);
        await this.prisma.projectExpense.createMany({
          data: EXPENSE_LABELS.slice(0, 3).map((expense, expenseIndex) => ({
            project_id: projectId,
            label: expense.label,
            amount: Math.round(project.budget_planned * expense.ratio),
            category: expense.category,
            expense_date: new Date(projectStart.getTime() + (45 + expenseIndex * 25) * 24 * 60 * 60 * 1000),
            created_by: creatorId,
          })),
        });
      }
    }
  }

  // Several dozen tickets spread across all twelve chantiers, all ticket
  // types/statuses/priorities, ~7 months of created_at spread, plausible
  // resolution times, and public/internal comments. Idempotent via the
  // TKT-MRK- ticket_number prefix (whole batch created once).
  private async seedMarrakechTickets() {
    const TICKET_NUMBER_PREFIX = 'TKT-MRK-';
    const existingCount = await this.prisma.ticket.count({
      where: { ticket_number: { startsWith: TICKET_NUMBER_PREFIX } },
    });
    if (existingCount > 0) return;

    const users = await this.prisma.user.findMany({ select: { id: true, email: true } });
    const userIdByEmail = new Map(users.map((u) => [u.email, u.id]));

    const projects = await this.prisma.project.findMany({
      where: { code: { in: MARRAKECH_PROJECTS.map((p) => p.code) } },
      select: { id: true, code: true },
    });
    const projectIdByCode = new Map(projects.map((p) => [p.code, p.id]));

    const ticketTypes = await this.prisma.ticketType.findMany({ select: { id: true, code: true } });
    const typeByCode = new Map(ticketTypes.map((t) => [t.code, t]));
    const statuses = await this.prisma.ticketStatus.findMany({ select: { id: true, code: true } });
    const statusByCode = new Map(statuses.map((s) => [s.code, s]));

    const TYPE_CYCLE: TicketTypeCode[] = [
      TicketTypeCode.RFI,
      TicketTypeCode.PUNCH,
      TicketTypeCode.CHANGE_ORDER,
      TicketTypeCode.SAFETY,
      TicketTypeCode.MAINTENANCE,
      TicketTypeCode.SUBMITTAL,
      TicketTypeCode.FIELD_ISSUE,
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

    const CONTENT_BY_TYPE: Record<TicketTypeCode, Array<{ title: string; description: string; trade: string }>> = {
      [TicketTypeCode.RFI]: [
        {
          title: 'Précision sur calepinage zellige patio central',
          description: 'Merci de confirmer le motif et les teintes du zellige prévu pour le patio central avant lancement de la pose.',
          trade: 'Second œuvre',
        },
        {
          title: 'Clarification altimétrie terrasse accessible',
          description: "Le plan d'exécution ne précise pas la pente d'évacuation des eaux pluviales sur la terrasse accessible. Merci de confirmer.",
          trade: 'Étanchéité',
        },
        {
          title: 'Question sur teinte tadelakt façade intérieure',
          description: 'Le nuancier fourni ne correspond pas à l’échantillon validé en réunion de chantier. Merci de trancher avant application.',
          trade: 'Second œuvre',
        },
        {
          title: 'Détail fixation brise-soleil façade sud',
          description: 'Le plan structure ne précise pas le mode de fixation du brise-soleil métallique en façade sud. Risque de blocage du lot menuiserie.',
          trade: 'Métallerie',
        },
        {
          title: 'Confirmation profondeur fondations zone piscine',
          description: "L'étude de sol recommande une reprise en sous-œuvre localisée. Merci de confirmer la profondeur définitive avant coulage.",
          trade: 'Gros œuvre',
        },
      ],
      [TicketTypeCode.PUNCH]: [
        {
          title: 'Reprise enduit taloché façade nord',
          description: "Défauts de planéité constatés sur l'enduit taloché de la façade nord, à reprendre avant réception.",
          trade: 'Second œuvre',
        },
        {
          title: 'Défaut de pose zellige salle d’eau',
          description: 'Plusieurs carreaux de zellige désaffleurés dans la salle d’eau, jointoiement à refaire.',
          trade: 'Carrelage',
        },
        {
          title: 'Peinture non uniforme cage escalier',
          description: 'Reprise de peinture nécessaire sur le mur nord de la cage d’escalier, coulures visibles.',
          trade: 'Peinture',
        },
        {
          title: 'Portail fer forgé mal aligné',
          description: 'Le portail d’entrée en fer forgé présente un défaut d’alignement, gêne à la fermeture.',
          trade: 'Métallerie',
        },
        {
          title: 'Fissures superficielles enduit patio',
          description: 'Micro-fissures de retrait observées sur l’enduit du patio, à traiter avant la levée des réserves.',
          trade: 'Second œuvre',
        },
      ],
      [TicketTypeCode.CHANGE_ORDER]: [
        {
          title: 'Modification implantation piscine',
          description: 'Le client souhaite déplacer la piscine de 1,5 m côté jardin pour dégager la terrasse. Impact sur le réseau enterré à chiffrer.',
          trade: 'Gros œuvre',
        },
        {
          title: 'Ajout climatisation gainable suites',
          description: "Demande d'ajout d'un système de climatisation gainable dans les suites, non prévu au marché initial.",
          trade: 'CVC',
        },
        {
          title: 'Changement revêtement sol hall d’accueil',
          description: 'Remplacement du carrelage prévu par un marbre local, impact coût et délai à valider.',
          trade: 'Carrelage',
        },
        {
          title: 'Extension terrasse toit',
          description: 'Le maître d’ouvrage demande l’extension de la terrasse toit de 20 m², nécessite reprise de structure.',
          trade: 'Gros œuvre',
        },
        {
          title: 'Ajout groupe électrogène de secours',
          description: 'Ajout d’un groupe électrogène de secours suite à demande MOA, impact sur le lot électricité.',
          trade: 'Électricité',
        },
      ],
      [TicketTypeCode.SAFETY]: [
        {
          title: 'Garde-corps manquant trémie escalier',
          description: 'Absence de garde-corps réglementaire au droit d’une trémie d’escalier, risque de chute grave.',
          trade: 'Sécurité',
        },
        {
          title: 'Coup de chaleur ouvrier zone coffrage',
          description: 'Un ouvrier a présenté des signes de coup de chaleur en pleine journée, pris en charge par les secours.',
          trade: 'Sécurité',
        },
        {
          title: 'Échafaudage non stabilisé',
          description: 'L’échafaudage n’est pas correctement ancré, risque de basculement par vent fort.',
          trade: 'Sécurité',
        },
        {
          title: 'Stockage bouteilles de gaz non conforme',
          description: 'Bouteilles de gaz stockées sans protection ni signalisation à proximité de la base vie.',
          trade: 'Sécurité',
        },
        {
          title: 'Absence de balisage fouille profonde',
          description: 'La fouille pour les fondations n’est pas balisée, risque de chute pour le personnel circulant de nuit.',
          trade: 'Sécurité',
        },
      ],
      [TicketTypeCode.MAINTENANCE]: [
        {
          title: 'Panne compresseur base vie',
          description: 'Le compresseur d’air de la base vie est en panne depuis hier, impacte les travaux de sablage.',
          trade: 'Matériel',
        },
        {
          title: 'Entretien grue à tour',
          description: 'Entretien périodique de la grue à tour à programmer avant la fin du mois.',
          trade: 'Matériel',
        },
        {
          title: 'Fuite réseau eau base vie',
          description: 'Fuite constatée sur le réseau d’alimentation en eau de la base vie, intervention urgente nécessaire.',
          trade: 'Plomberie',
        },
        {
          title: 'Climatiseur bureau chantier en panne',
          description: 'Le climatiseur du bureau de chantier ne fonctionne plus, conditions de travail difficiles avec la chaleur.',
          trade: 'Matériel',
        },
        {
          title: 'Groupe électrogène — vidange à prévoir',
          description: 'Le groupe électrogène de chantier nécessite une vidange, seuil d’heures atteint.',
          trade: 'Matériel',
        },
      ],
      [TicketTypeCode.SUBMITTAL]: [
        {
          title: 'Fiche technique pierre de Guéliz à valider',
          description: 'Merci de valider la fiche technique de la pierre de Guéliz proposée pour l’habillage de façade.',
          trade: 'Façade',
        },
        {
          title: 'Note de calcul charpente bois patio',
          description: 'Soumission de la note de calcul pour la charpente bois de la couverture du patio, en attente de validation MOE.',
          trade: 'Structure',
        },
        {
          title: 'Échantillon tadelakt à approuver',
          description: 'Échantillon de tadelakt taupe soumis pour validation avant application généralisée.',
          trade: 'Second œuvre',
        },
        {
          title: 'Fiche produit étanchéité toiture-terrasse',
          description: 'Soumission de la fiche produit de la membrane d’étanchéité prévue pour la toiture-terrasse.',
          trade: 'Étanchéité',
        },
        {
          title: 'Plan d’exécution ferraillage voile piscine',
          description: 'Soumission du plan de ferraillage du voile de piscine pour validation avant coulage.',
          trade: 'Gros œuvre',
        },
      ],
      [TicketTypeCode.FIELD_ISSUE]: [
        {
          title: 'Infiltration d’eau sous-sol après pluie',
          description: 'Des infiltrations ont été constatées au sous-sol suite aux dernières pluies, origine à déterminer.',
          trade: 'Étanchéité',
        },
        {
          title: 'Réseau existant non répertorié rencontré',
          description: 'Un réseau enterré non répertorié a été rencontré lors du terrassement, travaux suspendus localement.',
          trade: 'VRD',
        },
        {
          title: 'Accès chantier bloqué livraison voisine',
          description: 'L’accès chantier est bloqué par un chantier voisin, retard sur les livraisons de béton.',
          trade: 'Logistique',
        },
        {
          title: 'Poussière excessive gênant riverains',
          description: 'Plaintes de riverains concernant la poussière générée par le chantier, arrosage à renforcer.',
          trade: 'Environnement',
        },
        {
          title: 'Décalage de niveau dalle basse constaté',
          description: 'Un décalage de niveau a été constaté sur la dalle basse par rapport aux plans, vérification topographique en cours.',
          trade: 'Gros œuvre',
        },
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

    const PRIORITY_CYCLE: TicketPriority[] = ['medium', 'high', 'low', 'medium', 'critical', 'high', 'medium', 'low'];

    const OPENING_REMARKS = [
      'Merci de traiter ce point rapidement, il impacte le planning du lot.',
      'Point relevé lors de la visite de chantier de ce matin, merci de le prendre en charge.',
      'Pouvez-vous confirmer la prise en compte de cette remarque dans les meilleurs délais ?',
      'À examiner avant la prochaine réunion de chantier hebdomadaire.',
    ];
    const INTERNAL_NOTES = [
      "Pris en compte côté équipe chantier, intervention prévue sous 48h.",
      "À valider avec le bureau d'études avant toute intervention.",
      'Coordination nécessaire avec le sous-traitant concerné avant reprise.',
      'En attente de disponibilité matériel pour traiter ce point.',
    ];
    const CLOSING_REMARKS = [
      'Point traité et vérifié sur site, clôture du ticket.',
      'Reprise effectuée conformément aux exigences, réserve levée.',
      'Validé après contrôle contradictoire, aucune suite à donner.',
      'Correction confirmée lors du passage du bureau de contrôle.',
    ];

    const TICKETS_PER_PROJECT = 6;
    const now = new Date();
    let globalIndex = 0;

    for (const [projectIndex, project] of MARRAKECH_PROJECTS.entries()) {
      const projectId = projectIdByCode.get(project.code);
      if (!projectId) continue;

      const moaId = userIdByEmail.get(project.moa);
      const moeId = userIdByEmail.get(project.moe);
      const conducteurId = userIdByEmail.get(project.conducteur);
      const chefId = userIdByEmail.get(project.chef);
      const qseId = userIdByEmail.get(project.qse);
      const sousTraitantIds = project.sousTraitants.map((email) => userIdByEmail.get(email)).filter((id): id is string => !!id);

      if (!conducteurId) continue;

      for (let j = 0; j < TICKETS_PER_PROJECT; j += 1, globalIndex += 1) {
        const typeCode = TYPE_CYCLE[(projectIndex + j) % TYPE_CYCLE.length];
        const type = typeByCode.get(typeCode);
        if (!type) continue;

        const content = CONTENT_BY_TYPE[typeCode][j % CONTENT_BY_TYPE[typeCode].length];

        const createdAt = new Date(now.getTime() - Math.max(2, 215 - globalIndex * 3) * 24 * 60 * 60 * 1000);
        createdAt.setHours(8 + (globalIndex % 9), (globalIndex * 7) % 60, 0, 0);

        let statusCode = STATUS_CYCLE[(projectIndex + j) % STATUS_CYCLE.length];
        const resolutionHours = RESOLUTION_HOURS_BY_TYPE[typeCode] + (globalIndex % 6) * 8;
        let resolvedAt: Date | null = null;
        let closedAt: Date | null = null;

        if (statusCode === TicketStatusCode.RESOLVED || statusCode === TicketStatusCode.CLOSED) {
          const candidateResolvedAt = new Date(createdAt.getTime() + resolutionHours * 60 * 60 * 1000);
          if (candidateResolvedAt >= now) {
            statusCode = TicketStatusCode.IN_PROGRESS;
          } else {
            resolvedAt = candidateResolvedAt;
            if (statusCode === TicketStatusCode.CLOSED) {
              let candidateClosedAt = new Date(resolvedAt.getTime() + (24 + (globalIndex % 4) * 12) * 60 * 60 * 1000);
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
        const priority = PRIORITY_CYCLE[globalIndex % PRIORITY_CYCLE.length];

        // Author/assignee picked from the chantier's own team so RBAC scoping
        // (chef/sous-traitant/qse restricted to their ProjectMember chantiers)
        // stays realistic instead of cross-chantier assignment.
        let createdBy = conducteurId;
        if (typeCode === TicketTypeCode.SAFETY && qseId) createdBy = qseId;
        else if (typeCode === TicketTypeCode.CHANGE_ORDER && moaId && j % 2 === 0) createdBy = moaId;
        else if ((typeCode === TicketTypeCode.RFI || typeCode === TicketTypeCode.SUBMITTAL) && moeId) createdBy = moeId;

        let assignedTo: string | undefined;
        if (globalIndex % 7 !== 6) {
          if (typeCode === TicketTypeCode.SAFETY) assignedTo = qseId ?? chefId;
          else if (typeCode === TicketTypeCode.CHANGE_ORDER) assignedTo = conducteurId;
          else if (j % 2 === 0) assignedTo = chefId ?? conducteurId;
          else assignedTo = sousTraitantIds[j % Math.max(sousTraitantIds.length, 1)] ?? chefId;
        }

        const zone = `${project.neighborhood} — Lot ${String(100 + j * 5).padStart(3, '0')}`;
        const title = `${content.title} — ${project.name}`;

        const ticket = await this.prisma.ticket.create({
          data: {
            ticket_number: `${TICKET_NUMBER_PREFIX}${String(globalIndex + 1).padStart(3, '0')}`,
            project_id: projectId,
            ticket_type_id: type.id,
            status_id: status.id,
            title,
            description: content.description,
            priority,
            location_zone: zone,
            trade: content.trade,
            created_by: createdBy,
            assigned_to: assignedTo,
            due_date: dueDate,
            resolved_at: resolvedAt,
            closed_at: closedAt,
            created_at: createdAt,
          },
        });

        const historyEntries: Prisma.TicketStatusHistoryCreateManyInput[] = [
          {
            ticket_id: ticket.id,
            to_status_id: status.id,
            changed_by: createdBy,
            comment: 'Ticket créé',
            changed_at: createdAt,
          },
        ];
        if (statusCode !== TicketStatusCode.NEW) {
          const newStatus = statusByCode.get(TicketStatusCode.NEW);
          if (newStatus) {
            historyEntries.push({
              ticket_id: ticket.id,
              from_status_id: newStatus.id,
              to_status_id: status.id,
              changed_by: assignedTo ?? createdBy,
              comment: 'Mise à jour du statut',
              changed_at: resolvedAt ?? dueDate,
            });
          }
        }
        await this.prisma.ticketStatusHistory.createMany({ data: historyEntries });

        const comments: Prisma.TicketCommentCreateManyInput[] = [
          {
            ticket_id: ticket.id,
            user_id: createdBy,
            comment_text: `${OPENING_REMARKS[globalIndex % OPENING_REMARKS.length]} (${zone})`,
            is_internal: false,
            created_at: createdAt,
          },
        ];
        if (assignedTo && statusCode !== TicketStatusCode.NEW) {
          comments.push({
            ticket_id: ticket.id,
            user_id: assignedTo,
            comment_text: INTERNAL_NOTES[globalIndex % INTERNAL_NOTES.length],
            is_internal: true,
            created_at: new Date(createdAt.getTime() + 4 * 60 * 60 * 1000),
          });
        }
        if (statusCode === TicketStatusCode.RESOLVED || statusCode === TicketStatusCode.CLOSED) {
          comments.push({
            ticket_id: ticket.id,
            user_id: assignedTo ?? conducteurId,
            comment_text: CLOSING_REMARKS[globalIndex % CLOSING_REMARKS.length],
            is_internal: false,
            created_at: resolvedAt ?? createdAt,
          });
        }
        await this.prisma.ticketComment.createMany({ data: comments });
      }
    }
  }

  private async seedMarrakechKnowledgeArticles() {
    const adminUser = await this.prisma.user.findUnique({
      where: { email: this.adminEmail },
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
    const in20Days = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const articles: Array<{
      title: string;
      categoryCode: KnowledgeCategoryCode;
      content: string;
      visible_roles: RoleCode[];
      needs_review: boolean;
      valid_until: Date | null;
    }> = [
      // Procédures
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
        title: 'Procédure de bétonnage par forte chaleur',
        categoryCode: KnowledgeCategoryCode.PROCEDURE,
        content:
          "En période estivale à Marrakech, coulée à privilégier tôt le matin. Prévoir cure humide renforcée, protection contre le vent chaud (chergui) et retardateur de prise si température ambiante dépasse 32°C. À réévaluer avec le bureau d'études selon la saison.",
        visible_roles: [],
        needs_review: true,
        valid_until: null,
      },
      {
        title: 'Procédure d’accès chantier et badges visiteurs',
        categoryCode: KnowledgeCategoryCode.PROCEDURE,
        content:
          "Tout visiteur doit s'enregistrer au poste de garde, recevoir un badge visiteur et être accompagné en zone travaux. Les EPI de base (casque, gilet) sont fournis à l'entrée.",
        visible_roles: [],
        needs_review: false,
        valid_until: in20Days,
      },
      {
        title: 'Procédure de gestion des déchets de chantier',
        categoryCode: KnowledgeCategoryCode.PROCEDURE,
        content:
          'Tri des déchets par filière (gravats, bois, métaux, DIB) dans les bennes dédiées. Évacuation vers décharge agréée avec bon de suivi. Procédure à réviser suite à la mise à jour de la réglementation locale.',
        visible_roles: [],
        needs_review: false,
        valid_until: sixtyDaysAgo,
      },
      // Fiches sécurité
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
        title: 'Prévention du coup de chaleur en période estivale',
        categoryCode: KnowledgeCategoryCode.SAFETY_SHEET,
        content:
          'Mise à disposition de points d’eau fraîche, adaptation des horaires (pause méridienne élargie), rotation des équipes en extérieur, formation des chefs d’équipe à la reconnaissance des signes de coup de chaleur. Applicable de juin à septembre.',
        visible_roles: [],
        needs_review: false,
        valid_until: null,
      },
      {
        title: 'Consignes de travail en hauteur — échafaudages',
        categoryCode: KnowledgeCategoryCode.SAFETY_SHEET,
        content:
          'Vérification quotidienne de la stabilité et de l’ancrage des échafaudages, port du harnais au-delà de 3 m sans protection collective. Contrôle mensuel par une personne compétente à formaliser dans le registre.',
        visible_roles: [],
        needs_review: true,
        valid_until: null,
      },
      {
        title: 'Fiche sécurité — stockage produits chimiques',
        categoryCode: KnowledgeCategoryCode.SAFETY_SHEET,
        content:
          'Stockage des produits chimiques (peintures, solvants, résines) en zone ventilée, à l’écart de toute source de chaleur, avec bac de rétention et fiches de données de sécurité disponibles sur site.',
        visible_roles: [],
        needs_review: false,
        valid_until: sixtyDaysAgo,
      },
      // Normes techniques
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
        title: 'Règles parasismiques marocaines RPS 2000 — rappel',
        categoryCode: KnowledgeCategoryCode.TECHNICAL_STANDARD,
        content:
          'Synthèse des dispositions constructives minimales exigées par le RPS 2000/2011 pour la zone sismique de Marrakech : chaînages, contreventement, ferraillage minimal des poteaux. À consulter avant tout dimensionnement structure.',
        visible_roles: [RoleCode.admin, RoleCode.conducteur_travaux, RoleCode.moe],
        needs_review: false,
        valid_until: null,
      },
      {
        title: 'Norme NM sur les bétons — synthèse chantier',
        categoryCode: KnowledgeCategoryCode.TECHNICAL_STANDARD,
        content:
          'Rappel des classes de résistance et de la formulation type selon la norme marocaine NM 10.1.008. À mettre à jour suite à la dernière révision transmise par le bureau d’études.',
        visible_roles: [],
        needs_review: true,
        valid_until: null,
      },
      {
        title: 'DTU étanchéité toitures-terrasses — climat chaud',
        categoryCode: KnowledgeCategoryCode.TECHNICAL_STANDARD,
        content:
          'Points de vigilance pour l’étanchéité des toitures-terrasses accessibles sous climat chaud et sec : protection UV du complexe, pente minimale, traitement des relevés et points singuliers.',
        visible_roles: [],
        needs_review: false,
        valid_until: in20Days,
      },
      // Modèles de documents
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
        title: 'Modèle de bon de livraison matériaux',
        categoryCode: KnowledgeCategoryCode.DOCUMENT_TEMPLATE,
        content:
          'Trame à utiliser pour la réception contradictoire des livraisons de matériaux sur site : quantité, référence, état à réception, signature du réceptionnaire.',
        visible_roles: [],
        needs_review: false,
        valid_until: null,
      },
      {
        title: 'Modèle de rapport de visite de chantier hebdomadaire',
        categoryCode: KnowledgeCategoryCode.DOCUMENT_TEMPLATE,
        content:
          'Trame de rapport hebdomadaire : avancement par lot, effectifs présents, incidents relevés, points d’arrêt et actions à mener pour la semaine suivante.',
        visible_roles: [],
        needs_review: false,
        valid_until: in20Days,
      },
      {
        title: 'Modèle d’ordre de service',
        categoryCode: KnowledgeCategoryCode.DOCUMENT_TEMPLATE,
        content:
          'Trame standard d’ordre de service à notifier à l’entreprise concernée, avec accusé de réception et délai de contestation contractuel.',
        visible_roles: [],
        needs_review: false,
        valid_until: sixtyDaysAgo,
      },
      // Fiches matériel
      {
        title: 'Fiche VGP — Grue à tour',
        categoryCode: KnowledgeCategoryCode.EQUIPMENT_SHEET,
        content:
          'La Vérification Générale Périodique (VGP) des grues à tour est due tous les 6 mois. Elle doit être réalisée par un organisme agréé et consignée dans le registre de sécurité. Toute grue dont la VGP est expirée doit être immobilisée immédiatement.',
        visible_roles: [],
        needs_review: false,
        valid_until: sixtyDaysAgo,
      },
      {
        title: 'Fiche VGP — Nacelle élévatrice',
        categoryCode: KnowledgeCategoryCode.EQUIPMENT_SHEET,
        content:
          'VGP semestrielle obligatoire pour toute nacelle élévatrice mobile de personnel. Vérifier la formation CACES à jour de chaque opérateur avant utilisation.',
        visible_roles: [],
        needs_review: false,
        valid_until: null,
      },
      {
        title: 'Fiche d’entretien groupe électrogène',
        categoryCode: KnowledgeCategoryCode.EQUIPMENT_SHEET,
        content:
          'Plan d’entretien préventif du groupe électrogène de chantier : vidange toutes les 250h, contrôle filtres, niveau de charge batterie. À actualiser selon le modèle installé sur chaque chantier.',
        visible_roles: [],
        needs_review: true,
        valid_until: null,
      },
      {
        title: 'Fiche VGP — Engins de terrassement',
        categoryCode: KnowledgeCategoryCode.EQUIPMENT_SHEET,
        content:
          'Vérification périodique des engins de terrassement (pelles, chargeuses, compacteurs) : état des organes de sécurité, avertisseurs de recul, structures de protection ROPS/FOPS.',
        visible_roles: [],
        needs_review: false,
        valid_until: in20Days,
      },
      // FAQ
      {
        title: 'Qui valide un ordre de service ?',
        categoryCode: KnowledgeCategoryCode.FAQ,
        content:
          "Un ordre de service est émis par la maîtrise d'œuvre (MOE) et notifié à l'entreprise concernée. Il doit être contresigné pour prise d'effet. En cas de désaccord, l'entreprise dispose d'un délai contractuel pour formuler ses réserves.",
        visible_roles: [],
        needs_review: false,
        valid_until: null,
      },
      {
        title: 'Comment déclarer un incident sécurité sur le chantier ?',
        categoryCode: KnowledgeCategoryCode.FAQ,
        content:
          'Tout incident doit être déclaré immédiatement au QSE via un ticket de type "Incident sécurité", puis consigné dans le registre de sécurité chantier sous 24h.',
        visible_roles: [],
        needs_review: false,
        valid_until: null,
      },
      {
        title: 'Quelle est la procédure de levée de réserves ?',
        categoryCode: KnowledgeCategoryCode.FAQ,
        content:
          'Chaque réserve (ticket type "Réserve") doit être reprise par l’entreprise concernée puis vérifiée contradictoirement avant clôture. À reformuler suite aux retours du dernier comité de pilotage.',
        visible_roles: [],
        needs_review: true,
        valid_until: null,
      },
      {
        title: 'Quels documents fournir pour une réception de travaux ?',
        categoryCode: KnowledgeCategoryCode.FAQ,
        content:
          'DOE (dossier des ouvrages exécutés), PV d’essais, garanties fabricants, attestations de conformité des lots techniques, et le PV de réception signé par les parties.',
        visible_roles: [],
        needs_review: false,
        valid_until: in20Days,
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
}
