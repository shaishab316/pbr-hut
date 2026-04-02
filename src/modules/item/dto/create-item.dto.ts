import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { Size } from '@prisma/client';

const SizeVariantSchema = z.object({
  size: z.nativeEnum(Size),
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

export const CreateItemSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(80, 'Name must be at most 80 characters'),
    description: z
      .string()
      .min(1, 'Description is required')
      .max(300, 'Description must be at most 300 characters'),
    displayOrder: z.coerce.number().int().min(0).default(0),
    isDeliverable: z.coerce.boolean().default(true),
    isAvailable: z.coerce.boolean().default(true),
    allowCustomNote: z.coerce.boolean().default(true),
    isSideFree: z.coerce.boolean().default(false),
    isExtrasOptional: z.coerce.boolean().default(true),

    categoryId: z.uuid('Invalid category ID'),
    subCategoryId: z.uuid('Invalid sub category ID').optional(),

    tagIds: z.array(z.uuid('Invalid tag ID')).default([]),

    sizeVariants: z
      .array(SizeVariantSchema)
      .min(1, 'At least one size variant is required'),
    sideOptions: z
      .array(SideOptionSchema)
      .min(1, 'At least one side option is required'),
    extras: z.array(ItemExtraSchema).default([]),
  })
  .superRefine((data, ctx) => {
    const sizes = data.sizeVariants.map((v) => v.size);
    if (new Set(sizes).size !== sizes.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['sizeVariants'],
        message: 'Duplicate size entries',
      });
    }

    const defaults = data.sideOptions.filter((s) => s.isDefault);
    if (defaults.length > 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['sideOptions'],
        message: 'Only one side option can be default',
      });
    }
  });

export class CreateItemDto extends createZodDto(CreateItemSchema) {}
