import { NotificationType } from '@prisma/client';

export interface NotificationSendData {
  userIds: string[];
  message: string;
  title: string;
  type: NotificationType;
}

export interface INotificationService {
  sendNotification(data: NotificationSendData): Promise<void>;
}
