import z from 'zod';
import { SignUpSchema } from './sign-up.dto';
import { createZodDto } from 'nestjs-zod';

export const RiderSignUpSchema = SignUpSchema.and(
  z.object({
    latitude: z
      .number()
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90'),
    longitude: z
      .number()
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180'),
  }),
);

export type RiderSignUpInput = z.infer<typeof RiderSignUpSchema>;

export class RiderSignUpDto extends createZodDto(
  RiderSignUpSchema as unknown as z.ZodType<object>,
) {}
