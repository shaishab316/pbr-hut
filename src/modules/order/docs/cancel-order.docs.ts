import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export const ApiCancelOrder = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Cancel order',
      description:
        'Cancels an order if it is still cancellable and within 10 minutes of being placed.',
    }),
    ApiOkResponse({ description: 'Order cancelled' }),
    ApiBadRequestResponse({ description: 'Cancellation not allowed' }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid JWT',
      schema: {
        example: { message: 'Unauthorized', statusCode: 401 },
      },
    }),
  );
