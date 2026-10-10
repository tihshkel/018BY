import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { DAILY_MORNING_NOTIFICATIONS } from '@/constants/dailyMorningNotifications';
import { MORNING_MESSAGES, WELCOME_NOTIFICATION } from '@/constants/pregnancyNotificationTexts';
import { getAccountSyncId } from '@/utils/account-identity';
import { pushCoreOnlyToCloud } from '@/utils/account-sync';
import {
  getAlbumNotificationProfiles, isAlbumNotificationReminder, migrateAlbumNotificationPreferences,
  readNotificationReminders, saveAlbumNotificationPreferences,
} from '@/utils/albumNotificationPreferences';
import { buildKidsNotificationCandidates, saveKidsInfo } from '@/utils/kidsNotificationScheduler';
import {
  buildPregnancyNotificationCandidates, getPregnancyWeek, getTrimester, savePregnancyInfo,
} from '@/utils/pregnancyNotificationScheduler';
import {
  canUseLocalNotifications, clearScheduledAppNotifications, ensureNotificationPermission,
  LOCAL_NOTIFICATION_LIMIT, nextReminderDate, scheduleUserReminder,
} from '@/utils/localNotificationSchedule';
import { OPEN_NOTIFICATIONS_INBOX_DATA } from '@/utils/notifications';

export const IOS_SCHEDULED_NOTIFICATION_LIMIT = LOCAL_NOTIFICATION_LIMIT;
export type AlbumNotificationRefreshOptions = { skipCloudSync?: boolean; force?: boolean };
const REFRESH_KEY = '@album_notifications_refresh_v3';
let refreshInFlight: Promise<void> | null = null;
let generation = 0;

/** Дожидаемся старого планировщика перед сменой пользователя, затем удаляем его очередь. */
export async function clearAlbumNotificationsForAccountSwitch(): Promise<void> {
  generation += 1;
  await refreshInFlight?.catch(() => {});
  await clearScheduledAppNotifications();
  await AsyncStorage.removeItem(REFRESH_KEY);
}

type PlannedNotification = {
  identifier: string;
  title: string;
  body: string;
  trigger: Notifications.NotificationTriggerInput;
};

