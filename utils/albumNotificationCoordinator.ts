import AsyncStorage from '@react-native-async-storage/async-storage';

import { pushCoreOnlyToCloud } from '@/utils/account-sync';
import {
  loadKidsInfo,
  saveKidsInfo,
  scheduleKidsNotifications,
} from '@/utils/kidsNotificationScheduler';
import {
  loadPregnancyInfo,
  savePregnancyInfo,
  schedulePregnancyNotifications,
} from '@/utils/pregnancyNotificationScheduler';

/** iOS ограничивает ~64 локальных push; часть слотов — пользовательские напоминания. */
export const IOS_SCHEDULED_NOTIFICATION_LIMIT = 64;
const USER_REMINDER_SLOT_RESERVE = 8;

export type AlbumNotificationRefreshOptions = {
  skipCloudSync?: boolean;
  /** Перепланировать сразу (создание альбома), без интервала. */
  force?: boolean;
};

const LAST_ALBUM_NOTIFICATION_REFRESH_KEY = '@album_notifications_last_refresh_at';
const MIN_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

let refreshInFlight: Promise<void> | null = null;

function getNotificationBudgets(hasPregnancy: boolean, hasKids: boolean): {
  pregnancy: number;
  kids: number;
} {
  const sharedBudget = IOS_SCHEDULED_NOTIFICATION_LIMIT - USER_REMINDER_SLOT_RESERVE;

  if (hasPregnancy && hasKids) {
    const half = Math.floor(sharedBudget / 2);
    return { pregnancy: half, kids: half };
  }

  return { pregnancy: sharedBudget, kids: sharedBudget };
}

/**
 * Перепланирует push для всех сохранённых альбомов (беременность + дети).
 * Вызывать после создания альбома, при старте приложения и после синка с облаком.
 */
export async function refreshAllAlbumNotifications(
  options?: AlbumNotificationRefreshOptions
): Promise<void> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    if (!options?.force) {
      const lastRaw = await AsyncStorage.getItem(LAST_ALBUM_NOTIFICATION_REFRESH_KEY);
      const lastRefreshAt = lastRaw ? Number(lastRaw) : 0;
      if (lastRefreshAt > 0 && Date.now() - lastRefreshAt < MIN_REFRESH_INTERVAL_MS) {
        console.log('[AlbumNotifications] Skipping refresh — last run was recent');
        return;
      }
    }

    const pregnancyInfo = await loadPregnancyInfo();
    const kidsInfo = await loadKidsInfo();

    if (!pregnancyInfo && !kidsInfo) {
      return;
    }

    const budgets = getNotificationBudgets(Boolean(pregnancyInfo), Boolean(kidsInfo));

    if (pregnancyInfo) {
      await schedulePregnancyNotifications(pregnancyInfo.dueDate, pregnancyInfo.projectId, {
        skipCloudSync: true,
        maxNotifications: budgets.pregnancy,
        includeWelcome: options?.force === true,
      });
    }

    if (kidsInfo) {
      await scheduleKidsNotifications(kidsInfo.birthDate, kidsInfo.projectId, {
        skipCloudSync: true,
        maxNotifications: budgets.kids,
      });
    }

    await AsyncStorage.setItem(
      LAST_ALBUM_NOTIFICATION_REFRESH_KEY,
      String(Date.now())
    );

    if (!options?.skipCloudSync) {
      await pushCoreOnlyToCloud();
    }
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

/** Сохраняет дату нового альбома и перепланирует уведомления для всех типов. */
export async function setupAlbumNotificationsForCelebration(
  dueDate: Date,
  celebration: 'pregnancy' | 'kids',
  projectId?: string
): Promise<void> {
  const resolvedProjectId = projectId ?? `${celebration}_${Date.now()}`;

  if (celebration === 'pregnancy') {
    await savePregnancyInfo(dueDate, resolvedProjectId);
  } else {
    await saveKidsInfo(dueDate, resolvedProjectId);
  }

  await refreshAllAlbumNotifications({ skipCloudSync: true, force: true });
}
