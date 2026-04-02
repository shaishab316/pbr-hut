import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UploadedFiles,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ItemService } from './item.service';
import { CreateItemDto, CreateItemSchema } from './dto/create-item.dto';
import { createFileUploadInterceptor } from '../upload/interceptors/file-upload.interceptor';
import { ApiCreateItem, ApiGetItems } from './docs/item.docs';
import { QueryItemsDto } from './dto/query-items.dto';
import { safeJsonParse } from '@/common/utils/safeJsonParse';

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

  @Get()
  @ApiGetItems()
  findMany(@Query() query: QueryItemsDto) {
    return this.itemService.findMany(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateItem()
  @UseInterceptors(ItemUploadInterceptor)
  async create(
    @UploadedFiles() files: { image?: Express.Multer.File[] },
    @Body() body: any,
  ) {
    if (!files?.image?.[0]) {
      throw new BadRequestException('image file is required');
    }

    // support both styles: flat bracket notation OR JSON data field
    const raw: CreateItemDto = body['data']
      ? safeJsonParse(body['data'])
      : body;

    const dto = CreateItemSchema.parse(raw);

    return this.itemService.create(dto, files.image[0]);
  }
}
