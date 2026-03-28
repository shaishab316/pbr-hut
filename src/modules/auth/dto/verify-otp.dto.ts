import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const VerifyOtpSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Identifier should be a valid email or phone number')
    .describe('Email or phone number used during sign up to identify the user'),
  otp: z
    .string()
    .length(6, 'OTP should be 6 digits')
    .describe('6-digit one-time password'),
});

export class VerifyOtpDto extends createZodDto(VerifyOtpSchema) {}
