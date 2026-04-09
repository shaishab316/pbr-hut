import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AddCartItemInput } from './dto/add-cart-item.dto';
import type { UpdateCartItemInput } from './dto/update-cart-item.dto';
import { CartRepository } from './repositories/cart.repository';
import { DeliveryFeeDto } from './dto/delivery-fee.dto';
import { RestaurantCacheRepository } from '../restaurant/repositories/restaurant.cache.repository';
import { calculateDistanceInKm } from '@/common/helpers';

function normalizeNote(note: string | null | undefined): string {
  if (note == null || note.trim() === '') return '';
  return note.trim();
}

function sortIds(ids: string[]): string[] {
  return [...new Set(ids)].sort();
}

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepo: CartRepository,
    private readonly restaurantCacheRepo: RestaurantCacheRepository,
  ) {}

  async getCart(userId: string) {
    const data = await this.cartRepo.findCartWithItemsByUserId(userId);

    return data;
  }

  private async validateItemForCart(dto: AddCartItemInput) {
    const item = await this.cartRepo.findItemForCartValidation(dto.itemId);

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (!item.isAvailable) {
      throw new BadRequestException('Item is not available');
    }

    if (item.hasSizeVariants) {
      if (!dto.selectedSizeVariantId) {
        throw new BadRequestException('Size variant is required for this item');
      }
    } else if (dto.selectedSizeVariantId) {
      throw new BadRequestException('This item does not use size variants');
    }

    const sizeVariant = dto.selectedSizeVariantId
      ? item.sizeVariants.find((v) => v.id === dto.selectedSizeVariantId)
      : null;

    if (item.hasSizeVariants && !sizeVariant) {
      throw new BadRequestException('Invalid size variant for this item');
    }

    const side = item.sideOptions.find(
      (s) => s.id === dto.selectedSideOptionId,
    );

    if (!side) {
      throw new BadRequestException('Invalid side option for this item');
    }

    if (item.hasExtras) {
      const uniqueExtraIds = new Set(dto.extraIds);
      if (uniqueExtraIds.size !== dto.extraIds.length) {
        throw new BadRequestException('Duplicate extras are not allowed');
      }

      for (const extraId of dto.extraIds) {
        const found = item.extras.some((e) => e.id === extraId);
        if (!found) {
          throw new BadRequestException('Invalid extra for this item');
        }
      }

      if (!item.isExtrasOptional && dto.extraIds.length === 0) {
        throw new BadRequestException(
          'At least one extra is required for this item',
        );
      }
    } else if (dto.extraIds.length > 0) {
      throw new BadRequestException('This item does not have extras');
    }

    if (!item.allowCustomNote && normalizeNote(dto.customNote)) {
      throw new BadRequestException(
        'Custom notes are not allowed for this item',
      );
    }

    return {
      item,
      sizeVariant,
      side,
      extraRecords: item.hasExtras
        ? item.extras.filter((e) => dto.extraIds.includes(e.id))
        : [],
    };
  }

  private findMatchingCartItem(
    candidates: Awaited<ReturnType<CartRepository['findCartItemsForMerge']>>,
    dto: AddCartItemInput,
    sortedExtraIds: string[],
  ) {
    const targetExtras = sortedExtraIds;

    for (const c of candidates) {
      const ids = c.selectedExtras
        .map((e) => e.itemExtraId)
        .filter((id): id is string => id != null)
        .sort();

      if (ids.length !== targetExtras.length) continue;
      if (!ids.every((id, i) => id === targetExtras[i])) continue;
      if (normalizeNote(c.customNote) !== normalizeNote(dto.customNote))
        continue;

      return c;
    }

    return null;
  }

  async addItem(userId: string, dto: AddCartItemInput) {
    const { sizeVariant, side, extraRecords } =
      await this.validateItemForCart(dto);
    const cart = await this.cartRepo.upsertCartByUserId(userId);
    const sortedExtraIds = sortIds(dto.extraIds);

    const candidates = await this.cartRepo.findCartItemsForMerge({
      cartId: cart.id,
      itemId: dto.itemId,
      selectedSizeVariantId: dto.selectedSizeVariantId ?? null,
      selectedSideOptionId: dto.selectedSideOptionId,
    });

    const existing = this.findMatchingCartItem(candidates, dto, sortedExtraIds);

    if (existing) {
      await this.cartRepo.incrementCartItemQuantity(existing.id, dto.quantity);
      const data = await this.cartRepo.findCartWithItemsByUserId(userId);
      return {
        message: 'Item added to cart',
        data,
      };
    }

    const sizePrice =
      sizeVariant != null
        ? new Prisma.Decimal(sizeVariant.price.toString())
        : null;
    const sidePrice = new Prisma.Decimal(side.price.toString());

    await this.cartRepo.createCartItem({
      cart: { connect: { id: cart.id } },
      item: { connect: { id: dto.itemId } },
      quantity: dto.quantity,
      customNote: normalizeNote(dto.customNote) || null,
      selectedSizeVariant: dto.selectedSizeVariantId
        ? { connect: { id: dto.selectedSizeVariantId } }
        : undefined,
      selectedSideOption: { connect: { id: dto.selectedSideOptionId } },
      sizePrice,
      sidePrice,
      selectedExtras: {
        create: extraRecords.map((e) => ({
          itemExtra: { connect: { id: e.id } },
          extraName: e.name,
          price: new Prisma.Decimal(e.price.toString()),
        })),
      },
    });

    const data = await this.cartRepo.findCartWithItemsByUserId(userId);
    return {
      message: 'Item added to cart',
      data,
    };
  }

  async updateItem(
    userId: string,
    cartItemId: string,
    dto: UpdateCartItemInput,
  ) {
    await this.assertCartItemOwnedByUser(userId, cartItemId);

    const data: Prisma.CartItemUpdateInput = {};
    if (dto.quantity !== undefined) data.quantity = dto.quantity;
    if (dto.customNote !== undefined) {
      const row =
        await this.cartRepo.findCartItemWithItemNotePolicy(cartItemId);
      if (
        !row.item.allowCustomNote &&
        dto.customNote != null &&
        normalizeNote(dto.customNote)
      ) {
        throw new BadRequestException(
          'Custom notes are not allowed for this item',
        );
      }
      data.customNote =
        dto.customNote == null || normalizeNote(dto.customNote) === ''
          ? null
          : normalizeNote(dto.customNote);
    }

    await this.cartRepo.updateCartItem(cartItemId, data);

    const cartData = await this.cartRepo.findCartWithItemsByUserId(userId);
    return {
      message: 'Cart item updated',
      data: cartData,
    };
  }

  async removeItem(userId: string, cartItemId: string) {
    await this.assertCartItemOwnedByUser(userId, cartItemId);

    await this.cartRepo.deleteCartItem(cartItemId);

    const data = await this.cartRepo.findCartWithItemsByUserId(userId);
    return {
      message: 'Item removed from cart',
      data,
    };
  }

  async clearCart(userId: string) {
    const cart = await this.cartRepo.upsertCartByUserId(userId);
    await this.cartRepo.deleteAllCartItems(cart.id);

    const data = await this.cartRepo.findCartWithItemsByUserId(userId);
    return {
      message: 'Cart cleared',
      data,
    };
  }

  private async assertCartItemOwnedByUser(userId: string, cartItemId: string) {
    const row = await this.cartRepo.findCartItemIdIfOwned(userId, cartItemId);
    if (!row) {
      throw new NotFoundException('Cart item not found');
    }
  }

  async getDeliveryFee(userId: string, dto: DeliveryFeeDto) {
    // 1. Fetch Data
    const [cart, restaurant] = await Promise.all([
      this.cartRepo.findCartWithItemsByUserId(userId),
      this.restaurantCacheRepo.getPrimary(),
    ]);

    // 2. Validate Restaurant Existence & Location (SRP: Guard Clause)
    if (
      !restaurant ||
      restaurant.latitude == null ||
      restaurant.longitude == null
    ) {
      throw new InternalServerErrorException(
        'Restaurant data or location unavailable',
      );
    }

    // 3. Calculate Distance
    const distance = calculateDistanceInKm(
      { lat: restaurant.latitude, lon: restaurant.longitude },
      { lat: dto.latitude, lon: dto.longitude },
    );

    // 4. Validate Delivery Radius (SRP: Extracted Validation)
    this.validateDeliveryDistance(distance, restaurant.deliveryRadius);

    // 5. Calculate Cart Total (SRP: Extracted Calculation)
    const cartTotal = this.calculateCartTotal(cart.items);

    // 6. Validate Minimum Order (KISS: Direct comparison using DB config)
    if (cartTotal.lessThan(restaurant.minimumOrderAmountCOD)) {
      throw new BadRequestException(
        `Minimum order amount is ${restaurant.minimumOrderAmountCOD.toString()}`,
      );
    }

    // 7. Return Fee (KISS: Using base fee from DB)
    // Note: You can add complex logic here later (e.g., distance multipliers)
    // without breaking the single responsibility of the main function.
    return {
      distance: parseFloat(distance.toFixed(2)),
      deliveryFee: restaurant.baseDeliveryFee,
      currency: 'USD',
    };
  }

  /**
   * Calculates the total price of items in the cart.
   * Handles Size Variants, Side Options, and Extras.
   */
  private calculateCartTotal(
    items: NonNullable<
      Awaited<
        ReturnType<(typeof this.cartRepo)['findCartWithItemsByUserId']>
      >['items']
    >,
  ): Prisma.Decimal {
    return items.reduce((total, item) => {
      let itemPrice = item.selectedSizeVariant?.price || new Prisma.Decimal(0);

      if (item.selectedSideOption) {
        itemPrice = itemPrice.plus(item.selectedSideOption.price);
      }

      if (item.selectedExtras?.length) {
        const extrasSum = item.selectedExtras.reduce(
          (sum, extra) => sum.plus(extra.price),
          new Prisma.Decimal(0),
        );
        itemPrice = itemPrice.plus(extrasSum);
      }

      return total.plus(itemPrice);
    }, new Prisma.Decimal(0));
  }

  /**
   * Validates if the delivery distance is within the restaurant's radius.
   */
  private validateDeliveryDistance(distance: number, maxRadius: number): void {
    if (distance > maxRadius) {
      throw new BadRequestException(
        'Sorry, we do not deliver to this location.',
      );
    }
  }
}
