import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export const ApiCreateOrder = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Place order from cart',
      description:
        'Creates an order from the current cart, recomputes totals on the server, stores line-item snapshots, clears the cart, and returns the order with delivery/billing details. Card payments are recorded as unpaid until a gateway integration marks them paid.',
    }),
    ApiBody({
      schema: {
        example: {
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
    }),
    ApiCreatedResponse({
      description: 'Order created',
    }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid JWT',
      schema: {
        example: { message: 'Unauthorized', statusCode: 401 },
      },
    }),
  );
