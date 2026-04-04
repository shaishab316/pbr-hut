import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { cartResponseExample } from './models/cart-response.example';

export const ApiRemoveCartItem = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Remove cart line',
      description: 'Removes a single line from the cart.',
    }),
    ApiParam({
      name: 'cartItemId',
      format: 'uuid',
      description: 'Cart line item ID',
    }),
    ApiOkResponse({
      description: 'Cart after removal',
      schema: { example: cartResponseExample },
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
