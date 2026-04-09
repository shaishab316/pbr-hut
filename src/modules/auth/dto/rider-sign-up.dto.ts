import z from 'zod';
import { createZodDto } from 'nestjs-zod';

export const RiderSignUpSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(32, 'Password must be at most 32 characters'),

  phone: z.string('Phone number is required').refine(
    (val) =>
      //? This regex checks for a valid phone number format (E.164) and ensures it contains 10 to 15 digits after removing non-digit characters.
      /^\+?[0-9\s\-().]{10,}$/.test(val) &&
      /[0-9]{10,15}/.test(val.replace(/\D/g, '')),
    'Invalid phone number format. Accepted format: E.164 (+1234567890)',
  ),

  email: z.email('Invalid email address'),

  latitude: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
});

export class RiderSignUpDto extends createZodDto(RiderSignUpSchema) {}
