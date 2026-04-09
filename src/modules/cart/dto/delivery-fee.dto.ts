import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const deliveryFeeSchema = z.object({
  latitude: z
    .number('Latitude is required')
    .min(-90, 'Latitude must be greater than or equal to -90')
    .max(90, 'Latitude must be less than or equal to 90'),
  longitude: z
    .number('Longitude is required')
    .min(-180, 'Longitude must be greater than or equal to -180')
    .max(180, 'Longitude must be less than or equal to 180'),
});

export class DeliveryFeeDto extends createZodDto(deliveryFeeSchema) {}
