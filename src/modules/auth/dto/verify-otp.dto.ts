import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const EmailVerifyOtpSchema = z.object({
  identifierType: z.literal('email').default('email'),
  email: z.email('Invalid email address'),
});

const PhoneVerifyOtpSchema = z.object({
  identifierType: z.literal('phone'),
  phone: z.string('Phone number is required').refine(
    (val) =>
      //? This regex checks for a valid phone number format (E.164) and ensures it contains 10 to 15 digits after removing non-digit characters.
      /^\+?[0-9\s\-().]{10,}$/.test(val) &&
      /[0-9]{10,15}/.test(val.replace(/\D/g, '')),
    'Invalid phone number format. Accepted format: E.164 (+1234567890)',
  ),
});

const VerifyOtpSchema = z
  .discriminatedUnion('identifierType', [
    EmailVerifyOtpSchema,
    PhoneVerifyOtpSchema,
  ])
  .and(
    z.object({
      otp: z
        .string()
        .length(6, 'OTP should be 6 digits')
        .describe('6-digit one-time password'),

      //? The verifyReason field indicates the context in which the OTP is being verified, allowing the backend to handle different verification flows (e.g., registration vs. password reset) appropriately.
      verifyReason: z
        .enum(['register', 'forgot-password'])
        .default('register')
        .describe('Reason for OTP verification'),
    }),
  );

export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;

export class VerifyOtpDto extends createZodDto(
  VerifyOtpSchema as unknown as z.ZodType<object>,
) {}
