import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  ForgotPasswordEmailRequest,
  ForgotPasswordPhoneRequest,
} from './models/forgot-password.model';

export const ApiForgotPassword = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Forgot Password',
      description:
        'Initiates the password reset flow by sending a 6-digit OTP to the provided ' +
        'email or phone number. Use `identifierType` to select the variant.',
    }),
    ApiExtraModels(ForgotPasswordEmailRequest, ForgotPasswordPhoneRequest),
    ApiBody({
      schema: {
        oneOf: [
          { $ref: getSchemaPath(ForgotPasswordEmailRequest) },
          { $ref: getSchemaPath(ForgotPasswordPhoneRequest) },
        ],
        discriminator: {
          propertyName: 'identifierType',
          mapping: {
            email: getSchemaPath(ForgotPasswordEmailRequest),
            phone: getSchemaPath(ForgotPasswordPhoneRequest),
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'OTP sent successfully',
      schema: {
        example: {
          success: true,
          statusCode: 200,
          message: 'OTP sent successfully. Please check your email/phone.',
          data: null,
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Validation error — invalid email/phone format',
      schema: {
        example: {
          message: 'Invalid email address',
          error: 'Bad Request',
          statusCode: 400,
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'No account found for the given identifier',
      schema: {
        example: {
          message: 'No account found with this email/phone',
          error: 'Not Found',
          statusCode: 404,
        },
      },
    }),
  );
