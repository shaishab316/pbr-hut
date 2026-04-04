import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CreateOrderRequestModel,
  OrderBillingAddressBodyModel,
  OrderDeliveryAddressBodyModel,
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
      CreateOrderRequestModel,
      OrderDeliveryAddressBodyModel,
      OrderBillingAddressBodyModel,
    ),
    ApiBody({
      type: CreateOrderRequestModel,
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
      },
    }),
    ApiCreatedResponse({
      description: 'Order created and cart cleared',
      schema: {
        example: createOrderResponseExample,
      },
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
        example: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      },
    }),
  );
