import { setupAlbumNotificationsForCelebration, refreshAllAlbumNotifications } from '@/utils/albumNotificationCoordinator';
import { withTimeout } from '@/utils/asyncTimeout';
import { pushCoreOnlyToCloud } from '@/utils/account-sync';

const NOTIFICATIONS_TIMEOUT_MS = 45_000;
const CLOUD_SYNC_TIMEOUT_MS = 15_000;

/**
 * Планирование уведомлений и синхронизация с облаком — не блокируют UI создания альбома.
 * Перепланирует push для всех типов альбомов (беременность + дети), если оба сохранены.
 */
export function runDueDateBackgroundSetup(
  dueDate: Date,
  celebration: 'pregnancy' | 'kids'
): void {
  void (async () => {
    try {
      await withTimeout(
        setupAlbumNotificationsForCelebration(dueDate, celebration),
        NOTIFICATIONS_TIMEOUT_MS,
        `${celebration}-notifications`
      );

      await withTimeout(pushCoreOnlyToCloud(), CLOUD_SYNC_TIMEOUT_MS, 'cloud-sync');
    } catch (error) {
      console.warn('[DueDateSetup] Background setup failed:', error);
    }
  })();
}

export { refreshAllAlbumNotifications };
