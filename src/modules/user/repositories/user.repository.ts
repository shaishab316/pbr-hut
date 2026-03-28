import { SafeUser } from '@/common/types/safe-user.type';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/infra/prisma/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<SafeUser> {
    return this.prisma.user.create({ data });
  }

  async findByEmail(email: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByPhone(phone: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({ where: { phone } });
  }
}
