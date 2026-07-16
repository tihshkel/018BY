import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { getAccountSyncId, getRemindersStorageKey } from '@/utils/account-sync';
import { resolveLineGuideId } from '@/utils/albumImages';
import {
  computeAlbumProgress,
  findNextPageToContinue,
} from '@/utils/albumProgress';
import { getInstanceTitle, getSchemaForInstance } from '@/utils/albumProjectInit';
import {
  getNotificationInbox,
  type NotificationInboxItem,
} from '@/utils/notificationInbox';
import { loadPageInstances, loadPageValuesMap } from '@/utils/pageStorage';
import {
  getPregnancyDay,
  getWeeklyInsightForWeek,
  loadPregnancyInfo,
} from '@/utils/pregnancyNotificationScheduler';
import {
  getProjectCategoryLabel,
  loadUserProjects,
  type UserProject,
} from '@/utils/userProjects';

export const WIDGET_DATA_KEY = 'WidgetSnapshot';
export const WIDGET_APP_GROUP = 'group.com.tihshkel.x018BY.expowidgets';

/** Calendar days from local midnight today until ISO date (can be negative). */
export function daysUntil(isoDate: string, now: Date = new Date()): number {
  const target = new Date(isoDate);
  if (Number.isNaN(target.getTime())) return 0;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export type WidgetProjectSnapshot = {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  percent: number;
  celebration?: string;
  coverType?: string;
  pagesCount: number;
  photosCount: number;
  unfinishedPages?: number;
};

export type WidgetContinueSnapshot = {
  projectId: string;
  instanceId: string;
  projectTitle: string;
  pageTitle: string;
  percent: number;
  celebration?: string;
  coverType?: string;
};

export type WidgetReminderSnapshot = {
  title: string;
  dateISO: string;
  daysLeft: number;
};

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

export type WidgetInboxNotification = {
  id: string;
  title: string;
  body: string;
  receivedAt: string;
};

export type WidgetSnapshot = {
  updatedAt: string;
  userName?: string;
  /** Full album count (not capped by projects[] preview). */
  albumsCount: number;
  projects: WidgetProjectSnapshot[];
  continueProject?: WidgetContinueSnapshot;
  nextReminder?: WidgetReminderSnapshot;
  reminders: WidgetReminderSnapshot[];
  pregnancy?: WidgetPregnancySnapshot;
  todayNotifications: WidgetInboxNotification[];
  latestNotification?: WidgetInboxNotification;
  unreadTodayCount: number;
};

type StoredReminder = {
  id?: string;
  title?: string;
  date?: string;
  enabled?: boolean;
};

const MAX_PROJECTS = 5;
const MAX_PROGRESS_PROJECTS = 3;
const MAX_TODAY_NOTIFICATIONS = 3;

let syncInFlight: Promise<void> | null = null;

function sanitizePercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function writeWidgetData(payload: string): void {
  if (Platform.OS !== 'ios') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const widgets = require('@bittingz/expo-widgets') as {
      setWidgetData?: (value: string) => void;
    };
    if (typeof widgets.setWidgetData !== 'function') {
      if (__DEV__) {
        console.warn(
          '[WidgetSnapshot] setWidgetData unavailable — нужна нативная сборка (не Expo Go)',
        );
      }
      return;
    }
    widgets.setWidgetData(payload);
    if (__DEV__) {
      console.log('[WidgetSnapshot] synced payload', payload.length, 'bytes');
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[WidgetSnapshot] write failed:', error);
    }
  }
}

function isSameLocalDay(isoDate: string, reference: Date = new Date()): boolean {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return false;
  return (
    parsed.getFullYear() === reference.getFullYear() &&
    parsed.getMonth() === reference.getMonth() &&
    parsed.getDate() === reference.getDate()
  );
}

function mapInboxNotification(item: NotificationInboxItem): WidgetInboxNotification {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    receivedAt: item.receivedAt,
  };
}

