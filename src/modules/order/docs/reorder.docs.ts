import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export const ApiReorder = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Re-order',
      description:
        'Adds all lines from a past order back into the cart using current catalog IDs resolved from stored snapshots. Fails if any line can no longer be matched to the menu.',
    }),
    ApiOkResponse({ description: 'Updated cart after re-order' }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid JWT',
      schema: {
        example: { message: 'Unauthorized', statusCode: 401 },
      },
    }),
  );
