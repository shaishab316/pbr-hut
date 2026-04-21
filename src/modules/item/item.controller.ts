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
import { CurrentUser, Roles } from '@/common/decorators';
import { UserRole } from '@prisma/client';
import { Pagination } from '@/common/types/pagination';
import {
  CacheKey,
  CacheTTL,
  InvalidateCache,
} from '@/common/decorators/cache.decorator';

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

  // ─── Public ───────────────────────────────────────────────────────────────

  @Get()
  @ApiGetItems()
  @CacheKey('items:all')
  @CacheTTL(120)
  async findMany(@Query() query: QueryItemsDto) {
    const { items, total } = await this.itemService.findMany(query);

    return {
      message: 'Items retrieved successfully',
      data: items,
      meta: {
        pagination: {
          total,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(total / query.limit),
        } satisfies Pagination,
      },
    };
  }

  @Get('popular')
  @ApiGetItems()
  @CacheKey('items:popular')
  @CacheTTL(120)
  async popularItems(@Query() query: QueryItemsDto) {
    const { items, total } = await this.itemService.findMany(query);

    return {
      message: 'Popular items retrieved successfully',
      data: items,
      meta: {
        pagination: {
          total,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(total / query.limit),
        } satisfies Pagination,
      },
    };
  }

  @Get('you-may-like')
  @ApiGetItems()
  @CacheKey('items:you-may-like::user.id')
  @CacheTTL(120)
  async youMayLike(
    @Query() query: QueryItemsDto,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @CurrentUser('id') userId: string, // not implemented in service yet, but can be used to personalize recommendations
  ) {
    const { items, total } = await this.itemService.findMany(query);

    return {
      message: 'You may like items retrieved successfully',
      data: items,
      meta: {
        pagination: {
          total,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(total / query.limit),
        } satisfies Pagination,
      },
    };
  }

  @Get('hot-search-terms')
  // @CacheKey('items:hot-search-terms') // already use redis cache
  // @CacheTTL(300)
  async hotSearchTerms() {
    const terms = await this.itemService.getHotSearchTerms();

    return {
      message: 'Hot search terms retrieved successfully',
      data: terms,
    };
  }

  @Get(':id')
  @CacheKey('items:single::params.id')
  @CacheTTL(120)
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    const item = await this.itemService.findById(id);

    return {
      message: 'Item retrieved successfully',
      data: item,
    };
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateItem()
  @UseInterceptors(ItemUploadInterceptor)
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @InvalidateCache(
    'items:all',
    'items:popular',
    'items:you-may-like',
    // 'items:hot-search-terms', // it come when /item?search=xxx, so no need to invalidate when create/update item
  )
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
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @InvalidateCache(
    'items:all',
    'items:popular',
    'items:you-may-like',
    'items:single::params.id',
  )
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
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @InvalidateCache(
    'items:all',
    'items:popular',
    'items:you-may-like',
    'items:single::params.id',
  )
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.itemService.softDelete(id);
  }
}
