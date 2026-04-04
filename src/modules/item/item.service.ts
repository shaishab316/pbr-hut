import { Injectable } from '@nestjs/common';
import { CreateItemDto } from './dto/create-item.dto';
import type { UpdateItemDto } from './dto/update-item.dto';
import type { QueryItemsDto } from './dto/query-items.dto';
import { CloudinaryService } from '../upload/cloudinary.service';
import { ItemRepository } from './repositories/item.repository';
import { Pagination } from '@/common/types/pagination';

@Injectable()
export class ItemService {
  constructor(
    private readonly itemRepo: ItemRepository,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findMany(query: QueryItemsDto) {
    const { items, total } = await this.itemRepo.findMany(query);
    const totalPages = query.limit > 0 ? Math.ceil(total / query.limit) : 0;

    return {
      message: 'Success',
      data: items,
      pagination: {
        total,
        limit: query.limit,
        page: query.page,
        totalPages,
      } satisfies Pagination,
    };
  }

  async create(dto: CreateItemDto, imageFile: Express.Multer.File) {
    await this.itemRepo.validateRefs(dto);

    const { url: imageUrl } = await this.cloudinary.uploadFile({
      file: imageFile,
      folder: 'items',
      resourceType: 'image',
    });

    return this.itemRepo.create({ ...dto, imageUrl });
  }

  async update(
    id: string,
    dto: UpdateItemDto,
    imageFile?: Express.Multer.File,
  ) {
    await this.itemRepo.validateRefs({
      categoryId: dto.categoryId,
      subCategoryId: dto.subCategoryId ?? undefined,
      tagIds: dto.tagIds,
    });

    let imageUrl: string | undefined;
    if (imageFile) {
      const uploaded = await this.cloudinary.uploadFile({
        file: imageFile,
        folder: 'items',
        resourceType: 'image',
      });
      imageUrl = uploaded.url;
    }

    const updated = await this.itemRepo.update(id, { ...dto, imageUrl });

    return {
      message: 'Item updated successfully',
      data: updated,
    };
  }

  async softDelete(id: string) {
    await this.itemRepo.softDelete(id);
    return { message: 'Item deleted successfully' };
  }
}
