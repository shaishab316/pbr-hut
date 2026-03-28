import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const EmailSignUpSchema = z.object({
  contactType: z.literal('email').default('email'),
  email: z.email('Invalid email address'),
});

const PhoneSignUpSchema = z.object({
  contactType: z.literal('phone'),
  phone: z.string('Phone number is required').refine(
    (val) =>
      //? This regex checks for a valid phone number format (E.164) and ensures it contains 10 to 15 digits after removing non-digit characters.
      /^\+?[0-9\s\-().]{10,}$/.test(val) &&
      /[0-9]{10,15}/.test(val.replace(/\D/g, '')),
    'Invalid phone number format. Accepted format: E.164 (+1234567890)',
  ),
});

const SignUpSchema = z
  .discriminatedUnion('contactType', [EmailSignUpSchema, PhoneSignUpSchema])
  .and(
    z.object({
      name: z
        .string()
        .min(1, 'Name is required')
        .max(100, 'Name must be at most 100 characters'),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(32, 'Password must be at most 32 characters'),
    }),
  );

export type SignUpInput = z.infer<typeof SignUpSchema>;

export class SignUpDto extends createZodDto(
  SignUpSchema as unknown as z.ZodType<object>,
) {}
