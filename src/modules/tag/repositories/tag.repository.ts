import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/infra/prisma/prisma.service';

@Injectable()
export class TagRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
  }

  async create(name: string) {
    const exists = await this.prisma.tag.findUnique({ where: { name } });
    if (exists) throw new ConflictException('Tag already exists');
    return this.prisma.tag.create({ data: { name } });
  }

  async update(id: string, name: string) {
    await this.findOneOrThrow(id);
    return this.prisma.tag.update({ where: { id }, data: { name } });
  }

  async remove(id: string) {
    await this.findOneOrThrow(id);
    return this.prisma.tag.delete({ where: { id } });
  }

  private async findOneOrThrow(id: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException('Tag not found');
    return tag;
  }
}
