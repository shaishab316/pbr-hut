import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AddCartItemRequest } from './models/add-cart-item.model';
import { cartResponseExample } from './models/cart-response.example';

export const ApiAddCartItem = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Add item to cart',
      description:
        'Adds a menu item to the cart with the chosen size, side, and optional extras. Prices are snapshotted at add time. ' +
        'If an identical line (same item, size, side, extras, and note) already exists, quantities are merged.',
    }),
    ApiExtraModels(AddCartItemRequest),
    ApiBody({
      type: AddCartItemRequest,
      description:
        'When `hasSizeVariants` is true on the item, send `selectedSizeVariantId`. `extraIds` must satisfy item `hasExtras` / `isExtrasOptional` rules.',
    }),
    ApiCreatedResponse({
      description: 'Cart after add',
      schema: {
        example: {
          ...cartResponseExample,
          statusCode: 201,
          message: 'Item added to cart',
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Validation failed or item/options invalid',
      schema: {
        example: {
          statusCode: 400,
          message: 'Size variant is required for this item',
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid JWT',
      schema: {
        example: { message: 'Unauthorized', statusCode: 401 },
      },
    }),
  );
