import { ApiParam } from '@nestjs/swagger';

/** Shared `orderId` path parameter for `/orders/:orderId` routes. */
export const ApiOrderIdParam = ApiParam({
  name: 'orderId',
  description: 'Order primary key (UUID v4)',
  schema: { type: 'string', format: 'uuid' },
  example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
});
