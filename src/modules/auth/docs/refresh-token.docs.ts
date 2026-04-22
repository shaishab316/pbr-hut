import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export const ApiRefreshToken = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Refresh Access Token',
      description: 'Generate a new access token using a valid refresh token',
    }),
    ApiBody({
      schema: {
        example: {
          refreshToken:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxxxxxx.2t021l5TuEPSr9aDghih5cKGsgVrmGPRbf-2GDwi2Eo',
        },
      },
    }),
    ApiOkResponse({
      description: 'Access token refreshed successfully',
      schema: {
        example: {
          success: true,
          statusCode: 200,
          message: 'Access token refreshed successfully',
          data: {
            token:
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxxxxxx.2t021l5TuEPSr9aDghih5cKGsgVrmGPRbf-2GDwi2Eo',
            user: {
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
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid or expired refresh token',
      schema: {
        example: {
          statusCode: 401,
          message: 'Invalid or expired refresh token',
        },
      },
    }),
  );
