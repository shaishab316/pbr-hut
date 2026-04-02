import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateItemDto } from './dto/create-item.dto';
import { CloudinaryService } from '../upload/cloudinary.service';
import { ItemRepository } from './repositories/item.repository';
import { PrismaService } from '@/infra/prisma/prisma.service';

@Injectable()
export class ItemService {
  constructor(
    private readonly itemRepo: ItemRepository,
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(dto: CreateItemDto, imageFile: Express.Multer.File) {
    // 1. validate refs before touching cloudinary
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException('Category not found');

    if (dto.subCategoryId) {
      const sub = await this.prisma.subCategory.findFirst({
        where: { id: dto.subCategoryId, categoryId: dto.categoryId },
      });
      if (!sub)
        throw new NotFoundException(
          'SubCategory not found or does not belong to the given category',
        );
    }

    if (dto.tagIds.length > 0) {
      const tags = await this.prisma.tag.findMany({
        where: { id: { in: dto.tagIds } },
      });
      if (tags.length !== dto.tagIds.length)
        throw new BadRequestException('One or more tagIds are invalid');
    }

    // 2. upload image — only after validation passes
    const { url: imageUrl } = await this.cloudinary.uploadFile({
      file: imageFile,
      folder: 'items',
      resourceType: 'image',
    });

    // 3. create item with imageUrl from cloudinary
    return this.itemRepo.create({ ...dto, imageUrl });
  }
}