function buildNotificationSnapshot(inbox: NotificationInboxItem[]): {
  todayNotifications: WidgetInboxNotification[];
  latestNotification?: WidgetInboxNotification;
  unreadTodayCount: number;
} {
  const sorted = [...inbox].sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
  );
  const todayNotifications = sorted
    .filter((item) => isSameLocalDay(item.receivedAt))
    .slice(0, MAX_TODAY_NOTIFICATIONS)
    .map(mapInboxNotification);

  const latestNotification =
    todayNotifications[0] ??
    (sorted[0] ? mapInboxNotification(sorted[0]) : undefined);

  return {
    todayNotifications,
    latestNotification,
    unreadTodayCount: todayNotifications.length,
  };
}

async function loadReminders(): Promise<StoredReminder[]> {
  const syncId = await getAccountSyncId();
  const keys = syncId
    ? [getRemindersStorageKey(syncId), '@reminders']
    : ['@reminders'];

  for (const key of keys) {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed as StoredReminder[];
      }
    } catch {
      /* ignore */
    }
  }
  return [];
}

function mapReminderRows(rows: StoredReminder[]): WidgetReminderSnapshot[] {
  return rows
    .filter((row) => row.enabled !== false && row.title && row.date)
    .map((row) => ({
      title: String(row.title),
      dateISO: String(row.date),
      daysLeft: daysUntil(String(row.date)),
    }))
    .filter((row) => row.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);
}

