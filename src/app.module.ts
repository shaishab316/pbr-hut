import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate as configValidate } from './config/app.config';
import { PrismaModule } from './infra/prisma/prisma.module';
import { UploadModule } from './modules/upload/upload.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: configValidate,
    }),
    PrismaModule,
    UploadModule,
    RedisModule,
    AuthModule,
    UserModule,
  ],
})
export class AppModule {}
