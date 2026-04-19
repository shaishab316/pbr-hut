import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeliveryTiming,
  OrderStatus,
  OrderType,
  PaymentStatus,
  Prisma,
  Size,
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartRepo: CartRepository,
    private readonly cartService: CartService,
    private readonly orderRepo: OrderRepository,
  ) {}

  async placeOrder(userId: string, dto: CreateOrderInput) {
    const cart = await this.cartRepo.findCartWithItemsByUserId(userId);
    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    for (const line of cart.items) {
      if (line.item.deletedAt != null) {
        throw new BadRequestException(
          `Item "${line.item.name}" is no longer available`,
        );
      }
      if (!line.item.isAvailable) {
        throw new BadRequestException(
          `Item "${line.item.name}" is not available`,
        );
      }
      if (!line.selectedSideOption) {
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
      const feeData = await this.cartService.getDeliveryFee(userId, {
        latitude: dto.deliveryAddress.latitude,
        longitude: dto.deliveryAddress.longitude,
      });

      deliveryCharge = new Prisma.Decimal(feeData.deliveryFee.toString());
    }

    const totalAmount = itemsTotal.add(taxes).add(deliveryCharge);

    const scheduledAt =
      dto.deliveryTiming === DeliveryTiming.SCHEDULED ? dto.scheduledAt : null;

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
          throw new BadRequestException('Could not allocate order number');
        }
        orderNumber = generateOrderNumber();
      }

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
                    buildingDetail: dto.deliveryAddress.buildingDetail ?? null,
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

    return order;
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

  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        paymentStatus: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus },
      include: orderDetailInclude,
    });

    return updated;
  }

  async markAsPaid(orderId: string) {
    await this.prisma.riderEarning.updateMany({
      where: {
        orderId,
      },
      data: {
        status: 'SETTLED',
      },
    });

    return this.updatePaymentStatus(orderId, PaymentStatus.PAID);
  }

  async markAsUnpaid(orderId: string) {
    await this.prisma.riderEarning.updateMany({
      where: {
        orderId,
      },
      data: {
        status: 'PENDING',
      },
    });

    return this.updatePaymentStatus(orderId, PaymentStatus.UNPAID);
  }
}
