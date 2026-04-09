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

@ApiTags('Cart')
@UseGuards(JwtGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @ApiGetCart()
  @Get()
  async getCart(@CurrentUser('id') userId: string) {
    const cart = await this.cartService.getCart(userId);

    const totalBill = cart.items.reduce((total, item) => {
      // 1. Base prices (Size + Side)
      const sizePrice = parseFloat(item.sizePrice?.toString() || '0');
      const sidePrice = parseFloat(item.sidePrice?.toString() || '0');

      // 2. Extras sum
      const extrasTotal = (item.selectedExtras || []).reduce(
        (sum, extra) => sum + parseFloat(extra.price?.toString() || '0'),
        0,
      );

      // 3. Item Total = (Size + Side + Extras) * Quantity
      const itemTotal = (sizePrice + sidePrice + extrasTotal) * item.quantity;

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
  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  addItem(@CurrentUser('id') userId: string, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(userId, dto);
  }

  @ApiUpdateCartItem()
  @Patch('items/:cartItemId')
  updateItem(
    @CurrentUser('id') userId: string,
    @Param('cartItemId', ParseUUIDPipe) cartItemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(userId, cartItemId, dto);
  }

  @ApiRemoveCartItem()
  @Delete('items/:cartItemId')
  @HttpCode(HttpStatus.OK)
  removeItem(
    @CurrentUser('id') userId: string,
    @Param('cartItemId', ParseUUIDPipe) cartItemId: string,
  ) {
    return this.cartService.removeItem(userId, cartItemId);
  }

  @ApiClearCart()
  @Delete()
  @HttpCode(HttpStatus.OK)
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
