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
import { RiderOrderService } from './rider-order.service';
import {
  ApiRiderAcceptOrder,
  ApiRiderDeliverOrder,
  ApiRiderGetOrder,
  ApiRiderListAssigned,
  ApiRiderNearbyRequests,
} from './docs/rider-orders.docs';

@ApiTags('Rider · Orders')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.RIDER)
@Controller('rider/orders')
export class RiderOrderController {
  constructor(private readonly riderOrderService: RiderOrderService) {}

  @ApiRiderNearbyRequests()
  @Get('nearby-requests')
  listNearby(
    @CurrentUser('id') riderId: string,
    @Query() query: NearbyRiderOrdersDto,
  ) {
    return this.riderOrderService.listNearbyRequests(riderId, query);
  }

  @ApiRiderListAssigned()
  @Get('assigned')
  listAssigned(@CurrentUser('id') riderId: string) {
    return this.riderOrderService.listAssignedActive(riderId);
  }

  @ApiRiderGetOrder()
  @Get(':orderId')
  getOne(
    @CurrentUser('id') riderId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.riderOrderService.getOrderForRider(riderId, orderId);
  }

  @ApiRiderAcceptOrder()
  @Post(':orderId/accept')
  @HttpCode(HttpStatus.OK)
  accept(
    @CurrentUser('id') riderId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.riderOrderService.acceptOrder(riderId, orderId);
  }

  @ApiRiderDeliverOrder()
  @Post(':orderId/deliver')
  @HttpCode(HttpStatus.OK)
  deliver(
    @CurrentUser('id') riderId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: DeliverOrderDto,
  ) {
    return this.riderOrderService.deliverOrder(riderId, orderId, dto);
  }
}
