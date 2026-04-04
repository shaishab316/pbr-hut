import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { activeOrdersResponseExample } from './models/order-response.example';

export const ApiListActiveOrders = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'List active orders',
      description:
        'Returns orders that are still in progress for the authenticated user ' +
        '(excludes terminal states: **DELIVERED**, **PICKED_UP**, **CANCELLED**). ' +
        'Each order includes line items (with extras) and delivery address when applicable.',
    }),
    ApiOkResponse({
      description: 'Non-terminal orders, newest first',
      schema: {
        example: activeOrdersResponseExample,
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
