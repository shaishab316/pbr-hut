import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const updatePrimaryRestaurantSchema = z.object({
  name: z.string('Name is required'),

  address: z.string('Address is required'),
  latitude: z
    .number('Latitude is required')
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z
    .number('Longitude is required')
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),

  openingHour: z.string('Opening hours are required').refine((val) => {
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return regex.test(val);
  }, 'Opening hour must be in the format HH:mm'),

  closingHour: z.string('Closing hours are required').refine((val) => {
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return regex.test(val);
  }, 'Closing hour must be in the format HH:mm'),

  deliveryRadius: z
    .number('Delivery radius is required')
    .min(0, 'Delivery radius must be a positive number'),

  baseDeliveryFee: z
    .number('Base delivery fee is required')
    .min(0, 'Base delivery fee must be a positive number'),

  minimumOrderAmountCOD: z.coerce
    .number('Minimum order amount for COD is required')
    .min(0, 'Minimum order amount for COD must be a positive number'),

  isCODEnabled: z.boolean('isCODEnabled is required'),
});

export class UpdatePrimaryRestaurantDto extends createZodDto(
  updatePrimaryRestaurantSchema,
) {}
