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
import { UserRole } from '@prisma/client';
import { CurrentUser, Roles } from '@/common/decorators';
import { JwtGuard, RolesGuard } from '@/common/guards';
import { DeliverOrderDto } from './dto/deliver-order.dto';
import { NearbyRiderOrdersDto } from './dto/nearby-rider-orders.dto';
import { QueryOrderHistoryDto } from './dto/query-order-history.dto';
import { AddTimeDto } from './dto/add-time.dto';
import { RiderOrderService } from './rider-order.service';
import {
  ApiRiderAcceptOrder,
  ApiRiderDeclineOrder,
  ApiRiderDeliverOrder,
  ApiRiderGetOrder,
  ApiRiderListAssigned,
  ApiRiderNearbyRequests,
  ApiRiderOrderHistory,
  ApiRiderAddTime,
} from './docs/rider-orders.docs';
import {
  CacheKey,
  CacheTTL,
  InvalidateCache,
} from '@/common/decorators/cache.decorator';
import { MediumThrottle } from '@/common/decorators/throttle.decorator';

@ApiTags('Rider · Orders')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.RIDER)
@Controller('rider/orders')
export class RiderOrderController {
  constructor(private readonly riderOrderService: RiderOrderService) {}

  @ApiRiderNearbyRequests()
  @Get('nearby-requests')
  @CacheKey('rider-orders:nearby::user.id')
  @CacheTTL(30)
  async listNearby(
    @CurrentUser('id') riderId: string,
    @Query() query: NearbyRiderOrdersDto,
  ) {
    const { data, meta } = await this.riderOrderService.listNearbyRequests(
      riderId,
      query,
    );

    return {
      message: 'Nearby orders retrieved successfully',
      data,
      meta,
    };
  }

  @ApiRiderListAssigned()
  @Get('assigned')
  @CacheKey('rider-orders:assigned::user.id')
  @CacheTTL(30)
  listAssigned(@CurrentUser('id') riderId: string) {
    return this.riderOrderService.listAssignedActive(riderId);
  }

  @ApiRiderOrderHistory()
  @Get('history')
  @CacheKey('rider-orders:history::user.id')
  @CacheTTL(120)
  async listHistory(
    @CurrentUser('id') riderId: string,
    @Query() query: QueryOrderHistoryDto,
  ) {
    const { orders, total, thisMonthOrderTotalCount } =
      await this.riderOrderService.listOrderHistory(riderId, query);

    return {
      message: 'Order history retrieved successfully',
      data: orders,
      meta: {
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
        thisMonthOrderTotalCount,
      },
    };
  }

  @ApiRiderGetOrder()
  @Get(':orderId')
  @CacheKey('rider-orders:single::params.orderId')
  @CacheTTL(60)
  getOne(
    @CurrentUser('id') riderId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.riderOrderService.getOrderForRider(riderId, orderId);
  }

  @ApiRiderAcceptOrder()
  @MediumThrottle()
  @Post(':orderId/accept')
  @HttpCode(HttpStatus.OK)
  @InvalidateCache(
    'rider-orders:assigned::user.id',
    'rider-orders:nearby::user.id',
    'rider-orders:single::params.orderId',
  )
  async accept(
    @CurrentUser('id') riderId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    const data = await this.riderOrderService.acceptOrder(riderId, orderId);

    return {
      message: 'Order accepted successfully',
      data,
    };
  }

  @ApiRiderDeliverOrder()
  @MediumThrottle()
  @Post(':orderId/deliver')
  @HttpCode(HttpStatus.OK)
  @InvalidateCache(
    'rider-orders:assigned::user.id',
    'rider-orders:history::user.id',
    'rider-orders:single::params.orderId',
  )
  async deliver(
    @CurrentUser('id') riderId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: DeliverOrderDto,
  ) {
    const data = await this.riderOrderService.deliverOrder(
      riderId,
      orderId,
      dto,
    );

    return {
      message: 'Order delivered successfully',
      data,
    };
  }

  @ApiRiderAddTime()
  @MediumThrottle()
  @Post(':orderId/add-time')
  @HttpCode(HttpStatus.OK)
  @InvalidateCache('rider-orders:single::params.orderId')
  addTime(
    @CurrentUser('id') riderId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: AddTimeDto,
  ) {
    return this.riderOrderService.addTimeToOrder(riderId, orderId, dto);
  }

  @ApiRiderDeclineOrder()
  @MediumThrottle()
  @Post(':orderId/decline')
  @HttpCode(HttpStatus.OK)
  @InvalidateCache('rider-orders:nearby::user.id')
  async decline(
    @CurrentUser('id') riderId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    await this.riderOrderService.declineOrder(riderId, orderId);

    return {
      message: 'Order declined successfully',
    };
  }
}
