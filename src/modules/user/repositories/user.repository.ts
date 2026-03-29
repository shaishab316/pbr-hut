import type { SafeUser } from '@/common/types/safe-user.type';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<SafeUser> {
    return this.prisma.user.create({
      data,
      omit: {
        passwordHash: true,
      },
    });
  }

  async findByEmail(email: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({
      where: { email },
      omit: {
        passwordHash: true,
      },
    });
  }

  async findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      omit: {
        passwordHash: true,
      },
    });
  }

  async findByPhone(phone: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({
      where: { phone },
      omit: {
        passwordHash: true,
      },
    });
  }

  async findByPhoneWithPassword(phone: string) {
    return this.prisma.user.findUnique({
      where: { phone },
    });
  }
}
