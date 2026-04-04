import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  FlatCreateItemModel,
  JsonCreateItemModel,
  FlatUpdateItemModel,
  JsonUpdateItemModel,
} from './models/item.model';

export const ApiGetItems = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List items',
      description:
        'Returns paginated menu items. Search matches **name** or **description** (case-insensitive). ' +
        'Filter by **categoryId** and/or **subCategoryId**. Pagination uses **page** and **limit** (1-based page index).',
    }),
    ApiQuery({
      name: 'search',
      required: false,
      description: 'Matches item name or description',
    }),
    ApiQuery({
      name: 'categoryId',
      required: false,
      type: 'string',
      format: 'uuid',
    }),
    ApiQuery({
      name: 'subCategoryId',
      required: false,
      type: 'string',
      format: 'uuid',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: '1-based page index (default 1)',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Page size (1–100, default 20)',
    }),
    ApiOkResponse({
      description: 'Paginated items',
      schema: {
        example: {
          success: true,
          statusCode: 200,
          message: 'Success',
          data: [
            {
              id: 'f0f70859-d779-488a-a774-df78b6ec677a',
              name: 'Smoky BBQ Bacon Burger',
              description:
                'Two smashed beef patties, melted cheddar, crispy bacon, and bourbon BBQ sauce on a toasted brioche bun. Served with pickles and our house burger sauce on the side.',
              imageUrl:
                'https://res.cloudinary.com/dibd5ymvh/image/upload/v1775125147/items/atdtsfrwxl6tga69eoqc.jpg',
              displayOrder: 1,
              isDeliverable: true,
              isAvailable: true,
              allowCustomNote: true,
              isSideFree: true,
              isExtrasOptional: true,
              hasSizeVariants: true,
              hasExtras: true,
              categoryId: 'a9056df2-ad06-49b7-90dd-a0ec50c40ad8',
              subCategoryId: '86ca3397-ec3d-4e98-aac1-b9b0074a7ef4',
              createdAt: '2026-04-02T10:19:05.052Z',
              updatedAt: '2026-04-02T10:19:05.052Z',
              category: {
                id: 'a9056df2-ad06-49b7-90dd-a0ec50c40ad8',
                name: 'Burgers',
              },
              subCategory: {
                id: '86ca3397-ec3d-4e98-aac1-b9b0074a7ef4',
                name: 'Classic Beef',
              },
              tags: [],
              sizeVariants: [
                {
                  id: 'b780ebf0-c447-4db5-8251-40863a081bd7',
                  size: 'SMALL',
                  price: '9.5',
                },
                {
                  id: '78488138-6f81-452c-9a7f-ac2c82cfefc9',
                  size: 'REGULAR',
                  price: '12.9',
                },
              ],
              sideOptions: [
                {
                  id: '48d24932-838e-4c7e-8c35-e8920afc7fad',
                  name: 'Cajun seasoned fries',
                  price: '0',
                  isDefault: true,
                },
              ],
              extras: [
                {
                  id: '5ac901c2-3cda-416d-ac30-e566675dfa35',
                  name: 'Extra beef patty',
                  price: '3.5',
                },
              ],
            },
          ],
          meta: { total: 2, limit: 20, page: 1, totalPages: 1 },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid JWT',
      schema: { example: { statusCode: 401, message: 'Unauthorized' } },
    }),
  );

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
          message: 'Success',
          data: {
            id: '6c35b16d-267a-4cfb-9a38-6eb4c5c46346',
            name: 'Spicy Jalapeño Double Stack',
            description:
              'Two beef patties, pepper jack cheese, fresh jalapeños, chipotle mayo.',
            imageUrl:
              'https://res.cloudinary.com/dibd5ymvh/image/upload/v1775125344/items/adbnbxuadynwxygo0ifw.jpg',
            displayOrder: 2,
            isDeliverable: true,
            isAvailable: true,
            allowCustomNote: true,
            isSideFree: false,
            isExtrasOptional: true,
            hasSizeVariants: true,
            hasExtras: true,
            categoryId: 'a9056df2-ad06-49b7-90dd-a0ec50c40ad8',
            subCategoryId: '86ca3397-ec3d-4e98-aac1-b9b0074a7ef4',
            createdAt: '2026-04-02T10:22:22.573Z',
            updatedAt: '2026-04-02T10:22:22.573Z',
            category: {
              id: 'a9056df2-ad06-49b7-90dd-a0ec50c40ad8',
              name: 'Burgers',
            },
            subCategory: {
              id: '86ca3397-ec3d-4e98-aac1-b9b0074a7ef4',
              name: 'Classic Beef',
            },
            tags: [],
            sizeVariants: [
              {
                id: 'afec4266-6a28-4ba2-a9f4-7fe2077aebff',
                size: 'SMALL',
                price: '8.25',
              },
              {
                id: '3925de99-35db-4790-af21-3f7dfaa189c3',
                size: 'REGULAR',
                price: '11.5',
              },
            ],
            sideOptions: [
              {
                id: 'a84fa60c-9b3a-481d-bb1b-61c0ecd8d2c4',
                name: 'Straight-cut fries',
                price: '2.5',
                isDefault: false,
              },
              {
                id: '5241725f-aa0b-4b1c-b87c-09d9d88a6e52',
                name: 'Sweet potato fries',
                price: '3',
                isDefault: true,
              },
            ],
            extras: [
              {
                id: '090aa854-7b92-4153-b2bd-fd7f21f683db',
                name: 'Extra jalapeños',
                price: '1',
              },
            ],
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
      schema: { example: { statusCode: 401, message: 'Unauthorized' } },
    }),
    ApiForbiddenResponse({
      description: 'Caller is not ADMIN',
      schema: { example: { statusCode: 403, message: 'Forbidden resource' } },
    }),
  );

