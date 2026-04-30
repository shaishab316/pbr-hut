import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DeliveryTiming,
  OrderStatus,
  OrderType,
  PaymentStatus,
  Prisma,
  Size,
  NotificationType,
  UserRole,
} from '@prisma/client';
import { H3IndexUtil } from '@/common/utils/h3index.util';
import { PrismaService } from '@/infra/prisma/prisma.service';
import type { CartWithItems } from '@/modules/cart/repositories/cart.repository';
import { CartRepository } from '@/modules/cart/repositories/cart.repository';
import { CartService } from '@/modules/cart/cart.service';
import {
  OrderRepository,
  orderDetailInclude,
} from './repositories/order.repository';
import { NotificationService } from '@/infra/notification/notification.service';
import type { CreateOrderInput } from './dto/create-order.dto';
import type { QueryOrderHistoryInput } from './dto/query-order-history.dto';

const ETA_MINUTES = 15;
const CANCEL_WINDOW_MS = 10 * 60 * 1000;

// cspell:disable-next-line
const ORDER_NUMBER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ORDER_NUMBER_LEN = 9;

function generateOrderNumber(): string {
  const buf = randomBytes(ORDER_NUMBER_LEN);
  let s = '';
  for (let i = 0; i < ORDER_NUMBER_LEN; i++) {
    s += ORDER_NUMBER_ALPHABET[buf[i] % ORDER_NUMBER_ALPHABET.length];
  }
  return s;
}

function randomConfirmationCode(): string {
  return String(1000 + Math.floor(Math.random() * 9000));
}

