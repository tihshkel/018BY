import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { getAccountSyncId, getRemindersStorageKey } from '@/utils/account-sync';
import { resolveLineGuideId } from '@/utils/albumImages';
import { computeAlbumProgress, findNextPageToContinue } from '@/utils/albumProgress';
import { getInstanceTitle, getSchemaForInstance } from '@/utils/albumProjectInit';
import { resolveFormPathname } from '@/utils/albumPageNavigation';
import { getNotificationInbox, type NotificationInboxItem } from '@/utils/notificationInbox';
import { isAlbumNotificationReminder, type NotificationReminder } from '@/utils/albumNotificationPreferences';
import { addCalendarMonths, nextReminderDate } from '@/utils/localNotificationSchedule';
import { loadPageInstances, loadPageValuesMapMerged } from '@/utils/pageStorage';
import { computePageStatus } from '@/utils/pageStatus';
import { loadPregnancyInfo } from '@/utils/pregnancyNotificationScheduler';
import { getProjectCategoryLabel, loadUserProjects, type UserProject } from '@/utils/userProjects';

export const WIDGET_DATA_KEY = 'WidgetSnapshot';
export const WIDGET_APP_GROUP = 'group.com.tihshkel.x018BY.expowidgets';

/** Local calendar days, including daylight-saving transitions. */
export function daysUntil(isoDate: string, now: Date = new Date()): number {
  const target = new Date(isoDate);
  if (Number.isNaN(target.getTime())) return 0;
  const targetDay = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((targetDay - today) / 86_400_000);
}

export type WidgetProjectSnapshot = {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  percent: number;
  celebration?: string;
  coverType?: string;
  interiorType?: string;
  pagesCount: number;
  photosCount: number;
  unfinishedPages?: number;
  filledPages?: number;
  progressKnown?: boolean;
};

export type WidgetContinueSnapshot = {
  projectId: string;
  instanceId: string;
  projectTitle: string;
  pageTitle: string;
  percent: number;
  celebration?: string;
  coverType?: string;
  interiorType?: string;
  editorPath?: string;
  unfinishedPages?: number;
  filledPages?: number;
  totalPages?: number;
  actionHint?: string;
};

export type WidgetReminderSnapshot = { title: string; dateISO: string; daysLeft: number };
export type WidgetPregnancySnapshot = {
  week: number;
  day: number;
  dayInWeek: number;
  trimester: number;
  weeklyInsight?: string;
  daysLeft: number;
  pdrISO: string;
  projectTitle: string;
  projectId: string;
};
export type WidgetInboxNotification = { id: string; title: string; body: string; receivedAt: string };
export type WidgetSnapshot = {
  updatedAt: string;
  userName?: string;
  albumsCount: number;
  projects: WidgetProjectSnapshot[];
  continueProject?: WidgetContinueSnapshot;
  nextReminder?: WidgetReminderSnapshot;
  reminders: WidgetReminderSnapshot[];
  pregnancy?: WidgetPregnancySnapshot;
  todayNotifications: WidgetInboxNotification[];
  latestNotification?: WidgetInboxNotification;
  /** Legacy key: inbox has no read state; this is the full number received today. */
  unreadTodayCount: number;
};

type StoredReminder = Partial<NotificationReminder>;
const MAX_PROJECTS = 5;
const MAX_TODAY_NOTIFICATIONS = 3;
let syncInFlight: Promise<void> | null = null;
let syncRequested = false;
let snapshotGeneration = 0;
let lastPayload: string | undefined;

function sanitizePercent(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;
}

function writeWidgetData(payload: string): void {
  if (Platform.OS !== 'ios' || payload === lastPayload) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const widgets = require('@bittingz/expo-widgets') as { setWidgetData?: (value: string) => void };
    if (typeof widgets.setWidgetData !== 'function') return;
    widgets.setWidgetData(payload);
    lastPayload = payload;
  } catch (error) {
    if (__DEV__) console.warn('[WidgetSnapshot] write failed:', error);
  }
}

function isSameLocalDay(isoDate: string, reference: Date = new Date()): boolean {
  const parsed = new Date(isoDate);
  return !Number.isNaN(parsed.getTime()) && daysUntil(isoDate, reference) === 0;
}

function mapInboxNotification(item: NotificationInboxItem): WidgetInboxNotification {
  return { id: item.id, title: item.title, body: item.body, receivedAt: item.receivedAt };
}

function buildNotificationSnapshot(inbox: NotificationInboxItem[]): {
  todayNotifications: WidgetInboxNotification[];
  latestNotification?: WidgetInboxNotification;
  unreadTodayCount: number;
} {
  const sorted = inbox.filter((item) => Number.isFinite(Date.parse(item.receivedAt)))
    .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt));
  const today = sorted.filter((item) => isSameLocalDay(item.receivedAt));
  return {
    todayNotifications: today.slice(0, MAX_TODAY_NOTIFICATIONS).map(mapInboxNotification),
    latestNotification: sorted[0] ? mapInboxNotification(sorted[0]) : undefined,
    unreadTodayCount: today.length,
  };
}

