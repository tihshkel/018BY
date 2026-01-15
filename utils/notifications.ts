import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Set the notification handler for the app
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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

  let trigger: Notifications.NotificationTrigger;

  if (Platform.OS === 'ios') {
    const dateComponents: Notifications.DateTriggerInput = {
      month: notificationDate.getMonth() + 1,
      day: notificationDate.getDate(),
      hour: notificationDate.getHours(),
      minute: notificationDate.getMinutes(),
    };
    trigger = {
      ...dateComponents,
      repeats: repeats,
    };
  } else {
    // Android doesn't support reliable yearly repeating triggers easily.
    // We schedule a one-time notification for the next occurrence.
    // A background task would be needed for true repeating functionality.
    const seconds = Math.floor((notificationDate.getTime() - now.getTime()) / 1000);
    if (seconds <= 0) {
        return null;
    }
    trigger = { seconds };
  }

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
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
