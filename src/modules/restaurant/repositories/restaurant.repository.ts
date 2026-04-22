import { PrismaService } from '@/infra/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { UpdatePrimaryRestaurantDto } from '../dto/update-primary.dto';
import { H3IndexUtil } from '@/common/utils/h3index.util';

@Injectable()
export class RestaurantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async updatePrimary(data: UpdatePrimaryRestaurantDto) {
    const existing = await this.prisma.restaurant.findFirst();

    if (!existing) {
      return this.prisma.restaurant.create({ data });
    }

    return this.prisma.restaurant.update({
      where: { id: existing.id },
      data: {
        ...data,
        h3Index: H3IndexUtil.encodeH3(data.latitude, data.longitude),
      },
    });
  }

  async getPrimary() {
    return this.prisma.restaurant.findFirst();
  }
}
