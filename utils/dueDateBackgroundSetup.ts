import { pushCoreOnlyToCloud } from '@/utils/account-sync';
import { withTimeout } from '@/utils/asyncTimeout';
import { scheduleKidsNotifications } from '@/utils/kidsNotificationScheduler';
import { schedulePregnancyNotifications } from '@/utils/pregnancyNotificationScheduler';

const NOTIFICATIONS_TIMEOUT_MS = 45_000;
const CLOUD_SYNC_TIMEOUT_MS = 15_000;

/**
 * Планирование уведомлений и синхронизация с облаком — не блокируют UI создания альбома.
 */
export function runDueDateBackgroundSetup(
  dueDate: Date,
  celebration: 'pregnancy' | 'kids'
): void {
  void (async () => {
    try {
      if (celebration === 'pregnancy') {
        const projectId = `pregnancy_${Date.now()}`;
        await withTimeout(
          schedulePregnancyNotifications(dueDate, projectId, { skipCloudSync: true }),
          NOTIFICATIONS_TIMEOUT_MS,
          'pregnancy-notifications'
        );
      } else {
        const projectId = `kids_${Date.now()}`;
        await withTimeout(
          scheduleKidsNotifications(dueDate, projectId, { skipCloudSync: true }),
          NOTIFICATIONS_TIMEOUT_MS,
          'kids-notifications'
        );
      }

      await withTimeout(pushCoreOnlyToCloud(), CLOUD_SYNC_TIMEOUT_MS, 'cloud-sync');
    } catch (error) {
      console.warn('[DueDateSetup] Background setup failed:', error);
    }
  })();
}
