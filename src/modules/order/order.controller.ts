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

@ApiTags('Orders')
@UseGuards(JwtGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiCreateOrder()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.orderService.create(userId, dto as unknown as CreateOrderInput);
  }

  @ApiListActiveOrders()
  @Get('active')
  listActive(@CurrentUser('id') userId: string) {
    return this.orderService.listActive(userId);
  }

  @ApiListOrderHistory()
  @Get('history')
  listHistory(
    @CurrentUser('id') userId: string,
    @Query() query: QueryOrderHistoryDto,
  ) {
    return this.orderService.listHistory(userId, query);
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
