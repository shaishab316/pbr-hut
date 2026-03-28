import { Module } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';

@Module({
  providers: [UserRepository],
})
export class UserModule {}
