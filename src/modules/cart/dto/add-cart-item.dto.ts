import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const AddCartItemSchema = z.object({
  itemId: z.uuid('Invalid item ID'),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
  selectedSizeVariantId: z
    .uuid('Invalid size variant ID')
    .optional()
    .nullable(),
  selectedSideOptionId: z.uuid('Invalid side option ID'),
  extraIds: z.array(z.uuid('Invalid extra ID')).default([]),
  customNote: z.string().max(500).optional().nullable(),
});

export class AddCartItemDto extends createZodDto(AddCartItemSchema) {}

export type AddCartItemInput = z.infer<typeof AddCartItemSchema>;