function computeUnitPrice(line: CartWithItems['items'][0]): Prisma.Decimal {
  const size =
    line.sizePrice != null
      ? new Prisma.Decimal(line.sizePrice.toString())
      : new Prisma.Decimal(0);
  const side = new Prisma.Decimal(line.sidePrice!.toString());
  const extras = line.selectedExtras.reduce(
    (acc, e) => acc.add(new Prisma.Decimal(e.price.toString())),
    new Prisma.Decimal(0),
  );
  return size.add(side).add(extras);
}

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartRepo: CartRepository,
    private readonly cartService: CartService,
    private readonly orderRepo: OrderRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async placeOrder(userId: string, dto: CreateOrderInput) {
    this.logger.log(`🛒 Placing order for user: ${userId} - Type: ${dto.type}`);

    try {
      const cart = await this.cartRepo.findCartWithItemsByUserId(userId);
      if (cart.items.length === 0) {
        this.logger.warn(`⚠️ Cart is empty for user: ${userId}`);
        throw new BadRequestException('Cart is empty');
      }

      this.logger.debug(`📦 Cart items count: ${cart.items.length}`);

      for (const line of cart.items) {
        if (line.item.deletedAt != null) {
          this.logger.warn(
            `⚠️ Item deleted: "${line.item.name}" for user: ${userId}`,
          );
          throw new BadRequestException(
            `Item "${line.item.name}" is no longer available`,
          );
        }
        if (!line.item.isAvailable) {
          this.logger.warn(
            `⚠️ Item unavailable: "${line.item.name}" for user: ${userId}`,
          );
          throw new BadRequestException(
            `Item "${line.item.name}" is not available`,
          );
        }
        if (!line.selectedSideOption) {
          this.logger.warn(
            `⚠️ Missing side option for item: "${line.item.name}" for user: ${userId}`,
          );
          throw new BadRequestException(
            `Cart line for "${line.item.name}" is missing a side option`,
          );
        }
      }

      let itemsTotal = new Prisma.Decimal(0);
      for (const line of cart.items) {
        const unit = computeUnitPrice(line);
        itemsTotal = itemsTotal.add(unit.mul(line.quantity));
      }

      const taxes = new Prisma.Decimal(0);
      let deliveryCharge = new Prisma.Decimal(0);

      if (dto.type === OrderType.DELIVERY) {
        this.logger.debug(`📍 Calculating delivery fee for delivery order`);
        const feeData = await this.cartService.getDeliveryFee(userId, {
          latitude: dto.deliveryAddress.latitude,
          longitude: dto.deliveryAddress.longitude,
        });

        deliveryCharge = new Prisma.Decimal(feeData.deliveryFee.toString());
        this.logger.log(
          `💰 Delivery fee calculated: ${deliveryCharge.toString()} for user: ${userId}`,
        );
      }

      // Calculate discount: 1% off for orders >= $1000
      let discount = new Prisma.Decimal(0);
      if (itemsTotal.gte(1000)) {
        discount = itemsTotal.mul(0.01); // 1% of items total
        this.logger.log(
          `🎉 Discount applied: 1% on items total = ${discount.toString()} for user: ${userId}`,
        );
      }

      const totalAmount = itemsTotal
        .add(taxes)
        .add(deliveryCharge)
        .sub(discount);
      this.logger.log(
        `💳 Order total: Items=${itemsTotal.toString()}, Discount=${discount.toString()}, Delivery=${deliveryCharge.toString()}, Total=${totalAmount.toString()}`,
      );

      const scheduledAt =
        dto.deliveryTiming === DeliveryTiming.SCHEDULED
          ? dto.scheduledAt
          : null;

      const estimatedArrivalAt =
        dto.type === OrderType.DELIVERY
          ? new Date(Date.now() + ETA_MINUTES * 60 * 1000)
          : null;

      let h3Index: string | undefined;
      if (dto.type === OrderType.DELIVERY && dto.deliveryAddress) {
        const lat = dto.deliveryAddress.latitude;
        const lng = dto.deliveryAddress.longitude;
        if (lat != null && lng != null) {
          h3Index = H3IndexUtil.encodeH3(lat, lng);
          this.logger.debug(`📍 H3 Index encoded: ${h3Index}`);
        }
      }

      const order = await this.prisma.$transaction(async (tx) => {
        let orderNumber = generateOrderNumber();
        for (let attempt = 0; attempt < 24; attempt++) {
          const clash = await tx.order.findUnique({
            where: { orderNumber },
            select: { id: true },
          });
          if (!clash) break;
          if (attempt === 23) {
            this.logger.error(
              `❌ Could not allocate unique order number after 24 attempts`,
            );
            throw new BadRequestException('Could not allocate order number');
          }
          orderNumber = generateOrderNumber();
        }

        this.logger.debug(`🔢 Order number generated: ${orderNumber}`);

        const confirmationCode = randomConfirmationCode();

        const created = await tx.order.create({
          data: {
            userId,
            orderNumber,
            confirmationCode,
            type: dto.type,
            paymentMethod: dto.paymentMethod,
            paymentStatus: PaymentStatus.UNPAID,
            deliveryTiming: dto.deliveryTiming,
            scheduledAt,
            itemsTotal,
            deliveryCharge,
            discount,
            taxes,
            totalAmount,
            estimatedArrivalAt,
            h3Index,
            deliveryAddress:
              dto.type === OrderType.DELIVERY && dto.deliveryAddress
                ? {
                    create: {
                      locationLabel: dto.deliveryAddress.locationLabel ?? null,
                      name: dto.deliveryAddress.name,
                      phoneNumber: dto.deliveryAddress.phoneNumber,
                      address: dto.deliveryAddress.address,
                      buildingDetail:
                        dto.deliveryAddress.buildingDetail ?? null,
                      latitude: dto.deliveryAddress.latitude ?? null,
                      longitude: dto.deliveryAddress.longitude ?? null,
                    },
                  }
                : undefined,
            billingAddress: dto.billing
              ? {
                  create: {
                    country: dto.billing.country,
                    addressLine1: dto.billing.addressLine1,
                    addressLine2: dto.billing.addressLine2 ?? null,
                    suburb: dto.billing.suburb,
                    city: dto.billing.city,
                    postalCode: dto.billing.postalCode,
                    state: dto.billing.state,
                  },
                }
              : undefined,
            items: {
              create: cart.items.map((line) => {
                const unit = computeUnitPrice(line);
                const totalPrice = unit.mul(line.quantity);
                const side = line.selectedSideOption!;
                return {
                  itemId: line.itemId,
                  itemName: line.item.name,
                  imageUrl: line.item.imageUrl,
                  quantity: line.quantity,
                  customNote: line.customNote,
                  sizeName: line.selectedSizeVariant?.size ?? null,
                  sideOptionName: side.name,
                  sizePrice: line.sizePrice,
                  sidePrice: line.sidePrice,
                  unitPrice: unit,
                  totalPrice,
                  extras: {
                    create: line.selectedExtras.map((e) => ({
                      extraName: e.extraName,
                      price: new Prisma.Decimal(e.price.toString()),
                    })),
                  },
                };
              }),
            },
          },
          include: orderDetailInclude,
        });

        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        return created;
      });

      // 📬 Send notification to customer
      await this.notificationService.sendNotification(
        [userId],
        '✅ Order Confirmed',
        `Your order #${order.orderNumber} has been placed successfully. Order total: $${Number(order.totalAmount)}`,
        NotificationType.INFO,
      );

      // 📬 For delivery orders, notify nearby riders about the new order
      if (order.type === OrderType.DELIVERY && order.h3Index) {
        await this.notifyNearbyRiders(order);
      }

      this.logger.log(
        `✅ Order placed successfully: ${order.id} (Type: ${order.type})`,
      );

      return order;
    } catch (error) {
      this.logger.error(`❌ Order placement failed for user: ${userId}`, error);
      throw error;
    }
  }

  async listActive(userId: string) {
    const order = await this.orderRepo.findActiveByUserId(userId);

    return order;
  }

  async listHistory(userId: string, query: QueryOrderHistoryInput) {
    const [orders, total] = await this.orderRepo.findHistoryPage(
      userId,
      query.page,
      query.limit,
    );

    return {
      orders,
      total,
    };
  }

  async getById(userId: string, orderId: string) {
    const order = await this.orderRepo.findByIdForUser(userId, orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return { message: 'Success', data: order };
  }

  async cancel(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      select: {
        id: true,
        status: true,
        createdAt: true,
        orderNumber: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const nonCancellable: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.PICKED_UP,
      OrderStatus.CANCELLED,
    ];
    if (nonCancellable.includes(order.status)) {
      throw new BadRequestException('This order cannot be cancelled');
    }

    const elapsed = Date.now() - order.createdAt.getTime();
    if (elapsed > CANCEL_WINDOW_MS) {
      throw new BadRequestException(
        'Orders can only be cancelled within 10 minutes of placing them',
      );
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.CANCELLED },
    });

    // 📬 Send notification to customer
    await this.notificationService.sendNotification(
      [userId],
      '❌ Order Cancelled',
      `Your order #${order.orderNumber} has been cancelled successfully.`,
      NotificationType.INFO,
    );

    return { message: 'Order cancelled' };
  }

  async reorder(userId: string, orderId: string) {
    const order = await this.orderRepo.findByIdForUserWithItems(
      userId,
      orderId,
    );
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    for (const line of order.items) {
      if (!line.itemId) {
        throw new BadRequestException(
          `Cannot re-order line "${line.itemName}" (catalog item removed)`,
        );
      }

      const item = await this.prisma.item.findFirst({
        where: { id: line.itemId, deletedAt: null },
      });
      if (!item?.isAvailable) {
        throw new BadRequestException(
          `Item "${line.itemName}" is not available`,
        );
      }

      let selectedSizeVariantId: string | null | undefined;
      if (line.sizeName) {
        const size = line.sizeName as Size;
        if (!Object.values(Size).includes(size)) {
          throw new BadRequestException(
            `Cannot re-order "${line.itemName}" (invalid size snapshot)`,
          );
        }
        const sv = await this.prisma.sizeVariant.findFirst({
          where: { itemId: line.itemId, size },
        });
        if (!sv) {
          throw new BadRequestException(
            `Cannot re-order "${line.itemName}" (size no longer offered)`,
          );
        }
        selectedSizeVariantId = sv.id;
      } else {
        selectedSizeVariantId = undefined;
      }

      if (!line.sideOptionName) {
        throw new BadRequestException(
          `Cannot re-order "${line.itemName}" (missing side option)`,
        );
      }

      const side = await this.prisma.sideOption.findFirst({
        where: { itemId: line.itemId, name: line.sideOptionName },
      });
      if (!side) {
        throw new BadRequestException(
          `Cannot re-order "${line.itemName}" (side option no longer offered)`,
        );
      }

      const extraIds: string[] = [];
      for (const ex of line.extras) {
        const ie = await this.prisma.itemExtra.findFirst({
          where: { itemId: line.itemId, name: ex.extraName },
        });
        if (!ie) {
          throw new BadRequestException(
            `Extra "${ex.extraName}" is no longer available for "${line.itemName}"`,
          );
        }
        extraIds.push(ie.id);
      }

      await this.cartService.addItem(userId, {
        itemId: line.itemId,
        quantity: line.quantity,
        selectedSizeVariantId: selectedSizeVariantId ?? null,
        selectedSideOptionId: side.id,
        extraIds,
        customNote: line.customNote,
      });
    }

    return this.cartService.getCart(userId);
  }

  async updatePaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
    userId: string,
    userRole: UserRole,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        paymentStatus: true,
        userId: true,
        assignedRiderId: true,
        orderNumber: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only admins can update any order; riders can update only their assigned orders.
    if (userRole === UserRole.RIDER && order.assignedRiderId !== userId) {
      throw new BadRequestException(
        'Riders can only update payment status for their own orders',
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus },
      include: orderDetailInclude,
    });

    // 📬 Send notification to customer about payment status change
    if (paymentStatus === PaymentStatus.PAID) {
      await this.notificationService.sendNotification(
        [order.userId],
        '💳 Payment Received',
        `Payment for order #${order.orderNumber} has been received. Thank you!`,
        NotificationType.INFO,
      );
    } else if (paymentStatus === PaymentStatus.REFUNDED) {
      await this.notificationService.sendNotification(
        [order.userId],
        '💰 Refund Processed',
        `Your refund for order #${order.orderNumber} has been processed.`,
        NotificationType.INFO,
      );
    }

    return updated;
  }

  async markAsPaid(orderId: string, userId: string, userRole: UserRole) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch order with rider earning details
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          riderEarning: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // 2. Authorization check: Only ADMIN or the assigned RIDER can mark as paid
      if (userRole === UserRole.RIDER && order.assignedRiderId !== userId) {
        throw new BadRequestException(
          'Riders can only update payment status for their own orders',
        );
      }

      if (!order.assignedRiderId) {
        throw new BadRequestException(
          'Order is not assigned to a rider. Cannot mark as paid.',
        );
      }

      if (!order.riderEarning) {
        throw new BadRequestException(
          'No rider earning record found for this order',
        );
      }

      // 3. Update rider earning status to SETTLED
      await tx.riderEarning.update({
        where: { id: order.riderEarning.id },
        data: { status: 'SETTLED' },
      });

      // 4. Increment rider's availableBalance by the earning amount
      const ridingEarningAmount = order.riderEarning.total;
      await tx.riderProfile.update({
        where: { userId: order.assignedRiderId },
        data: {
          availableBalance: {
            increment: ridingEarningAmount,
          },
        },
      });

      // 5. Update order payment status to PAID
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: PaymentStatus.PAID },
        include: orderDetailInclude,
      });

      this.logger.log(
        `✅ Order #${order.orderNumber} marked as PAID. Rider earning: $${ridingEarningAmount.toString()} credited to rider ${order.assignedRiderId}`,
      );

      return updated;
    });
  }

  async markAsUnpaid(orderId: string, userId: string, userRole: UserRole) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch order with rider earning details
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          riderEarning: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // 2. Authorization check: Only ADMIN or the assigned RIDER can mark as unpaid
      if (userRole === UserRole.RIDER && order.assignedRiderId !== userId) {
        throw new BadRequestException(
          'Riders can only update payment status for their own orders',
        );
      }

      if (!order.assignedRiderId) {
        throw new BadRequestException(
          'Order is not assigned to a rider. Cannot mark as unpaid.',
        );
      }

      if (!order.riderEarning) {
        throw new BadRequestException(
          'No rider earning record found for this order',
        );
      }

      // 3. Verify rider has sufficient balance to reverse
      const riderProfile = await tx.riderProfile.findUnique({
        where: { userId: order.assignedRiderId },
      });

      if (!riderProfile) {
        throw new NotFoundException('Rider profile not found');
      }

      const ridingEarningAmount = order.riderEarning.total;
      if (riderProfile.availableBalance < ridingEarningAmount) {
        throw new BadRequestException(
          `Insufficient balance to reverse. Rider balance: $${riderProfile.availableBalance.toString()}, Amount to reverse: $${ridingEarningAmount.toString()}`,
        );
      }

      // 4. Update rider earning status back to PENDING
      await tx.riderEarning.update({
        where: { id: order.riderEarning.id },
        data: { status: 'PENDING' },
      });

      // 5. Decrement rider's availableBalance by the earning amount
      await tx.riderProfile.update({
        where: { userId: order.assignedRiderId },
        data: {
          availableBalance: {
            decrement: ridingEarningAmount,
          },
        },
      });

      // 6. Update order payment status back to UNPAID
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: PaymentStatus.UNPAID },
        include: orderDetailInclude,
      });

      this.logger.log(
        `❌ Order #${order.orderNumber} marked as UNPAID. Rider earning: $${ridingEarningAmount.toString()} reversed from rider ${order.assignedRiderId}`,
      );

      return updated;
    });
  }

  /**
   * Notify nearby riders about a new delivery order in their area
   */
  private async notifyNearbyRiders(order: any): Promise<void> {
    if (!order.h3Index) {
      return;
    }

    try {
      // Get riders in the same H3 cell area (using H3 neighbors)
      const nearbyH3Cells = H3IndexUtil.getSearchCells(order.h3Index, 2);

      // Find active riders in those H3 cells
      const nearbyRiders = await this.prisma.user.findMany({
        where: {
          role: UserRole.RIDER,
          riderProfile: {
            h3Index: {
              in: nearbyH3Cells,
            },
          },
        },
        select: { id: true },
        take: 50, // Limit to prevent too many notifications
      });

      if (nearbyRiders.length === 0) {
        return;
      }

      const riderIds = nearbyRiders.map((r) => r.id);

      await this.notificationService.sendNotification(
        riderIds,
        '🆕 New Delivery Order Available',
        `Order #${order.orderNumber} is waiting for a rider. Delivery fee: $${(Number(order.deliveryCharge) / 100).toFixed(2)}`,
        NotificationType.INFO,
      );

      this.logger.log(
        `📬 Notified ${riderIds.length} nearby riders about order ${order.id}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to notify nearby riders for order ${order.id}:`,
        error,
      );
      // Don't throw - this is best effort
    }
  }
}
