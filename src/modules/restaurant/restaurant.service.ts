import { Injectable } from '@nestjs/common';
import { RestaurantRepository } from './repositories/restaurant.repository';
import { UpdatePrimaryRestaurantDto } from './dto/update-primary.dto';
import { RestaurantCacheRepository } from './repositories/restaurant.cache.repository';

@Injectable()
export class RestaurantService {
  constructor(
    private readonly restaurantRepo: RestaurantRepository,
    private readonly restaurantCacheRepo: RestaurantCacheRepository,
  ) {}

  async updatePrimary(dto: UpdatePrimaryRestaurantDto) {
    const restaurant = await this.restaurantRepo.updatePrimary(dto);

    await this.restaurantCacheRepo.setPrimary(restaurant);

    return restaurant;
  }

  async getPrimary() {
    const cachedRestaurant = await this.restaurantCacheRepo.getPrimary();

    if (cachedRestaurant) {
      return cachedRestaurant;
    }

    const restaurant = await this.restaurantRepo.getPrimary();

    if (restaurant) {
      await this.restaurantCacheRepo.setPrimary(restaurant);
    }

    return restaurant;
  }
}
