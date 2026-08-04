import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

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
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Email ou mot de passe invalide.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe invalide.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
      select: userSelect,
    });

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role.code,
    });

    return {
      accessToken,
      user: updatedUser,
    };
  }
}