import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export const ApiGetOrder = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get order by id',
      description:
        'Returns a single order with items, extras, delivery address, and billing address (if stored).',
    }),
    ApiOkResponse({ description: 'Order detail' }),
    ApiNotFoundResponse({ description: 'Order not found' }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid JWT',
      schema: {
        example: { message: 'Unauthorized', statusCode: 401 },
      },
    }),
  );
