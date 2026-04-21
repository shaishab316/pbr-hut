import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CacheKey,
  CacheTTL,
  InvalidateCache,
} from '@/common/decorators/cache.decorator';
import { TagService } from './tag.service';
import { CreateTagDto } from './dto/create-tag.dto';
import {
  ApiCreateTag,
  ApiDeleteTag,
  ApiGetTags,
  ApiUpdateTag,
} from './docs/tag.docs';

@ApiTags('Tags')
@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get()
  @ApiGetTags()
  @CacheKey('tags:all')
  @CacheTTL(300)
  findAll() {
    return this.tagService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateTag()
  @InvalidateCache('tags:all:*')
  create(@Body() dto: CreateTagDto) {
    return this.tagService.create(dto);
  }

  @Patch(':id')
  @ApiUpdateTag()
  @InvalidateCache('tags:all:*')
  update(@Param('id') id: string, @Body() dto: CreateTagDto) {
    return this.tagService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteTag()
  @InvalidateCache('tags:all:*')
  remove(@Param('id') id: string) {
    return this.tagService.remove(id);
  }
}
