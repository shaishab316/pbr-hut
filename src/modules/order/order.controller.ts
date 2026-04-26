import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '@/common/decorators';
import { JwtGuard, RolesGuard } from '@/common/guards';
import { UserRole } from '@prisma/client';
import { OrderService } from './order.service';
import { CreateOrderDto, CreateOrderInput } from './dto/create-order.dto';
import { QueryOrderHistoryDto } from './dto/query-order-history.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import {
  ApiCancelOrder,
  ApiCreateOrder,
  ApiGetOrder,
  ApiListActiveOrders,
  ApiListOrderHistory,
  ApiReorder,
} from './docs';
import { Pagination } from '@/common/types/pagination';
import {
  CacheKey,
  CacheTTL,
  InvalidateCache,
} from '@/common/decorators/cache.decorator';
import {
  MediumThrottle,
  StrictThrottle,
} from '@/common/decorators/throttle.decorator';

@ApiTags('Orders')
@UseGuards(JwtGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiCreateOrder()
  @MediumThrottle()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @InvalidateCache('orders:active::user.id')
  async placeOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    const order = await this.orderService.placeOrder(
      userId,
      dto as unknown as CreateOrderInput,
    );

    return {
      message: 'Order placed successfully',
      data: order,
    };
  }

  @ApiListActiveOrders()
  @Get('active')
  @CacheKey('orders:active::user.id')
  @CacheTTL(60)
  async listActive(@CurrentUser('id') userId: string) {
    const orders = await this.orderService.listActive(userId);
    return { message: 'Active orders retrieved successfully', data: orders };
  }

  @ApiListOrderHistory()
  @Get('history')
  @CacheKey('orders:history::user.id')
  @CacheTTL(120)
  async listHistory(
    @CurrentUser('id') userId: string,
    @Query() query: QueryOrderHistoryDto,
  ) {
    const { orders, total } = await this.orderService.listHistory(
      userId,
      query,
    );

    return {
      message: 'Order history retrieved successfully',
      data: orders,
      meta: {
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        } satisfies Pagination,
      },
    };
  }

  @ApiGetOrder()
  @Get(':orderId')
  @CacheKey('orders:single::params.orderId')
  @CacheTTL(120)
  getById(
    @CurrentUser('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.orderService.getById(userId, orderId);
  }

  @ApiCancelOrder()
  @MediumThrottle()
  @Post(':orderId/cancel')
  @HttpCode(HttpStatus.OK)
  @InvalidateCache(
    'orders:active::user.id',
    'orders:history::user.id',
    'orders:single::params.orderId',
  )
  cancel(
    @CurrentUser('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.orderService.cancel(userId, orderId);
  }

  @ApiReorder()
  @MediumThrottle()
  @Post(':orderId/reorder')
  @HttpCode(HttpStatus.OK)
  @InvalidateCache('orders:active::user.id', 'orders:single::params.orderId')
  reorder(
    @CurrentUser('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.orderService.reorder(userId, orderId);
  }

  @Post(':orderId/mark-as-paid')
  @StrictThrottle()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RIDER)
  @InvalidateCache('orders:single::params.orderId')
  async markAsPaid(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    const order = await this.orderService.markAsPaid(orderId, userId, userRole);
    return {
      message: 'Order marked as paid successfully',
      data: order,
    };
  }

  @Post(':orderId/mark-as-unpaid')
  @StrictThrottle()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RIDER)
  @InvalidateCache('orders:single::params.orderId')
  async markAsUnpaid(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    const order = await this.orderService.markAsUnpaid(
      orderId,
      userId,
      userRole,
    );
    return {
      message: 'Order marked as unpaid successfully',
      data: order,
    };
  }

  @Post(':orderId/update-payment-status')
  @StrictThrottle()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RIDER)
  @InvalidateCache('orders:single::params.orderId')
  async updatePaymentStatus(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    const order = await this.orderService.updatePaymentStatus(
      orderId,
      dto.paymentStatus,
      userId,
      userRole,
    );
    return {
      message: 'Payment status updated successfully',
      data: order,
    };
  }
}
