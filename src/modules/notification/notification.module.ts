import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { NotificationProcessor } from './notification.processor';
import { OneSignalService } from './onesignal.service';
import {
  NOTIFICATION_QUEUE,
  NOTIFICATION_SERVICE,
} from './notification.constants';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: NOTIFICATION_QUEUE })],
  providers: [
    NotificationProcessor,
    { provide: NOTIFICATION_SERVICE, useClass: OneSignalService },
  ],
  exports: [BullModule],
})
export class NotificationModule {}
