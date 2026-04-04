import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';

export const orderListInclude = {
  deliveryAddress: true,
  items: {
    orderBy: { id: 'asc' as const },
    include: { extras: { orderBy: { id: 'asc' as const } } },
  },
} satisfies Prisma.OrderInclude;

export const orderDetailInclude = {
  deliveryAddress: true,
  billingAddress: true,
  items: {
    orderBy: { id: 'asc' as const },
    include: { extras: { orderBy: { id: 'asc' as const } } },
  },
} satisfies Prisma.OrderInclude;

export type OrderWithListPayload = Prisma.OrderGetPayload<{
  include: typeof orderListInclude;
}>;

export type OrderWithDetailPayload = Prisma.OrderGetPayload<{
  include: typeof orderDetailInclude;
}>;

const TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.PICKED_UP,
  OrderStatus.CANCELLED,
];

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveByUserId(userId: string): Promise<OrderWithListPayload[]> {
    return this.prisma.order.findMany({
      where: {
        userId,
        status: { notIn: TERMINAL_STATUSES },
      },
      orderBy: { createdAt: 'desc' },
      include: orderListInclude,
    });
  }

  findHistoryPage(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = {
      userId,
      status: { in: TERMINAL_STATUSES },
    };
    return Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: orderListInclude,
      }),
      this.prisma.order.count({ where }),
    ]);
  }

  findByIdForUser(
    userId: string,
    orderId: string,
  ): Promise<OrderWithDetailPayload | null> {
    return this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: orderDetailInclude,
    });
  }

  findByIdForUserWithItems(userId: string, orderId: string) {
    return this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: {
          include: { extras: true },
        },
      },
    });
  }
}
