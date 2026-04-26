import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UpdatePrimaryRestaurantDto } from './dto/update-primary.dto';
import { RestaurantService } from './restaurant.service';
import { JwtGuard, RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators';
import {
  CacheKey,
  CacheTTL,
  InvalidateCache,
} from '@/common/decorators/cache.decorator';
import {
  RelaxedThrottle,
  StrictThrottle,
} from '@/common/decorators/throttle.decorator';

@Controller('restaurant')
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Get('/primary')
  @RelaxedThrottle()
  @CacheKey('primary-restaurant')
  @CacheTTL(3600) //? 1 hour
  async getPrimary() {
    const data = await this.restaurantService.getPrimary();

    return {
      message: 'Primary restaurant retrieved successfully',
      data,
    };
  }

  @Post('/update-primary')
  @StrictThrottle()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  @InvalidateCache('primary-restaurant')
  async updatePrimary(@Body() dto: UpdatePrimaryRestaurantDto) {
    const data = await this.restaurantService.updatePrimary(dto);

    return {
      message: 'Primary restaurant updated successfully',
      data,
    };
  }
}
