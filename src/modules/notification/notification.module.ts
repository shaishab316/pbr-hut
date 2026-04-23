import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { NotificationProcessor } from './notification.processor';
import { OneSignalService } from './onesignal.service';
import {
  NOTIFICATION_QUEUE,
  NOTIFICATION_SERVICE,
} from './notification.constants';
import { NotificationController } from './notification.controller';
import { UserNotificationService } from './user-notification.service';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationService } from './notification.service';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: NOTIFICATION_QUEUE })],
  controllers: [NotificationController],
  providers: [
    NotificationProcessor,
    UserNotificationService,
    NotificationService,
    NotificationRepository,
    { provide: NOTIFICATION_SERVICE, useClass: OneSignalService },
  ],
  exports: [
    BullModule,
    UserNotificationService,
    NotificationRepository,
    NotificationService,
  ],
})
export class NotificationModule {}
