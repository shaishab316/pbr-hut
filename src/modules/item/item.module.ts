import { Module } from '@nestjs/common';
import { ItemService } from './item.service';
import { ItemController } from './item.controller';
import { PrismaModule } from '@/infra/prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { ItemRepository } from './repositories/item.repository';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [ItemController],
  providers: [ItemService, ItemRepository],
  exports: [ItemService, ItemRepository],
})
export class ItemModule {}
