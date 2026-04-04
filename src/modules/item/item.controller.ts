import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  ParseUUIDPipe,
  UploadedFiles,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ItemService } from './item.service';
import { CreateItemDto, CreateItemSchema } from './dto/create-item.dto';
import { UpdateItemDto, UpdateItemSchema } from './dto/update-item.dto';
import { createFileUploadInterceptor } from '../upload/interceptors/file-upload.interceptor';
import {
  ApiCreateItem,
  ApiGetItems,
  ApiUpdateItem,
  ApiDeleteItem,
} from './docs/item.docs';
import { QueryItemsDto } from './dto/query-items.dto';
import { safeJsonParse } from '@/common/utils/safeJsonParse';
import { JwtGuard, RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators';
import { UserRole } from '@prisma/client';

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
@UseGuards(JwtGuard, RolesGuard)
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  // ─── Public ───────────────────────────────────────────────────────────────

  @Get()
  @ApiGetItems()
  // No guards — public endpoint
  findMany(@Query() query: QueryItemsDto) {
    return this.itemService.findMany(query);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateItem()
  @UseInterceptors(ItemUploadInterceptor)
  @Roles(UserRole.ADMIN)
  async create(
    @UploadedFiles() files: { image?: Express.Multer.File[] },
    @Body() body: any,
  ) {
    if (!files?.image?.[0]) {
      throw new BadRequestException('image file is required');
    }

    const raw: CreateItemDto = body['data']
      ? safeJsonParse(body['data'])
      : body;

    const dto = CreateItemSchema.parse(raw);

    return this.itemService.create(dto, files.image[0]);
  }

  @Patch(':id')
  @ApiUpdateItem()
  @UseInterceptors(ItemUploadInterceptor)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: { image?: Express.Multer.File[] },
    @Body() body: any,
  ) {
    const raw: UpdateItemDto = body['data']
      ? safeJsonParse(body['data'])
      : body;

    const dto = UpdateItemSchema.parse(raw);

    return this.itemService.update(id, dto, files?.image?.[0]);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiDeleteItem()
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.itemService.softDelete(id);
  }
}
