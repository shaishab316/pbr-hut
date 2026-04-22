import { PrismaService } from '@/infra/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import type { Prisma, RefreshToken } from '@prisma/client';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.RefreshTokenCreateArgs['data'],
  ): Promise<RefreshToken> {
    return await this.prisma.refreshToken.create({ data });
  }

  async findByTokenHash(tokenHash: string) {
    return await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { omit: { passwordHash: true } } },
    });
  }

  async findByUserId(userId: string) {
    return await this.prisma.refreshToken.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(tokenHash: string): Promise<void> {
    await this.prisma.refreshToken.delete({
      where: { tokenHash },
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }
}
