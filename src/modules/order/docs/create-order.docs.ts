import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOperation,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  DeliveryOrderCardModel,
  DeliveryOrderCardScheduledModel,
  DeliveryOrderCashModel,
  DeliveryOrderCashScheduledModel,
  OrderBillingAddressBodyModel,
  OrderDeliveryAddressBodyModel,
  PickupOrderCardModel,
  PickupOrderCashModel,
} from './models/create-order.model';
import { createOrderResponseExample } from './models/order-response.example';

export const ApiCreateOrder = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Place order from cart',
      description:
        'Creates an order from the **current cart**: totals are **recomputed on the server** (subtotal, tax, delivery fee), line items are stored as snapshots, then the cart is cleared.\n\n' +
        '- `DELIVERY` → requires `deliveryAddress`; use `CASH_ON_DELIVERY` or `CARD`.\n' +
        '- `PICKUP` → omit `deliveryAddress`; use `CASH_ON_PICKUP` or `CARD`.\n' +
        '- `CARD` → requires `billing` (billing address snapshot).\n' +
        '- `deliveryTiming: SCHEDULED` → send `scheduledAt` (ISO-8601).\n\n' +
        'Card payments are stored as `paymentStatus: UNPAID` until a gateway marks them paid.',
    }),
    ApiExtraModels(
      OrderDeliveryAddressBodyModel,
      OrderBillingAddressBodyModel,
      DeliveryOrderCashModel,
      DeliveryOrderCardModel,
      DeliveryOrderCashScheduledModel,
      DeliveryOrderCardScheduledModel,
      PickupOrderCashModel,
      PickupOrderCardModel,
    ),
    ApiBody({
      description:
        'Discriminated by `type` → `paymentMethod` → `deliveryTiming`',
      schema: {
        oneOf: [
          { $ref: getSchemaPath(DeliveryOrderCashModel) },
          { $ref: getSchemaPath(DeliveryOrderCardModel) },
          { $ref: getSchemaPath(DeliveryOrderCashScheduledModel) },
          { $ref: getSchemaPath(DeliveryOrderCardScheduledModel) },
          { $ref: getSchemaPath(PickupOrderCashModel) },
          { $ref: getSchemaPath(PickupOrderCardModel) },
        ],
        discriminator: {
          propertyName: 'type',
          mapping: {
            DELIVERY: getSchemaPath(DeliveryOrderCashModel), // representative
            PICKUP: getSchemaPath(PickupOrderCashModel), // representative
          },
        },
      },
      examples: {
        deliveryCash: {
          summary: 'Delivery · cash on delivery',
          description: 'No billing block required',
          value: {
            type: 'DELIVERY',
            deliveryTiming: 'NOW',
            paymentMethod: 'CASH_ON_DELIVERY',
            deliveryAddress: {
              locationLabel: 'Bir Uttam AK Khandakar Road',
              name: 'Harrison Elliot',
              phoneNumber: '+8801712000000',
              address: '49 Bir Uttam AK Khandakar Rd, Dhaka 1212',
              buildingDetail: 'Apt 4B',
              latitude: 23.8103,
              longitude: 90.4125,
            },
          },
        },
        pickupCash: {
          summary: 'Pickup · cash on pickup',
          value: {
            type: 'PICKUP',
            deliveryTiming: 'NOW',
            paymentMethod: 'CASH_ON_PICKUP',
          },
        },
        cardWithBilling: {
          summary: 'Pay now (card) · billing required',
          value: {
            type: 'DELIVERY',
            deliveryTiming: 'NOW',
            paymentMethod: 'CARD',
            deliveryAddress: {
              locationLabel: 'Bir Uttam AK Khandakar Road',
              name: 'Harrison Elliot',
              phoneNumber: '+8801712000000',
              address: '49 Bir Uttam AK Khandakar Rd, Dhaka 1212',
              buildingDetail: 'Apt 4B',
              latitude: 23.8103,
              longitude: 90.4125,
            },
            billing: {
              country: 'Bangladesh',
              addressLine1: '49 Bir Uttam AK Khandakar Rd',
              addressLine2: null,
              suburb: 'Gulshan',
              city: 'Dhaka',
              postalCode: '1212',
              state: 'Dhaka Division',
            },
          },
        },
        deliveryScheduled: {
          summary: 'Delivery · scheduled · cash',
          value: {
            type: 'DELIVERY',
            deliveryTiming: 'SCHEDULED',
            scheduledAt: '2025-04-15T14:00:00.000Z',
            paymentMethod: 'CASH_ON_DELIVERY',
            deliveryAddress: {
              name: 'Harrison Elliot',
              phoneNumber: '+8801712000000',
              address: '49 Bir Uttam AK Khandakar Rd, Dhaka 1212',
              latitude: 23.8103,
              longitude: 90.4125,
            },
          },
        },
      },
    }),
    ApiCreatedResponse({
      description: 'Order created and cart cleared',
      schema: { example: createOrderResponseExample },
    }),
    ApiBadRequestResponse({
      description:
        'Validation failed, empty cart, unavailable item, or business rule (e.g. wrong payment method for order type)',
      schema: {
        example: {
          statusCode: 400,
          message: 'Cart is empty',
          error: 'Bad Request',
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
