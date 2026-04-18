import { Module } from '@nestjs/common';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { AdsRepository } from './repositories/ads.repository';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [AdsController],
  providers: [AdsService, AdsRepository],
  exports: [AdsRepository],
})
export class AdsModule {}
