import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const QueryItemsSchema = z.object({
  search: z.string().trim().min(1, 'Search cannot be empty').optional(),
  categoryId: z.uuid('Invalid category ID').optional(),
  subCategoryId: z.uuid('Invalid sub category ID').optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be at most 100')
    .default(20),
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
});

export class QueryItemsDto extends createZodDto(QueryItemsSchema) {}

export type QueryItemsInput = z.infer<typeof QueryItemsSchema>;
