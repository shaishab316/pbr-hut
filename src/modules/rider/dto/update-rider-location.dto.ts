import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UpdateRiderLocationSchema = z.object({
  latitude: z
    .number()
    .gte(-90, 'Latitude must be at least -90')
    .lte(90, 'Latitude must be at most 90'),
  longitude: z
    .number()
    .gte(-180, 'Longitude must be at least -180')
    .lte(180, 'Longitude must be at most 180'),
});

export class UpdateRiderLocationDto extends createZodDto(
  UpdateRiderLocationSchema,
) {}

export type UpdateRiderLocationInput = z.infer<typeof UpdateRiderLocationSchema>;
