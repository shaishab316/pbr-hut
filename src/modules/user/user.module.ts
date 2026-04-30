import { Module } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { RiderModule } from '../rider/rider.module';
import { UploadModule } from '../../infra/upload/upload.module';

@Module({
  imports: [RiderModule, UploadModule],
  controllers: [UserController],
  providers: [UserRepository, UserService],
  exports: [UserRepository],
})
export class UserModule {}
