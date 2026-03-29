import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export const ApiGetMe = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get current user',
      description: 'Returns the authenticated user profile.',
    }),
    ApiOkResponse({
      description: 'Authenticated user',
      schema: {
        example: {
          success: true,
          statusCode: 200,
          message: 'Success',
          data: {
            id: '01KMVYSHFWG0GS3AJSE8KG1QS0',
            email: 'john@example.com',
            phone: null,
            name: 'John Doe',
            role: 'CUSTOMER',
            isActive: true,
            createdAt: '2026-03-29T04:49:07.964Z',
            updatedAt: '2026-03-29T04:49:17.308Z',
          },
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
