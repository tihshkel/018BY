import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAccountSyncId } from '@/utils/account-identity';
import { getRemindersStorageKey, pushCoreOnlyToCloud, setLocalRemindersJsonForSyncId } from '@/utils/account-sync';
import { refreshAllAlbumNotifications } from '@/utils/albumNotificationCoordinator';
import { loadKidsInfo, saveKidsInfo } from '@/utils/kidsNotificationScheduler';
import {
  loadPregnancyInfo,
  savePregnancyInfo,
} from '@/utils/pregnancyNotificationScheduler';
import { cancelScheduledNotification } from '@/utils/notifications';
import { isAlbumNotificationReminder, linkAlbumNotificationPreferences } from '@/utils/albumNotificationPreferences';
import { cancelUserReminder } from '@/utils/localNotificationSchedule';

export function sameLocalCalendarDay(isoA: string, isoB: string): boolean {
  try {
    const a = new Date(isoA);
    const b = new Date(isoB);
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  } catch {
    return false;
  }
}

export type ProjectReminderSnapshot = {
  category?: string;
  reminderDate?: string | null;
};

/**
 * При удалении проекта: убирает связанные записи из списка напоминаний, отменяет локальные push,
 * сбрасывает @pregnancy_info / @kids_info если они привязаны к этому projectId.
 * Вызывать до удаления ключей `@project_${id}` из AsyncStorage (или передать snapshot с главного экрана).
 */
export async function removeRemindersAndScheduledNotificationsForProject(
  projectId: string,
  projectSnapshot?: ProjectReminderSnapshot | null
): Promise<void> {
  const pid = String(projectId);
  let meta: Record<string, unknown> | null = null;
  try {
    const raw = await AsyncStorage.getItem(`@project_${pid}`);
    if (raw) {
      const p = JSON.parse(raw);
      meta = p && typeof p === 'object' && !Array.isArray(p) ? p : null;
    }
  } catch {
    meta = null;
  }

  const category =
    (typeof meta?.category === 'string' ? meta.category : undefined) ?? projectSnapshot?.category;
  const reminderDate =
    (typeof meta?.reminderDate === 'string' ? meta.reminderDate : null) ??
    projectSnapshot?.reminderDate ??
    (typeof meta?.date === 'string' ? meta.date : null);

  const pregnancyInfo = await loadPregnancyInfo();
  const kidsInfo = await loadKidsInfo();

  const pregnancyLinked = pregnancyInfo != null && String(pregnancyInfo.projectId) === pid;
  const kidsLinked = kidsInfo != null && String(kidsInfo.projectId) === pid;

  if (pregnancyLinked) {
    await AsyncStorage.removeItem('@pregnancy_info');
  }
  if (kidsLinked) {
    await AsyncStorage.removeItem('@kids_info');
  }

  const syncId = await getAccountSyncId();
  const remindersKey = syncId ? getRemindersStorageKey(syncId) : '@reminders';

  const shouldRemoveReminder = (r: any): boolean => {
    if (r?.projectId) return String(r.projectId) === pid;
    // Старый шаблон без привязки удаляем только по его дате; личные записи остаются.
    return Boolean(category && reminderDate && r?.date &&
      /^(pregnancy|kids)_\d+_1$/.test(String(r.id ?? '')) &&
      r.categoryId === category && sameLocalCalendarDay(String(r.date), reminderDate));
  };

  let rawList = await AsyncStorage.getItem(remindersKey);
  if ((!rawList || rawList === '[]') && syncId) {
    rawList = (await AsyncStorage.getItem('@reminders')) ?? rawList;
  }
  let list: any[] = [];
  try {
    const parsed = rawList ? JSON.parse(rawList) : [];
    list = Array.isArray(parsed) ? parsed : [];
  } catch {
    list = [];
  }

  const cancelledIds = new Set<string>();
  const kept: any[] = [];
  for (const r of list) {
    if (shouldRemoveReminder(r)) {
      if (!isAlbumNotificationReminder(r)) await cancelUserReminder(r);
      const nid = r?.notificationId;
      if (typeof nid === 'string' && nid.length > 0 && !cancelledIds.has(nid)) {
        cancelledIds.add(nid);
        await cancelScheduledNotification(nid);
      }
    } else {
      kept.push(r);
    }
  }

  const json = JSON.stringify(kept);
  if (syncId) {
    await setLocalRemindersJsonForSyncId(syncId, json);
  } else {
    await AsyncStorage.setItem('@reminders', json);
  }

  await refreshAllAlbumNotifications({ skipCloudSync: true, force: true });

  try {
    await pushCoreOnlyToCloud({ remindersAuthoritativeLocal: true });
  } catch {
    // не блокируем удаление проекта
  }
}

