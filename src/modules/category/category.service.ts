import { Injectable } from '@nestjs/common';
import { CategoryRepository } from './repositories/category.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepo: CategoryRepository) {}

  findAll() {
    return this.categoryRepo.findAll();
  }

  create(dto: CreateCategoryDto) {
    return this.categoryRepo.create(dto.name, dto.hasSizeVariants);
  }

  update(id: string, dto: CreateCategoryDto) {
    return this.categoryRepo.update(id, dto.name, dto.hasSizeVariants);
  }

  remove(id: string) {
    return this.categoryRepo.remove(id);
  }

  findSubs(categoryId: string) {
    return this.categoryRepo.findSubs(categoryId);
  }

  createSub(categoryId: string, dto: CreateSubCategoryDto) {
    return this.categoryRepo.createSub(
      categoryId,
      dto.name,
      dto.hasSizeVariants,
    );
  }

  updateSub(subId: string, dto: CreateSubCategoryDto) {
    return this.categoryRepo.updateSub(subId, dto.name, dto.hasSizeVariants);
  }

  removeSub(subId: string) {
    return this.categoryRepo.removeSub(subId);
  }
}
