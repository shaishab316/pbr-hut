import { createZodDto } from 'nestjs-zod';
import { createAdsSchema } from './create-ads.dto';

export const updateAdsSchema = createAdsSchema.partial();

export class UpdateAdsDto extends createZodDto(updateAdsSchema) {}
