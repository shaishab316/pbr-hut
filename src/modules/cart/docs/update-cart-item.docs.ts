import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UpdateCartItemRequest } from './models/update-cart-item.model';
import { cartResponseExample } from './models/cart-response.example';

export const ApiUpdateCartItem = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Update cart line',
      description:
        'Updates quantity and/or custom note for a cart line owned by the current user.',
    }),
    ApiParam({
      name: 'cartItemId',
      format: 'uuid',
      description: 'Cart line item ID',
    }),
    ApiExtraModels(UpdateCartItemRequest),
    ApiBody({
      type: UpdateCartItemRequest,
      description:
        'Send at least one field. Validation requires at least one of `quantity` or `customNote` (including `customNote: null` to clear).',
    }),
    ApiOkResponse({
      description: 'Cart after update',
      schema: { example: cartResponseExample },
    }),
    ApiBadRequestResponse({
      description: 'Validation failed',
    }),
    ApiNotFoundResponse({
      description: 'Cart line not found',
      schema: {
        example: { statusCode: 404, message: 'Cart item not found' },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid JWT',
      schema: {
        example: { message: 'Unauthorized', statusCode: 401 },
      },
    }),
  );
