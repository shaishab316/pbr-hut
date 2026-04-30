import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import {
  NOTIFICATION_JOBS,
  NOTIFICATION_QUEUE,
} from './notification.constants';
import { Queue } from 'bullmq';
import { NotificationSendData } from './interfaces/notification.service.interface';
import { NotificationType } from '@prisma/client';
import { ulid } from 'ulid';

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
    await this.notificationQueue.add(
      NOTIFICATION_JOBS.SEND,
      {
        userIds,
        title,
        message,
        type,
        id: ulid(),
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50, age: 24 * 60 * 60 },
      },
    );
  }
}
