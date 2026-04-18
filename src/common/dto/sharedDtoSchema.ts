import z from 'zod';

export const sharedDtoSchema = {
  phone: z
    .string('Phone number is required')
    .trim()
    .refine(
      (val) =>
        //? This regex checks for a valid phone number format (E.164) and ensures it contains 10 to 15 digits after removing non-digit characters.
        /^\+?[0-9\s\-().]{10,}$/.test(val) &&
        /[0-9]{10,15}/.test(val.replace(/\D/g, '')),
      'Invalid phone number format. Accepted format: E.164 (+1234567890)',
    ),

  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(32, 'Password must be at most 32 characters'),
};
