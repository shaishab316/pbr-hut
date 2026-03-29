import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ResetPasswordRequest } from './models/reset-password.model';

export const ApiResetPassword = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Reset Password',
      description:
        'Resets the user password using the short-lived token issued ' +
        'after successful OTP verification. Token is single-use and expires shortly.',
    }),
    ApiExtraModels(ResetPasswordRequest),
    ApiBody({ type: ResetPasswordRequest }),
    ApiOkResponse({
      description: 'Password reset successfully',
      schema: {
        example: {
          success: true,
          statusCode: 200,
          message: 'Password has been reset successfully.',
          data: null,
        },
      },
    }),
    ApiBadRequestResponse({
      description:
        'Validation error — password too short/long or missing token',
      schema: {
        example: {
          message: 'Password must be at least 8 characters long',
          error: 'Bad Request',
          statusCode: 400,
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid or expired reset token',
      schema: {
        example: {
          message: 'Reset token is invalid or has expired',
          error: 'Unauthorized',
          statusCode: 401,
        },
      },
    }),
  );
