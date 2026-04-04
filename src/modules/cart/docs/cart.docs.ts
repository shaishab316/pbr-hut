import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

const cartResponseExample = {
  success: true,
  statusCode: 200,
  message: 'Success',
  data: {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    userId: '01KMVYSHFWG0GS3AJSE8KG1QS0',
    createdAt: '2026-04-04T10:00:00.000Z',
    updatedAt: '2026-04-04T10:00:00.000Z',
    items: [
      {
        id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        cartId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        itemId: 'f0f70859-d779-488a-a774-df78b6ec677a',
        quantity: 2,
        customNote: null,
        selectedSizeVariantId: '78488138-6f81-452c-9a7f-ac2c82cfefc9',
        selectedSideOptionId: '48d24932-838e-4c7e-8c35-e8920afc7fad',
        sizePrice: '12.90',
        sidePrice: '0.00',
        createdAt: '2026-04-04T10:00:00.000Z',
        updatedAt: '2026-04-04T10:00:00.000Z',
        item: {
          id: 'f0f70859-d779-488a-a774-df78b6ec677a',
          name: 'Smoky BBQ Bacon Burger',
          imageUrl: 'https://example.com/image.jpg',
          isAvailable: true,
          allowCustomNote: true,
          isSideFree: true,
          isExtrasOptional: true,
          hasSizeVariants: true,
          hasExtras: true,
          deletedAt: null,
        },
        selectedSizeVariant: {
          id: '78488138-6f81-452c-9a7f-ac2c82cfefc9',
          itemId: 'f0f70859-d779-488a-a774-df78b6ec677a',
          size: 'REGULAR',
          price: '12.90',
        },
        selectedSideOption: {
          id: '48d24932-838e-4c7e-8c35-e8920afc7fad',
          itemId: 'f0f70859-d779-488a-a774-df78b6ec677a',
          name: 'Cajun seasoned fries',
          price: '0.00',
          isDefault: true,
        },
        selectedExtras: [],
      },
    ],
  },
};

export const ApiGetCart = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get current cart',
      description:
        'Returns the authenticated user’s cart with line items, selected variants, sides, extras, and price snapshots. Creates an empty cart if none exists.',
    }),
    ApiOkResponse({
      description: 'Cart with items',
      schema: { example: cartResponseExample },
    }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid JWT',
      schema: {
        example: { message: 'Unauthorized', statusCode: 401 },
      },
    }),
  );

export const ApiAddCartItem = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Add item to cart',
      description:
        'Adds a menu item to the cart with the chosen size, side, and optional extras. Prices are snapshotted at add time. ' +
        'If an identical line (same item, size, side, extras, and note) already exists, quantities are merged.',
    }),
    ApiBody({
      schema: {
        example: {
          itemId: 'f0f70859-d779-488a-a774-df78b6ec677a',
          quantity: 1,
          selectedSizeVariantId: '78488138-6f81-452c-9a7f-ac2c82cfefc9',
          selectedSideOptionId: '48d24932-838e-4c7e-8c35-e8920afc7fad',
          extraIds: ['5ac901c2-3cda-416d-ac30-e566675dfa35'],
          customNote: 'No onions',
        },
      },
    }),
    ApiCreatedResponse({
      description: 'Cart after add',
      schema: { example: { ...cartResponseExample, statusCode: 201 } },
    }),
    ApiBadRequestResponse({
      description: 'Validation failed or item/options invalid',
      schema: {
        example: {
          statusCode: 400,
          message: 'Size variant is required for this item',
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid JWT',
      schema: {
        example: { message: 'Unauthorized', statusCode: 401 },
      },
    }),
  );

export const ApiUpdateCartItem = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Update cart line',
      description:
        'Updates quantity and/or custom note for a cart line owned by the current user.',
    }),
    ApiParam({
      name: 'cartItemId',
      format: 'uuid',
      description: 'Cart line item ID',
    }),
    ApiBody({
      schema: {
        examples: {
          quantity: { value: { quantity: 3 } },
          note: { value: { customNote: 'Extra sauce' } },
        },
      },
    }),
    ApiOkResponse({
      description: 'Cart after update',
      schema: { example: cartResponseExample },
    }),
    ApiBadRequestResponse({
      description: 'Validation failed',
    }),
    ApiNotFoundResponse({
      description: 'Cart line not found',
      schema: {
        example: { statusCode: 404, message: 'Cart item not found' },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid JWT',
      schema: {
        example: { message: 'Unauthorized', statusCode: 401 },
      },
    }),
  );

export const ApiRemoveCartItem = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Remove cart line',
      description: 'Removes a single line from the cart.',
    }),
    ApiParam({
      name: 'cartItemId',
      format: 'uuid',
      description: 'Cart line item ID',
    }),
    ApiOkResponse({
      description: 'Cart after removal',
      schema: { example: cartResponseExample },
    }),
    ApiNotFoundResponse({
      description: 'Cart line not found',
      schema: {
        example: { statusCode: 404, message: 'Cart item not found' },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid JWT',
      schema: {
        example: { message: 'Unauthorized', statusCode: 401 },
      },
    }),
  );

export const ApiClearCart = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Clear cart',
      description: 'Removes all lines from the cart. The cart record remains.',
    }),
    ApiOkResponse({
      description: 'Empty cart',
      schema: {
        example: {
          ...cartResponseExample,
          data: { ...cartResponseExample.data, items: [] },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid JWT',
      schema: {
        example: { message: 'Unauthorized', statusCode: 401 },
      },
    }),
  );
