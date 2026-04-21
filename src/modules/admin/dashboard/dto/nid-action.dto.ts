import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const approveNidSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export const declineNidSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  rejectionReason: z
    .string()
    .min(5, 'Rejection reason must be at least 5 characters')
    .describe('Reason for declining the NID'),
});

export class ApproveNidDto extends createZodDto(approveNidSchema) {}
export class DeclineNidDto extends createZodDto(declineNidSchema) {}
