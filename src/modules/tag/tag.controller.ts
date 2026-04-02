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
  findAll() {
    return this.tagService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateTag()
  create(@Body() dto: CreateTagDto) {
    return this.tagService.create(dto);
  }

  @Patch(':id')
  @ApiUpdateTag()
  update(@Param('id') id: string, @Body() dto: CreateTagDto) {
    return this.tagService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteTag()
  remove(@Param('id') id: string) {
    return this.tagService.remove(id);
  }
}
