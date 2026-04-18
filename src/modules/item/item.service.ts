import { Injectable } from '@nestjs/common';
import { CreateItemDto } from './dto/create-item.dto';
import type { UpdateItemDto } from './dto/update-item.dto';
import type { QueryItemsDto } from './dto/query-items.dto';
import { CloudinaryService } from '../upload/cloudinary.service';
import { ItemRepository } from './repositories/item.repository';

@Injectable()
export class ItemService {
  constructor(
    private readonly itemRepo: ItemRepository,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findMany(query: QueryItemsDto) {
    return this.itemRepo.findMany(query);
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

  async findById(id: string) {
    return this.itemRepo.findById(id);
  }
}
