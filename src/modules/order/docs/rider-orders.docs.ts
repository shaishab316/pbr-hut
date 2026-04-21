import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiOrderIdParam } from './order-id.param';
import { NearbyRiderOrdersDto } from '../dto/nearby-rider-orders.dto';

const nearbyExample = {
  success: true,
  statusCode: 200,
  message: 'Success',
  data: [
    {
      id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      orderNumber: 'POGK4J524',
      type: 'DELIVERY',
      status: 'PREPARING',
      h3Index: '873cf13b0ffffff',
      totalAmount: '50.00',
      distanceKm: 1.2,
      deliveryAddress: {
        latitude: 23.8103,
        longitude: 90.4125,
        address: '49 Bir Uttam AK Khandakar Rd',
      },
      items: [],
    },
  ],
  meta: { h3CellsSearched: 7, k: 1 },
};

export const ApiRiderNearbyRequests = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Nearby delivery requests (H3)',
      description:
        'Returns **unassigned** `DELIVERY` orders in **CONFIRMED** or **PREPARING** whose `h3Index` falls in the rider’s H3 k-ring ' +
        '(same resolution 7 as `RiderProfile.h3Index`). Uses `gridDisk(riderH3, k)` for O(cells) lookup, then sorts by **distanceKm** when drop-off lat/lng exist.\n\n' +
        'Requires `RiderProfile.h3Index` to be set.',
    }),
    ApiExtraModels(NearbyRiderOrdersDto),
    ApiQuery({
      name: 'k',
      required: false,
      type: Number,
      example: 1,
      description:
        'H3 grid disk radius around the rider cell (0 = single cell, 1 = 7 cells, …)',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      example: 20,
      description: 'Max rows after sort (1–50)',
    }),
    ApiOkResponse({
      description: 'Orders with optional `distanceKm` on each row',
      schema: { example: nearbyExample },
    }),
    ApiBadRequestResponse({
      description: 'Rider profile or H3 index missing',
      schema: {
        example: {
          statusCode: 400,
          message:
            'Update your rider location so your H3 index is set before listing nearby requests',
          error: 'Bad Request',
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Missing/invalid JWT or not a rider',
      schema: {
        example: { message: 'Forbidden', statusCode: 403 },
      },
    }),
  );

export const ApiRiderListAssigned = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'My active deliveries',
      description:
        'Orders **assigned to this rider** with status **OUT_FOR_DELIVERY**.',
    }),
    ApiOkResponse({
      description: 'Assigned orders (newest activity first)',
    }),
    ApiUnauthorizedResponse({
      description: 'Missing/invalid JWT or not a rider',
    }),
  );

export const ApiRiderGetOrder = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOrderIdParam,
    ApiOperation({
      summary: 'Get order (rider)',
      description:
        'Allowed if the order is **assigned to you**, or it is an **unassigned pool order** in your extended H3 area (k≤3).',
    }),
    ApiOkResponse({ description: 'Full order detail' }),
    ApiForbiddenResponse({
      description: 'Rider cannot view this order',
    }),
    ApiNotFoundResponse({ description: 'Unknown order id' }),
    ApiUnauthorizedResponse({ description: 'Not a rider' }),
  );

export const ApiRiderAcceptOrder = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOrderIdParam,
    ApiOperation({
      summary: 'Accept / claim order',
      description:
        'Assigns this rider if the order is still **unassigned**, **DELIVERY**, and **CONFIRMED** or **PREPARING**. ' +
        'Sets status to **OUT_FOR_DELIVERY**. If the order has an `h3Index`, it must lie in the rider’s k≤3 ring.',
    }),
    ApiOkResponse({ description: 'Order assigned' }),
    ApiBadRequestResponse({ description: 'Order not in pool or race lost' }),
    ApiForbiddenResponse({ description: 'Outside H3 service area' }),
    ApiNotFoundResponse({ description: 'Order not found' }),
    ApiUnauthorizedResponse({ description: 'Not a rider' }),
  );

