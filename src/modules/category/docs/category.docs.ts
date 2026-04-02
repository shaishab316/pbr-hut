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

const CategoryExample = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Pizzas',
};
const SubCategoryExample = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Classic',
  categoryId: '550e8400-e29b-41d4-a716-446655440000',
};

export const ApiGetCategories = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get all categories',
      description:
        'Returns all categories with their sub-categories. Used to populate the category dropdown in the admin form.',
    }),
    ApiOkResponse({
      schema: {
        example: {
          success: true,
          statusCode: 200,
          message: 'Success',
          data: [
            {
              ...CategoryExample,
              subCategories: [SubCategoryExample],
            },
          ],
        },
      },
    }),
  );

export const ApiCreateCategory = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Create category' }),
    ApiCreatedResponse({
      schema: {
        example: {
          success: true,
          statusCode: 201,
          message: 'Category created',
          data: CategoryExample,
        },
      },
    }),
    ApiConflictResponse({
      schema: {
        example: { statusCode: 409, message: 'Category already exists' },
      },
    }),
  );

export const ApiUpdateCategory = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Rename category' }),
    ApiOkResponse({
      schema: {
        example: {
          success: true,
          statusCode: 200,
          message: 'Category updated',
          data: CategoryExample,
        },
      },
    }),
    ApiNotFoundResponse({
      schema: { example: { statusCode: 404, message: 'Category not found' } },
    }),
  );

export const ApiDeleteCategory = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Delete category',
      description:
        'Deletes a category. Will fail if items are still linked to it (FK constraint).',
    }),
    ApiNoContentResponse({ description: 'Category deleted' }),
    ApiNotFoundResponse({
      schema: { example: { statusCode: 404, message: 'Category not found' } },
    }),
  );

// ─── SubCategory ──────────────────────────────────────────────────────────────

export const ApiGetSubCategories = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get sub-categories by category',
      description: 'Returns all sub-categories under a given category.',
    }),
    ApiOkResponse({
      schema: {
        example: {
          success: true,
          statusCode: 200,
          message: 'Success',
          data: [SubCategoryExample],
        },
      },
    }),
    ApiNotFoundResponse({
      schema: { example: { statusCode: 404, message: 'Category not found' } },
    }),
  );

export const ApiCreateSubCategory = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Create sub-category under a category' }),
    ApiCreatedResponse({
      schema: {
        example: {
          success: true,
          statusCode: 201,
          message: 'SubCategory created',
          data: SubCategoryExample,
        },
      },
    }),
    ApiNotFoundResponse({
      schema: { example: { statusCode: 404, message: 'Category not found' } },
    }),
    ApiConflictResponse({
      schema: {
        example: {
          statusCode: 409,
          message: 'SubCategory already exists under this category',
        },
      },
    }),
  );

export const ApiUpdateSubCategory = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Rename sub-category' }),
    ApiOkResponse({
      schema: {
        example: {
          success: true,
          statusCode: 200,
          message: 'SubCategory updated',
          data: SubCategoryExample,
        },
      },
    }),
    ApiNotFoundResponse({
      schema: {
        example: { statusCode: 404, message: 'SubCategory not found' },
      },
    }),
  );

export const ApiDeleteSubCategory = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Delete sub-category' }),
    ApiNoContentResponse({ description: 'SubCategory deleted' }),
    ApiNotFoundResponse({
      schema: {
        example: { statusCode: 404, message: 'SubCategory not found' },
      },
    }),
  );
