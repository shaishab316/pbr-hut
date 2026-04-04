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

@ApiTags('Cart')
@UseGuards(JwtGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @ApiGetCart()
  @Get()
  getCart(@CurrentUser('id') userId: string) {
    return this.cartService.getCart(userId);
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
}