async function loadProjectMeta(projectId: string): Promise<Record<string, unknown>> {
  const raw = await AsyncStorage.getItem(`@project_${projectId}`);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

async function computeProjectProgress(
  project: UserProject,
): Promise<{ percent: number; unfinishedPages?: number }> {
  const meta = await loadProjectMeta(project.id);
  const category = String(meta.category ?? project.category ?? '');
  const coverType = (meta.coverType as string) ?? project.coverType ?? null;
  const albumId = (meta.albumId as string) ?? project.albumId ?? null;
  const lineGuideId = resolveLineGuideId(coverType ?? albumId ?? '', category);

  const instances = await loadPageInstances(
    (key) => AsyncStorage.getItem(key),
    project.id,
  );
  if (instances.length === 0) {
    if (project.pagesCount > 0 && project.photosCount > 0) {
      return {
        percent: sanitizePercent(
          Math.min(100, Math.round((project.photosCount / project.pagesCount) * 100)),
        ),
      };
    }
    return { percent: 0 };
  }

  const pageValuesMap = await loadPageValuesMap(
    (key) => AsyncStorage.getItem(key),
    project.id,
  );
  const progress = computeAlbumProgress(instances, pageValuesMap, (instance) =>
    getSchemaForInstance(instance, lineGuideId),
  );
  const unfinishedPages = progress.totalCount - progress.filledCount;
  return {
    percent: sanitizePercent(progress.percent),
    unfinishedPages: unfinishedPages > 0 ? unfinishedPages : undefined,
  };
}

/** Used by home widgets and iOS snapshot. */
export async function buildContinueSnapshotForHome(
  projects: UserProject[],
): Promise<WidgetContinueSnapshot | undefined> {
  for (const project of projects.slice(0, MAX_PROJECTS)) {
    const meta = await loadProjectMeta(project.id);
    const category = String(meta.category ?? project.category ?? '');
    const coverType = (meta.coverType as string) ?? project.coverType ?? null;
    const albumId = (meta.albumId as string) ?? project.albumId ?? null;
    const lineGuideId = resolveLineGuideId(coverType ?? albumId ?? '', category);

    const instances = await loadPageInstances(
      (key) => AsyncStorage.getItem(key),
      project.id,
    );

    if (instances.length === 0) {
      const roughPercent =
        project.pagesCount > 0
          ? sanitizePercent(Math.round((project.photosCount / project.pagesCount) * 100))
          : 0;
      if (roughPercent > 0 && roughPercent < 100) {
        return {
          projectId: project.id,
          instanceId: '',
          projectTitle: project.title,
          pageTitle: 'Продолжить заполнение',
          percent: roughPercent,
          celebration: category,
          coverType: coverType ?? undefined,
        };
      }
      continue;
    }

    const pageValuesMap = await loadPageValuesMap(
      (key) => AsyncStorage.getItem(key),
      project.id,
    );
    const getSchema = (instance: Parameters<typeof getSchemaForInstance>[0]) =>
      getSchemaForInstance(instance, lineGuideId);
    const progress = computeAlbumProgress(instances, pageValuesMap, getSchema);
    if (sanitizePercent(progress.percent) >= 100) continue;

    const nextPage = findNextPageToContinue(instances, pageValuesMap, getSchema);
    if (!nextPage) continue;

    const pageTitle = getInstanceTitle(nextPage, lineGuideId);

    return {
      projectId: project.id,
      instanceId: nextPage.instanceId,
      projectTitle: project.title,
      pageTitle,
      percent: sanitizePercent(progress.percent),
      celebration: category,
      coverType: coverType ?? undefined,
    };
  }
  return undefined;
}

async function buildSnapshot(): Promise<WidgetSnapshot> {
  const [userName, projects, pregnancyInfo, reminderRows, inbox] = await Promise.all([
    AsyncStorage.getItem('@user_name'),
    loadUserProjects(),
    loadPregnancyInfo(),
    loadReminders(),
    getNotificationInbox(),
  ]);

  const reminders = mapReminderRows(reminderRows);
  const nextReminder = reminders[0];
  const notificationSnapshot = buildNotificationSnapshot(inbox);

  const projectsWithProgress = await Promise.all(
    projects.slice(0, MAX_PROJECTS).map(async (project, index) => {
      const progress =
        index < MAX_PROGRESS_PROJECTS
          ? await computeProjectProgress(project)
          : {
              percent:
                project.pagesCount > 0
                  ? Math.min(
                      100,
                      Math.round((project.photosCount / project.pagesCount) * 100),
                    )
                  : 0,
            };

      const meta = await loadProjectMeta(project.id);
      const category = String(meta.category ?? project.category ?? '');

      return {
        id: project.id,
        title: project.title,
        category,
        categoryLabel: getProjectCategoryLabel(category),
        percent: sanitizePercent(progress.percent),
        celebration: category,
        coverType: project.coverType ?? undefined,
        pagesCount: project.pagesCount ?? 0,
        photosCount: project.photosCount ?? 0,
        unfinishedPages: progress.unfinishedPages,
      } satisfies WidgetProjectSnapshot;
    }),
  );

  let pregnancy: WidgetPregnancySnapshot | undefined;
  if (pregnancyInfo) {
    const dayInfo = getPregnancyDay(pregnancyInfo.dueDate);
    const project = projects.find((p) => p.id === pregnancyInfo.projectId);
    pregnancy = {
      week: dayInfo.week,
      day: dayInfo.day,
      dayInWeek: dayInfo.dayInWeek,
      trimester: dayInfo.trimester,
      weeklyInsight: getWeeklyInsightForWeek(dayInfo.week),
      daysLeft: daysUntil(pregnancyInfo.dueDate.toISOString()),
      pdrISO: pregnancyInfo.dueDate.toISOString(),
      projectTitle: project?.title ?? 'Беременность',
      projectId: pregnancyInfo.projectId,
    };
  }

  const continueProject = await buildContinueSnapshotForHome(projects);

  return {
    updatedAt: new Date().toISOString(),
    userName: userName?.trim() || undefined,
    albumsCount: projects.length,
    projects: projectsWithProgress,
    continueProject,
    nextReminder,
    reminders,
    pregnancy,
    ...notificationSnapshot,
  };
}

async function doSync(): Promise<void> {
  const snapshot = await buildSnapshot();
  writeWidgetData(JSON.stringify(snapshot));
}

export async function syncWidgetSnapshot(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  if (syncInFlight) {
    await syncInFlight;
    return;
  }
  syncInFlight = doSync().finally(() => {
    syncInFlight = null;
  });
  await syncInFlight;
}

export async function clearWidgetSnapshot(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const empty: WidgetSnapshot = {
    updatedAt: new Date().toISOString(),
    albumsCount: 0,
    projects: [],
    reminders: [],
    todayNotifications: [],
    unreadTodayCount: 0,
  };
  writeWidgetData(JSON.stringify(empty));
}

/** @internal exported for regression tests */
export const widgetSnapshotTestUtils = {
  isSameLocalDay,
  buildNotificationSnapshot,
  daysUntil,
};
