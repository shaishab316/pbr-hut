import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const ResetPasswordSchema = z.object({
  token: z
    .string()
    .describe('Password reset token obtained after OTP verification'),

  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(32, 'Password must be at most 32 characters long')
    .describe('New password for the user'),
});

export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}
