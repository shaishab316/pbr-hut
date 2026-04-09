import { Module } from '@nestjs/common';
import { AdminDashboardModule } from './dashboard/admin-dashboard.module';

@Module({
  imports: [AdminDashboardModule],
})
export class AdminModule {}
