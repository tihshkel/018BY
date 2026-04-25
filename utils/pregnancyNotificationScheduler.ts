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
export function getPregnancyWeek(dueDate: Date): number {
    const now = new Date();
    const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const weeksUntilDue = Math.floor(daysUntilDue / 7);
    const currentWeek = 40 - weeksUntilDue;
    return Math.max(1, Math.min(42, currentWeek));
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
        // Expo SDK 54+: trigger должен содержать `type`.
        // https://docs.expo.dev/versions/latest/sdk/notifications/#notificationtriggerinput
        let trigger: any;

        if (Platform.OS === 'ios') {
            trigger = { type: 'date', date: triggerDate };
        } else {
            // Android: используем timeInterval (seconds)
            const seconds = Math.floor((triggerDate.getTime() - now.getTime()) / 1000);
            if (seconds <= 0) return null;
            trigger = { type: 'timeInterval', seconds };
        }

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: true,
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
export async function savePregnancyInfo(dueDate: Date, projectId: string): Promise<void> {
    try {
        const pregnancyInfo = {
            dueDate: dueDate.toISOString(),
            projectId,
            createdAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem('@pregnancy_info', JSON.stringify(pregnancyInfo));
        console.log('[PregnancyNotifications] Saved pregnancy info');
    } catch (error) {
        console.error('[PregnancyNotifications] Failed to save pregnancy info:', error);
    }
}

/**
 * Загрузить информацию о беременности
 */
export async function loadPregnancyInfo(): Promise<{ dueDate: Date; projectId: string } | null> {
    try {
        const data = await AsyncStorage.getItem('@pregnancy_info');
        if (!data) return null;

        const parsed = JSON.parse(data);
        return {
            dueDate: new Date(parsed.dueDate),
            projectId: parsed.projectId,
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
    projectId: string
): Promise<void> {
    // Всегда сохраняем ПДР в AsyncStorage и облако, даже без уведомлений (Expo Go, отказ в разрешениях)
    await savePregnancyInfo(dueDate, projectId);
    const currentWeek = getPregnancyWeek(dueDate);

    const Notifications = getNotifications();
    if (!Notifications) {
        console.log('[PregnancyNotifications] Notifications not available, saving PDR and reminders only');
        await saveNotificationsAsReminders(dueDate, currentWeek);
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
            await saveNotificationsAsReminders(dueDate, currentWeek);
            return;
        }
        
        console.log('[PregnancyNotifications] Permission granted, proceeding with scheduling');

        // Отменяем старые уведомления
        await cancelAllPregnancyNotifications();
        const now = new Date();

        // Ограничение: планируем только на 4 недели вперёд (для iOS лимита в 64 уведомления)
        const maxWeeksAhead = 4;
        const scheduledIds: string[] = [];

        console.log(`[PregnancyNotifications] Current week: ${currentWeek}, Due date: ${dueDate.toLocaleDateString()}`);

        // 1. Приветственное уведомление (сразу)
        const welcomeDate = new Date(now.getTime() + 5000); // через 5 секунд
        await scheduleNotification(
            WELCOME_NOTIFICATION.title,
            WELCOME_NOTIFICATION.body,
            welcomeDate,
            'pregnancy_welcome'
        );

        // 2. Еженедельные уведомления
        for (let week = currentWeek; week <= Math.min(currentWeek + maxWeeksAhead, 42); week++) {
            const notification = WEEKLY_NOTIFICATIONS.find(n => n.week === week);
            if (notification) {
                const weekDate = getWeekStartDate(dueDate, week);
                if (weekDate > now) {
                    await scheduleNotification(
                        notification.title,
                        notification.body,
                        weekDate,
                        `pregnancy_week_${week}`
                    );
                }
            }
        }

        // 3. Триместровые уведомления
        for (const trimester of TRIMESTER_NOTIFICATIONS) {
            if (trimester.weekStart >= currentWeek && trimester.weekStart <= currentWeek + maxWeeksAhead) {
                const trimesterDate = getWeekStartDate(dueDate, trimester.weekStart);
                trimesterDate.setHours(10, 0, 0, 0); // 10:00
                if (trimesterDate > now) {
                    await scheduleNotification(
                        trimester.title,
                        trimester.body,
                        trimesterDate,
                        `pregnancy_trimester_${trimester.trimester}`
                    );
                }
            }
        }

        // 4. Уведомления о ПДР
        const dueDateMs = dueDate.getTime();

        // За 14 дней
        const before14 = new Date(dueDateMs - 14 * 24 * 60 * 60 * 1000);
        before14.setHours(10, 0, 0, 0);
        if (before14 > now) {
            await scheduleNotification(
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
            await scheduleNotification(
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
            await scheduleNotification(
                DUE_DATE_NOTIFICATIONS.onDay.title,
                DUE_DATE_NOTIFICATIONS.onDay.body,
                onDueDate,
                'pregnancy_due_day'
            );
        }

        // 5. Уведомления о подготовке (сумка в роддом на 34 неделе)
        if (currentWeek <= 34 && 34 <= currentWeek + maxWeeksAhead) {
            const bagDate = getWeekStartDate(dueDate, 34);
            bagDate.setHours(10, 0, 0, 0);
            if (bagDate > now) {
                await scheduleNotification(
                    PREPARATION_NOTIFICATIONS.hospitalBag.title,
                    PREPARATION_NOTIFICATIONS.hospitalBag.body,
                    bagDate,
                    'pregnancy_hospital_bag'
                );
            }
        }

        // 6. Выбор имени (случайный день между 20-28 неделей)
        if (currentWeek >= 20 && currentWeek <= 28) {
            const nameDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // через 3 дня
            nameDate.setHours(9, 30, 0, 0);
            await scheduleNotification(
                PREPARATION_NOTIFICATIONS.chooseName.title,
                PREPARATION_NOTIFICATIONS.chooseName.body,
                nameDate,
                'pregnancy_choose_name'
            );
        }

        // 7. Утренние напоминания (случайные, раз в 2-3 дня)
        const trimester = getTrimester(currentWeek);
        const morningMessages = MORNING_MESSAGES.find(m => m.trimester === trimester)?.messages || [];

        for (let i = 0; i < 5; i++) {
            const dayOffset = 2 + i * 2 + Math.floor(Math.random() * 2); // каждые 2-3 дня
            const morningDate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
            morningDate.setHours(8, 30 + Math.floor(Math.random() * 30), 0, 0); // 8:30-9:00

            const randomMessage = morningMessages[Math.floor(Math.random() * morningMessages.length)];
            if (randomMessage) {
                await scheduleNotification(
                    'Доброе утро! 🌸',
                    randomMessage,
                    morningDate,
                    `pregnancy_morning_${i}`
                );
            }
        }

        // 8. Напоминания-помощники (случайные)
        const shuffledHelpers = [...HELPER_REMINDERS].sort(() => Math.random() - 0.5).slice(0, 3);
        for (let i = 0; i < shuffledHelpers.length; i++) {
            const helper = shuffledHelpers[i];
            const helperDate = new Date(now.getTime() + (5 + i * 4) * 24 * 60 * 60 * 1000);
            helperDate.setHours(12 + Math.floor(Math.random() * 6), 0, 0, 0); // 12:00-18:00

            await scheduleNotification(
                helper.title,
                helper.body,
                helperDate,
                `pregnancy_helper_${i}`
            );
        }

        // Сохраняем все уведомления как напоминания в AsyncStorage для отображения в списке
        await saveNotificationsAsReminders(dueDate, currentWeek);

        console.log('[PregnancyNotifications] All notifications scheduled successfully');
    } catch (error) {
        console.error('[PregnancyNotifications] Failed to schedule notifications:', error);
    }
}

/**
 * Сохранить уведомления как напоминания для отображения в списке
 */
async function saveNotificationsAsReminders(dueDate: Date, currentWeek: number): Promise<void> {
    try {
        const { getRemindersStorageKey, pushCoreOnlyToCloud } = await import('@/utils/account-sync');
        const accessCode = await AsyncStorage.getItem('@access_code');
        const remindersKey = accessCode ? getRemindersStorageKey(accessCode) : '@reminders';
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
        await pushCoreOnlyToCloud();
        console.log('[PregnancyNotifications] Saved reminders to list and cloud');
    } catch (error) {
        console.error('[PregnancyNotifications] Failed to save reminders:', error);
    }
}

/**
 * Перепланировать уведомления (вызывать при открытии приложения)
 */
export async function refreshPregnancyNotifications(): Promise<void> {
    const pregnancyInfo = await loadPregnancyInfo();
    if (pregnancyInfo) {
        await schedulePregnancyNotifications(pregnancyInfo.dueDate, pregnancyInfo.projectId);
    }
}
