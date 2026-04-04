import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { cartResponseExample } from './models/cart-response.example';

export const ApiClearCart = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Clear cart',
      description: 'Removes all lines from the cart. The cart record remains.',
    }),
    ApiOkResponse({
      description: 'Empty cart',
      schema: {
        example: {
          ...cartResponseExample,
          data: { ...cartResponseExample.data, items: [] },
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
