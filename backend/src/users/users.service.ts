import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleCode } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const userSelect = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  phone: true,
  is_active: true,
  last_login_at: true,
  created_at: true,
  updated_at: true,
  role: {
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
    },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      orderBy: [{ created_at: 'desc' }],
      select: userSelect,
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    return user;
  }

  async create(createUserDto: CreateUserDto) {
    await this.ensureRoleExists(createUserDto.roleId);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new BadRequestException('Cette adresse e-mail est déjà utilisée.');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    return this.prisma.user.create({
      data: {
        role_id: createUserDto.roleId,
        first_name: createUserDto.firstName,
        last_name: createUserDto.lastName,
        email: createUserDto.email,
        phone: createUserDto.phone,
        password_hash: passwordHash,
        is_active: createUserDto.isActive ?? true,
      },
      select: userSelect,
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto, actorId: string) {
    const targetUser = await this.getUserGuardInfo(id);

    let nextRoleCode: RoleCode | undefined;
    if (updateUserDto.roleId) {
      const role = await this.ensureRoleExists(updateUserDto.roleId);
      nextRoleCode = role.code;
    }

    const isCurrentlyAdmin = targetUser.role.code === RoleCode.admin;
    const isDemotingFromAdmin =
      isCurrentlyAdmin && nextRoleCode !== undefined && nextRoleCode !== RoleCode.admin;
    const isDeactivating = updateUserDto.isActive === false && targetUser.is_active;

    if (id === actorId && (isDemotingFromAdmin || isDeactivating)) {
      throw new ForbiddenException(
        'Vous ne pouvez pas modifier votre propre rôle administrateur ni désactiver votre propre compte.',
      );
    }

    if (isCurrentlyAdmin && targetUser.is_active && (isDemotingFromAdmin || isDeactivating)) {
      const otherActiveAdmins = await this.prisma.user.count({
        where: {
          role: { code: RoleCode.admin },
          is_active: true,
          id: { not: id },
        },
      });

      if (otherActiveAdmins === 0) {
        throw new ForbiddenException(
          'Impossible de rétrograder ou désactiver le dernier administrateur actif du système.',
        );
      }
    }

    if (updateUserDto.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: updateUserDto.email,
          id: { not: id },
        },
        select: { id: true },
      });

      if (existingUser) {
        throw new BadRequestException('Cette adresse e-mail est déjà utilisée.');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        role_id: updateUserDto.roleId,
        first_name: updateUserDto.firstName,
        last_name: updateUserDto.lastName,
        email: updateUserDto.email,
        phone: updateUserDto.phone,
        is_active: updateUserDto.isActive,
        password_hash: updateUserDto.password
          ? await bcrypt.hash(updateUserDto.password, 10)
          : undefined,
      },
      select: userSelect,
    });
  }

  async remove(id: string, actorId: string) {
    const targetUser = await this.getUserGuardInfo(id);

    if (id === actorId) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer votre propre compte.');
    }

    const isCurrentlyAdmin = targetUser.role.code === RoleCode.admin;
    if (isCurrentlyAdmin && targetUser.is_active) {
      const otherActiveAdmins = await this.prisma.user.count({
        where: {
          role: { code: RoleCode.admin },
          is_active: true,
          id: { not: id },
        },
      });

      if (otherActiveAdmins === 0) {
        throw new ForbiddenException(
          'Impossible de supprimer le dernier administrateur actif du système.',
        );
      }
    }

    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new BadRequestException(
          'Impossible de supprimer cet utilisateur : il est référencé par des tickets, commentaires ou pièces jointes existants. Désactivez-le plutôt.',
        );
      }
      throw err;
    }

    return { success: true };
  }

  private async ensureRoleExists(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, code: true },
    });

    if (!role) {
      throw new BadRequestException('Le rôle sélectionné est introuvable.');
    }

    return role;
  }

  private async getUserGuardInfo(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        is_active: true,
        role: { select: { code: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    return user;
  }
}