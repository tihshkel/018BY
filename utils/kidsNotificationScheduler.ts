/**
 * Планировщик уведомлений для детского альбома
 * Расчёт дат на основе дня рождения и планирование push-уведомлений
 */

import { getAccountSyncId } from '@/utils/account-identity';
import { getRemindersStorageKey, pushCoreOnlyToCloud } from '@/utils/account-sync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { SchedulableTriggerInputTypes, type DateTriggerInput } from 'expo-notifications';
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
        console.log(`[KidsNotifications] Skipping past notification: ${title}`);
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
            },
            trigger,
            identifier,
        });

        console.log(`[KidsNotifications] Scheduled: ${title} at ${triggerDate.toLocaleString()}`);
        return notificationId;
    } catch (error) {
        console.error(`[KidsNotifications] Failed to schedule: ${title}`, error);
        return null;
    }
}

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

/**
 * Главная функция: запланировать все уведомления для детей
 */
export async function scheduleKidsNotifications(
    birthDate: Date,
    projectId: string,
    options?: { skipCloudSync?: boolean }
): Promise<void> {
    // Всегда сохраняем дату рождения в AsyncStorage и облако, даже без уведомлений (Expo Go, отказ в разрешениях)
    await saveKidsInfo(birthDate, projectId);

    const Notifications = getNotifications();
    if (!Notifications) {
        console.log('[KidsNotifications] Notifications not available, saving birth date and reminders only');
        await saveNotificationsAsReminders(birthDate, options?.skipCloudSync);
        return;
    }

    try {
        // Запрашиваем разрешения
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
            console.log('[KidsNotifications] Permission not granted. Birth date and reminders saved.');
            await saveNotificationsAsReminders(birthDate, options?.skipCloudSync);
            return;
        }
        
        console.log('[KidsNotifications] Permission granted, proceeding with scheduling');

        // Отменяем старые уведомления
        await cancelAllKidsNotifications();

        const now = new Date();
        // Сбрасываем время рождения на 00:00 для корректных расчетов дней
        const baseDate = new Date(birthDate);
        baseDate.setHours(0, 0, 0, 0);

        console.log(`[KidsNotifications] Starting scheduling for Birth Date: ${birthDate.toLocaleDateString()}`);

        // Планируем все уведомления из списка
        for (const item of KIDS_NOTIFICATIONS) {
            const notificationDate = new Date(baseDate);

            // Рассчитываем дату в зависимости от типа триггера
            if (item.triggerType === 'days') {
                notificationDate.setDate(baseDate.getDate() + item.triggerValue);
            } else if (item.triggerType === 'months') {
                notificationDate.setMonth(baseDate.getMonth() + item.triggerValue);
            } else if (item.triggerType === 'years') {
                notificationDate.setFullYear(baseDate.getFullYear() + item.triggerValue);
            }

            // Специальная обработка для сезонных уведомлений
            if (item.id === 'first_new_year') {
                notificationDate.setTime(getFirstNewYearDate(baseDate).getTime());
            } else if (item.id === 'first_winter') {
                notificationDate.setTime(getFirstSeasonDate(baseDate, 11).getTime()); // Декабрь
            } else if (item.id === 'first_spring') {
                notificationDate.setTime(getFirstSeasonDate(baseDate, 2).getTime()); // Март
            } else if (item.id === 'first_summer') {
                notificationDate.setTime(getFirstSeasonDate(baseDate, 5).getTime()); // Июнь
            } else if (item.id === 'first_autumn') {
                notificationDate.setTime(getFirstSeasonDate(baseDate, 8).getTime()); // Сентябрь
            }

            // Добавляем смещение (если есть) - например для диапазонов "5-6 месяцев"
            if (item.offsetDays) {
                notificationDate.setDate(notificationDate.getDate() + item.offsetDays);
            }

            // Устанавливаем время
            const [hours, minutes] = item.time.split(':').map(Number);
            notificationDate.setHours(hours, minutes, 0, 0);

            // Планируем только будущие уведомления
            if (notificationDate > now) {
                await scheduleNotification(
                    item.title,
                    item.body,
                    notificationDate,
                    `kids_${item.id}`
                );
            }
        }

        // Сохраняем все уведомления как напоминания в AsyncStorage для отображения в списке
        await saveNotificationsAsReminders(birthDate, options?.skipCloudSync);

        console.log('[KidsNotifications] All notifications scheduled successfully');
    } catch (error) {
        console.error('[KidsNotifications] Failed to schedule notifications:', error);
    }
}

/**
 * Сохранить уведомления как напоминания для отображения в списке
 */
async function saveNotificationsAsReminders(birthDate: Date, skipCloudSync?: boolean): Promise<void> {
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
            (r: any) => r?.categoryId !== 'kids' && !String(r?.id || '').startsWith('kids_')
        );

        const reminders = [
            { id: `kids_birth_${Date.now()}`, title: 'День рождения ребёнка', date: birthDate.toISOString(), enabled: true },
            { id: `kids_monthly_${Date.now()}`, title: 'Ежемесячные уведомления', date: new Date().toISOString(), enabled: true },
        ];

        allReminders.push(...reminders);
        await AsyncStorage.setItem(remindersKey, JSON.stringify(allReminders));
        if (!skipCloudSync) {
            await pushCoreOnlyToCloud();
        }
        console.log('[KidsNotifications] Saved reminders to list and cloud');
    } catch (error) {
        console.error('[KidsNotifications] Failed to save reminders:', error);
    }
}

/**
 * Перепланировать уведомления (вызывать при открытии приложения)
 */
export async function refreshKidsNotifications(): Promise<void> {
    const kidsInfo = await loadKidsInfo();
    if (kidsInfo) {
        await scheduleKidsNotifications(kidsInfo.birthDate, kidsInfo.projectId);
    }
}
