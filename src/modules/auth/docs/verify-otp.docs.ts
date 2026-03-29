import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  VerifyOtpEmailRequest,
  VerifyOtpPhoneRequest,
} from './models/verifyotp.model';

export const ApiVerifyOtp = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Verify OTP',
      description:
        'Verify the 6-digit OTP sent during registration or password reset. ' +
        'Supports email and phone identifiers via `identifierType` discriminator.',
    }),
    ApiBody({
      schema: {
        oneOf: [
          { $ref: getSchemaPath(VerifyOtpEmailRequest) },
          { $ref: getSchemaPath(VerifyOtpPhoneRequest) },
        ],
        discriminator: {
          propertyName: 'identifierType',
          mapping: {
            email: getSchemaPath(VerifyOtpEmailRequest),
            phone: getSchemaPath(VerifyOtpPhoneRequest),
          },
        },
      },
    }),
    ApiExtraModels(VerifyOtpEmailRequest, VerifyOtpPhoneRequest),
    ApiOkResponse({
      description: 'Account verified successfully',
      schema: {
        example: {
          success: true,
          statusCode: 200,
          message: 'Account verified successfully',
          data: null,
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid/expired OTP or session expired',
      schema: {
        example: {
          message: 'Invalid or expired OTP',
          error: 'Bad Request',
          statusCode: 400,
        },
      },
    }),
  );
