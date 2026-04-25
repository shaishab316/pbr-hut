import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateSubCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(50, 'Name must be at most 50 characters'),
  hasSizeVariants: z.boolean().optional().default(false),
});

export class CreateSubCategoryDto extends createZodDto(
  CreateSubCategorySchema,
) {}