export const ApiRiderDeliverOrder = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOrderIdParam,
    ApiOperation({
      summary: 'Complete delivery',
      description:
        'Sets status to **DELIVERED** and `deliveredAt` when the order is **OUT_FOR_DELIVERY** and assigned to you. ' +
        'Optional `confirmationCode` must match the customer code when provided.',
    }),
    ApiBody({
      required: false,
      schema: {
        type: 'object',
        properties: {
          confirmationCode: {
            type: 'string',
            minLength: 4,
            maxLength: 4,
            example: '4562',
            description:
              'Optional — must match the order’s confirmation code when sent',
          },
        },
      },
    }),
    ApiOkResponse({ description: 'Order delivered' }),
    ApiBadRequestResponse({
      description: 'Wrong state or confirmation code',
    }),
    ApiNotFoundResponse({ description: 'Not assigned to you' }),
    ApiUnauthorizedResponse({ description: 'Not a rider' }),
  );

export const ApiRiderOrderHistory = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'My delivery history',
      description:
        'Returns orders that have been **delivered**, **picked up**, or **cancelled** by this rider. ' +
        'Paginated by `limit` and `page` query parameters.',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      example: 20,
      description: 'Items per page (1–100, default 20)',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      example: 1,
      description: 'Page number (starts at 1, default 1)',
    }),
    ApiOkResponse({
      description: 'Delivery history with pagination metadata',
      schema: {
        example: {
          message: 'Order history retrieved successfully',
          data: [
            {
              id: 'order-id-123',
              orderNumber: 'POGK4J524',
              type: 'DELIVERY',
              status: 'DELIVERED',
              totalAmount: '50.00',
              createdAt: '2026-04-19T10:30:00Z',
              deliveredAt: '2026-04-19T11:00:00Z',
              deliveryAddress: {
                name: 'John Doe',
                address: '49 Bir Uttam AK Khandakar Rd',
              },
              items: [],
            },
          ],
          meta: {
            pagination: {
              page: 1,
              limit: 20,
              total: 42,
              totalPages: 3,
            },
            thisMonthOrderTotalCount: 12,
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid query parameters',
    }),
    ApiUnauthorizedResponse({ description: 'Not a rider' }),
  );

export const ApiRiderAddTime = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOrderIdParam,
    ApiOperation({
      summary: 'Add time to estimated arrival',
      description:
        'Extends the estimated arrival time by the specified minutes. ' +
        'Only works for orders that are **OUT_FOR_DELIVERY** and assigned to the rider.',
    }),
    ApiBody({
      required: true,
      schema: {
        type: 'object',
        properties: {
          timeInMinutes: {
            type: 'number',
            example: 15,
            description: 'Minutes to add to the estimated arrival time (1–180)',
          },
        },
        required: ['timeInMinutes'],
      },
    }),
    ApiOkResponse({
      description: 'Estimated arrival time updated',
      schema: {
        example: {
          message: 'Estimated arrival time updated',
          data: {
            id: 'order-id-123',
            orderNumber: 'POGK4J524',
            status: 'OUT_FOR_DELIVERY',
            estimatedArrivalAt: '2026-04-19T11:15:00Z',
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description:
        'Order not out for delivery, or no estimated arrival time set',
    }),
    ApiNotFoundResponse({
      description: 'Order not found or not assigned to you',
    }),
    ApiUnauthorizedResponse({ description: 'Not a rider' }),
  );

export const ApiRiderDeclineOrder = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOrderIdParam,
    ApiOperation({
      summary: 'Decline delivery order',
      description:
        'Declines an **unassigned** delivery order from the pool. ' +
        'The order remains available for other riders. ' +
        'Cannot decline twice or if already assigned to someone.',
    }),
    ApiOkResponse({
      description: 'Order declined',
      schema: {
        example: {
          message: 'Order declined',
        },
      },
    }),
    ApiBadRequestResponse({
      description:
        'Order is assigned, not delivery type, already declined, or not available',
    }),
    ApiNotFoundResponse({
      description: 'Order not found',
    }),
    ApiUnauthorizedResponse({ description: 'Not a rider' }),
  );
