import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  getSchemaPath,
} from '@nestjs/swagger';
import { EmailSignUpModel, PhoneSignUpModel } from './models/signup.model';

export const ApiCustomerSignUp = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Register a new customer',
      description:
        'Sends OTP to email or phone. Discriminated by `identifierType`. Customer can sign up with email or phone.',
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