/** После создания проекта: привязать напоминания без projectId по categoryId + дате (шаблоны, select-cover, eventDate). */
export async function attachProjectIdToTemplateReminders(
  projectId: string,
  category: string,
  reminderDateISO: string
): Promise<void> {
  const syncId = await getAccountSyncId();
  const primary = syncId ? getRemindersStorageKey(syncId) : '@reminders';
  let raw = await AsyncStorage.getItem(primary);
  if ((!raw || raw === '[]') && syncId) {
    raw = (await AsyncStorage.getItem('@reminders')) ?? raw;
  }
  let list: any[] = [];
  try {
    const p = raw ? JSON.parse(raw) : [];
    list = Array.isArray(p) ? p : [];
  } catch {
    return;
  }

  let changed = false;
  const next = list.map((r) => {
    if (!r || r.projectId) return r;
    if (!/^(pregnancy|kids)_\d+_1$/.test(String(r.id ?? ''))) return r;
    if (r.categoryId !== category || !r.date) return r;
    if (!sameLocalCalendarDay(String(r.date), reminderDateISO)) return r;
    changed = true;
    return { ...r, projectId: String(projectId) };
  });
  if (!changed) return;

  const json = JSON.stringify(next);
  if (syncId) {
    await setLocalRemindersJsonForSyncId(syncId, json);
  } else {
    await AsyncStorage.setItem('@reminders', json);
  }
  try {
    await pushCoreOnlyToCloud({ remindersAuthoritativeLocal: true });
  } catch {
    /* ignore */
  }
}

/**
 * После первого создания проекта с датой события (edit-album, select-album):
 * связывает @pregnancy_info / @kids_info с реальным id и проставляет projectId в списке напоминаний.
 */
export async function linkNewProjectToEventReminders(
  projectId: string,
  celebration: string,
  eventDateISO: string | undefined | null
): Promise<void> {
  if (!eventDateISO || Number.isNaN(Date.parse(eventDateISO))) return;
  const pid = String(projectId);
  const cat = String(celebration || '').trim();
  if (!cat) return;

  if (cat === 'pregnancy') {
    const info = await loadPregnancyInfo();
    if (info && info.projectId.startsWith('pregnancy_') && sameLocalCalendarDay(info.dueDate.toISOString(), eventDateISO)) await savePregnancyInfo(info.dueDate, pid);
  } else if (cat === 'kids') {
    const info = await loadKidsInfo();
    if (info && info.projectId.startsWith('kids_') && sameLocalCalendarDay(info.birthDate.toISOString(), eventDateISO)) await saveKidsInfo(info.birthDate, pid);
  }

  await attachProjectIdToTemplateReminders(pid, cat, eventDateISO);

  if (cat === 'pregnancy' || cat === 'kids') {
    await linkAlbumNotificationPreferences(pid, cat, eventDateISO);
    try {
      await refreshAllAlbumNotifications({ skipCloudSync: true, force: true });
    } catch (error) {
      console.warn('[ProjectReminders] Failed to refresh album notifications after link:', error);
    }
  }
}
