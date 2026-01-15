import * as Notifications from 'expo-notifications';
import { KIDS_NOTIFICATIONS } from './kidsNotificationsData';
import { Platform } from 'react-native';

const scheduleNotification = async (
    date: Date,
    title: string,
    body: string
) => {
    const now = new Date();

    // Если дата уже прошла, не планируем
    if (date <= now) {
        console.log(`[KidsNotificationScheduler] Skipping past notification: ${title} at ${date.toISOString()}`);
        return;
    }

    try {
        let trigger: any;

        if (Platform.OS === 'ios') {
            trigger = { date };
        } else {
            const seconds = Math.floor((date.getTime() - now.getTime()) / 1000);
            if (seconds <= 0) return;
            trigger = { seconds };
        }

        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: true,
            },
            trigger,
        });

        console.log(`[KidsNotificationScheduler] Scheduled: "${title}" for ${date.toISOString()} (ID: ${id})`);
        return id;

    } catch (error) {
        console.error('[KidsNotificationScheduler] Error scheduling:', error);
    }
};

/**
 * Планирует уведомления для детского альбома на основе даты рождения.
 * @param birthDateISO - Дата рождения в формате ISO строки.
 */
export const scheduleKidsNotifications = async (birthDateISO: string) => {
    try {
        console.log('[KidsNotificationScheduler] Starting scheduling for Birth Date:', birthDateISO);

        const settings = await Notifications.getPermissionsAsync();
        if (
            settings.granted ||
            settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
        ) {
            // Permission granted
        } else {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                console.warn('[KidsNotificationScheduler] Permission not granted');
                return;
            }
        }

        const birthDate = new Date(birthDateISO);
        // Сбрасываем время рождения на 00:00 для корректных расчетов дней
        const baseDate = new Date(birthDate);
        baseDate.setHours(0, 0, 0, 0);

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

            // Добавляем смещение (если есть) - например для диапазонов "5-6 месяцев"
            if (item.offsetDays) {
                notificationDate.setDate(notificationDate.getDate() + item.offsetDays);
            }

            // Устанавливаем время
            const [hours, minutes] = item.time.split(':').map(Number);
            notificationDate.setHours(hours, minutes, 0, 0);

            await scheduleNotification(notificationDate, item.title, item.body);
        }

        console.log('[KidsNotificationScheduler] Completed scheduling.');

    } catch (error) {
        console.error('[KidsNotificationScheduler] Fatal error:', error);
    }
};
