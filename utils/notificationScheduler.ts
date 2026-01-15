import * as Notifications from 'expo-notifications';
import {
    PREGNANCY_WEEKLY_NOTIFICATIONS,
    PREGNANCY_TRIMESTER_NOTIFICATIONS,
    PREGNANCY_PREPARATION_NOTIFICATIONS,
    type NotificationContent
} from './pregnancyNotificationsData';
import { Platform } from 'react-native';

// Длительность беременности: 280 дней = 40 недель
const TOTAL_PREGNANCY_DAYS = 280;

/**
 * Рассчитывает дату начала беременности (LMP) на основе ПДР.
 * ПДР - 40 недель = LMP
 */
const calculateLMPDate = (dueDate: Date): Date => {
    const lmp = new Date(dueDate);
    lmp.setDate(lmp.getDate() - TOTAL_PREGNANCY_DAYS);
    return lmp;
};

/**
 * Планирует одно уведомление.
 */
const scheduleNotification = async (
    date: Date,
    title: string,
    body: string,
    triggerId?: string
) => {
    const now = new Date();

    if (date <= now) {
        console.log(`[NotificationScheduler] Skipping past notification: ${title} at ${date.toISOString()}`);
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

        console.log(`[NotificationScheduler] Scheduled: "${title}" for ${date.toISOString()} (ID: ${id})`);
        return id;
    } catch (error) {
        console.error('[NotificationScheduler] Error scheduling:', error);
    }
};

/**
 * Основная функция планирования всех уведомлений для беременности.
 * @param dueDateISO - Дата родов (ПДР) в формате ISO строки.
 */
export const schedulePregnancyNotifications = async (dueDateISO: string) => {
    try {
        console.log('[NotificationScheduler] Starting scheduling for Due Date:', dueDateISO);

        // 1. Проверяем разрешения
        const settings = await Notifications.getPermissionsAsync();
        if (
            settings.granted ||
            settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
        ) {
            // Permission granted or provisional
        } else {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                console.warn('[NotificationScheduler] Permission not granted');
                return;
            }
        }

        // 2. Рассчитываем ключевые даты
        const dueDate = new Date(dueDateISO);
        const lmpDate = calculateLMPDate(dueDate); // Start of Week 0 (Day 0)

        // 3. Планируем еженедельные уведомления
        for (const item of PREGNANCY_WEEKLY_NOTIFICATIONS) {
            // Дата уведомления = LMP + (week_number - 1) * 7 days
            // Например, 1 неделя начинается сразу (в теории), или через 0 полных недель.
            // По логике: "Начало 1 недели" -> это день 0 (LMP).
            // "Начало 2 недели" -> это день 7.
            const daysToAdd = (item.week - 1) * 7;
            const notificationDate = new Date(lmpDate);
            notificationDate.setDate(notificationDate.getDate() + daysToAdd);

            // Устанавливаем время
            const [hours, minutes] = item.time.split(':').map(Number);
            notificationDate.setHours(hours, minutes, 0, 0);

            await scheduleNotification(notificationDate, item.title, item.body, item.trigger);
        }

        // 4. Планируем триместры
        for (const item of PREGNANCY_TRIMESTER_NOTIFICATIONS) {
            const daysToAdd = item.week * 7;
            const notificationDate = new Date(lmpDate);
            notificationDate.setDate(notificationDate.getDate() + daysToAdd);

            const [hours, minutes] = item.time.split(':').map(Number);
            notificationDate.setHours(hours, minutes, 0, 0);

            await scheduleNotification(notificationDate, item.title, item.body, item.trigger);
        }

        // 5. Планируем подготовку (сумки)
        for (const item of PREGNANCY_PREPARATION_NOTIFICATIONS) {
            let daysToAdd = item.week * 7;

            if (item.trigger === 'baby_bag') {
                // Логика: через 3 дня после сумки в роддом (которая на 34 неделе)
                // 34 недели = 34 * 7 = 238 дней
                // + 3 дня = 241 день
                daysToAdd += 3;
            }

            const notificationDate = new Date(lmpDate);
            notificationDate.setDate(notificationDate.getDate() + daysToAdd);

            const [hours, minutes] = item.time.split(':').map(Number);
            notificationDate.setHours(hours, minutes, 0, 0);

            await scheduleNotification(notificationDate, item.title, item.body, item.trigger);
        }

        // 6. ПДР (Countdown) Notifications
        // За 14 дней
        const pdrMinus14 = new Date(dueDate);
        pdrMinus14.setDate(dueDate.getDate() - 14);
        pdrMinus14.setHours(10, 0, 0, 0);
        await scheduleNotification(pdrMinus14, 'Скоро ПДР', 'Где-то впереди есть день, к которому тянутся все ваши недели. ПДР — это про ожидание чуда. Позвольте себе мечту о моменте встречи.');

        // За 7 дней
        const pdrMinus7 = new Date(dueDate);
        pdrMinus7.setDate(dueDate.getDate() - 7);
        pdrMinus7.setHours(10, 0, 0, 0);
        await scheduleNotification(pdrMinus7, 'Неделя до ПДР', 'Ваша ПДР — маленькая звёздочка в календаре. День, который согревает одним своим приближением. Сегодня — хорошее время заглянуть в эту мечту, сохраните фотографию и запишите, как себя чувствуете в приложении');

        // В день ПДР
        const pdrDay = new Date(dueDate);
        pdrDay.setHours(8, 0, 0, 0);
        await scheduleNotification(pdrDay, 'Сегодня ПДР', 'Есть дата, которая живёт где-то в сердце — день встречи. Он всё ближе, и это так трепетно. ПДР — мягкое напоминание о том, какой путь вы уже прошли вместе.');


        console.log('[NotificationScheduler] Completed scheduling.');

    } catch (error) {
        console.error('[NotificationScheduler] Fatal error:', error);
    }
};
