import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiOperation,
} from '@nestjs/swagger';

const TagExample = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  name: 'Vegan',
};

export const ApiGetTags = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get all tags',
      description:
        'Returns all tags. Used to populate the tag pills (Classic / Specialty / Vegan / Gourmet) in the admin form.',
    }),
    ApiOkResponse({
      schema: {
        example: {
          success: true,
          statusCode: 200,
          message: 'Success',
          data: [TagExample],
        },
      },
    }),
  );

export const ApiCreateTag = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Create tag' }),
    ApiCreatedResponse({
      schema: {
        example: {
          success: true,
          statusCode: 201,
          message: 'Tag created',
          data: TagExample,
        },
      },
    }),
    ApiConflictResponse({
      schema: { example: { statusCode: 409, message: 'Tag already exists' } },
    }),
  );

export const ApiUpdateTag = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Rename tag' }),
    ApiOkResponse({
      schema: {
        example: {
          success: true,
          statusCode: 200,
          message: 'Tag updated',
          data: TagExample,
        },
      },
    }),
    ApiNotFoundResponse({
      schema: { example: { statusCode: 404, message: 'Tag not found' } },
    }),
  );

export const ApiDeleteTag = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Delete tag',
      description: 'Deletes a tag. Cascades to item_tags junction table.',
    }),
    ApiNoContentResponse({ description: 'Tag deleted' }),
    ApiNotFoundResponse({
      schema: { example: { statusCode: 404, message: 'Tag not found' } },
    }),
  );
