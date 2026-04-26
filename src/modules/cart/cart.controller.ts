import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators';
import { JwtGuard } from '@/common/guards';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import {
  ApiAddCartItem,
  ApiClearCart,
  ApiGetCart,
  ApiRemoveCartItem,
  ApiUpdateCartItem,
} from './docs';
import { DeliveryFeeDto } from './dto/delivery-fee.dto';
import {
  CacheKey,
  CacheTTL,
  InvalidateCache,
} from '@/common/decorators/cache.decorator';
import { MediumThrottle } from '@/common/decorators/throttle.decorator';

@ApiTags('Cart')
@UseGuards(JwtGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @ApiGetCart()
  @Get()
  @CacheKey('cart:user::user.id')
  @CacheTTL(60)
  async getCart(@CurrentUser('id') userId: string) {
    const cart = await this.cartService.getCart(userId);

    const totalBill = cart.items.reduce((total, item) => {
      const sizePrice = parseFloat(item.sizePrice?.toString() || '0');
      const sidePrice = parseFloat(item.sidePrice?.toString() || '0');
      const basePrice = parseFloat(item.item.basePrice?.toString() || '0');

      const extrasTotal = (item.selectedExtras || []).reduce(
        (sum, extra) => sum + parseFloat(extra.price?.toString() || '0'),
        0,
      );

      const unitPrice = sizePrice + sidePrice || basePrice;
      const itemTotal = (unitPrice + extrasTotal) * item.quantity;

      return total + itemTotal;
    }, 0);

    return {
      message: 'Cart retrieved successfully',
      data: {
        ...cart,
        totalBill,
      },
    };
  }

  @ApiAddCartItem()
  @MediumThrottle()
  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @InvalidateCache('cart:user::user.id')
  addItem(@CurrentUser('id') userId: string, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(userId, dto);
  }

  @ApiUpdateCartItem()
  @MediumThrottle()
  @Patch('items/:cartItemId')
  @InvalidateCache('cart:user::user.id')
  updateItem(
    @CurrentUser('id') userId: string,
    @Param('cartItemId', ParseUUIDPipe) cartItemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(userId, cartItemId, dto);
  }

  @ApiRemoveCartItem()
  @MediumThrottle()
  @Delete('items/:cartItemId')
  @HttpCode(HttpStatus.OK)
  @InvalidateCache('cart:user::user.id')
  removeItem(
    @CurrentUser('id') userId: string,
    @Param('cartItemId', ParseUUIDPipe) cartItemId: string,
  ) {
    return this.cartService.removeItem(userId, cartItemId);
  }

  @ApiClearCart()
  @Delete()
  @HttpCode(HttpStatus.OK)
  @InvalidateCache('cart:user::user.id')
  clearCart(@CurrentUser('id') userId: string) {
    return this.cartService.clearCart(userId);
  }

  @Post('delivery-fee')
  async getDeliveryFee(
    @CurrentUser('id') userId: string,
    @Body() dto: DeliveryFeeDto,
  ) {
    const data = await this.cartService.getDeliveryFee(userId, dto);

    return {
      message: 'Delivery fee calculated successfully',
      data,
    };
  }
}
