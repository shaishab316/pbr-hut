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
import { CurrentUser } from '@/common/decorators';
import { JwtGuard } from '@/common/guards';
import { OrderService } from './order.service';
import { CreateOrderDto, CreateOrderInput } from './dto/create-order.dto';
import { QueryOrderHistoryDto } from './dto/query-order-history.dto';
import {
  ApiCancelOrder,
  ApiCreateOrder,
  ApiGetOrder,
  ApiListActiveOrders,
  ApiListOrderHistory,
  ApiReorder,
} from './docs';
import { Pagination } from '@/common/types/pagination';

@ApiTags('Orders')
@UseGuards(JwtGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiCreateOrder()
  @Post()
  @HttpCode(HttpStatus.CREATED)
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
  async listActive(@CurrentUser('id') userId: string) {
    const orders = await this.orderService.listActive(userId);
    return { message: 'Active orders retrieved successfully', data: orders };
  }

  @ApiListOrderHistory()
  @Get('history')
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
  getById(
    @CurrentUser('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.orderService.getById(userId, orderId);
  }

  @ApiCancelOrder()
  @Post(':orderId/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentUser('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.orderService.cancel(userId, orderId);
  }

  @ApiReorder()
  @Post(':orderId/reorder')
  @HttpCode(HttpStatus.OK)
  reorder(
    @CurrentUser('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.orderService.reorder(userId, orderId);
  }
}
