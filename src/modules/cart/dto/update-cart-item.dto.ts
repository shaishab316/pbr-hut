import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const UpdateCartItemSchema = z
  .object({
    quantity: z.coerce.number().int().min(1).max(99).optional(),
    customNote: z.string().max(500).optional().nullable(),
  })
  .refine(
    (data) => data.quantity !== undefined || data.customNote !== undefined,
    { message: 'Provide quantity and/or customNote' },
  );

export class UpdateCartItemDto extends createZodDto(UpdateCartItemSchema) {}

export type UpdateCartItemInput = z.infer<typeof UpdateCartItemSchema>;
