import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export const ApiListActiveOrders = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'List active orders',
      description:
        'Returns orders that are not yet completed or cancelled (e.g. preparing or out for delivery).',
    }),
    ApiOkResponse({ description: 'Active orders' }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid JWT',
      schema: {
        example: { message: 'Unauthorized', statusCode: 401 },
      },
    }),
  );
