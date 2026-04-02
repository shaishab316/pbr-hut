import { PrismaService } from '@/infra/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { CreateItemSchema } from '../dto/create-item.dto';

type CreateItemInput = z.infer<typeof CreateItemSchema> & {
  imageUrl: string;
};

@Injectable()
export class ItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateItemInput) {
    //? use transaction to ensure data consistency
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          name: data.name,
          description: data.description,
          imageUrl: data.imageUrl,
          displayOrder: data.displayOrder,
          isDeliverable: data.isDeliverable,
          isAvailable: data.isAvailable,
          allowCustomNote: data.allowCustomNote,
          isSideFree: data.isSideFree,
          isExtrasOptional: data.isExtrasOptional,
          hasSizeVariants: data.sizeVariants.length > 0,
          hasExtras: data.extras.length > 0,

          categoryId: data.categoryId,
          subCategoryId: data.subCategoryId ?? null,

          // nested creates
          tags: {
            create: data.tagIds.map((tagId) => ({ tagId })),
          },
          sizeVariants: {
            create: data.sizeVariants.map((v) => ({
              size: v.size,
              price: v.price,
            })),
          },
          sideOptions: {
            create: data.sideOptions.map((s) => ({
              name: s.name,
              price: s.price,
              isDefault: s.isDefault,
            })),
          },
          extras: {
            create: data.extras.map((e) => ({
              name: e.name,
              price: e.price,
            })),
          },
        },
        include: {
          category: true,
          subCategory: true,
          tags: { include: { tag: true } },
          sizeVariants: true,
          sideOptions: true,
          extras: true,
        },
      });

      return item;
    });
  }
}
