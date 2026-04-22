import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, OrderType, Prisma } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { H3IndexUtil } from '@/common/utils/h3index.util';
import { RiderRepository } from '@/modules/rider/repositories/rider.repository';
import {
  orderDetailInclude,
  type OrderWithDetailPayload,
} from './repositories/order.repository';
import type { NearbyRiderOrdersInput } from './dto/nearby-rider-orders.dto';
import type { DeliverOrderInput } from './dto/deliver-order.dto';
import type { QueryOrderHistoryInput } from './dto/query-order-history.dto';
import type { AddTimeInput } from './dto/add-time.dto';
import { SocketGateway } from '../socket/socket.gateway';

/** Unassigned delivery orders a rider can claim (includes PENDING until a kitchen workflow narrows this) */
const RIDER_POOL_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
];

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

const riderNearbyInclude = {
  deliveryAddress: true,
  items: {
    orderBy: { id: 'asc' as const },
    include: {
      extras: {
        orderBy: { id: 'asc' as const },
        omit: {
          orderItemId: true,
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

type NearbyRow = Prisma.OrderGetPayload<{
  include: typeof riderNearbyInclude;
  omit: { confirmationCode: true };
}>;

@Injectable()
export class RiderOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly riderRepo: RiderRepository,
    private readonly socketGateway: SocketGateway,
  ) {}

  private async getRiderReferencePoint(userId: string): Promise<{
    lat: number;
    lng: number;
  }> {
    const profile = await this.riderRepo.getProfile(userId);
    if (!profile) {
      throw new BadRequestException('Rider profile not found');
    }
    if (profile.latitude != null && profile.longitude != null) {
      return { lat: profile.latitude, lng: profile.longitude };
    }
    if (profile.h3Index) {
      const { lat, lng } = H3IndexUtil.decodeH3(profile.h3Index);
      return { lat, lng };
    }
    throw new BadRequestException(
      'Set your location (latitude/longitude or H3 index) before using rider order features',
    );
  }

  /**
   * Delivery orders in the rider’s H3 k-ring that are unassigned and still in the pool.
   * Sorted by straight-line distance to the drop-off when coords exist, else by createdAt.
   */
  async listNearbyRequests(userId: string, query: NearbyRiderOrdersInput) {
    const profile = await this.riderRepo.getProfile(userId);
    if (!profile?.h3Index) {
      throw new BadRequestException(
        'Update your rider location so your H3 index is set (e.g. via signup or profile) before listing nearby requests',
      );
    }

    const cells = H3IndexUtil.getSearchCells(profile.h3Index, query.k);
    const ref =
      profile.latitude != null && profile.longitude != null
        ? { lat: profile.latitude, lng: profile.longitude }
        : H3IndexUtil.decodeH3(profile.h3Index);

    const rows = await this.prisma.order.findMany({
      where: {
        type: OrderType.DELIVERY,
        assignedRiderId: null,
        status: { in: RIDER_POOL_STATUSES },
        h3Index: { in: cells },
        declines: { none: { riderId: userId } },
      },
      include: riderNearbyInclude,
      omit: { confirmationCode: true }, //! should be hidden from the rider
      orderBy: { createdAt: 'asc' },
    });

    const sorted = this.sortNearby(rows, ref).slice(0, query.limit);

    return {
      data: sorted,
      meta: {
        h3CellsSearched: cells.length,
        k: query.k,
      },
    };
  }

  private sortNearby(rows: NearbyRow[], ref: { lat: number; lng: number }) {
    const scored = rows.map((row) => {
      const lat = row.deliveryAddress?.latitude;
      const lng = row.deliveryAddress?.longitude;
      let distanceKm: number | null = null;
      if (lat != null && lng != null) {
        distanceKm = haversineKm(ref, { lat, lng });
      }
      return { row, distanceKm };
    });

    scored.sort((a, b) => {
      if (a.distanceKm != null && b.distanceKm != null) {
        return a.distanceKm - b.distanceKm;
      }
      if (a.distanceKm != null) return -1;
      if (b.distanceKm != null) return 1;
      return a.row.createdAt.getTime() - b.row.createdAt.getTime();
    });

    return scored.map(({ row, distanceKm }) => ({
      ...row,
      distanceKm,
    }));
  }

  /** Orders assigned to this rider and still out for delivery */
  async listAssignedActive(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        assignedRiderId: userId,
        status: OrderStatus.OUT_FOR_DELIVERY,
      },
      include: orderDetailInclude,
      omit: { confirmationCode: true }, //! should be hidden from the rider
      orderBy: { updatedAt: 'desc' },
    });

    return { message: 'Success', data: orders };
  }

  async listOrderHistory(userId: string, query: QueryOrderHistoryInput) {
    const terminalStatuses = [
      OrderStatus.DELIVERED,
      OrderStatus.PICKED_UP,
      OrderStatus.CANCELLED,
    ];

    const skip = (query.page - 1) * query.limit;
    const where = {
      assignedRiderId: userId,
      status: { in: terminalStatuses },
    };

    // Calculate start of current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [orders, total, thisMonthOrderTotalCount] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
        include: orderDetailInclude,
        omit: { confirmationCode: true },
      }),
      this.prisma.order.count({ where }),
      this.prisma.order.count({
        where: {
          assignedRiderId: userId,
          status: { in: terminalStatuses },
          createdAt: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
      }),
    ]);

    return { orders, total, thisMonthOrderTotalCount };
  }

  async getOrderForRider(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId },
      include: orderDetailInclude,
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const allowed = await this.canRiderViewOrder(userId, order);
    if (!allowed) {
      throw new ForbiddenException('You cannot access this order');
    }

    return { message: 'Success', data: order };
  }

  private async canRiderViewOrder(
    riderId: string,
    order: OrderWithDetailPayload,
  ): Promise<boolean> {
    if (order.assignedRiderId === riderId) {
      return true;
    }

    if (
      order.assignedRiderId != null ||
      order.type !== OrderType.DELIVERY ||
      !RIDER_POOL_STATUSES.includes(order.status)
    ) {
      return false;
    }

    const profile = await this.riderRepo.getProfile(riderId);
    if (!profile?.h3Index || !order.h3Index) {
      return false;
    }

    const cells = H3IndexUtil.getSearchCells(profile.h3Index, 3);
    return cells.includes(order.h3Index);
  }

  async acceptOrder(riderId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId },
      select: {
        id: true,
        type: true,
        status: true,
        assignedRiderId: true,
        h3Index: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.type !== OrderType.DELIVERY) {
      throw new BadRequestException(
        'Only delivery orders can be accepted by riders',
      );
    }
    if (order.assignedRiderId != null) {
      throw new BadRequestException('Order already assigned to a rider');
    }
    if (!RIDER_POOL_STATUSES.includes(order.status)) {
      throw new BadRequestException('Order is not available for assignment');
    }

    const profile = await this.riderRepo.getProfile(riderId);
    if (!profile?.h3Index) {
      throw new BadRequestException(
        'Set your rider H3 location before accepting orders',
      );
    }

    if (order.h3Index) {
      const cells = H3IndexUtil.getSearchCells(profile.h3Index, 3);
      if (!cells.includes(order.h3Index)) {
        throw new ForbiddenException(
          'This order is outside your current H3 search area',
        );
      }
    }

    const updated = await this.prisma.order.updateMany({
      where: {
        id: orderId,
        assignedRiderId: null,
        type: OrderType.DELIVERY,
        status: { in: RIDER_POOL_STATUSES },
      },
      data: {
        assignedRiderId: riderId,
        status: OrderStatus.OUT_FOR_DELIVERY,
      },
    });

    if (updated.count === 0) {
      throw new BadRequestException(
        'Could not accept order — it may have just been taken or updated',
      );
    }

    const full = await this.prisma.order.findFirstOrThrow({
      where: { id: orderId },
      include: orderDetailInclude,
      omit: { confirmationCode: true }, //! should be hidden from the rider
    });

    //? notify other riders
    this.socketGateway.emit('*', 'riderOrderAssigned', {
      orderId,
      riderId,
    });

    return full;
  }

  async deliverOrder(riderId: string, orderId: string, dto: DeliverOrderInput) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, assignedRiderId: riderId },
      select: {
        id: true,
        status: true,
        confirmationCode: true,
        deliveryCharge: true,
        paymentStatus: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found or not assigned to you');
    }

    if (order.status !== OrderStatus.OUT_FOR_DELIVERY) {
      throw new BadRequestException('Order is not out for delivery');
    }

    if (
      dto.confirmationCode != null &&
      dto.confirmationCode !== order.confirmationCode
    ) {
      throw new BadRequestException('Invalid confirmation code');
    }

    const full = await this.prisma.$transaction(async (tx) => {
      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.DELIVERED,
          deliveredAt: new Date(),
        },
        include: orderDetailInclude,
      });

      // Create earning record
      await tx.riderEarning.create({
        data: {
          riderId,
          orderId,
          deliveryFee: order.deliveryCharge,
          tip: new Prisma.Decimal(0),
          total: order.deliveryCharge,
          status: order.paymentStatus === 'PAID' ? 'SETTLED' : 'PENDING',
        },
      });

      return updatedOrder;
    });

    return full;
  }

  async addTimeToOrder(riderId: string, orderId: string, dto: AddTimeInput) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, assignedRiderId: riderId },
      select: {
        id: true,
        status: true,
        estimatedArrivalAt: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found or not assigned to you');
    }

    if (order.status !== OrderStatus.OUT_FOR_DELIVERY) {
      throw new BadRequestException(
        'Can only add time to orders that are out for delivery',
      );
    }

    if (!order.estimatedArrivalAt) {
      throw new BadRequestException(
        'No estimated arrival time set for this order',
      );
    }

    const newEstimatedArrivalAt = new Date(
      order.estimatedArrivalAt.getTime() + dto.timeInMinutes * 60 * 1000,
    );

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        estimatedArrivalAt: newEstimatedArrivalAt,
      },
      include: orderDetailInclude,
    });

    return {
      message: 'Estimated arrival time updated',
      data: updated,
    };
  }

  async declineOrder(riderId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId },
      select: {
        id: true,
        type: true,
        status: true,
        assignedRiderId: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.type !== OrderType.DELIVERY) {
      throw new BadRequestException(
        'Only delivery orders can be declined by riders',
      );
    }
    if (order.assignedRiderId != null) {
      throw new BadRequestException(
        'Cannot decline an order already assigned to a rider',
      );
    }
    if (!RIDER_POOL_STATUSES.includes(order.status)) {
      throw new BadRequestException('Order is not available for decline');
    }

    const existing = await this.prisma.orderDecline.findUnique({
      where: { orderId_riderId: { orderId, riderId } },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('You have already declined this order');
    }

    await this.prisma.orderDecline.create({
      data: {
        orderId,
        riderId,
      },
    });
  }
}
