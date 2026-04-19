import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const AddTimeSchema = z.object({
  timeInMinutes: z.coerce
    .number()
    .int()
    .min(1, 'Time must be at least 1 minute')
    .max(180, 'Cannot add more than 180 minutes'),
});

export class AddTimeDto extends createZodDto(AddTimeSchema) {}

export type AddTimeInput = z.infer<typeof AddTimeSchema>;
