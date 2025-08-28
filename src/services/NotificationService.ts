import notifee, {
  TimestampTrigger,
  TriggerType,
  AuthorizationStatus,
} from '@notifee/react-native';

class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermission() {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
  }

  async scheduleTaskReminder(taskId: string, taskTitle: string, dueDate: Date) {
    // Create a timestamp trigger
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: dueDate.getTime(),
    };

    // Create a notification channel (required for Android)
    const channelId = await notifee.createChannel({
      id: 'task-reminders',
      name: 'Task Reminders',
      importance: 4, // High importance
    });

    // Schedule the notification
    await notifee.createTriggerNotification(
      {
        id: taskId,
        title: 'Task Reminder',
        body: taskTitle,
        android: {
          channelId,
          pressAction: {
            id: 'default',
          },
        },
        ios: {
          sound: 'default',
        },
      },
      trigger,
    );
  }

  async cancelTaskReminder(taskId: string) {
    await notifee.cancelNotification(taskId);
  }

  async cancelAllReminders() {
    await notifee.cancelAllNotifications();
  }
}

export default NotificationService;
