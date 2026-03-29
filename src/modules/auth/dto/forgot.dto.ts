import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const EmailForgotPasswordSchema = z.object({
  identifierType: z.literal('email').default('email'),
  email: z.email('Invalid email address'),
});

const PhoneForgotPasswordSchema = z.object({
  identifierType: z.literal('phone'),
  phone: z.string('Phone number is required').refine(
    (val) =>
      //? This regex checks for a valid phone number format (E.164) and ensures it contains 10 to 15 digits after removing non-digit characters.
      /^\+?[0-9\s\-().]{10,}$/.test(val) &&
      /[0-9]{10,15}/.test(val.replace(/\D/g, '')),
    'Invalid phone number format. Accepted format: E.164 (+1234567890)',
  ),
});

const ForgotPasswordSchema = z.discriminatedUnion('identifierType', [
  EmailForgotPasswordSchema,
  PhoneForgotPasswordSchema,
]);

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export class ForgotPasswordDto extends createZodDto(
  ForgotPasswordSchema as unknown as z.ZodType<object>,
) {}
