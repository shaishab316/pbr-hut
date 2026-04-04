import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { QueryOrderHistoryQueryModel } from './models/query-order-history.model';
import { orderHistoryResponseExample } from './models/order-response.example';

export const ApiListOrderHistory = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Order history',
      description:
        'Paginated list of **completed** orders for the current user: **DELIVERED**, **PICKED_UP**, or **CANCELLED**. ' +
        'Sorted by `createdAt` descending.',
    }),
    ApiExtraModels(QueryOrderHistoryQueryModel),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      example: 1,
      description: '1-based page index (default: 1)',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      example: 20,
      description: 'Page size, 1–100 (default: 20)',
    }),
    ApiOkResponse({
      description: 'Paginated past orders',
      schema: {
        example: orderHistoryResponseExample,
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
