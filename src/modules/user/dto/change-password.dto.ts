import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const _ = {
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(32, 'Password must be at most 32 characters'),
};

const changePasswordSchema = z.object({
  currentPassword: _.password,
  newPassword: _.password,
});

export class changePasswordDto extends createZodDto(changePasswordSchema) {}
