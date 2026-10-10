/**
 * Планировщик уведомлений для дневника беременности
 * Расчёт недель беременности и планирование push-уведомлений
 */

import {
    DUE_DATE_NOTIFICATIONS,
    HELPER_REMINDERS,
    PREPARATION_NOTIFICATIONS,
    TRIMESTER_NOTIFICATIONS,
    WEEKLY_NOTIFICATIONS,
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
export const TOTAL_PREGNANCY_DAYS = 280;

function pregnancyElapsedDays(dueDate: Date, now: Date): number {
    const start = new Date(dueDate);
    start.setDate(start.getDate() - TOTAL_PREGNANCY_DAYS);
    const calendarDay = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.floor((calendarDay(now) - calendarDay(start)) / 86400000);
}

export function getPregnancyWeek(dueDate: Date, now = new Date()): number {
    return Math.max(1, Math.min(42, Math.floor(pregnancyElapsedDays(dueDate, now) / 7) + 1));
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
    const rawDay = pregnancyElapsedDays(dueDate, now) + 1;
    const day = Math.max(1, Math.min(TOTAL_PREGNANCY_DAYS + 14, rawDay));
    const week = getPregnancyWeek(dueDate, now);
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

export type PregnancyNotificationCandidate = {
    title: string;
    body: string;
    date: Date;
    identifier: string;
};

/** Все даты закреплены за ПДР и не сдвигаются вперёд при каждом запуске приложения. */
export function buildPregnancyNotificationCandidates(dueDate: Date, now = new Date()): PregnancyNotificationCandidate[] {
    if (!Number.isFinite(dueDate.getTime())) return [];
    const candidates: PregnancyNotificationCandidate[] = [];
    const add = (date: Date, title: string, body: string, identifier: string) => {
        if (date > now) candidates.push({ date, title, body, identifier });
    };
    for (const item of WEEKLY_NOTIFICATIONS) {
        add(getWeekStartDate(dueDate, item.week), item.title, item.body, `pregnancy_week_${item.week}`);
    }
    for (const item of TRIMESTER_NOTIFICATIONS) {
        const date = getWeekStartDate(dueDate, item.weekStart);
        date.setHours(10, 0, 0, 0);
        add(date, item.title, item.body, `pregnancy_trimester_${item.trimester}`);
    }
    for (const [daysBefore, key, item, hour] of [
        [14, '14days', DUE_DATE_NOTIFICATIONS.before14Days, 10],
        [7, '7days', DUE_DATE_NOTIFICATIONS.before7Days, 10],
        [0, 'day', DUE_DATE_NOTIFICATIONS.onDay, 8],
    ] as const) {
        const date = new Date(dueDate);
        date.setDate(date.getDate() - daysBefore);
        date.setHours(hour, 0, 0, 0);
        add(date, item.title, item.body, `pregnancy_due_${key}`);
    }
    const bagDate = getWeekStartDate(dueDate, 34);
    bagDate.setHours(10, 0, 0, 0);
    add(bagDate, PREPARATION_NOTIFICATIONS.hospitalBag.title, PREPARATION_NOTIFICATIONS.hospitalBag.body, 'pregnancy_hospital_bag');
    const babyBagDate = new Date(bagDate);
    babyBagDate.setDate(babyBagDate.getDate() + PREPARATION_NOTIFICATIONS.babyBag.daysAfterHospitalBag);
    add(babyBagDate, PREPARATION_NOTIFICATIONS.babyBag.title, PREPARATION_NOTIFICATIONS.babyBag.body, 'pregnancy_baby_bag');
    const nameDate = getWeekStartDate(dueDate, PREPARATION_NOTIFICATIONS.chooseName.weekStart);
    nameDate.setDate(nameDate.getDate() + 3);
    nameDate.setHours(9, 30, 0, 0);
    add(nameDate, PREPARATION_NOTIFICATIONS.chooseName.title, PREPARATION_NOTIFICATIONS.chooseName.body, 'pregnancy_choose_name');
    // Один помощник в неделю на фиксированный день; refresh больше не откладывает его навсегда.
    for (let week = 1; week <= 40; week++) {
        const helper = HELPER_REMINDERS[(week - 1) % HELPER_REMINDERS.length];
        const date = getWeekStartDate(dueDate, week);
        date.setDate(date.getDate() + 4);
        date.setHours(13, 0, 0, 0);
        add(date, helper.title, helper.body, `pregnancy_helper_${week}`);
    }
    return candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export async function schedulePregnancyNotifications(
    dueDate: Date,
    projectId: string,
    options?: { skipCloudSync?: boolean; maxNotifications?: number; includeWelcome?: boolean }
): Promise<void> {
    const { setupAlbumNotificationsForCelebration } = await import('@/utils/albumNotificationCoordinator');
    await setupAlbumNotificationsForCelebration(dueDate, 'pregnancy', projectId);
}

export async function refreshPregnancyNotifications(): Promise<void> {
    const { refreshAllAlbumNotifications } = await import('@/utils/albumNotificationCoordinator');
    await refreshAllAlbumNotifications({ skipCloudSync: true });
}
