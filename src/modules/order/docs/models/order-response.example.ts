/** Matches `ResponseInterceptor`: `{ success, statusCode, message, data?, pagination? }`. */

const orderItemExample = {
  id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  orderId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  itemId: 'f0f70859-d779-488a-a774-df78b6ec677a',
  itemName: 'Classic Margherita',
  imageUrl: 'https://example.com/margherita.jpg',
  quantity: 2,
  customNote: null,
  sizeName: 'MEDIUM',
  sideOptionName: 'Buttered corn & capsicum',
  sizePrice: '18.50',
  sidePrice: '2.00',
  unitPrice: '22.50',
  totalPrice: '45.00',
  extras: [
    {
      id: 'd4e5f6a7-b8c9-0123-def0-234567890123',
      orderItemId: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
      extraName: 'Extra cheese',
      price: '2.00',
    },
  ],
};

const deliveryAddressExample = {
  id: 'e5f6a7b8-c9d0-1234-ef01-345678901234',
  orderId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  locationLabel: 'Bir Uttam AK Khandakar Road',
  name: 'Harrison Elliot',
  phoneNumber: '+8801712000000',
  address: '49 Bir Uttam AK Khandakar Rd, Dhaka 1212',
  buildingDetail: 'Apt 4B',
  latitude: 23.8103,
  longitude: 90.4125,
};

const billingAddressExample = {
  id: 'f6a7b8c9-d0e1-2345-f012-456789012345',
  orderId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  country: 'Bangladesh',
  addressLine1: '49 Bir Uttam AK Khandakar Rd',
  addressLine2: null,
  suburb: 'Gulshan',
  city: 'Dhaka',
  postalCode: '1212',
  state: 'Dhaka Division',
};

export const orderDetailDataExample = {
  id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  userId: '01KMVYSHFWG0GS3AJSE8KG1QS0',
  orderNumber: 'POGK4J524',
  confirmationCode: '4562',
  type: 'DELIVERY',
  status: 'PREPARING',
  paymentMethod: 'CARD',
  paymentStatus: 'UNPAID',
  deliveryTiming: 'NOW',
  scheduledAt: null,
  estimatedArrivalAt: '2026-04-04T12:15:00.000Z',
  deliveredAt: null,
  itemsTotal: '45.00',
  deliveryCharge: '5.00',
  taxes: '0.00',
  totalAmount: '50.00',
  createdAt: '2026-04-04T11:55:00.000Z',
  updatedAt: '2026-04-04T11:55:00.000Z',
  deliveryAddress: deliveryAddressExample,
  billingAddress: billingAddressExample,
  items: [orderItemExample],
};

export const createOrderResponseExample = {
  success: true,
  statusCode: 201,
  message: 'Order placed successfully',
  data: orderDetailDataExample,
};

export const activeOrdersResponseExample = {
  success: true,
  statusCode: 200,
  message: 'Success',
  data: [
    {
      ...orderDetailDataExample,
      items: [orderItemExample],
      billingAddress: billingAddressExample,
    },
  ],
};

export const orderHistoryResponseExample = {
  success: true,
  statusCode: 200,
  message: 'Success',
  data: [
    {
      id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      userId: '01KMVYSHFWG0GS3AJSE8KG1QS0',
      orderNumber: 'POGK4J524',
      confirmationCode: '4562',
      type: 'DELIVERY',
      status: 'DELIVERED',
      paymentMethod: 'CASH_ON_DELIVERY',
      paymentStatus: 'UNPAID',
      deliveryTiming: 'NOW',
      scheduledAt: null,
      estimatedArrivalAt: '2026-04-04T12:15:00.000Z',
      deliveredAt: '2026-04-04T12:10:00.000Z',
      itemsTotal: '45.00',
      deliveryCharge: '5.00',
      taxes: '0.00',
      totalAmount: '50.00',
      createdAt: '2026-04-04T11:55:00.000Z',
      updatedAt: '2026-04-04T12:10:00.000Z',
      deliveryAddress: deliveryAddressExample,
      items: [orderItemExample],
    },
  ],
  pagination: {
    total: 42,
    limit: 20,
    page: 1,
    totalPages: 3,
  },
};

export const getOrderResponseExample = {
  success: true,
  statusCode: 200,
  message: 'Success',
  data: orderDetailDataExample,
};

export const cancelOrderResponseExample = {
  success: true,
  statusCode: 200,
  message: 'Order cancelled',
};

export const reorderResponseExample = {
  success: true,
  statusCode: 200,
  message: 'Success',
  data: {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    userId: '01KMVYSHFWG0GS3AJSE8KG1QS0',
    createdAt: '2026-04-04T10:00:00.000Z',
    updatedAt: '2026-04-04T10:00:00.000Z',
    items: [],
  },
};
