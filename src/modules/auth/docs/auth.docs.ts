import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { EmailSignUpModel, PhoneSignUpModel } from './models/signup.model';
import { EmailLoginModel, PhoneLoginModel } from './models/login.model';
import {
  VerifyOtpEmailRequest,
  VerifyOtpPhoneRequest,
} from './models/verifyotp.model';
import {
  ForgotPasswordEmailRequest,
  ForgotPasswordPhoneRequest,
} from './models/forgot-password.model';
import { ResetPasswordRequest } from './models/reset-password.model';

export const ApiSignUp = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Register a new user',
      description:
        'Sends OTP to email or phone. Discriminated by `identifierType`.',
    }),
    ApiExtraModels(EmailSignUpModel, PhoneSignUpModel),
    ApiBody({
      schema: {
        oneOf: [
          { $ref: getSchemaPath(EmailSignUpModel) },
          { $ref: getSchemaPath(PhoneSignUpModel) },
        ],
        discriminator: {
          propertyName: 'identifierType',
          mapping: {
            email: getSchemaPath(EmailSignUpModel),
            phone: getSchemaPath(PhoneSignUpModel),
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
          message: 'Verification sent',
          data: {
            identifier: 'john@example.com',
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Validation failed or account already exists',
      schema: {
        example: {
          statusCode: 400,
          message:
            'Already have an account with this identifier, please login instead',
          error: 'Bad Request',
        },
      },
    }),
  );

export const ApiLogin = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Login',
      description:
        'Authenticate with email or phone + password. Discriminated by `identifierType`.',
    }),
    ApiExtraModels(EmailLoginModel, PhoneLoginModel),
    ApiBody({
      schema: {
        oneOf: [
          { $ref: getSchemaPath(EmailLoginModel) },
          { $ref: getSchemaPath(PhoneLoginModel) },
        ],
        discriminator: {
          propertyName: 'identifierType',
          mapping: {
            email: getSchemaPath(EmailLoginModel),
            phone: getSchemaPath(PhoneLoginModel),
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'Login successful',
      schema: {
        example: {
          success: true,
          statusCode: 200,
          message: 'Login successful',
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
    ApiBadRequestResponse({
      description: 'Malformed request or validation failed',
      schema: {
        example: {
          statusCode: 400,
          message: 'Validation failed',
          errors: [
            {
              origin: 'string',
              code: 'too_small',
              minimum: 8,
              inclusive: true,
              path: ['password'],
              message: 'Password must be at least 8 characters',
            },
          ],
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid credentials or incorrect password',
      schema: {
        example: {
          message: 'Invalid credentials, incorrect password',
          error: 'Bad Request',
          statusCode: 400,
        },
      },
    }),
  );

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

export const ApiResendOtp = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Resend OTP',
      description:
        'Resend OTP to the same identifier used during registration.',
    }),
    ApiBody({
      schema: {
        example: { identifier: 'john@example.com' },
      },
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