/** Общая очередь всех бумажных, цифровых и личных напоминаний; пользовательские настройки не сбрасываются. */
export async function refreshAllAlbumNotifications(options?: AlbumNotificationRefreshOptions): Promise<void> {
  while (refreshInFlight) {
    await refreshInFlight;
    // После ожидания читаем актуальные настройки: во время refresh мог добавиться новый альбом.
  }
  refreshInFlight = refreshNotifications(options).finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

async function refreshNotifications(options?: AlbumNotificationRefreshOptions): Promise<void> {
  const currentGeneration = generation;
  await migrateAlbumNotificationPreferences();
  if (!canUseLocalNotifications()) return;
  if (!(await ensureNotificationPermission())) {
    // Выключение в приложении должно удалить старую очередь даже при запрете в iOS.
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of pending) {
      if (currentGeneration !== generation) return;
      if (item.identifier.startsWith('kids_') || item.identifier.startsWith('pregnancy_') ||
        item.identifier.startsWith('app_user_reminder_') || item.content.data?.openNotifications === true) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
    }
    await AsyncStorage.removeItem(REFRESH_KEY);
    return;
  }
  const rows = await readNotificationReminders();
  const now = new Date();
  const syncId = await getAccountSyncId();
  const signature = JSON.stringify({
    syncId, day: now.toDateString(), timezone: now.getTimezoneOffset(),
    rows: rows.map(({ notificationId, ...row }) => row),
  });
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const isManaged = (id: string) => id.startsWith('kids_') || id.startsWith('pregnancy_') || id.startsWith('app_user_reminder_');
  const legacyIds = new Set(rows.map((row) => row.notificationId).filter(Boolean));
  const isOwned = (item: Notifications.NotificationRequest) =>
    isManaged(item.identifier) || legacyIds.has(item.identifier) || item.content.data?.openNotifications === true;
  const owned = scheduled.filter(isOwned);
  if (!options?.force && owned.length > 0 && await AsyncStorage.getItem(REFRESH_KEY) === signature) return;

  const available = Platform.OS === 'ios'
    ? Math.max(0, LOCAL_NOTIFICATION_LIMIT - (scheduled.length - owned.length)) : 500;
  const profiles = getAlbumNotificationProfiles(rows);
  const kidsDaily = profiles.some((profile) => profile.type === 'kids' && profile.daily);
  const pregnancyDaily = profiles.find((profile) => profile.type === 'pregnancy' && profile.daily &&
    (profile.date.toDateString() === now.toDateString() || profile.date > now));
  const daily: PlannedNotification[] = [];
  if (kidsDaily) {
    for (const message of DAILY_MORNING_NOTIFICATIONS) {
      daily.push({
        identifier: `kids_morning_day_${message.day}`, title: message.title, body: message.body,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.MONTHLY, day: message.day, hour: 9, minute: 30 },
      });
    }
  }
  // Одноразовые даты прекращают утренние сообщения после ПДР автоматически.
  if (pregnancyDaily) {
    for (let offset = 0; offset < 14; offset++) {
      const date = new Date(now);
      date.setDate(date.getDate() + offset);
      date.setHours(9, 0, 0, 0);
      const dueEnd = new Date(pregnancyDaily.date);
      dueEnd.setHours(23, 59, 59, 999);
      if (date <= now || date > dueEnd) continue;
      const trimester = getTrimester(getPregnancyWeek(pregnancyDaily.date, date));
      const messages = MORNING_MESSAGES.find((item) => item.trimester === trimester)?.messages ?? [];
      const calendarDay = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
      daily.push({
        identifier: `pregnancy_morning_${calendarDay}`, title: 'Доброе утро! 🌸',
        body: messages[calendarDay % Math.max(1, messages.length)] ?? 'Загляните в дневник и сохраните своё настроение.',
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      });
    }
  }

  const personal = rows.filter((row) => !isAlbumNotificationReminder(row) && row.enabled !== false && row.deleted !== true && nextReminderDate(row, now))
    .sort((a, b) => nextReminderDate(a, now)!.getTime() - nextReminderDate(b, now)!.getTime());
  const events = profiles.flatMap((profile) => {
    if (!profile.events) return [];
    const candidates = profile.type === 'kids'
      ? buildKidsNotificationCandidates(profile.date, now) : buildPregnancyNotificationCandidates(profile.date, now);
    if (profile.type === 'pregnancy' && profile.welcomeAt && new Date(profile.welcomeAt) > now) {
      candidates.push({ ...WELCOME_NOTIFICATION, date: new Date(profile.welcomeAt), identifier: 'pregnancy_welcome' });
    }
    return candidates.map((item) => ({ ...item, projectId: profile.projectId }));
  }).sort((a, b) => a.date.getTime() - b.date.getTime());
  // Бумажная и электронная версия одного альбома с одной датой не удваивают push.
  const seen = new Set<string>();
  const uniqueEvents = events.filter((item) => {
    const key = `${item.identifier}:${item.date.getTime()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Личные напоминания имеют приоритет; 31 сообщение резервируется вместе, чтобы не было пропущенных дней.
  const personalBudget = Math.min(personal.length, Math.max(0, available - (kidsDaily ? DAILY_MORNING_NOTIFICATIONS.length : 0)));
  const chosenPersonal = personal.slice(0, personalBudget);
  const remaining = available - chosenPersonal.length;
  const dailyBudget = Math.min(daily.length, Math.max(0, remaining - Math.min(8, uniqueEvents.length)));
  const kidsMorningBudget = kidsDaily && remaining >= DAILY_MORNING_NOTIFICATIONS.length ? DAILY_MORNING_NOTIFICATIONS.length : 0;
  const chosenDaily = daily.slice(0, Math.max(kidsMorningBudget, dailyBudget));
  const chosenEvents = uniqueEvents.slice(0, Math.max(0, remaining - chosenDaily.length));
  const requests: PlannedNotification[] = [
    ...chosenDaily,
    ...chosenEvents.map((item) => ({
      identifier: `${item.identifier}_${encodeURIComponent(item.projectId)}`,
      title: item.title, body: item.body,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.date } as Notifications.DateTriggerInput,
    })),
  ];

  if (currentGeneration !== generation) return;
  for (const item of owned) {
    if (currentGeneration !== generation) return;
    await Notifications.cancelScheduledNotificationAsync(item.identifier);
  }
  for (const row of chosenPersonal) {
    if (currentGeneration !== generation) return;
    await scheduleUserReminder(row);
  }
  for (const item of requests) {
    if (currentGeneration !== generation) return;
    await Notifications.scheduleNotificationAsync({
      identifier: item.identifier,
      content: { title: item.title, body: item.body, sound: true, data: OPEN_NOTIFICATIONS_INBOX_DATA },
      trigger: item.trigger,
    });
  }
  if (currentGeneration !== generation) return;
  await AsyncStorage.setItem(REFRESH_KEY, signature);
  if (!options?.skipCloudSync) await pushCoreOnlyToCloud({ remindersAuthoritativeLocal: true });
}

/** Дата хранится отдельно у каждого подключённого альбома. */
export async function setupAlbumNotificationsForCelebration(
  date: Date,
  type: 'pregnancy' | 'kids',
  projectId?: string
): Promise<void> {
  if (!Number.isFinite(date.getTime())) throw new Error('Некорректная дата альбома');
  if (refreshInFlight) await refreshInFlight;
  const id = projectId ?? `${type}_${Date.now()}`;
  await saveAlbumNotificationPreferences(type, date, id, true);
  if (type === 'pregnancy') await savePregnancyInfo(date, id);
  else await saveKidsInfo(date, id);
  await ensureNotificationPermission(true);
  await refreshAllAlbumNotifications({ skipCloudSync: true, force: true });
}
