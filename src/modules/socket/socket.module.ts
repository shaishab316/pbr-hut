import { Global, Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Global()
@Module({
  imports: [AuthModule, UserModule],
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SocketModule {}
