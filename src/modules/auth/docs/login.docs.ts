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
import { EmailLoginModel, PhoneLoginModel } from './models/login.model';

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
