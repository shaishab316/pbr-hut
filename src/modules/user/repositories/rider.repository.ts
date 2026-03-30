import { PrismaService } from '@/infra/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class RiderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createProfile(data: Prisma.RiderProfileCreateInput) {
    return this.prisma.riderProfile.create({
      data,
    });
  }

  async updateProfile(userId: string, data: Prisma.RiderProfileUpdateInput) {
    return this.prisma.riderProfile.update({
      where: { userId },
      data,
    });
  }

  async getProfile(userId: string) {
    return this.prisma.riderProfile.findUnique({
      where: { userId },
    });
  }
}
