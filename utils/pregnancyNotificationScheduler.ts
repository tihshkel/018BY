/**
 * Планировщик уведомлений для дневника беременности
 * Расчёт недель беременности и планирование push-уведомлений
 */

import {
    DUE_DATE_NOTIFICATIONS,
    HELPER_REMINDERS,
    MORNING_MESSAGES,
    PREPARATION_NOTIFICATIONS,
    TRIMESTER_NOTIFICATIONS,
    WEEKLY_NOTIFICATIONS,
    WELCOME_NOTIFICATION,
} from '@/constants/pregnancyNotificationTexts';
import { getAccountSyncId } from '@/utils/account-identity';
import { getRemindersStorageKey, pushCoreOnlyToCloud } from '@/utils/account-sync';
import { OPEN_NOTIFICATIONS_INBOX_DATA } from '@/utils/notifications';
import {
    SchedulableTriggerInputTypes,
    type DailyTriggerInput,
    type DateTriggerInput,
} from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Проверяем, находимся ли мы в Expo Go
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Динамическая загрузка expo-notifications
let notificationsModule: typeof import('expo-notifications') | null = null;

const getNotifications = (): typeof import('expo-notifications') | null => {
    if (isExpoGo) {
        console.log('[PregnancyNotifications] Expo Go detected, notifications disabled');
        return null;
    }

    if (notificationsModule) {
        return notificationsModule;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Notifications = require('expo-notifications');
        notificationsModule = Notifications;
        return Notifications;
    } catch (error) {
        console.error('[PregnancyNotifications] Failed to load notifications module:', error);
        return null;
    }
};

/**
 * Рассчитать текущую неделю беременности по ПДР
 * ПДР = 40 недель от первого дня последней менструации
 */
export const TOTAL_PREGNANCY_DAYS = 280;

export function getPregnancyWeek(dueDate: Date): number {
    const now = new Date();
    const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const weeksUntilDue = Math.floor(daysUntilDue / 7);
    const currentWeek = 40 - weeksUntilDue;
    return Math.max(1, Math.min(42, currentWeek));
}

export type PregnancyDayInfo = {
    day: number;
    dayInWeek: number;
    week: number;
    trimester: number;
};

/**
 * Текущий день беременности (1…294) от LMP = ПДР − 280 дней.
 */
export function getPregnancyDay(dueDate: Date, now: Date = new Date()): PregnancyDayInfo {
    const lmp = new Date(dueDate);
    lmp.setDate(lmp.getDate() - TOTAL_PREGNANCY_DAYS);
    lmp.setHours(0, 0, 0, 0);

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const rawDay =
        Math.floor((today.getTime() - lmp.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const day = Math.max(1, Math.min(TOTAL_PREGNANCY_DAYS + 14, rawDay));
    const week = getPregnancyWeek(dueDate);
    const dayInWeek = ((day - 1) % 7) + 1;

    return {
        day,
        dayInWeek,
        week,
        trimester: getTrimester(week),
    };
}

/**
 * Короткий текст недели для виджета (из WEEKLY_NOTIFICATIONS).
 */
export function getWeeklyInsightForWeek(week: number, maxLength = 120): string | undefined {
    const entry = WEEKLY_NOTIFICATIONS.find((item) => item.week === week);
    if (!entry?.body) return undefined;
    const body = entry.body.trim();
    if (body.length <= maxLength) return body;
    return `${body.slice(0, maxLength - 1).trim()}…`;
}

/**
 * Рассчитать дату начала определённой недели беременности
 */
export function getWeekStartDate(dueDate: Date, week: number): Date {
    // ПДР = конец 40 недели
    // Начало недели N = ПДР - (40 - N + 1) * 7 дней
    const weeksFromDue = 40 - week + 1;
    const date = new Date(dueDate);
    date.setDate(date.getDate() - weeksFromDue * 7);
    date.setHours(9, 0, 0, 0); // 09:00
    return date;
}

/**
 * Получить триместр по неделе
 */
export function getTrimester(week: number): number {
    if (week <= 13) return 1;
    if (week <= 27) return 2;
    return 3;
}

/**
 * Запланировать одно уведомление
 */
const PREGNANCY_DAILY_REMINDER_HOUR = 9;
const PREGNANCY_DAILY_REMINDER_MINUTE = 0;

async function scheduleDailyNotification(
    title: string,
    body: string,
    hour: number,
    minute: number,
    identifier: string
): Promise<string | null> {
    const Notifications = getNotifications();
    if (!Notifications) return null;

    try {
        const trigger: DailyTriggerInput = {
            type: SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
        };

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: true,
                data: OPEN_NOTIFICATIONS_INBOX_DATA,
            },
            trigger,
            identifier,
        });

        console.log(`[PregnancyNotifications] Scheduled daily: ${title} at ${hour}:${String(minute).padStart(2, '0')}`);
        return notificationId;
    } catch (error) {
        console.error(`[PregnancyNotifications] Failed to schedule daily: ${title}`, error);
        return null;
    }
}

