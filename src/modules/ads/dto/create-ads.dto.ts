import { TargetItem } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const createAdsSchema = z.object({
  order: z.coerce
    .number('Order must be a number')
    .int('Order must be an integer')
    .positive('Order must be a positive number'),
  title: z
    .string('Title is required')
    .min(1, 'Title must be at least 1 character long')
    .max(255, 'Title must be at most 255 characters long'),
  color: z
    .string('Color is required')
    .regex(/^#([0-9A-Fa-f]{3}){1,2}$/, 'Invalid hex color code')
    .default('#FFFFFF'),
  type: z.enum(TargetItem),
  data: z.string('Data is required').min(1, 'Data is required'),
});

export class CreateAdsDto extends createZodDto(createAdsSchema) {}
