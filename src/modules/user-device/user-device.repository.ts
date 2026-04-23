import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infra/prisma/prisma.service';

@Injectable()
export class UserDeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getPlayerIdsByUserIds(userIds: string[]): Promise<string[]> {
    const devices = await this.prisma.userDevice.findMany({
      where: { userId: { in: userIds } },
      select: { oneSignalPlayerId: true },
    });

    return devices.map((d) => d.oneSignalPlayerId).filter(Boolean) as string[];
  }
}
