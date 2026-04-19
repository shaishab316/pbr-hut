import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { CreateItemSchema } from '../dto/create-item.dto';
import type { UpdateItemDto } from '../dto/update-item.dto';
import type { QueryItemsInput } from '../dto/query-items.dto';
import { z } from 'zod';
import { ITEM_SEARCH_FIELDS } from '../item.constant';

export type CreateItemInput = z.infer<typeof CreateItemSchema> & {
  imageUrl: string;
};

export type UpdateItemInput = UpdateItemDto & {
  imageUrl?: string;
};

type ValidateRefsInput = {
  categoryId?: string;
  subCategoryId?: string | null;
  tagIds?: string[];
};

const itemListInclude = {
  category: true,
  subCategory: {
    omit: {
      categoryId: true,
    },
  },
  tags: { select: { tag: true } },
  sizeVariants: {
    omit: {
      itemId: true,
    },
  },
  sideOptions: {
    omit: {
      itemId: true,
    },
  },
  extras: {
    omit: {
      itemId: true,
    },
  },
} satisfies Prisma.ItemInclude;

@Injectable()
export class ItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── helpers ──────────────────────────────────────────────────────────────

  private buildWhere(query: QueryItemsInput): Prisma.ItemWhereInput {
    const conditions: Prisma.ItemWhereInput[] = [
      { deletedAt: null }, // exclude soft-deleted items
    ];

    if (query.search) {
      conditions.push({
        OR: ITEM_SEARCH_FIELDS.map((field) => ({
          [field]: { contains: query.search, mode: 'insensitive' },
        })),
      });
    }

    if (query.categoryId) {
      conditions.push({ categoryId: query.categoryId });
    }

    if (query.subCategoryId) {
      conditions.push({ subCategoryId: query.subCategoryId });
    }

    return { AND: conditions };
  }

  async findById(id: string) {
    const item = await this.prisma.item.findFirst({
      where: { id, deletedAt: null },
      include: itemListInclude,
    });

    if (!item) {
      throw new NotFoundException('Item not found or deleted');
    }

    return {
      ...item,
      tags: item.tags.map((it) => it.tag),
    };
  }

  // ─── queries ──────────────────────────────────────────────────────────────

  async findMany(query: QueryItemsInput) {
    const where = this.buildWhere(query);
    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      this.prisma.item.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        include: itemListInclude,
      }),
      this.prisma.item.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        tags: item.tags.map((it) => it.tag),
      })),
      total,
    };
  }

  // ─── mutations ────────────────────────────────────────────────────────────

  async validateRefs({ categoryId, subCategoryId, tagIds }: ValidateRefsInput) {
    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) throw new NotFoundException('Category not found');
    }

    if (subCategoryId && categoryId) {
      const sub = await this.prisma.subCategory.findFirst({
        where: { id: subCategoryId, categoryId },
      });
      if (!sub)
        throw new NotFoundException(
          'SubCategory not found or does not belong to the given category',
        );
    }

    if (tagIds && tagIds.length > 0) {
      const tags = await this.prisma.tag.findMany({
        where: { id: { in: tagIds } },
      });
      if (tags.length !== tagIds.length)
        throw new BadRequestException('One or more tagIds are invalid');
    }
  }

  async create(data: CreateItemInput) {
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
        include: itemListInclude,
      });

      return {
        ...item,
        tags: item.tags.map((it) => it.tag),
      };
    });
  }

  async update(id: string, data: UpdateItemInput) {
    return this.prisma.$transaction(async (tx) => {
      await this.findById(id);

      if (data.tagIds !== undefined) {
        await tx.itemTag.deleteMany({ where: { itemId: id } });
      }

      if (data.sizeVariants !== undefined) {
        await tx.sizeVariant.deleteMany({ where: { itemId: id } });
      }

      if (data.sideOptions !== undefined) {
        await tx.sideOption.deleteMany({ where: { itemId: id } });
      }

      if (data.extras !== undefined) {
        await tx.itemExtra.deleteMany({ where: { itemId: id } });
      }

      const updatedItem = await tx.item.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
          ...(data.displayOrder !== undefined && {
            displayOrder: data.displayOrder,
          }),
          ...(data.isDeliverable !== undefined && {
            isDeliverable: data.isDeliverable,
          }),
          ...(data.isAvailable !== undefined && {
            isAvailable: data.isAvailable,
          }),
          ...(data.allowCustomNote !== undefined && {
            allowCustomNote: data.allowCustomNote,
          }),
          ...(data.isSideFree !== undefined && { isSideFree: data.isSideFree }),
          ...(data.isExtrasOptional !== undefined && {
            isExtrasOptional: data.isExtrasOptional,
          }),
          ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
          // null explicitly clears the relation
          ...(data.subCategoryId !== undefined && {
            subCategoryId: data.subCategoryId,
          }),
          // Derived boolean flags
          ...(data.sizeVariants !== undefined && {
            hasSizeVariants: data.sizeVariants.length > 0,
          }),
          ...(data.extras !== undefined && {
            hasExtras: data.extras.length > 0,
          }),

          ...(data.tagIds !== undefined && {
            tags: {
              create: data.tagIds.map((tagId) => ({ tagId })),
            },
          }),
          ...(data.sizeVariants !== undefined && {
            sizeVariants: {
              create: data.sizeVariants.map((v) => ({
                size: v.size,
                price: v.price,
              })),
            },
          }),
          ...(data.sideOptions !== undefined && {
            sideOptions: {
              create: data.sideOptions.map((s) => ({
                name: s.name,
                price: s.price,
                isDefault: s.isDefault,
              })),
            },
          }),
          ...(data.extras !== undefined && {
            extras: {
              create: data.extras.map((e) => ({
                name: e.name,
                price: e.price,
              })),
            },
          }),
        },
        include: itemListInclude,
      });

      return {
        ...updatedItem,
        tags: updatedItem.tags.map((it) => it.tag),
      };
    });
  }

  async softDelete(id: string) {
    await this.findById(id); // throws 404 if not found or already deleted
    await this.prisma.item.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
