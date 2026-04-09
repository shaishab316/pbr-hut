import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtGuard } from '@/common/guards';
import { AdminDashboardService } from './admin-dashboard.service';

@ApiTags('Admin — Dashboard')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Admin dashboard summary' })
  @ApiOkResponse({
    description: 'Stats, weekly revenue, categories, recent orders, top items',
  })
  getSummary() {
    return this.adminDashboardService.getSummary();
  }
}
