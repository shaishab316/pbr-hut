import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiOrderIdParam } from './order-id.param';
import { reorderResponseExample } from './models/order-response.example';

export const ApiReorder = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOrderIdParam,
    ApiOperation({
      summary: 'Re-order',
      description:
        'Rebuilds the **current cart** from a past order by resolving snapshots to **live menu IDs** ' +
        '(size variant, side, extras). Calls the same validation as **add to cart** for each line.\n\n' +
        'Fails with `400` if the catalog no longer offers a matching variant, side, or extra.',
    }),
    ApiOkResponse({
      description: 'Returns the updated cart (same shape as `GET /cart`)',
      schema: {
        example: reorderResponseExample,
      },
    }),
    ApiBadRequestResponse({
      description: 'Menu no longer matches stored snapshots, or item unavailable',
      schema: {
        example: {
          message:
            'Extra "Black olives" is no longer available for "Classic Margherita"',
          error: 'Bad Request',
          statusCode: 400,
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Order not found for this user',
      schema: {
        example: {
          message: 'Order not found',
          error: 'Not Found',
          statusCode: 404,
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid JWT',
      schema: {
        example: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      },
    }),
  );