async function scheduleNotification(
    title: string,
    body: string,
    triggerDate: Date,
    identifier?: string
): Promise<string | null> {
    const Notifications = getNotifications();
    if (!Notifications) return null;

    const now = new Date();
    if (triggerDate <= now) {
        console.log(`[PregnancyNotifications] Skipping past notification: ${title}`);
        return null;
    }

    try {
        const trigger: DateTriggerInput = {
            type: SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
        };

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: true,
                data: OPEN_NOTIFICATIONS_INBOX_DATA,
            },
            trigger,
            identifier,
        });

        console.log(`[PregnancyNotifications] Scheduled: ${title} at ${triggerDate.toLocaleString()}`);
        return notificationId;
    } catch (error) {
        console.error(`[PregnancyNotifications] Failed to schedule: ${title}`, error);
        return null;
    }
}

/**
 * Отменить все уведомления беременности
 */
export async function cancelAllPregnancyNotifications(): Promise<void> {
    const Notifications = getNotifications();
    if (!Notifications) return;

    try {
        // Получаем все запланированные уведомления
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();

        // Отменяем те, которые относятся к беременности
        for (const notification of scheduled) {
            if (notification.identifier?.startsWith('pregnancy_')) {
                await Notifications.cancelScheduledNotificationAsync(notification.identifier);
            }
        }

        console.log('[PregnancyNotifications] Cancelled all pregnancy notifications');
    } catch (error) {
        console.error('[PregnancyNotifications] Failed to cancel notifications:', error);
    }
}

/**
 * Сохранить информацию о беременности
 */
type StoredPregnancyInfo = {
    dueDate: string;
    projectId: string;
    createdAt: string;
    welcomeNotificationScheduled?: boolean;
};

async function readStoredPregnancyInfo(): Promise<StoredPregnancyInfo | null> {
    try {
        const data = await AsyncStorage.getItem('@pregnancy_info');
        if (!data) return null;
        const parsed = JSON.parse(data) as StoredPregnancyInfo;
        if (!parsed?.dueDate || !parsed?.projectId) return null;
        return parsed;
    } catch {
        return null;
    }
}

export async function savePregnancyInfo(
    dueDate: Date,
    projectId: string,
    options?: { welcomeNotificationScheduled?: boolean }
): Promise<void> {
    try {
        const existing = await readStoredPregnancyInfo();
        const isSameProject = existing?.projectId === projectId;
        const pregnancyInfo: StoredPregnancyInfo = {
            dueDate: dueDate.toISOString(),
            projectId,
            createdAt: isSameProject && existing?.createdAt
                ? existing.createdAt
                : new Date().toISOString(),
            welcomeNotificationScheduled:
                options?.welcomeNotificationScheduled ??
                (isSameProject ? existing?.welcomeNotificationScheduled : false) ??
                false,
        };
        await AsyncStorage.setItem('@pregnancy_info', JSON.stringify(pregnancyInfo));
        console.log('[PregnancyNotifications] Saved pregnancy info');
        if (Platform.OS === 'ios') {
            const { syncWidgetSnapshot } = await import('@/utils/widgetSnapshot');
            void syncWidgetSnapshot();
        }
    } catch (error) {
        console.error('[PregnancyNotifications] Failed to save pregnancy info:', error);
    }
}

/**
 * Загрузить информацию о беременности
 */
export async function loadPregnancyInfo(): Promise<{
    dueDate: Date;
    projectId: string;
    welcomeNotificationScheduled: boolean;
} | null> {
    try {
        const parsed = await readStoredPregnancyInfo();
        if (!parsed) return null;

        return {
            dueDate: new Date(parsed.dueDate),
            projectId: parsed.projectId,
            welcomeNotificationScheduled: parsed.welcomeNotificationScheduled === true,
        };
    } catch (error) {
        console.error('[PregnancyNotifications] Failed to load pregnancy info:', error);
        return null;
    }
}

/**
 * Главная функция: запланировать все уведомления для беременности
 * Планирует уведомления на ближайшие 4 недели (из-за ограничений iOS)
 */
