import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  validate as configValidate,
  type Env,
} from './common/config/app.config';
import { PrismaModule } from './infra/prisma/prisma.module';
import { UploadModule } from './modules/upload/upload.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { MailModule } from '@/modules/mail/mail.module';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { MAIL_QUEUE } from '@/modules/mail/mail.constants';
import { LoggerMiddleware } from './common/middlewares';
import { OtpModule } from './modules/otp/otp.module';
import { RiderModule } from './modules/rider/rider.module';
import { ItemModule } from './modules/item/item.module';
import { CategoryModule } from './modules/category/category.module';
import { TagModule } from './modules/tag/tag.module';
import { CartModule } from './modules/cart/cart.module';
import { OrderModule } from './modules/order/order.module';
import { RestaurantModule } from './modules/restaurant/restaurant.module';
import { AdminModule } from './modules/admin/admin.module';
import { AdsModule } from './modules/ads/ads.module';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
import { SocketModule } from './modules/socket/socket.module';
import * as winston from 'winston';
import LokiTransport from 'winston-loki';
import { NotificationModule } from './modules/notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: configValidate,
    }),
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.colorize(),
              winston.format.simple(),
            ),
          }),
          new LokiTransport({
            host: config.get('LOKI_URL', { infer: true }),
            labels: { job: 'nestjs', app: 'pbr-hut' },
          }),
        ],
      }),
    }),
    ScheduleModule.forRoot(),
    SocketModule,
    PrismaModule,
    UploadModule,
    RedisModule,
    MailModule,
    NotificationModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: {
          url: config.get('REDIS_URL', { infer: true }),
        },
      }),
    }),
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: MAIL_QUEUE,
      adapter: BullMQAdapter,
    }),
    AuthModule,
    UserModule,
    OtpModule,
    RiderModule,
    ItemModule,
    CategoryModule,
    TagModule,
    CartModule,
    OrderModule,
    RestaurantModule,
    AdminModule,
    AdsModule,
    SocketModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*path');
  }
}
