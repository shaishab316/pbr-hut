import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UpdatePrimaryRestaurantDto } from './dto/update-primary.dto';
import { RestaurantService } from './restaurant.service';
import { JwtGuard, RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators';

@Controller('restaurant')
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Post('/update-primary')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  async updatePrimary(@Body() dto: UpdatePrimaryRestaurantDto) {
    const data = await this.restaurantService.updatePrimary(dto);

    return {
      message: 'Primary restaurant updated successfully',
      data,
    };
  }
}
