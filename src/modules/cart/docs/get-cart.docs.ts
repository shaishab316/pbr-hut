import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { cartResponseExample } from './models/cart-response.example';

export const ApiGetCart = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get current cart',
      description:
        'Returns the authenticated user’s cart with line items, selected variants, sides, extras, and price snapshots. Creates an empty cart if none exists.',
    }),
    ApiOkResponse({
      description: 'Cart with items',
      schema: { example: cartResponseExample },
    }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid JWT',
      schema: {
        example: { message: 'Unauthorized', statusCode: 401 },
      },
    }),
  );
