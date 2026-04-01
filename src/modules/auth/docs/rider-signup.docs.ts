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
  EmailRiderSignUpModel,
  PhoneRiderSignUpModel,
} from './models/rider-signup.model';

export const ApiRiderSignUp = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Register a new rider',
      description:
        'Sends OTP to email or phone and stores rider location (latitude/longitude). Discriminated by `identifierType`.',
    }),
    ApiExtraModels(EmailRiderSignUpModel, PhoneRiderSignUpModel),
    ApiBody({
      schema: {
        oneOf: [
          { $ref: getSchemaPath(EmailRiderSignUpModel) },
          { $ref: getSchemaPath(PhoneRiderSignUpModel) },
        ],
        discriminator: {
          propertyName: 'identifierType',
          mapping: {
            email: getSchemaPath(EmailRiderSignUpModel),
            phone: getSchemaPath(PhoneRiderSignUpModel),
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
