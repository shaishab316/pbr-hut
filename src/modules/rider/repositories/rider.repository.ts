import { PrismaService } from '@/infra/prisma/prisma.service';
import {
  QueryRiderDto,
  RIDER_PROFILE_SORT_KEYS,
} from '@/modules/admin/dashboard/dto/query-rider.dto';
import { userSearchableFields } from '@/modules/user/user.constant';
import { Injectable } from '@nestjs/common';
import { NidStatus, Prisma } from '@prisma/client';

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

  async getAllRiders(dto: QueryRiderDto) {
    const { page, limit, search, status, orderBy } = dto;

    const whereClause: Prisma.RiderProfileWhereInput = {};

    if (search) {
      whereClause.user = {
        OR: userSearchableFields.map((field) => ({
          [field]: { contains: search, mode: 'insensitive' },
        })),
      };
    }

    if (status === 'active') {
      whereClause.nidStatus = NidStatus.VERIFIED;
    } else {
      whereClause.nidStatus = { not: NidStatus.VERIFIED };
    }

    const [orderByOrder, ...rest] = orderBy;
    const orderByField = rest.join('');
    const direction = orderByOrder === '+' ? 'asc' : 'desc';

    const orderByClause: Prisma.RiderProfileOrderByWithRelationInput =
      RIDER_PROFILE_SORT_KEYS.has(orderByField)
        ? { [orderByField]: direction }
        : { user: { [orderByField]: direction } };

    return this.prisma.$transaction([
      this.prisma.riderProfile.findMany({
        where: whereClause,
        include: {
          user: { omit: { passwordHash: true } },
        },
        orderBy: orderByClause,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.riderProfile.count({ where: whereClause }),
    ]);
  }

  async getHomeOverview(riderId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayOrderCount, riderProfile] = await Promise.all([
      this.prisma.order.count({
        where: {
          assignedRiderId: riderId,
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      this.prisma.riderProfile.findUnique({
        where: { userId: riderId },
        select: {
          availableBalance: true,
        },
      }),
    ]);

    return {
      todayTotalOrderCount: todayOrderCount,
      totalWalletAmount: riderProfile?.availableBalance || 0,
    };
  }
}
