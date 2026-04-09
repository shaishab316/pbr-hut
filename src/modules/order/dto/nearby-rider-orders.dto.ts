import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/** H3 `gridDisk` radius: 0 = single cell, 1 = center + 6 neighbors (7 cells), etc. */
export const NearbyRiderOrdersSchema = z.object({
  k: z.coerce
    .number()
    .int()
    .min(0, 'k must be at least 0')
    .max(3, 'k must be at most 3')
    .default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export class NearbyRiderOrdersDto extends createZodDto(
  NearbyRiderOrdersSchema,
) {}

export type NearbyRiderOrdersInput = z.infer<typeof NearbyRiderOrdersSchema>;
