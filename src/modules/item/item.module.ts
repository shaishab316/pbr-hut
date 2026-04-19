import { Module } from '@nestjs/common';
import { ItemService } from './item.service';
import { ItemController } from './item.controller';
import { PrismaModule } from '@/infra/prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { ItemRepository } from './repositories/item.repository';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, UploadModule, RedisModule],
  controllers: [ItemController],
  providers: [ItemService, ItemRepository],
  exports: [ItemService, ItemRepository],
})
export class ItemModule {}
