import { Module } from '@nestjs/common';
import { RiderService } from './rider.service';
import { RiderController } from './rider.controller';
import { RiderRepository } from './repositories/rider.repository';
import { UploadModule } from '../../infra/upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [RiderController],
  providers: [RiderService, RiderRepository],
  exports: [RiderService, RiderRepository],
})
export class RiderModule {}
