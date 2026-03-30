import { Module } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { RiderRepository } from './repositories/rider.repository';

@Module({
  controllers: [UserController],
  providers: [UserRepository, UserService, RiderRepository],
  exports: [UserRepository, RiderRepository],
})
export class UserModule {}
