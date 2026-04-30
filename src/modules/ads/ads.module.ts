import { Module } from '@nestjs/common';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { AdsRepository } from './repositories/ads.repository';
import { UploadModule } from '../../infra/upload/upload.module';
import { AdsCron } from './ads.cron';

@Module({
  imports: [UploadModule],
  controllers: [AdsController],
  providers: [AdsService, AdsRepository, AdsCron],
  exports: [AdsRepository],
})
export class AdsModule {}
