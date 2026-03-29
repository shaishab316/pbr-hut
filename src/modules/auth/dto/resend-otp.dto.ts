import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ResendOtpSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Identifier should be a valid email or phone number')
    .describe('Email or phone number used during sign up'),
});

export class ResendOtpDto extends createZodDto(ResendOtpSchema) {}
