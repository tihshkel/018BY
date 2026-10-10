import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAccountSyncId } from '@/utils/account-identity';
import { getRemindersStorageKey, setLocalRemindersJsonForSyncId } from '@/utils/account-sync';

export type AlbumNotificationType = 'pregnancy' | 'kids';
export type AlbumNotificationGroup = 'daily' | 'events';
export type NotificationReminder = {
  id: string;
  title: string;
  date: string;
  enabled?: boolean;
  notificationId?: string;
  categoryId?: string;
  categoryName?: string;
  description?: string;
  projectId?: string;
  repeats?: boolean;
  kind?: 'album-notifications';
  albumNotificationGroup?: AlbumNotificationGroup;
  deleted?: boolean;
  [key: string]: unknown;
};

export type AlbumNotificationProfile = {
  type: AlbumNotificationType;
  projectId: string;
  date: Date;
  daily: boolean;
  events: boolean;
  welcomeAt?: string;
};

export function isAlbumNotificationReminder(row: { kind?: unknown }): boolean {
  return row.kind === 'album-notifications';
}

export async function readNotificationReminders(): Promise<NotificationReminder[]> {
  const syncId = await getAccountSyncId();
  const key = syncId ? getRemindersStorageKey(syncId) : '@reminders';
  let raw = await AsyncStorage.getItem(key);
  if (raw === null && syncId) {
    raw = await AsyncStorage.getItem('@reminders');
    if (raw !== null) await setLocalRemindersJsonForSyncId(syncId, raw);
  }
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((row) => row && typeof row.id === 'string') : [];
  } catch { return []; }
}

export async function writeNotificationReminders(rows: NotificationReminder[]): Promise<void> {
  const syncId = await getAccountSyncId();
  const json = JSON.stringify(rows);
  if (syncId) await setLocalRemindersJsonForSyncId(syncId, json);
  else await AsyncStorage.setItem('@reminders', json);
}

/** Настройки альбома живут в синхронизируемом списке, а не в одном глобальном слоте. */
export async function saveAlbumNotificationPreferences(
  type: AlbumNotificationType,
  date: Date,
  projectId: string,
  enable = false
): Promise<void> {
  const rows = await readNotificationReminders();
  const name = type === 'pregnancy' ? 'Беременность' : 'Детский альбом';
  for (const group of ['daily', 'events'] as const) {
    const id = `album_notifications_${encodeURIComponent(projectId)}_${group}`;
    const index = rows.findIndex((row) => row.id === id);
    const previous = index >= 0 ? rows[index] : undefined;
    const row: NotificationReminder = {
      ...previous,
      id, projectId, categoryId: type, categoryName: name,
      kind: 'album-notifications', albumNotificationGroup: group,
      title: group === 'daily' ? `${name} · утренние сообщения` : `${name} · важные моменты`,
      description: group === 'daily'
        ? (type === 'kids' ? 'Разные идеи для записей каждый день в 09:30.' : 'Тёплое напоминание каждый день в 09:00 до ПДР.')
        : (type === 'kids' ? 'Возрастные события и дни рождения ребёнка до 7 лет.' : 'Недели беременности, ПДР и подготовка к встрече.'),
      date: date.toISOString(),
      enabled: enable ? true : previous?.enabled ?? true,
      deleted: enable ? false : previous?.deleted ?? false,
      ...(type === 'pregnancy' && group === 'events' && enable && !previous
        ? { welcomeAt: new Date(Date.now() + 5000).toISOString() } : {}),
    };
    if (index >= 0) rows[index] = row;
    else rows.push(row);
  }
  await writeNotificationReminders(rows);
}

