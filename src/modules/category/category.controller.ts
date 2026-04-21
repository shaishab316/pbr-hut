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
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import {
  ApiCreateCategory,
  ApiCreateSubCategory,
  ApiDeleteCategory,
  ApiDeleteSubCategory,
  ApiGetCategories,
  ApiGetSubCategories,
  ApiUpdateCategory,
  ApiUpdateSubCategory,
} from './docs/category.docs';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // Category
  @Get()
  @ApiGetCategories()
  @CacheKey('categories:all')
  @CacheTTL(300)
  findAll() {
    return this.categoryService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateCategory()
  @InvalidateCache('categories:all:*')
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Patch(':id')
  @ApiUpdateCategory()
  @InvalidateCache('categories:all:*')
  update(@Param('id') id: string, @Body() dto: CreateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteCategory()
  @InvalidateCache('categories:all:*')
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }

  // SubCategory
  @Get(':id/sub-categories')
  @ApiGetSubCategories()
  @CacheKey('categories:subcategories::params.id')
  @CacheTTL(300)
  findSubs(@Param('id') id: string) {
    return this.categoryService.findSubs(id);
  }

  @Post(':id/sub-categories')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateSubCategory()
  @InvalidateCache('categories:all:*', 'categories:subcategories::params.id')
  createSub(
    @Param('id') categoryId: string,
    @Body() dto: CreateSubCategoryDto,
  ) {
    return this.categoryService.createSub(categoryId, dto);
  }

  @Patch('sub-categories/:subId')
  @ApiUpdateSubCategory()
  @InvalidateCache('categories:all:*', 'categories:subcategories:*')
  updateSub(@Param('subId') subId: string, @Body() dto: CreateSubCategoryDto) {
    return this.categoryService.updateSub(subId, dto);
  }

  @Delete('sub-categories/:subId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteSubCategory()
  @InvalidateCache('categories:all:*', 'categories:subcategories:*')
  removeSub(@Param('subId') subId: string) {
    return this.categoryService.removeSub(subId);
  }
}
