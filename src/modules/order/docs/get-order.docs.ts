import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiOrderIdParam } from './order-id.param';
import { getOrderResponseExample } from './models/order-response.example';

export const ApiGetOrder = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOrderIdParam,
    ApiOperation({
      summary: 'Get order by id',
      description:
        'Returns one order owned by the caller, including **items + extras**, **deliveryAddress** (delivery orders), ' +
        'and **billingAddress** when it was captured (e.g. card checkout).',
    }),
    ApiOkResponse({
      description: 'Order detail',
      schema: {
        example: getOrderResponseExample,
      },
    }),
    ApiNotFoundResponse({
      description: 'No order with this id for the current user',
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
