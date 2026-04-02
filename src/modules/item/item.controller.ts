import {
  Controller,
  Post,
  Body,
  UploadedFiles,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ItemService } from './item.service';
import { CreateItemDto } from './dto/create-item.dto';
import { createFileUploadInterceptor } from '../upload/interceptors/file-upload.interceptor';
import { ApiCreateItem } from './docs/item.docs';

const ItemUploadInterceptor = createFileUploadInterceptor({
  fields: [
    {
      name: 'image',
      maxCount: 1,
      maxFileSize: 2 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
  ],
});

@ApiTags('Items')
@Controller('items')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateItem()
  @UseInterceptors(ItemUploadInterceptor)
  async create(
    @UploadedFiles() files: { image?: Express.Multer.File[] },
    @Body() dto: CreateItemDto,
  ) {
    if (!files?.image?.[0]) {
      throw new BadRequestException('image file is required');
    }
    return this.itemService.create(dto, files.image[0]);
  }
}
