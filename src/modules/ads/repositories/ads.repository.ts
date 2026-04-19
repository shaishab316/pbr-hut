import { PrismaService } from '@/infra/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.BannerAdsCreateArgs['data']) {
    return this.prisma.bannerAds.create({
      data,
    });
  }

  update(adsId: string, data: Prisma.BannerAdsUpdateArgs['data']) {
    return this.prisma.bannerAds.update({
      where: { id: adsId },
      data,
    });
  }

  delete(adsId: string) {
    return this.prisma.bannerAds.delete({
      where: { id: adsId },
    });
  }

  findMany() {
    return this.prisma.bannerAds.findMany({
      orderBy: {
        order: 'asc',
      },
    });
  }

  findById(adsId: string) {
    return this.prisma.bannerAds.findUnique({
      where: { id: adsId },
    });
  }

  incrementClickCount(adsId: string, count: number) {
    return this.prisma.bannerAds.update({
      where: { id: adsId },
      data: { clickCount: { increment: count } },
    });
  }
}
