import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const RefreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .length(64, 'Refresh token must be a valid 64-character hash')
    .describe('Valid refresh token'),
});

export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {}
