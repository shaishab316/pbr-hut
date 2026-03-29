import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { VerifyOtpModel } from './models/resend-otp.model';

export const ApiResendOtp = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Resend OTP',
      description:
        'Resend OTP to the same identifier used during registration.',
    }),
    ApiExtraModels(VerifyOtpModel),
    ApiBody({
      type: VerifyOtpModel,
    }),
    ApiOkResponse({
      description: 'OTP resent successfully',
      schema: {
        example: {
          success: true,
          statusCode: 200,
          message: 'Verification resent',
          data: {
            identifier: 'shaishab316@gmail.com',
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Session expired, please sign up again',
      schema: {
        example: {
          message: 'Session expired, please sign up again',
          error: 'Bad Request',
          statusCode: 400,
        },
      },
    }),
  );
