import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { NOTIFICATION_QUEUE } from './notification.constants';
import { Queue } from 'bullmq';
import { NotificationSendData } from './interfaces/notification.service.interface';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue<NotificationSendData>,
  ) {}

  async sendNotification(
    userIds: string[],
    title: string,
    message: string,
    type: NotificationType,
  ) {
    await this.notificationQueue.add('send-notification', {
      userIds,
      title,
      message,
      type,
    });
  }
}
