import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/** Optional customer confirmation code check at handoff */
export const DeliverOrderSchema = z.object({
  confirmationCode: z.string().length(4).optional(),
});

export class DeliverOrderDto extends createZodDto(DeliverOrderSchema) {}

export type DeliverOrderInput = z.infer<typeof DeliverOrderSchema>;
