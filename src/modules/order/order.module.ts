import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infra/prisma/prisma.module';
import { CartModule } from '@/modules/cart/cart.module';
import { RiderModule } from '@/modules/rider/rider.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { RiderOrderController } from './rider-order.controller';
import { RiderOrderService } from './rider-order.service';
import { OrderRepository } from './repositories/order.repository';

@Module({
  imports: [PrismaModule, CartModule, RiderModule],
  controllers: [OrderController, RiderOrderController],
  providers: [OrderService, RiderOrderService, OrderRepository],
})
export class OrderModule {}
