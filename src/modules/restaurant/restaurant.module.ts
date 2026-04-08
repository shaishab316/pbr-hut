import { Module } from '@nestjs/common';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';
import { RestaurantCacheRepository } from './repositories/restaurant.cache.repository';
import { RedisModule } from '../redis/redis.module';
import { RestaurantRepository } from './repositories/restaurant.repository';

@Module({
  imports: [RedisModule],
  controllers: [RestaurantController],
  providers: [
    RestaurantService,
    RestaurantRepository,
    RestaurantCacheRepository,
  ],
})
export class RestaurantModule {}
