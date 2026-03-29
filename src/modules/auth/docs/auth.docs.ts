import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { EmailSignUpModel } from './models/email-signup.model';
import { PhoneSignUpModel } from './models/phone-signup.model';
import { EmailLoginModel } from './models/email-login.model';
import { PhoneLoginModel } from './models/phone-login.model';

const SignUpSchema = () => ({
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
});

const LoginSchema = () => ({
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
});

export const ApiSignUp = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Register a new user',
      description:
        'Sends OTP to email or phone. Discriminated by `identifierType`.',
    }),
    ApiExtraModels(EmailSignUpModel, PhoneSignUpModel),
    ApiBody({ schema: SignUpSchema() }),
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
    ApiBody({ schema: LoginSchema() }),
    ApiOkResponse({
      description: 'Login successful',
      schema: {
        example: {
          success: true,
          statusCode: 200,
          message: 'Login successful',
          data: {
            token:
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMUtNVllTSEZXRzBHUzNBSlNFOEtHMVFTMCIsImlkZW50aWZpZXIiOiJqb2huQGV4YW1wbGUuY29tIiwiaWF0IjoxNzc0NzU5NzYyLCJleHAiOjE3NzczNTE3NjJ9.2t021l5TuEPSr9aDghih5cKGsgVrmGPRbf-2GDwi2Eo',
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
      description: 'Verify the 6-digit OTP sent during registration.',
    }),
    ApiBody({
      schema: {
        example: { identifier: 'john@example.com', otp: '123456' },
      },
    }),
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
