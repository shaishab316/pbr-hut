import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infra/prisma/prisma.module';
import { CartController } from './cart.controller';
import { CartRepository } from './repositories/cart.repository';
import { CartService } from './cart.service';
import { RestaurantModule } from '../restaurant/restaurant.module';

@Module({
  imports: [PrismaModule, RestaurantModule],
  controllers: [CartController],
  providers: [CartRepository, CartService],
  exports: [CartService, CartRepository],
})
export class CartModule {}
