import { Injectable, Logger } from '@nestjs/common';
import { RestaurantRepository } from './repositories/restaurant.repository';
import { UpdatePrimaryRestaurantDto } from './dto/update-primary.dto';
import { RestaurantCacheRepository } from './repositories/restaurant.cache.repository';

@Injectable()
export class RestaurantService {
  private readonly logger = new Logger(RestaurantService.name);

  constructor(
    private readonly restaurantRepo: RestaurantRepository,
    private readonly restaurantCacheRepo: RestaurantCacheRepository,
  ) {}

  async updatePrimary(dto: UpdatePrimaryRestaurantDto) {
    this.logger.log(`🏮 Updating primary restaurant`);

    try {
      const restaurant = await this.restaurantRepo.updatePrimary(dto);
      this.logger.debug(`🏮 Restaurant updated: ${restaurant.id}`);

      await this.restaurantCacheRepo.setPrimary(restaurant);
      this.logger.debug(`💾 Cache updated for primary restaurant`);

      this.logger.log(`✅ Primary restaurant updated: ${restaurant.id}`);
      return restaurant;
    } catch (error) {
      this.logger.error(`❌ Primary restaurant update failed:`, error);
      throw error;
    }
  }

  async getPrimary() {
    this.logger.debug(`🔍 Fetching primary restaurant`);

    const cachedRestaurant = await this.restaurantCacheRepo.getPrimary();

    if (cachedRestaurant) {
      this.logger.log(
        `⚡ Primary restaurant from cache: ${cachedRestaurant.id}`,
      );
      return cachedRestaurant;
    }

    this.logger.debug(`🛋 Primary restaurant cache miss, fetching from DB`);
    const restaurant = await this.restaurantRepo.getPrimary();

    if (restaurant) {
      await this.restaurantCacheRepo.setPrimary(restaurant);
      this.logger.debug(`💾 Primary restaurant cached: ${restaurant.id}`);
    }

    return restaurant;
  }
}
