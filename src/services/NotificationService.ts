import notifee, {
  TimestampTrigger,
  TriggerType,
  AuthorizationStatus,
} from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import {Platform, PermissionsAndroid} from 'react-native';

class NotificationService {
  private static instance: NotificationService;
  private fcmToken: string | null = null;

  private constructor() {
    this.initializeFCM();
  }

  private async initializeFCM() {
    await this.requestFCMPermission();
    this.setupFCMListeners();
  }

  private async requestFCMPermission() {
    try {
      console.log('[FCM] Requesting permissions for platform:', Platform.OS);

      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        console.log(
          '[FCM] iOS permission status:',
          authStatus,
          'enabled:',
          enabled,
        );
        return enabled;
      } else if (Platform.OS === 'android') {
        console.log('[FCM] Checking if permission is already granted...');
        const hasPermission = await messaging().hasPermission();
        console.log('[FCM] Current permission status:', hasPermission);

        if (hasPermission === messaging.AuthorizationStatus.NOT_DETERMINED) {
          console.log('[FCM] Requesting Android notification permission...');
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          console.log('[FCM] Permission request result:', granted);
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }

        return hasPermission === messaging.AuthorizationStatus.AUTHORIZED;
      }
      return false;
    } catch (error) {
      console.error('[FCM] Error requesting permissions:', error);
      return false;
    }
  }

  private setupFCMListeners() {
    // Handle background messages
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Message handled in the background!', remoteMessage);
      await this.displayFCMNotification(remoteMessage);
    });

    // Handle foreground messages
    messaging().onMessage(async remoteMessage => {
      console.log('Received foreground message:', remoteMessage);
      await this.displayFCMNotification(remoteMessage);
    });

    // Handle notification open events
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification caused app to open:', remoteMessage);
      // Handle notification navigation here
    });
  }

  private async displayFCMNotification(remoteMessage: any) {
    // Create a channel for Android
    const channelId = await notifee.createChannel({
      id: 'fcm-notifications',
      name: 'Firebase Cloud Messages',
      importance: 4,
    });

    // Display the notification using Notifee
    await notifee.displayNotification({
      title: remoteMessage.notification?.title,
      body: remoteMessage.notification?.body,
      android: {
        channelId,
      },
    });
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermission() {
    const notifeeSettings = await notifee.requestPermission();
    const fcmPermission = await this.requestFCMPermission();
    return (
      notifeeSettings.authorizationStatus === AuthorizationStatus.AUTHORIZED &&
      fcmPermission
    );
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

  async getFCMToken(): Promise<string | null> {
    try {
      console.log('[FCM] Starting token retrieval...');

      // Check Google Play Services (Android only)
      if (Platform.OS === 'android') {
        const isAvailable = await messaging().hasPermission();
        console.log('[FCM] Firebase Messaging permission status:', isAvailable);

        if (
          isAvailable === messaging.AuthorizationStatus.NOT_DETERMINED ||
          isAvailable === messaging.AuthorizationStatus.DENIED
        ) {
          console.log('[FCM] Requesting Firebase Messaging permission...');
          const authStatus = await messaging().requestPermission();
          console.log('[FCM] Permission request result:', authStatus);
        }
      }

      // Get the token
      console.log('[FCM] Getting token...');
      this.fcmToken = await messaging().getToken();

      if (this.fcmToken) {
        console.log('[FCM] Token retrieved successfully');
        console.log('[FCM] Token:', this.fcmToken);
      } else {
        console.warn('[FCM] Token is null');
      }

      return this.fcmToken;
    } catch (error) {
      console.error('[FCM] Error getting token:', error);
      if (error instanceof Error) {
        console.error('[FCM] Error message:', error.message);
        console.error('[FCM] Error stack:', error.stack);
      }
      return null;
    }
  }

  async subscribeToTopic(topic: string): Promise<void> {
    try {
      await messaging().subscribeToTopic(topic);
      console.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      console.error(`Error subscribing to topic ${topic}:`, error);
    }
  }

  async unsubscribeFromTopic(topic: string): Promise<void> {
    try {
      await messaging().unsubscribeFromTopic(topic);
      console.log(`Unsubscribed from topic: ${topic}`);
    } catch (error) {
      console.error(`Error unsubscribing from topic ${topic}:`, error);
    }
  }
}

export default NotificationService;
