import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const QueryNotificationsSchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be at most 100')
    .default(20),
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
});

export class QueryNotificationsDto extends createZodDto(
  QueryNotificationsSchema,
) {}

export type QueryNotificationsInput = z.infer<typeof QueryNotificationsSchema>;
