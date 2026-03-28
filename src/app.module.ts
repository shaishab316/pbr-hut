import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate as configValidate } from './config/app.config';
import { PrismaModule } from './infra/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: configValidate,
    }),
    PrismaModule,
  ],
})
export class AppModule {}