export const ApiUpdateItem = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiConsumes('multipart/form-data'),
    ApiOperation({
      summary: 'Update item',
      description:
        'Partially updates a menu item. **Only supplied fields are changed** — omitted fields retain their current values. ' +
        'Nested arrays (`sizeVariants`, `sideOptions`, `extras`, `tagIds`) use **replace semantics**: ' +
        'when provided the full set replaces the existing records; omit the array entirely to leave it untouched. ' +
        'Same two payload styles as POST — **Flat fields** or **JSON data field**. Pick one.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Item ID' }),
    ApiExtraModels(FlatUpdateItemModel, JsonUpdateItemModel),
    ApiBody({
      schema: {
        oneOf: [
          { $ref: getSchemaPath(FlatUpdateItemModel) },
          { $ref: getSchemaPath(JsonUpdateItemModel) },
        ],
        discriminator: {
          propertyName: 'style',
          mapping: {
            flat: getSchemaPath(FlatUpdateItemModel),
            json: getSchemaPath(JsonUpdateItemModel),
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'Item updated successfully',
      schema: {
        example: {
          message: 'Item updated successfully',
          data: {
            id: 'f0f70859-d779-488a-a774-df78b6ec677a',
            name: 'Smoky BBQ Bacon Burger — Updated',
            description:
              'Two smashed beef patties, melted cheddar, crispy bacon, and bourbon BBQ sauce.',
            imageUrl:
              'https://res.cloudinary.com/dibd5ymvh/image/upload/v1775125999/items/newimage.jpg',
            displayOrder: 1,
            isDeliverable: true,
            isAvailable: false,
            allowCustomNote: true,
            isSideFree: true,
            isExtrasOptional: true,
            hasSizeVariants: true,
            hasExtras: true,
            categoryId: 'a9056df2-ad06-49b7-90dd-a0ec50c40ad8',
            subCategoryId: '86ca3397-ec3d-4e98-aac1-b9b0074a7ef4',
            createdAt: '2026-04-02T10:19:05.052Z',
            updatedAt: '2026-04-02T11:05:14.320Z',
            category: {
              id: 'a9056df2-ad06-49b7-90dd-a0ec50c40ad8',
              name: 'Burgers',
            },
            subCategory: {
              id: '86ca3397-ec3d-4e98-aac1-b9b0074a7ef4',
              name: 'Classic Beef',
            },
            tags: [],
            sizeVariants: [
              {
                id: 'c1b2e3f4-0000-0000-0000-000000000001',
                size: 'SMALL',
                price: '9.5',
              },
              {
                id: 'c1b2e3f4-0000-0000-0000-000000000002',
                size: 'REGULAR',
                price: '12.9',
              },
            ],
            sideOptions: [
              {
                id: 'd1e2f3a4-0000-0000-0000-000000000001',
                name: 'Cajun seasoned fries',
                price: '0',
                isDefault: true,
              },
            ],
            extras: [
              {
                id: 'e1f2a3b4-0000-0000-0000-000000000001',
                name: 'Extra beef patty',
                price: '3.5',
              },
            ],
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Validation failed',
      schema: {
        examples: {
          duplicateSize: {
            summary: 'Duplicate size variant in the new array',
            value: { statusCode: 400, message: 'Duplicate size entries' },
          },
          multipleDefaults: {
            summary: 'More than one default side in the new array',
            value: {
              statusCode: 400,
              message: 'Only one side option can be default',
            },
          },
          invalidTags: {
            summary: 'One or more tagIds do not exist',
            value: {
              statusCode: 400,
              message: 'One or more tagIds are invalid',
            },
          },
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Item, Category, or SubCategory not found',
      schema: {
        examples: {
          itemNotFound: {
            summary: 'Item not found or already deleted',
            value: { statusCode: 404, message: 'Item not found' },
          },
          categoryNotFound: {
            summary: 'Provided categoryId does not exist',
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
      schema: { example: { statusCode: 401, message: 'Unauthorized' } },
    }),
    ApiForbiddenResponse({
      description: 'Caller is not ADMIN',
      schema: { example: { statusCode: 403, message: 'Forbidden resource' } },
    }),
  );

export const ApiDeleteItem = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Delete item (soft)',
      description:
        'Soft-deletes an item by stamping `deletedAt`. The item is immediately hidden from all list and query endpoints ' +
        'but remains in the database for audit purposes. This action is **irreversible** via the API.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Item ID to delete' }),
    ApiOkResponse({
      description: 'Item deleted successfully',
      schema: {
        example: { message: 'Item deleted successfully' },
      },
    }),
    ApiNotFoundResponse({
      description: 'Item not found or already deleted',
      schema: {
        example: { statusCode: 404, message: 'Item not found' },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid JWT',
      schema: { example: { statusCode: 401, message: 'Unauthorized' } },
    }),
    ApiForbiddenResponse({
      description: 'Caller is not ADMIN',
      schema: { example: { statusCode: 403, message: 'Forbidden resource' } },
    }),
  );
