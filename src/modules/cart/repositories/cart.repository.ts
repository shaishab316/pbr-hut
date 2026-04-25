import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';

export const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      item: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          isAvailable: true,
          allowCustomNote: true,
          isSideFree: true,
          isExtrasOptional: true,
          hasSizeVariants: true,
          hasExtras: true,
          deletedAt: true,
          basePrice: true,
        },
      },
      selectedSizeVariant: true,
      selectedSideOption: true,
      selectedExtras: true,
    },
  },
} satisfies Prisma.CartInclude;

export type CartWithItems = Prisma.CartGetPayload<{
  include: typeof cartInclude;
}>;

type ItemForCartValidation = Prisma.ItemGetPayload<{
  include: {
    sizeVariants: true;
    sideOptions: true;
    extras: true;
  };
}>;

@Injectable()
export class CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsertCartByUserId(userId: string) {
    return this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async findCartWithItemsByUserId(userId: string): Promise<CartWithItems> {
    const { id } = await this.upsertCartByUserId(userId);
    return this.prisma.cart.findUniqueOrThrow({
      where: { id },
      include: cartInclude,
    });
  }

  findItemForCartValidation(
    itemId: string,
  ): Promise<ItemForCartValidation | null> {
    return this.prisma.item.findFirst({
      where: { id: itemId, deletedAt: null },
      include: {
        sizeVariants: true,
        sideOptions: true,
        extras: true,
      },
    });
  }

  findCartItemsForMerge(params: {
    cartId: string;
    itemId: string;
    selectedSizeVariantId: string | null;
    selectedSideOptionId: string | null;
  }) {
    return this.prisma.cartItem.findMany({
      where: {
        cartId: params.cartId,
        itemId: params.itemId,
        selectedSizeVariantId: params.selectedSizeVariantId,
        selectedSideOptionId: params.selectedSideOptionId,
      },
      include: {
        selectedExtras: {
          where: { itemExtraId: { not: null } },
          select: { itemExtraId: true },
        },
      },
    });
  }

  incrementCartItemQuantity(cartItemId: string, by: number) {
    return this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity: { increment: by } },
    });
  }

  createCartItem(data: Prisma.CartItemCreateInput) {
    return this.prisma.cartItem.create({ data });
  }

  findCartItemWithItemNotePolicy(cartItemId: string) {
    return this.prisma.cartItem.findUniqueOrThrow({
      where: { id: cartItemId },
      include: { item: { select: { allowCustomNote: true } } },
    });
  }

  updateCartItem(cartItemId: string, data: Prisma.CartItemUpdateInput) {
    return this.prisma.cartItem.update({
      where: { id: cartItemId },
      data,
    });
  }

  deleteCartItem(cartItemId: string) {
    return this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });
  }

  deleteAllCartItems(cartId: string) {
    return this.prisma.cartItem.deleteMany({
      where: { cartId },
    });
  }

  findCartItemIdIfOwned(userId: string, cartItemId: string) {
    return this.prisma.cartItem.findFirst({
      where: { id: cartItemId, cart: { userId } },
      select: { id: true },
    });
  }
}
