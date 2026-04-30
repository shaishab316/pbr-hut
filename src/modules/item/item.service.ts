import { Injectable, Logger } from '@nestjs/common';
import { CreateItemDto } from './dto/create-item.dto';
import type { UpdateItemDto } from './dto/update-item.dto';
import type { QueryItemsDto } from './dto/query-items.dto';
import { CloudinaryService } from '../../infra/upload/cloudinary.service';
import { ItemRepository } from './repositories/item.repository';
import { RedisService } from '../../infra/redis/redis.service';

@Injectable()
export class ItemService {
  private readonly logger = new Logger(ItemService.name);

  constructor(
    private readonly itemRepo: ItemRepository,
    private readonly cloudinary: CloudinaryService,
    private readonly redis: RedisService,
  ) {}

  async findMany(query: QueryItemsDto) {
    if (query.search) {
      this.logger.log(`🔍 Item search: "${query.search.trim().toLowerCase()}"`);
      await this.redis
        .getClient()
        .zincrby('search:popular', 1, query.search.trim().toLowerCase());
    }

    return this.itemRepo.findMany(query);
  }

  async getHotSearchTerms() {
    this.logger.debug(`🔥 Fetching hot search terms`);
    const top5 = await this.redis.getClient().zrevrange('search:popular', 0, 4);

    if (top5.length > 0) {
      this.logger.debug(`🔥 Hot searches: ${top5.join(', ')}`);
    }
    return top5;
  }

  async create(dto: CreateItemDto, imageFile: Express.Multer.File) {
    this.logger.log(`🎍 Creating new item: ${dto.name}`);

    try {
      await this.itemRepo.validateRefs(dto);
      this.logger.debug(`✅ Item references validated: ${dto.name}`);

      const { url: imageUrl } = await this.cloudinary.uploadFile({
        file: imageFile,
        folder: 'items',
        resourceType: 'image',
      });

      this.logger.debug(`📄 Item image uploaded: ${imageUrl}`);

      const result = await this.itemRepo.create({ ...dto, imageUrl });
      this.logger.log(`✅ Item created: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Item creation failed for ${dto.name}:`, error);
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateItemDto,
    imageFile?: Express.Multer.File,
  ) {
    this.logger.log(`🔄 Updating item: ${id}`);

    try {
      await this.itemRepo.validateRefs({
        categoryId: dto.categoryId,
        subCategoryId: dto.subCategoryId ?? undefined,
        tagIds: dto.tagIds,
      });

      let imageUrl: string | undefined;
      if (imageFile) {
        this.logger.debug(`📄 Uploading new item image for: ${id}`);
        const uploaded = await this.cloudinary.uploadFile({
          file: imageFile,
          folder: 'items',
          resourceType: 'image',
        });
        imageUrl = uploaded.url;
        this.logger.debug(`📄 Item image updated: ${imageUrl}`);
      }

      const updated = await this.itemRepo.update(id, { ...dto, imageUrl });
      this.logger.log(`✅ Item updated: ${id}`);

      return {
        message: 'Item updated successfully',
        data: updated,
      };
    } catch (error) {
      this.logger.error(`❌ Item update failed for ${id}:`, error);
      throw error;
    }
  }

  async softDelete(id: string) {
    this.logger.log(`🗑️  Soft deleting item: ${id}`);
    try {
      await this.itemRepo.softDelete(id);
      this.logger.log(`✅ Item soft deleted: ${id}`);
      return { message: 'Item deleted successfully' };
    } catch (error) {
      this.logger.error(`❌ Item soft delete failed for ${id}:`, error);
      throw error;
    }
  }

  async findById(id: string) {
    this.logger.debug(`🔍 Fetching item: ${id}`);
    return this.itemRepo.findById(id);
  }
}
