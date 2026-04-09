import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infra/prisma/prisma.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardRepository } from './repositories/dashboard.repository';

@Module({
  imports: [PrismaModule],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService, AdminDashboardRepository],
})
export class AdminDashboardModule {}
