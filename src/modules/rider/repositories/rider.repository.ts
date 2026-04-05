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

  upsertLocation(
    userId: string,
    coords: { latitude: number; longitude: number; h3Index: string },
  ) {
    return this.prisma.riderProfile.upsert({
      where: { userId },
      create: {
        user: { connect: { id: userId } },
        latitude: coords.latitude,
        longitude: coords.longitude,
        h3Index: coords.h3Index,
      },
      update: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        h3Index: coords.h3Index,
      },
    });
  }

  async getProfile(userId: string) {
    return this.prisma.riderProfile.findUnique({
      where: { userId },
    });
  }

  async updateNid(
    userId: string,
    data: Pick<
      Prisma.RiderProfileUpdateInput,
      'nidFrontUrl' | 'nidBackUrl' | 'nidStatus'
    >,
  ) {
    return this.prisma.riderProfile.update({
      where: { userId },
      data,
    });
  }

  async findById(userId: string) {
    return this.prisma.riderProfile.findUnique({
      where: { userId },
    });
  }
}
