import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/infra/prisma/prisma.service';

@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      include: { subCategories: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(name: string) {
    const exists = await this.prisma.category.findUnique({ where: { name } });
    if (exists) throw new ConflictException('Category already exists');
    return this.prisma.category.create({ data: { name } });
  }

  async update(id: string, name: string) {
    await this.findOneOrThrow(id);
    return this.prisma.category.update({ where: { id }, data: { name } });
  }

  async remove(id: string) {
    await this.findOneOrThrow(id);
    return this.prisma.category.delete({ where: { id } });
  }

  findSubs(categoryId: string) {
    return this.prisma.subCategory.findMany({
      where: { categoryId },
      orderBy: { name: 'asc' },
    });
  }

  async createSub(categoryId: string, name: string) {
    await this.findOneOrThrow(categoryId);
    return this.prisma.subCategory.create({ data: { name, categoryId } });
  }

  async updateSub(subId: string, name: string) {
    await this.findSubOrThrow(subId);
    return this.prisma.subCategory.update({
      where: { id: subId },
      data: { name },
    });
  }

  async removeSub(subId: string) {
    await this.findSubOrThrow(subId);
    return this.prisma.subCategory.delete({ where: { id: subId } });
  }

  private async findOneOrThrow(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  private async findSubOrThrow(id: string) {
    const sub = await this.prisma.subCategory.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('SubCategory not found');
    return sub;
  }
}
