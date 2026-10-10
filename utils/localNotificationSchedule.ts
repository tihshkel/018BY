import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { OPEN_NOTIFICATIONS_INBOX_DATA } from '@/utils/notifications';
import type { NotificationReminder } from '@/utils/albumNotificationPreferences';

export const LOCAL_NOTIFICATION_LIMIT = 64;
export const USER_REMINDER_NOTIFICATION_PREFIX = 'app_user_reminder_';

export function getUserReminderNotificationIdentifier(id: string): string {
  return `${USER_REMINDER_NOTIFICATION_PREFIX}${id}`;
}

export function canUseLocalNotifications(): boolean {
  return Constants.executionEnvironment !== 'storeClient' && Platform.OS !== 'web';
}

export async function ensureNotificationPermission(request = false): Promise<boolean> {
  if (!canUseLocalNotifications()) return false;
  let settings = await Notifications.getPermissionsAsync();
  const allowed = () => settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (!allowed() && request && settings.canAskAgain) settings = await Notifications.requestPermissionsAsync();
  return allowed();
}

/** Календарный сдвиг с последним днём месяца вместо перепрыгивания в следующий месяц. */
export function addCalendarMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

export function nextReminderDate(row: Pick<NotificationReminder, 'date' | 'repeats'>, now = new Date()): Date | null {
  const original = new Date(row.date);
  if (!Number.isFinite(original.getTime())) return null;
  if (!row.repeats) return original > now ? original : null;
  if (original > now) return original;
  let next = addCalendarMonths(original, (now.getFullYear() - original.getFullYear()) * 12);
  if (next <= now) next = addCalendarMonths(original, (now.getFullYear() + 1 - original.getFullYear()) * 12);
  return next;
}

export async function scheduleUserReminder(row: NotificationReminder): Promise<string | null> {
  if (!(await ensureNotificationPermission())) return null;
  const date = nextReminderDate(row);
  if (!date) return null;
  const trigger: Notifications.DateTriggerInput | Notifications.YearlyTriggerInput = row.repeats && new Date(row.date).getFullYear() <= new Date().getFullYear()
    ? { type: Notifications.SchedulableTriggerInputTypes.YEARLY, month: date.getMonth(), day: date.getDate(), hour: date.getHours(), minute: date.getMinutes() }
    : { type: Notifications.SchedulableTriggerInputTypes.DATE, date };
  return Notifications.scheduleNotificationAsync({
    identifier: getUserReminderNotificationIdentifier(row.id),
    content: { title: row.title, body: row.description ?? '', sound: true, data: OPEN_NOTIFICATIONS_INBOX_DATA },
    trigger,
  });
}

export async function cancelUserReminder(row: Pick<NotificationReminder, 'id' | 'notificationId'>): Promise<void> {
  if (!canUseLocalNotifications()) return;
  const stable = getUserReminderNotificationIdentifier(row.id);
  await Notifications.cancelScheduledNotificationAsync(stable);
  if (row.notificationId && row.notificationId !== stable) await Notifications.cancelScheduledNotificationAsync(row.notificationId);
}

export async function clearScheduledAppNotifications(): Promise<void> {
  if (!canUseLocalNotifications()) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const item of scheduled) {
    if (item.identifier.startsWith('kids_') || item.identifier.startsWith('pregnancy_') ||
      item.identifier.startsWith(USER_REMINDER_NOTIFICATION_PREFIX) || item.content.data?.openNotifications === true) {
      await Notifications.cancelScheduledNotificationAsync(item.identifier);
    }
  }
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.clearLastNotificationResponseAsync();
}
