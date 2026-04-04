import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export const ApiListOrderHistory = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Order history',
      description:
        'Paginated list of completed, picked up, or cancelled orders for the authenticated user.',
    }),
    ApiOkResponse({ description: 'Paginated orders' }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid JWT',
      schema: {
        example: { message: 'Unauthorized', statusCode: 401 },
      },
    }),
  );
