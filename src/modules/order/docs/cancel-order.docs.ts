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
import { cancelOrderResponseExample } from './models/order-response.example';

export const ApiCancelOrder = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOrderIdParam,
    ApiOperation({
      summary: 'Cancel order',
      description:
        'Cancels an order **only if**:\n\n' +
        '- It is still **cancellable** (not **DELIVERED**, **PICKED_UP**, or already **CANCELLED**), and\n' +
        '- **Within 10 minutes** of `createdAt`.\n\n' +
        'Otherwise returns `400`.',
    }),
    ApiOkResponse({
      description: 'Order marked cancelled',
      schema: {
        example: cancelOrderResponseExample,
      },
    }),
    ApiBadRequestResponse({
      description: 'Too late to cancel, or order already terminal',
      schema: {
        example: {
          message:
            'Orders can only be cancelled within 10 minutes of placing them',
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
