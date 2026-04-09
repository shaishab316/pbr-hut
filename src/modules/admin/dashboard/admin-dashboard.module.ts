import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infra/prisma/prisma.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardRepository } from './repositories/dashboard.repository';
import { OrderRepository } from '@/modules/order/repositories/order.repository';
import { RiderRepository } from '@/modules/rider/repositories/rider.repository';

@Module({
  imports: [PrismaModule],
  controllers: [AdminDashboardController],
  providers: [
    AdminDashboardService,
    AdminDashboardRepository,
    OrderRepository,
    RiderRepository,
  ],
})
export class AdminDashboardModule {}
