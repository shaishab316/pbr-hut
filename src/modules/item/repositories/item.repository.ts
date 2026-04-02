import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { CreateItemSchema } from '../dto/create-item.dto';
import { z } from 'zod';

export type CreateItemInput = z.infer<typeof CreateItemSchema> & {
  imageUrl: string;
};

type ValidateRefsInput = Pick<
  CreateItemInput,
  'categoryId' | 'subCategoryId' | 'tagIds'
>;

@Injectable()
export class ItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async validateRefs({ categoryId, subCategoryId, tagIds }: ValidateRefsInput) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException('Category not found');

    if (subCategoryId) {
      const sub = await this.prisma.subCategory.findFirst({
        where: { id: subCategoryId, categoryId },
      });
      if (!sub)
        throw new NotFoundException(
          'SubCategory not found or does not belong to the given category',
        );
    }

    if (tagIds.length > 0) {
      const tags = await this.prisma.tag.findMany({
        where: { id: { in: tagIds } },
      });
      if (tags.length !== tagIds.length)
        throw new BadRequestException('One or more tagIds are invalid');
    }
  }

  async create(data: CreateItemInput) {
    return this.prisma.$transaction(async (tx) => {
      return tx.item.create({
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
            create: data.extras.map((e) => ({ name: e.name, price: e.price })),
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
    });
  }
}
