import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { getAccountSyncId, getRemindersStorageKey } from '@/utils/account-sync';
import { resolveLineGuideId } from '@/utils/albumImages';
import {
  computeAlbumProgress,
  findNextPageToContinue,
} from '@/utils/albumProgress';
import { getInstanceTitle, getSchemaForInstance } from '@/utils/albumProjectInit';
import { loadPageInstances, loadPageValuesMap } from '@/utils/pageStorage';
import {
  getPregnancyWeek,
  loadPregnancyInfo,
} from '@/utils/pregnancyNotificationScheduler';
import {
  getProjectCategoryLabel,
  loadUserProjects,
  type UserProject,
} from '@/utils/userProjects';

export const WIDGET_DATA_KEY = 'WidgetSnapshot';
export const WIDGET_APP_GROUP = 'group.com.tihshkel.x018BY.expowidgets';

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
};

export type WidgetContinueSnapshot = {
  projectId: string;
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
  daysLeft: number;
  pdrISO: string;
  projectTitle: string;
  projectId: string;
};

export type WidgetSnapshot = {
  updatedAt: string;
  userName?: string;
  projects: WidgetProjectSnapshot[];
  continueProject?: WidgetContinueSnapshot;
  nextReminder?: WidgetReminderSnapshot;
  reminders: WidgetReminderSnapshot[];
  pregnancy?: WidgetPregnancySnapshot;
};

type StoredReminder = {
  id?: string;
  title?: string;
  date?: string;
  enabled?: boolean;
};

const MAX_PROJECTS = 5;
const MAX_PROGRESS_PROJECTS = 3;

let syncInFlight: Promise<void> | null = null;

function writeWidgetData(payload: string): void {
  if (Platform.OS !== 'ios') return;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const widgets = require('@bittingz/expo-widgets') as {
    setWidgetData?: (value: string) => void;
  };
  widgets.setWidgetData?.(payload);
}

function daysUntil(isoDate: string): number {
  const target = new Date(isoDate);
  if (Number.isNaN(target.getTime())) return 0;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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

async function computeProjectPercent(
  project: UserProject,
): Promise<number> {
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
      return Math.min(
        100,
        Math.round((project.photosCount / project.pagesCount) * 100),
      );
    }
    return 0;
  }

  const pageValuesMap = await loadPageValuesMap(
    (key) => AsyncStorage.getItem(key),
    project.id,
  );
  const progress = computeAlbumProgress(instances, pageValuesMap, (instance) =>
    getSchemaForInstance(instance, lineGuideId),
  );
  return progress.percent;
}

async function buildContinueSnapshot(
  projects: UserProject[],
): Promise<WidgetContinueSnapshot | undefined> {
  for (const project of projects.slice(0, MAX_PROGRESS_PROJECTS)) {
    const meta = await loadProjectMeta(project.id);
    const category = String(meta.category ?? project.category ?? '');
    const coverType = (meta.coverType as string) ?? project.coverType ?? null;
    const albumId = (meta.albumId as string) ?? project.albumId ?? null;
    const lineGuideId = resolveLineGuideId(coverType ?? albumId ?? '', category);

    const instances = await loadPageInstances(
      (key) => AsyncStorage.getItem(key),
      project.id,
    );
    if (instances.length === 0) continue;

    const pageValuesMap = await loadPageValuesMap(
      (key) => AsyncStorage.getItem(key),
      project.id,
    );
    const getSchema = (instance: Parameters<typeof getSchemaForInstance>[0]) =>
      getSchemaForInstance(instance, lineGuideId);
    const progress = computeAlbumProgress(instances, pageValuesMap, getSchema);
    if (progress.percent >= 100) continue;

    const nextPage = findNextPageToContinue(instances, pageValuesMap, getSchema);
    const pageTitle = nextPage
      ? getInstanceTitle(nextPage, lineGuideId)
      : 'Продолжить заполнение';

    return {
      projectId: project.id,
      projectTitle: project.title,
      pageTitle,
      percent: progress.percent,
      celebration: category,
      coverType: coverType ?? undefined,
    };
  }
  return undefined;
}

async function buildSnapshot(): Promise<WidgetSnapshot> {
  const [userName, projects, pregnancyInfo, reminderRows] = await Promise.all([
    AsyncStorage.getItem('@user_name'),
    loadUserProjects(),
    loadPregnancyInfo(),
    loadReminders(),
  ]);

  const reminders = mapReminderRows(reminderRows);
  const nextReminder = reminders[0];

  const projectsWithProgress = await Promise.all(
    projects.slice(0, MAX_PROJECTS).map(async (project, index) => {
      const percent =
        index < MAX_PROGRESS_PROJECTS
          ? await computeProjectPercent(project)
          : project.pagesCount > 0
            ? Math.min(
                100,
                Math.round((project.photosCount / project.pagesCount) * 100),
              )
            : 0;

      const meta = await loadProjectMeta(project.id);
      const category = String(meta.category ?? project.category ?? '');

      return {
        id: project.id,
        title: project.title,
        category,
        categoryLabel: getProjectCategoryLabel(category),
        percent,
        celebration: category,
        coverType: project.coverType ?? undefined,
        pagesCount: project.pagesCount,
        photosCount: project.photosCount,
      } satisfies WidgetProjectSnapshot;
    }),
  );

  let pregnancy: WidgetPregnancySnapshot | undefined;
  if (pregnancyInfo) {
    const week = getPregnancyWeek(pregnancyInfo.dueDate);
    const project = projects.find((p) => p.id === pregnancyInfo.projectId);
    pregnancy = {
      week,
      daysLeft: daysUntil(pregnancyInfo.dueDate.toISOString()),
      pdrISO: pregnancyInfo.dueDate.toISOString(),
      projectTitle: project?.title ?? 'Беременность',
      projectId: pregnancyInfo.projectId,
    };
  }

  const continueProject = await buildContinueSnapshot(projects);

  return {
    updatedAt: new Date().toISOString(),
    userName: userName?.trim() || undefined,
    projects: projectsWithProgress,
    continueProject,
    nextReminder,
    reminders,
    pregnancy,
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
    projects: [],
    reminders: [],
  };
  writeWidgetData(JSON.stringify(empty));
}
