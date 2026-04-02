import { Injectable } from '@nestjs/common';
import { TagRepository } from './repositories/tag.repository';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagService {
  constructor(private readonly tagRepo: TagRepository) {}

  findAll() {
    return this.tagRepo.findAll();
  }

  create(dto: CreateTagDto) {
    return this.tagRepo.create(dto.name);
  }

  update(id: string, dto: CreateTagDto) {
    return this.tagRepo.update(id, dto.name);
  }

  remove(id: string) {
    return this.tagRepo.remove(id);
  }
}
