import { Injectable } from '@nestjs/common';
import { CreateItemDto } from './dto/create-item.dto';
import { CloudinaryService } from '../upload/cloudinary.service';
import { ItemRepository } from './repositories/item.repository';

@Injectable()
export class ItemService {
  constructor(
    private readonly itemRepo: ItemRepository,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(dto: CreateItemDto, imageFile: Express.Multer.File) {
    await this.itemRepo.validateRefs(dto);

    const { url: imageUrl } = await this.cloudinary.uploadFile({
      file: imageFile,
      folder: 'items',
      resourceType: 'image',
    });

    return this.itemRepo.create({ ...dto, imageUrl });
  }
}
