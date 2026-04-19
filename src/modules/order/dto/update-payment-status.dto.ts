import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PaymentStatus } from '@prisma/client';

const UpdatePaymentStatusSchema = z.object({
  paymentStatus: z
    .enum([PaymentStatus.PAID, PaymentStatus.UNPAID, PaymentStatus.REFUNDED])
    .describe('The payment status to set for the order'),
});

export class UpdatePaymentStatusDto extends createZodDto(
  UpdatePaymentStatusSchema,
) {}

export type UpdatePaymentStatusInput = z.infer<
  typeof UpdatePaymentStatusSchema
>;
