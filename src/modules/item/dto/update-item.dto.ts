import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { Size } from '@prisma/client';

const SizeVariantSchema = z.object({
  size: z.enum(Size),
  price: z.coerce.number().min(0, 'Price must be at least 0'),
});

const SideOptionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.coerce.number().min(0, 'Price must be at least 0'),
  isDefault: z.coerce.boolean().default(false),
});

const ItemExtraSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.coerce.number().min(0, 'Price must be at least 0'),
});

export const UpdateItemSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    description: z.string().min(1).max(300).optional(),
    displayOrder: z.coerce.number().int().min(0).optional(),
    isDeliverable: z.coerce.boolean().optional(),
    isAvailable: z.coerce.boolean().optional(),
    allowCustomNote: z.coerce.boolean().optional(),
    isSideFree: z.coerce.boolean().optional(),
    isExtrasOptional: z.coerce.boolean().optional(),

    categoryId: z.uuid('Invalid category ID').optional(),
    subCategoryId: z.uuid('Invalid sub category ID').optional().nullable(),

    tagIds: z.array(z.uuid('Invalid tag ID')).optional(),

    basePrice: z.coerce.number().min(0).optional().nullable(),

    sizeVariants: z.array(SizeVariantSchema).optional(),
    sideOptions: z.array(SideOptionSchema).optional(),
    extras: z.array(ItemExtraSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.sizeVariants !== undefined) {
      const hasVariants = data.sizeVariants.length > 0;

      if (!hasVariants && data.basePrice == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['basePrice'],
          message: 'basePrice is required when no size variants are provided',
        });
      }

      if (hasVariants) {
        const sizes = data.sizeVariants.map((v) => v.size);
        if (new Set(sizes).size !== sizes.length) {
          ctx.addIssue({
            code: 'custom',
            path: ['sizeVariants'],
            message: 'Duplicate size entries',
          });
        }
      }
    }

    if (data.sideOptions !== undefined) {
      const defaults = data.sideOptions.filter((s) => s.isDefault);
      if (defaults.length > 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['sideOptions'],
          message: 'Only one side option can be default',
        });
      }
    }
  });

export class UpdateItemDto extends createZodDto(UpdateItemSchema) {}

export type UpdateItemInput = z.infer<typeof UpdateItemSchema>;
