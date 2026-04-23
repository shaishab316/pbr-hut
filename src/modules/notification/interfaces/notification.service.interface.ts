export interface NotificationSendData {
  userIds: string[];
  message: string;
}

export interface INotificationService {
  sendNotification(data: NotificationSendData): Promise<void>;
}
