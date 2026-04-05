import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export const ApiUpdateRiderLocation = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Update rider location',
      description:
        'Persists **latitude**, **longitude**, and recomputes **h3Index** (resolution 7, same as orders) using `H3IndexUtil`. ' +
        'Creates a `RiderProfile` row if none exists. **Rider role only.**\n\n' +
        'Call this regularly while online so nearby order requests and H3-based matching stay accurate.',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['latitude', 'longitude'],
        properties: {
          latitude: {
            type: 'number',
            example: 23.810331,
            minimum: -90,
            maximum: 90,
            description: 'WGS-84 latitude',
          },
          longitude: {
            type: 'number',
            example: 90.412521,
            minimum: -180,
            maximum: 180,
            description: 'WGS-84 longitude',
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'Profile updated with new coordinates and H3 cell',
      schema: {
        example: {
          success: true,
          statusCode: 200,
          message: 'Location updated',
          data: {
            userId: '01KMZ7E364PR7TFEGYNW1PY1B4',
            latitude: 23.810331,
            longitude: 90.412521,
            h3Index: '873cf13b0ffffff',
            nidFrontUrl: null,
            nidBackUrl: null,
            nidStatus: 'NOT_SUBMITTED',
            verifiedAt: null,
            rejectionReason: null,
            isAvailable: false,
            isBusy: false,
            createdAt: '2026-03-30T11:18:02.920Z',
            updatedAt: '2026-04-04T12:00:00.000Z',
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Validation failed (lat/lng out of range)',
      schema: {
        example: {
          statusCode: 400,
          message: 'Validation failed',
          error: 'Bad Request',
        },
      },
    }),
    ApiForbiddenResponse({
      description: 'Authenticated user is not a rider',
      schema: {
        example: {
          message: 'You do not have permission to access this resource',
          statusCode: 403,
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid JWT',
      schema: {
        example: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      },
    }),
  );

export const ApiUploadNid = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Upload national ID images',
      description:
        "Uploads the front and back of the rider's national ID. Images are stored and the rider profile `nidStatus` is set to PENDING. Allowed types: JPEG, PNG, WebP. Maximum 5 MB per file.",
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['nidFront', 'nidBack'],
        properties: {
          nidFront: {
            type: 'string',
            format: 'binary',
            description: 'Front of the national ID (one image)',
          },
          nidBack: {
            type: 'string',
            format: 'binary',
            description: 'Back of the national ID (one image)',
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'NID images uploaded; rider profile updated',
      schema: {
        example: {
          success: true,
          statusCode: 201,
          message: 'Success',
          data: {
            userId: '01KMZ7E364PR7TFEGYNW1PY1B4',
            latitude: 23.810331,
            longitude: 90.412521,
            h3Index: '873cf13b0ffffff',
            nidFrontUrl:
              'https://res.cloudinary.com/dibd5ymvh/image/upload/v1775038586/nid/gwqfovadeuofuwjhd1rd.jpg',
            nidBackUrl:
              'https://res.cloudinary.com/dibd5ymvh/image/upload/v1775038586/nid/dzc7l2tthi8qvhvpzjoh.jpg',
            nidStatus: 'PENDING',
            verifiedAt: null,
            rejectionReason: null,
            isAvailable: false,
            isBusy: false,
            createdAt: '2026-03-30T11:18:02.920Z',
            updatedAt: '2026-04-01T10:16:24.409Z',
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description:
        'Invalid multipart fields, MIME type not allowed, or file exceeds size limit',
      schema: {
        example: {
          statusCode: 400,
          message: '"nidFront" does not accept "image/gif"',
          error: 'Bad Request',
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid JWT',
      schema: {
        example: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      },
    }),
  );