async function loadReminders(): Promise<StoredReminder[]> {
  const syncId = await getAccountSyncId();
  // An account's empty calendar must not pick up another account's legacy data.
  const raw = await AsyncStorage.getItem(syncId ? getRemindersStorageKey(syncId) : '@reminders');
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function mapReminderRows(rows: StoredReminder[]): WidgetReminderSnapshot[] {
  return rows.flatMap((row) => {
    if (!row || row.enabled === false || row.deleted === true || typeof row.title !== 'string' ||
      !row.title.trim() || typeof row.date !== 'string' || !Number.isFinite(Date.parse(row.date))) return [];
    let title = row.title.trim();
    let date = new Date(row.date);
    if (isAlbumNotificationReminder(row)) {
      if (row.albumNotificationGroup !== 'events') return [];
      if (row.categoryId === 'pregnancy') title = 'Предварительная дата родов';
      else if (row.categoryId === 'kids') {
        const birthday = new Date(row.date);
        let year = Math.max(new Date().getFullYear(), birthday.getFullYear() + 1);
        date = addCalendarMonths(birthday, (year - birthday.getFullYear()) * 12);
        if (daysUntil(date.toISOString()) < 0) date = addCalendarMonths(birthday, (++year - birthday.getFullYear()) * 12);
        if (year - birthday.getFullYear() > 7) return [];
        title = 'День рождения ребёнка';
      }
    } else if (row.repeats) {
      const next = nextReminderDate({ date: row.date, repeats: true });
      if (!next) return [];
      date = next;
    }
    const dateISO = date.toISOString();
    const daysLeft = daysUntil(dateISO);
    return daysLeft >= 0 ? [{ title, dateISO, daysLeft }] : [];
  }).filter((row, index, all) => all.findIndex((other) => other.title === row.title && other.dateISO === row.dateISO) === index)
    .sort((a, b) => Date.parse(a.dateISO) - Date.parse(b.dateISO));
}

async function loadProjectMeta(projectId: string): Promise<Record<string, unknown>> {
  const raw = await AsyncStorage.getItem(`@project_${projectId}`);
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch { return {}; }
}

/** Same schema and merged per-page storage as the album editor. No photo-count estimates. */
export async function readWidgetProject(project: UserProject): Promise<{
  project: WidgetProjectSnapshot;
  next?: WidgetContinueSnapshot;
  lastEditedAt: number;
}> {
  const meta = await loadProjectMeta(project.id);
  const category = String(meta.category ?? project.category ?? '');
  const coverType = typeof meta.coverType === 'string' ? meta.coverType : project.coverType ?? undefined;
  const interiorType = String(meta.interiorType ?? meta.albumId ?? project.albumId ?? '');
  const lineGuideId = resolveLineGuideId(interiorType, category);
  const title = typeof meta.title === 'string' && meta.title.trim() ? meta.title.trim() : project.title;
  const instances = await loadPageInstances((key) => AsyncStorage.getItem(key), project.id);
  const values = await loadPageValuesMapMerged((key) => AsyncStorage.getItem(key), project.id, instances.map((item) => item.instanceId));
  const getSchema = (instance: Parameters<typeof getSchemaForInstance>[0]) => getSchemaForInstance(instance, lineGuideId);
  // Locked decorations and pages excluded by the user are not unfinished work.
  const editable = instances.filter((instance) => {
    const schema = getSchema(instance);
    if (!schema) return false;
    const status = computePageStatus(schema, values[instance.instanceId]);
    return status !== 'locked' && status !== 'excluded';
  });
  const progress = computeAlbumProgress(editable, values, getSchema);
  const remaining = progress.totalCount - progress.filledCount;
  const progressKnown = instances.length > 0 && instances.every((instance) => Boolean(getSchema(instance)));
  const percent = !progressKnown ? 0 : progress.totalCount === 0 ? 100 : sanitizePercent(progress.percent);
  const flow = { celebration: category, coverType, interiorType: interiorType || undefined };
  const snapshot: WidgetProjectSnapshot = {
    id: project.id, title, category, categoryLabel: getProjectCategoryLabel(category), percent, ...flow,
    pagesCount: progress.totalCount, photosCount: project.photosCount ?? 0,
    unfinishedPages: progressKnown ? remaining : undefined, filledPages: progress.filledCount, progressKnown,
  };
  const lastEditedAt = Object.values(values).reduce((latest, value) => Math.max(latest, Date.parse(value.updatedAt ?? '') || 0), Date.parse(project.dateStarted) || 0);
  const nextPage = findNextPageToContinue(editable, values, getSchema);
  if (!nextPage) {
    return {
      project: snapshot, lastEditedAt,
      next: !progressKnown ? {
        projectId: project.id, instanceId: '', projectTitle: title, pageTitle: 'Первая страница вашей истории',
        percent: 0, ...flow, actionHint: 'Откройте альбом и начните с одного воспоминания',
      } : undefined,
    };
  }
  const schema = getSchema(nextPage);
  const hasPhotos = (schema?.photoBlocks?.length ?? 0) > 0;
  const hasText = (schema?.fields?.length ?? 0) > 0 || schema?.captionEnabled;
  const actionHint = hasPhotos && hasText ? 'Добавьте фото и несколько слов об этом моменте'
    : hasPhotos ? 'Выберите фото, которое хочется сохранить'
    : 'Сохраните детали, пока они ещё свежи в памяти';
  return {
    project: snapshot, lastEditedAt,
    next: {
      projectId: project.id, instanceId: nextPage.instanceId, projectTitle: title,
      pageTitle: getInstanceTitle(nextPage, lineGuideId), percent, ...flow,
      editorPath: resolveFormPathname(schema), unfinishedPages: remaining,
      filledPages: progress.filledCount, totalPages: progress.totalCount, actionHint,
    },
  };
}

async function readProjects(projects: UserProject[]) {
  const results: Awaited<ReturnType<typeof readWidgetProject>>[] = [];
  // Keep memory bounded for large libraries while considering every album.
  for (let offset = 0; offset < projects.length; offset += 3) {
    results.push(...await Promise.all(projects.slice(offset, offset + 3).map(readWidgetProject)));
  }
  return results.sort((a, b) => b.lastEditedAt - a.lastEditedAt);
}

/** Shared with the home screen; prioritizes the most recently edited unfinished album. */
export async function buildContinueSnapshotForHome(projects: UserProject[]): Promise<WidgetContinueSnapshot | undefined> {
  return (await readProjects(projects)).find((item) => item.next)?.next;
}

async function buildSnapshot(): Promise<WidgetSnapshot> {
  const [userName, projects, pregnancyInfo, reminderRows, inbox] = await Promise.all([
    AsyncStorage.getItem('@user_name'), loadUserProjects(), loadPregnancyInfo(), loadReminders(), getNotificationInbox(),
  ]);
  const reminders = mapReminderRows(reminderRows);
  const results = await readProjects(projects);
  const next = results.find((item) => item.next);
  // Put the active album first, while preserving each other album's own progress.
  const ordered = next ? [next, ...results.filter((item) => item !== next)] : results;
  let pregnancy: WidgetPregnancySnapshot | undefined;
  const pregnancyProject = pregnancyInfo && projects.find((project) => project.id === pregnancyInfo.projectId);
  if (pregnancyInfo && pregnancyProject && Number.isFinite(pregnancyInfo.dueDate.getTime()) && daysUntil(pregnancyInfo.dueDate.toISOString()) >= -14) {
    const daysLeft = daysUntil(pregnancyInfo.dueDate.toISOString());
    const day = Math.max(1, Math.min(294, 281 - daysLeft));
    const week = Math.max(1, Math.min(42, 40 - Math.floor(daysLeft / 7)));
    pregnancy = {
      day, week, dayInWeek: ((day - 1) % 7) + 1,
      trimester: week <= 13 ? 1 : week <= 27 ? 2 : 3,
      daysLeft, pdrISO: pregnancyInfo.dueDate.toISOString(),
      projectTitle: pregnancyProject.title, projectId: pregnancyInfo.projectId,
    };
  }
  return {
    updatedAt: new Date().toISOString(), userName: userName?.trim() || undefined,
    albumsCount: projects.length, projects: ordered.slice(0, MAX_PROJECTS).map((item) => item.project),
    continueProject: next?.next, nextReminder: reminders[0], reminders, pregnancy,
    ...buildNotificationSnapshot(inbox),
  };
}

export async function syncWidgetSnapshot(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  syncRequested = true;
  if (syncInFlight) return syncInFlight;
  syncInFlight = (async () => {
    try {
      do {
        syncRequested = false;
        const generation = snapshotGeneration;
        const snapshot = await buildSnapshot();
        // A sign-out during an in-flight read must never restore the previous account's data.
        if (generation === snapshotGeneration) writeWidgetData(JSON.stringify(snapshot));
      } while (syncRequested);
    } catch (error) {
      if (__DEV__) console.warn('[WidgetSnapshot] sync failed:', error);
    }
  })().finally(() => { syncInFlight = null; });
  return syncInFlight;
}

export async function clearWidgetSnapshot(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  snapshotGeneration += 1;
  syncRequested = false;
  const empty: WidgetSnapshot = {
    updatedAt: new Date().toISOString(), albumsCount: 0, projects: [], reminders: [],
    todayNotifications: [], unreadTodayCount: 0,
  };
  writeWidgetData(JSON.stringify(empty));
}

/** @internal */
export const widgetSnapshotTestUtils = { isSameLocalDay, buildNotificationSnapshot, daysUntil };
