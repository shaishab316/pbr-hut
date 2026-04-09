import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
import { QueryOrdersDto } from './dto/query-order.dto';
import { Pagination } from '@/common/types/pagination';
import { QueryRiderDto } from './dto/query-rider.dto';

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

  @Get('/admin/orders')
  async getAllOrders(@Query() dto: QueryOrdersDto) {
    const [orders, total] = await this.adminDashboardService.getAllOrders(dto);

    return {
      message: 'Orders retrieved successfully',
      pagination: {
        limit: dto.limit,
        page: dto.page,
        total,
        totalPages: Math.ceil(total / dto.limit),
      } satisfies Pagination,
      data: orders,
    };
  }

  @Get('/admin/riders')
  async getAllRiders(@Query() dto: QueryRiderDto) {
    const [riders, total] = await this.adminDashboardService.getAllRiders(dto);

    return {
      message: 'Riders retrieved successfully',
      pagination: {
        limit: dto.limit,
        page: dto.page,
        total,
        totalPages: Math.ceil(total / dto.limit),
      } satisfies Pagination,
      data: riders,
    };
  }
}
