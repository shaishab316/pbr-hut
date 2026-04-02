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
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // Category
  @Get()
  findAll() {
    return this.categoryService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: CreateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }

  // SubCategory
  @Get(':id/sub-categories')
  findSubs(@Param('id') id: string) {
    return this.categoryService.findSubs(id);
  }

  @Post(':id/sub-categories')
  @HttpCode(HttpStatus.CREATED)
  createSub(
    @Param('id') categoryId: string,
    @Body() dto: CreateSubCategoryDto,
  ) {
    return this.categoryService.createSub(categoryId, dto);
  }

  @Patch('sub-categories/:subId')
  updateSub(@Param('subId') subId: string, @Body() dto: CreateSubCategoryDto) {
    return this.categoryService.updateSub(subId, dto);
  }

  @Delete('sub-categories/:subId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSub(@Param('subId') subId: string) {
    return this.categoryService.removeSub(subId);
  }
}
