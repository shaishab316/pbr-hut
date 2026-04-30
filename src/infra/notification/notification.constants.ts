export const NOTIFICATION_QUEUE = 'notification';
export const NOTIFICATION_JOBS = {
  SEND: 'notification.send',
} as const;
export const NOTIFICATION_SERVICE = Symbol('INotificationService');