export async function schedulePregnancyNotifications(
    dueDate: Date,
    projectId: string,
    options?: { skipCloudSync?: boolean; maxNotifications?: number; includeWelcome?: boolean }
): Promise<void> {
    // Всегда сохраняем ПДР в AsyncStorage и облако, даже без уведомлений (Expo Go, отказ в разрешениях)
    await savePregnancyInfo(dueDate, projectId);
    const currentWeek = getPregnancyWeek(dueDate);

    const Notifications = getNotifications();
    if (!Notifications) {
        console.log('[PregnancyNotifications] Notifications not available, saving PDR and reminders only');
        await saveNotificationsAsReminders(dueDate, currentWeek, options?.skipCloudSync);
        return;
    }

    try {
        // Проверяем текущие разрешения
        let permissions = await Notifications.getPermissionsAsync();
        let hasPermission = permissions.granted;
        
        // Для iOS также проверяем provisional статус
        if (Platform.OS === 'ios' && !hasPermission) {
            hasPermission = permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
        }
        
        // Если разрешений нет, запрашиваем
        if (!hasPermission) {
            const requestResult = await Notifications.requestPermissionsAsync();
            hasPermission = requestResult.status === 'granted';
            
            // Для iOS также проверяем provisional после запроса
            if (Platform.OS === 'ios' && !hasPermission) {
                hasPermission = requestResult.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
            }
        }
        
        if (!hasPermission) {
            console.log('[PregnancyNotifications] Permission not granted. PDR and reminders saved.');
            await saveNotificationsAsReminders(dueDate, currentWeek, options?.skipCloudSync);
            return;
        }
        
        console.log('[PregnancyNotifications] Permission granted, proceeding with scheduling');

        // Отменяем старые уведомления
        await cancelAllPregnancyNotifications();
        const now = new Date();
        const maxNotifications = options?.maxNotifications ?? 56;
        const maxWeeksAhead = 4;
        let scheduledCount = 0;

        const trySchedule = async (
            title: string,
            body: string,
            triggerDate: Date,
            identifier?: string
        ): Promise<string | null> => {
            if (scheduledCount >= maxNotifications) {
                return null;
            }
            const notificationId = await scheduleNotification(title, body, triggerDate, identifier);
            if (notificationId) {
                scheduledCount += 1;
            }
            return notificationId;
        };

        console.log(`[PregnancyNotifications] Current week: ${currentWeek}, Due date: ${dueDate.toLocaleDateString()}`);

        // 1. Приветственное уведомление — только при создании альбома, не при фоновом refresh
        if (options?.includeWelcome) {
            const welcomeDate = new Date(now.getTime() + 5000);
            const welcomeId = await trySchedule(
                WELCOME_NOTIFICATION.title,
                WELCOME_NOTIFICATION.body,
                welcomeDate,
                'pregnancy_welcome'
            );
            if (welcomeId) {
                await savePregnancyInfo(dueDate, projectId, {
                    welcomeNotificationScheduled: true,
                });
            }
        }

        // 2. Ежедневное напоминание (один слот, повторяется каждый день)
        const trimester = getTrimester(currentWeek);
        const dailyMessages =
            MORNING_MESSAGES.find((entry) => entry.trimester === trimester)?.messages ?? [];
        const dailyBody =
            dailyMessages[0] ??
            'Откройте дневник беременности и отметьте, как прошёл вчерашний день.';
        await scheduleDailyNotification(
            'Доброе утро! 🌸',
            dailyBody,
            PREGNANCY_DAILY_REMINDER_HOUR,
            PREGNANCY_DAILY_REMINDER_MINUTE,
            'pregnancy_daily_morning'
        );
        scheduledCount += 1;

        // 3. Еженедельные уведомления
        for (let week = currentWeek; week <= Math.min(currentWeek + maxWeeksAhead, 42); week++) {
            const notification = WEEKLY_NOTIFICATIONS.find(n => n.week === week);
            if (notification) {
                const weekDate = getWeekStartDate(dueDate, week);
                if (weekDate > now) {
                    await trySchedule(
                        notification.title,
                        notification.body,
                        weekDate,
                        `pregnancy_week_${week}`
                    );
                }
            }
        }

        // 4. Триместровые уведомления
        for (const trimester of TRIMESTER_NOTIFICATIONS) {
            if (trimester.weekStart >= currentWeek && trimester.weekStart <= currentWeek + maxWeeksAhead) {
                const trimesterDate = getWeekStartDate(dueDate, trimester.weekStart);
                trimesterDate.setHours(10, 0, 0, 0); // 10:00
                if (trimesterDate > now) {
                    await trySchedule(
                        trimester.title,
                        trimester.body,
                        trimesterDate,
                        `pregnancy_trimester_${trimester.trimester}`
                    );
                }
            }
        }

        // 5. Уведомления о ПДР
        const dueDateMs = dueDate.getTime();

        // За 14 дней
        const before14 = new Date(dueDateMs - 14 * 24 * 60 * 60 * 1000);
        before14.setHours(10, 0, 0, 0);
        if (before14 > now) {
            await trySchedule(
                DUE_DATE_NOTIFICATIONS.before14Days.title,
                DUE_DATE_NOTIFICATIONS.before14Days.body,
                before14,
                'pregnancy_due_14days'
            );
        }

        // За 7 дней
        const before7 = new Date(dueDateMs - 7 * 24 * 60 * 60 * 1000);
        before7.setHours(10, 0, 0, 0);
        if (before7 > now) {
            await trySchedule(
                DUE_DATE_NOTIFICATIONS.before7Days.title,
                DUE_DATE_NOTIFICATIONS.before7Days.body,
                before7,
                'pregnancy_due_7days'
            );
        }

        // В день ПДР
        const onDueDate = new Date(dueDate);
        onDueDate.setHours(8, 0, 0, 0);
        if (onDueDate > now) {
            await trySchedule(
                DUE_DATE_NOTIFICATIONS.onDay.title,
                DUE_DATE_NOTIFICATIONS.onDay.body,
                onDueDate,
                'pregnancy_due_day'
            );
        }

        // 6. Уведомления о подготовке (сумка в роддом на 34 неделе)
        if (currentWeek <= 34 && 34 <= currentWeek + maxWeeksAhead) {
            const bagDate = getWeekStartDate(dueDate, 34);
            bagDate.setHours(10, 0, 0, 0);
            if (bagDate > now) {
                await trySchedule(
                    PREPARATION_NOTIFICATIONS.hospitalBag.title,
                    PREPARATION_NOTIFICATIONS.hospitalBag.body,
                    bagDate,
                    'pregnancy_hospital_bag'
                );
            }
        }

        // 7. Выбор имени (случайный день между 20-28 неделей)
        if (currentWeek >= 20 && currentWeek <= 28) {
            const nameDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // через 3 дня
            nameDate.setHours(9, 30, 0, 0);
            await trySchedule(
                PREPARATION_NOTIFICATIONS.chooseName.title,
                PREPARATION_NOTIFICATIONS.chooseName.body,
                nameDate,
                'pregnancy_choose_name'
            );
        }

        // 8. Напоминания-помощники (случайные)
        const shuffledHelpers = [...HELPER_REMINDERS].sort(() => Math.random() - 0.5).slice(0, 3);
        for (let i = 0; i < shuffledHelpers.length; i++) {
            const helper = shuffledHelpers[i];
            const helperDate = new Date(now.getTime() + (5 + i * 4) * 24 * 60 * 60 * 1000);
            helperDate.setHours(12 + Math.floor(Math.random() * 6), 0, 0, 0); // 12:00-18:00

            await trySchedule(
                helper.title,
                helper.body,
                helperDate,
                `pregnancy_helper_${i}`
            );
        }

        console.log(
            `[PregnancyNotifications] Scheduled ${scheduledCount}/${maxNotifications} notifications`
        );

        // Сохраняем все уведомления как напоминания в AsyncStorage для отображения в списке
        await saveNotificationsAsReminders(dueDate, currentWeek, options?.skipCloudSync);

        console.log('[PregnancyNotifications] All notifications scheduled successfully');
    } catch (error) {
        console.error('[PregnancyNotifications] Failed to schedule notifications:', error);
    }
}

