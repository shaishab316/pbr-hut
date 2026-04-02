import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { FlatCreateItemModel, JsonCreateItemModel } from './models/item.model';

export const ApiCreateItem = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiConsumes('multipart/form-data'),
    ApiOperation({
      summary: 'Create item',
      description:
        'Creates a menu item with all nested data in one transaction. ' +
        'Two payload styles supported — **Flat fields** (bracket notation) or **JSON data field**. Pick one.',
    }),
    ApiExtraModels(FlatCreateItemModel, JsonCreateItemModel),
    ApiBody({
      schema: {
        oneOf: [
          { $ref: getSchemaPath(FlatCreateItemModel) },
          { $ref: getSchemaPath(JsonCreateItemModel) },
        ],
        discriminator: {
          propertyName: 'style',
          mapping: {
            flat: getSchemaPath(FlatCreateItemModel),
            json: getSchemaPath(JsonCreateItemModel),
          },
        },
      },
    }),
    ApiCreatedResponse({
      description: 'Item created successfully',
      schema: {
        example: {
          success: true,
          statusCode: 201,
          message: 'Item created',
          data: {
            id: '550e8400-e29b-41d4-a716-446655440010',
            name: 'Classic Margherita',
            imageUrl:
              'https://res.cloudinary.com/demo/image/upload/items/classic-margherita.jpg',
            displayOrder: 1,
            isDeliverable: true,
            isAvailable: true,
            allowCustomNote: true,
            isSideFree: true,
            isExtrasOptional: true,
            hasSizeVariants: true,
            hasExtras: true,
            category: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Pizzas',
            },
            subCategory: {
              id: '550e8400-e29b-41d4-a716-446655440001',
              name: 'Classic',
            },
            tags: [
              {
                tag: {
                  id: '550e8400-e29b-41d4-a716-446655440002',
                  name: 'Vegan',
                },
              },
            ],
            sizeVariants: [
              { id: 'sv-1', size: 'SMALL', price: '8.00' },
              { id: 'sv-2', size: 'REGULAR', price: '14.50' },
              { id: 'sv-3', size: 'MEDIUM', price: '16.00' },
              { id: 'sv-4', size: 'LARGE', price: '19.00' },
            ],
            sideOptions: [
              {
                id: 'so-1',
                name: 'Cajun Fries',
                price: '0.00',
                isDefault: false,
              },
              {
                id: 'so-2',
                name: 'House Salad',
                price: '0.00',
                isDefault: false,
              },
              {
                id: 'so-3',
                name: 'Buttered Corn',
                price: '0.00',
                isDefault: true,
              },
            ],
            extras: [
              { id: 'ex-1', name: 'Extra Bourbon Sauce', price: '2.00' },
              { id: 'ex-2', name: 'Black Olives', price: '2.00' },
            ],
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Validation failed',
      schema: {
        examples: {
          missingImage: {
            summary: 'No image uploaded',
            value: { statusCode: 400, message: 'image file is required' },
          },
          duplicateSize: {
            summary: 'Duplicate size variant',
            value: { statusCode: 400, message: 'Duplicate size entries' },
          },
          multipleDefaults: {
            summary: 'More than one default side',
            value: {
              statusCode: 400,
              message: 'Only one side option can be default',
            },
          },
          invalidTags: {
            summary: 'Invalid tagIds',
            value: {
              statusCode: 400,
              message: 'One or more tagIds are invalid',
            },
          },
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Category or SubCategory not found',
      schema: {
        examples: {
          categoryNotFound: {
            summary: 'Category not found',
            value: { statusCode: 404, message: 'Category not found' },
          },
          subCategoryNotFound: {
            summary: 'SubCategory not found or wrong category',
            value: {
              statusCode: 404,
              message:
                'SubCategory not found or does not belong to the given category',
            },
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid JWT',
      schema: {
        example: { statusCode: 401, message: 'Unauthorized' },
      },
    }),
  );
