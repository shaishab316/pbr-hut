import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateTagSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name must be at most 50 characters'),
});

export class CreateTagDto extends createZodDto(CreateTagSchema) {}
