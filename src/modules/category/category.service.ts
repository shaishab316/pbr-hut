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
    return this.categoryRepo.create(dto.name);
  }

  update(id: string, dto: CreateCategoryDto) {
    return this.categoryRepo.update(id, dto.name);
  }

  remove(id: string) {
    return this.categoryRepo.remove(id);
  }

  findSubs(categoryId: string) {
    return this.categoryRepo.findSubs(categoryId);
  }

  createSub(categoryId: string, dto: CreateSubCategoryDto) {
    return this.categoryRepo.createSub(categoryId, dto.name);
  }

  updateSub(subId: string, dto: CreateSubCategoryDto) {
    return this.categoryRepo.updateSub(subId, dto.name);
  }

  removeSub(subId: string) {
    return this.categoryRepo.removeSub(subId);
  }
}
