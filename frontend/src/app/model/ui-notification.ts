export type NotifyType = 'info' | 'warn' | 'error' | 'success';

export interface UINotification {
  type: NotifyType;
  title: string;
  message: string;
}
