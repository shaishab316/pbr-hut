import {
  Controller,
  Get,
  Query,
  UseGuards,
  Response,
  Post,
  Body,
  HttpCode,
} from '@nestjs/common';
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
import { ApproveNidDto, DeclineNidDto } from './dto/nid-action.dto';
import type { Response as ExpressResponse } from 'express';
import {
  CacheKey,
  CacheTTL,
  InvalidateCache,
} from '@/common/decorators/cache.decorator';

@ApiTags('Admin — Dashboard')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Admin dashboard summary' })
  @ApiOkResponse({
    description: 'Stats, weekly revenue, categories, recent orders, top items',
  })
  @CacheKey('admin:dashboard:summary')
  @CacheTTL(300)
  getSummary() {
    return this.adminDashboardService.getSummary();
  }

  @Get('orders')
  @CacheKey('admin:orders:all:')
  @CacheTTL(120)
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

  @Get('riders')
  @CacheKey('admin:riders:all:')
  @CacheTTL(120)
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

  @Get('orders/download/csv')
  @ApiOperation({ summary: 'Download orders as CSV' })
  @ApiOkResponse({
    description: 'CSV file with orders data',
  })
  async downloadOrdersCsv(
    @Query() dto: QueryOrdersDto,
    @Response() res: ExpressResponse,
  ) {
    const csv = await this.adminDashboardService.generateOrdersCsv(dto);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
    res.send(csv);
  }

  @Post('riders/nid/approve')
  @InvalidateCache('admin:riders:all:*')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve rider NID' })
  @ApiOkResponse({
    description: 'Rider NID approved successfully',
  })
  async approveRiderNid(@Body() dto: ApproveNidDto) {
    const data = await this.adminDashboardService.approveRiderNid(dto.userId);

    return {
      message: 'Rider NID approved successfully',
      data,
    };
  }

  @Post('riders/nid/decline')
  @InvalidateCache('admin:riders:all:*')
  @HttpCode(200)
  @ApiOperation({ summary: 'Decline rider NID' })
  @ApiOkResponse({
    description: 'Rider NID declined successfully',
  })
  async declineRiderNid(@Body() dto: DeclineNidDto) {
    const data = await this.adminDashboardService.declineRiderNid(
      dto.userId,
      dto.rejectionReason,
    );

    return {
      message: 'Rider NID declined successfully',
      data,
    };
  }
}
