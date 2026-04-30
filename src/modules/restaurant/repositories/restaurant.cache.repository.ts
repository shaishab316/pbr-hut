import { RedisService } from '@/infra/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { Restaurant } from '@prisma/client';

@Injectable()
export class RestaurantCacheRepository {
  constructor(private readonly redis: RedisService) {}

  async getPrimary() {
    return this.redis.get<Restaurant | null>((ctx) => ctx.PRIMARY_RESTAURANT);
  }

  async setPrimary(restaurant: Restaurant) {
    await this.redis.set((ctx) => ctx.PRIMARY_RESTAURANT, restaurant);
  }
}
