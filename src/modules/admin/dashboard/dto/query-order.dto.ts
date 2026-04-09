import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Order, OrderStatus } from '@prisma/client';

const orderSortKeys = [
  'createdAt',
  'updatedAt',
  'totalAmount',
  'status',
  'orderNumber',
] as const satisfies ReadonlyArray<keyof Order>;

export const QueryOrdersSchema = z.object({
  page: z.coerce
    .number()
    .int('Page must be an integer')
    .min(1, 'Page must be a positive integer')
    .default(1),
  limit: z.coerce
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be a positive integer')
    .max(100, 'Limit must be a positive integer less than or equal to 100')
    .default(20),
  status: z
    .enum([...(Object.values(OrderStatus) as OrderStatus[]), 'SCHEDULED'])
    .optional(),
  orderBy: z.enum(
    orderSortKeys.flatMap((k) => [
      `+${k}`,
      `-${k}`,
    ]) as `${'-' | '+'}${keyof Order}`[],
  ),
});

export class QueryOrdersDto extends createZodDto(QueryOrdersSchema) {}
