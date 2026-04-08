import { PrismaService } from '@/infra/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { UpdatePrimaryRestaurantDto } from '../dto/update-primary.dto';

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
      data,
    });
  }

  async getPrimary() {
    return this.prisma.restaurant.findFirst();
  }
}
