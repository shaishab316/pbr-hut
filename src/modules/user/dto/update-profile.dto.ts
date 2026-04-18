import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const updateProfileSchema = z.object({
  name: _.name.optional(),
  phone: _.phone.optional(),
});

export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