/**
 * Сохранить уведомления как напоминания для отображения в списке
 */
async function saveNotificationsAsReminders(
    dueDate: Date,
    currentWeek: number,
    skipCloudSync?: boolean
): Promise<void> {
    try {
        const syncId = await getAccountSyncId();
        const remindersKey = syncId ? getRemindersStorageKey(syncId) : '@reminders';
        const existingReminders = await AsyncStorage.getItem(remindersKey);
        let allReminders: any[] = [];
        try {
            allReminders = existingReminders ? JSON.parse(existingReminders) : [];
            if (!Array.isArray(allReminders)) allReminders = [];
        } catch {
            allReminders = [];
        }

        allReminders = allReminders.filter(
            (r: any) => r?.categoryId !== 'pregnancy' && !String(r?.id || '').startsWith('pregnancy_')
        );

        const reminders = [
            { id: `pregnancy_due_${Date.now()}`, title: 'Предварительная дата родов (ПДР)', date: dueDate.toISOString(), enabled: true },
            { id: `pregnancy_week_${Date.now()}`, title: 'Еженедельные уведомления', date: new Date().toISOString(), enabled: true },
        ];

        allReminders.push(...reminders);
        await AsyncStorage.setItem(remindersKey, JSON.stringify(allReminders));
        if (!skipCloudSync) {
            await pushCoreOnlyToCloud();
        }
        console.log('[PregnancyNotifications] Saved reminders to list and cloud');
    } catch (error) {
        console.error('[PregnancyNotifications] Failed to save reminders:', error);
    }
}

/**
 * Перепланировать уведомления (вызывать при открытии приложения)
 */
export async function refreshPregnancyNotifications(): Promise<void> {
    const { refreshAllAlbumNotifications } = await import('@/utils/albumNotificationCoordinator');
    await refreshAllAlbumNotifications({ skipCloudSync: true });
}
