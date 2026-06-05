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
};

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
    });
  }

  if (kidsInfo) {
    await scheduleKidsNotifications(kidsInfo.birthDate, kidsInfo.projectId, {
      skipCloudSync: true,
      maxNotifications: budgets.kids,
    });
  }

  if (!options?.skipCloudSync) {
    await pushCoreOnlyToCloud();
  }
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

  await refreshAllAlbumNotifications({ skipCloudSync: true });
}
