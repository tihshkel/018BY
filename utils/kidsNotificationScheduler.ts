/**
 * Планировщик уведомлений для детского альбома
 * Расчёт дат на основе дня рождения и планирование push-уведомлений
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { addCalendarMonths } from '@/utils/localNotificationSchedule';
import { KIDS_NOTIFICATIONS } from './kidsNotificationsData';

// Проверяем, находимся ли мы в Expo Go
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Динамическая загрузка expo-notifications
let notificationsModule: typeof import('expo-notifications') | null = null;

const getNotifications = (): typeof import('expo-notifications') | null => {
    if (isExpoGo) {
        console.log('[KidsNotifications] Expo Go detected, notifications disabled');
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
        console.error('[KidsNotifications] Failed to load notifications module:', error);
        return null;
    }
};

/**
 * Отменить все уведомления детей
 */
export async function cancelAllKidsNotifications(): Promise<void> {
    const Notifications = getNotifications();
    if (!Notifications) return;

    try {
        // Получаем все запланированные уведомления
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();

        // Отменяем те, которые относятся к детям
        for (const notification of scheduled) {
            if (notification.identifier?.startsWith('kids_')) {
                await Notifications.cancelScheduledNotificationAsync(notification.identifier);
            }
        }

        console.log('[KidsNotifications] Cancelled all kids notifications');
    } catch (error) {
        console.error('[KidsNotifications] Failed to cancel notifications:', error);
    }
}

/**
 * Сохранить информацию о ребёнке
 */
export async function saveKidsInfo(birthDate: Date, projectId: string): Promise<void> {
    try {
        const kidsInfo = {
            birthDate: birthDate.toISOString(),
            projectId,
            createdAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem('@kids_info', JSON.stringify(kidsInfo));
        console.log('[KidsNotifications] Saved kids info');
    } catch (error) {
        console.error('[KidsNotifications] Failed to save kids info:', error);
    }
}

/**
 * Загрузить информацию о ребёнке
 */
export async function loadKidsInfo(): Promise<{ birthDate: Date; projectId: string } | null> {
    try {
        const data = await AsyncStorage.getItem('@kids_info');
        if (!data) return null;

        const parsed = JSON.parse(data);
        return {
            birthDate: new Date(parsed.birthDate),
            projectId: parsed.projectId,
        };
    } catch (error) {
        console.error('[KidsNotifications] Failed to load kids info:', error);
        return null;
    }
}

/**
 * Получить дату первого Нового года после рождения
 */
function getFirstNewYearDate(birthDate: Date): Date {
    const newYear = new Date(birthDate.getFullYear() + 1, 0, 1); // 1 января следующего года
    if (birthDate.getTime() > new Date(birthDate.getFullYear(), 11, 31).getTime()) {
        // Если родился после 31 декабря, первый Новый год будет через год
        return new Date(birthDate.getFullYear() + 2, 0, 1);
    }
    return newYear;
}

/**
 * Получить дату первого сезона после рождения
 */
function getFirstSeasonDate(birthDate: Date, seasonMonth: number): Date {
    const currentYear = birthDate.getFullYear();
    const seasonDate = new Date(currentYear, seasonMonth, 1);
    
    if (birthDate > seasonDate) {
        // Если сезон уже прошёл в этом году, берём следующий год
        return new Date(currentYear + 1, seasonMonth, 1);
    }
    return seasonDate;
}

export type KidsNotificationCandidate = {
    title: string;
    body: string;
    date: Date;
    identifier: string;
};

export function buildKidsNotificationCandidates(birthDate: Date, now: Date): KidsNotificationCandidate[] {
    const baseDate = new Date(birthDate);
    baseDate.setHours(0, 0, 0, 0);

    const candidates: KidsNotificationCandidate[] = [];

    for (const item of KIDS_NOTIFICATIONS) {
        let notificationDate = new Date(baseDate);

        if (item.triggerType === 'days') {
            notificationDate.setDate(baseDate.getDate() + item.triggerValue);
        } else if (item.triggerType === 'months') {
            notificationDate = addCalendarMonths(baseDate, item.triggerValue);
        } else if (item.triggerType === 'years') {
            notificationDate = addCalendarMonths(baseDate, item.triggerValue * 12);
        }

        if (item.id === 'first_new_year') {
            notificationDate.setTime(getFirstNewYearDate(baseDate).getTime());
        } else if (item.id === 'first_winter') {
            notificationDate.setTime(getFirstSeasonDate(baseDate, 11).getTime());
        } else if (item.id === 'first_spring') {
            notificationDate.setTime(getFirstSeasonDate(baseDate, 2).getTime());
        } else if (item.id === 'first_summer') {
            notificationDate.setTime(getFirstSeasonDate(baseDate, 5).getTime());
        } else if (item.id === 'first_autumn') {
            notificationDate.setTime(getFirstSeasonDate(baseDate, 8).getTime());
        }

        if (item.offsetDays) {
            notificationDate.setDate(notificationDate.getDate() + item.offsetDays);
        }

        const [hours, minutes] = item.time.split(':').map(Number);
        notificationDate.setHours(hours, minutes, 0, 0);

        if (notificationDate > now) {
            candidates.push({
                title: item.title,
                body: item.body,
                date: notificationDate,
                identifier: `kids_${item.id}`,
            });
        }
    }

    return candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Подключение совместимо с прежними вызовами; бюджет всех альбомов считается вместе. */
export async function scheduleKidsNotifications(
    birthDate: Date,
    projectId: string,
    options?: { skipCloudSync?: boolean; maxNotifications?: number }
): Promise<void> {
    const { setupAlbumNotificationsForCelebration } = await import('@/utils/albumNotificationCoordinator');
    await setupAlbumNotificationsForCelebration(birthDate, 'kids', projectId);
}

export async function refreshKidsNotifications(): Promise<void> {
    const { refreshAllAlbumNotifications } = await import('@/utils/albumNotificationCoordinator');
    await refreshAllAlbumNotifications({ skipCloudSync: true });
}
