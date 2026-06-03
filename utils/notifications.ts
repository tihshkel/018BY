import {
  SchedulableTriggerInputTypes,
  type DateTriggerInput,
  type YearlyTriggerInput,
} from 'expo-notifications';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

/** Payload для перехода на экран истории уведомлений по тапу. */
export const OPEN_NOTIFICATIONS_INBOX_DATA = { openNotifications: true as const };

// Set the notification handler for the app (only if not in Expo Go)
if (!isExpoGo) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        // `shouldShowAlert` deprecated в новых версиях expo-notifications
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (error) {
    console.warn('Error setting notification handler:', error);
  }
}

/**
 * Requests permission to send notifications.
 * @returns {Promise<boolean>} - True if permission is granted, false otherwise.
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (isExpoGo) return false;

  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.warn('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Schedules a notification for a reminder.
 * @param {string} title - The title of the notification.
 * @param {string} body - The body of the notification.
 * @param {Date} date - The date for the notification.
 * @param {boolean} repeats - Whether the notification should repeat annually.
 * @returns {Promise<string | null>} - The notification ID or null if scheduling failed.
 */
export const scheduleReminderNotification = async (
  title: string,
  body: string,
  date: Date,
  repeats: boolean = false
): Promise<string | null> => {
  if (isExpoGo) return null;

  const now = new Date();
  let notificationDate = new Date(date);

  // For repeating notifications (like birthdays), ensure the next date is in the future
  if (repeats && notificationDate <= now) {
    notificationDate.setFullYear(now.getFullYear());
    if (notificationDate <= now) {
      notificationDate.setFullYear(now.getFullYear() + 1);
    }
  }

  if (notificationDate <= now && !repeats) {
    console.warn('Cannot schedule a one-time notification in the past.');
    return null;
  }

  let trigger: Notifications.NotificationTriggerInput;

  if (repeats) {
    // Ежегодно: месяц 0–11, как в JS Date (см. YearlyTriggerInput в expo-notifications)
    const yearly: YearlyTriggerInput = {
      type: SchedulableTriggerInputTypes.YEARLY,
      month: notificationDate.getMonth(),
      day: notificationDate.getDate(),
      hour: notificationDate.getHours(),
      minute: notificationDate.getMinutes(),
    };
    trigger = yearly;
  } else {
    const once: DateTriggerInput = {
      type: SchedulableTriggerInputTypes.DATE,
      date: notificationDate,
    };
    trigger = once;
  }

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: OPEN_NOTIFICATIONS_INBOX_DATA,
      },
      trigger,
    });
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

/**
 * Cancels a scheduled notification.
 * @param {string} notificationId - The ID of the notification to cancel.
 */
export const cancelScheduledNotification = async (notificationId: string) => {
  if (isExpoGo || !notificationId) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
};