/** Сохраняем уже подключённые бумажные альбомы и мигрируем старые два служебных ряда. */
export async function migrateAlbumNotificationPreferences(): Promise<void> {
  const initialRows = await readNotificationReminders();
  const sources: { type: AlbumNotificationType; date: Date; projectId: string }[] = [];
  const papersRaw = await AsyncStorage.getItem('@paper_albums');
  try {
    const papers = papersRaw ? JSON.parse(papersRaw) : [];
    if (Array.isArray(papers)) {
      for (const paper of papers) {
        if ((paper?.type === 'kids' || paper?.type === 'pregnancy') && paper.projectId && Number.isFinite(Date.parse(paper.date))) {
          sources.push({ type: paper.type, date: new Date(paper.date), projectId: String(paper.projectId) });
        }
      }
    }
  } catch { /* Повреждённый список не мешает остальным напоминаниям. */ }
  for (const type of ['pregnancy', 'kids'] as const) {
    const raw = await AsyncStorage.getItem(type === 'pregnancy' ? '@pregnancy_info' : '@kids_info');
    try {
      const info = raw ? JSON.parse(raw) : null;
      const date = info?.dueDate ?? info?.birthDate;
      if (info?.projectId && Number.isFinite(Date.parse(date))) {
        sources.push({ type, date: new Date(date), projectId: String(info.projectId) });
      }
    } catch { /* ignore invalid legacy data */ }
  }
  for (const source of sources) {
    if (initialRows.some((row) => isAlbumNotificationReminder(row) && row.projectId === source.projectId)) continue;
    await saveAlbumNotificationPreferences(source.type, source.date, source.projectId);
    const legacy = initialRows.filter((row) =>
      new RegExp(`^${source.type}_(due|week|birth|monthly)_\\d+$`).test(row.id)
    );
    if (legacy.some((row) => row.enabled === false)) {
      const rows = await readNotificationReminders();
      await writeNotificationReminders(rows.map((row) =>
        row.projectId === source.projectId && isAlbumNotificationReminder(row) ? { ...row, enabled: false } : row
      ));
    }
  }
  const rows = await readNotificationReminders();
  const kept = rows.filter((row) => !/^(pregnancy_(due|week)|kids_(birth|monthly))_\d+$/.test(row.id) &&
    !/^(pregnancy|kids)_\d+_1$/.test(row.id));
  if (kept.length !== rows.length) await writeNotificationReminders(kept);
}

export function getAlbumNotificationProfiles(rows: NotificationReminder[]): AlbumNotificationProfile[] {
  const profiles = new Map<string, AlbumNotificationProfile>();
  for (const row of rows) {
    if (!isAlbumNotificationReminder(row) || !row.projectId ||
      (row.categoryId !== 'pregnancy' && row.categoryId !== 'kids') || !Number.isFinite(Date.parse(row.date))) continue;
    const key = `${row.categoryId}:${row.projectId}`;
    const profile: AlbumNotificationProfile = profiles.get(key) ?? {
      type: row.categoryId, projectId: row.projectId, date: new Date(row.date), daily: false, events: false,
    };
    if (row.albumNotificationGroup === 'daily') profile.daily = row.enabled !== false && row.deleted !== true;
    if (row.albumNotificationGroup === 'events') profile.events = row.enabled !== false && row.deleted !== true;
    if (row.albumNotificationGroup === 'events' && typeof row.welcomeAt === 'string') profile.welcomeAt = row.welcomeAt;
    profiles.set(key, profile);
  }
  return Array.from(profiles.values());
}

/** Перенос временной настройки на настоящий проект, без повторного включения выключенного. */
export async function linkAlbumNotificationPreferences(projectId: string, type: AlbumNotificationType, dateISO: string): Promise<void> {
  const rows = await readNotificationReminders();
  let linked = false;
  const updated = rows.map((row) => {
    if (!isAlbumNotificationReminder(row) || row.categoryId !== type || !row.projectId?.startsWith(`${type}_`) ||
      new Date(row.date).toDateString() !== new Date(dateISO).toDateString()) return row;
    linked = true;
    return { ...row, projectId, id: `album_notifications_${encodeURIComponent(projectId)}_${row.albumNotificationGroup}` };
  });
  if (linked) await writeNotificationReminders(updated);
}
