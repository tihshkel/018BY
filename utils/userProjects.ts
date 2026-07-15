import { getAlbumTemplateById } from '@/albums';
import { projectCategories } from '@/constants/projectTemplates';
import { getPregnancyCoverPdf } from '@/utils/coverPdfMapping';
import { getGiftDisplayTitle, getGiftItemByAlbumName } from '@/utils/albumGiftMapping';
import { filterProjectsByDeleted, loadDeletedProjectIds } from '@/utils/deleted-project-ids';
import {
  getAlbumPageCount,
  resolveInteriorAlbumId,
  resolveLineGuideId,
} from '@/utils/albumImages';
import { isLegacyFreeformProject, pruneLegacyFreeformProjects } from '@/utils/legacyFreeformProject';
import { pruneGhostAlbumProjects } from '@/utils/pruneGhostAlbumProjects';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const HOME_PROJECTS_PREVIEW_LIMIT = 2;

/** Показывать «Все» / переход ко всем историям, только если проектов больше двух. */
export const HOME_SHOW_ALL_STORIES_MIN_COUNT = HOME_PROJECTS_PREVIEW_LIMIT + 1;

export type UserProject = {
  id: string;
  title: string;
  category: string;
  albumId?: string | null;
  coverType?: string | null;
  coverImage?: string;
  pagesCount: number;
  photosCount: number;
  remindersCount: number;
  dateStarted: string;
  /** ISO — последнее открытие альбома; для сортировки «недавно открытые первыми». */
  lastOpenedAt?: string | null;
  isReadyMadeAlbum?: boolean;
  hasPdfTemplate?: boolean;
  thumbnailPath?: unknown;
  reminderDate?: string | null;
  date?: string | null;
};

export function getProjectCategoryLabel(categoryId: string): string {
  return projectCategories.find((c) => c.id === categoryId)?.name ?? categoryId;
}

export function formatProjectsCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} проект`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} проекта`;
  }
  return `${count} проектов`;
}

const safeParseArray = (raw: string | null): unknown[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const countPhotoAnnotations = (items: unknown[]): number => {
  if (!Array.isArray(items) || items.length === 0) return 0;
  return items.filter(
    (ann) =>
      ann &&
      typeof ann === 'object' &&
      (ann as { type?: string }).type === 'image' &&
      typeof (ann as { imageUri?: string }).imageUri === 'string' &&
      ((ann as { imageUri: string }).imageUri?.length ?? 0) > 0
  ).length;
};

function hasValidReadyMadeMeta(project: Record<string, unknown>): boolean {
  const id = String(project?.id ?? '').trim();
  if (!id) return false;
  if (isLegacyFreeformProject(project)) return false;

  const category = String(project.category ?? '').trim();
  const rawInterior = String(project.interiorType ?? project.albumId ?? '').trim();
  const interiorId = resolveInteriorAlbumId(rawInterior, category);
  const lineGuideId = resolveLineGuideId(interiorId, category);

  if (category === 'diary') return lineGuideId.startsWith('diary_interior_');
  if (category === 'pregnancy') return lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5';
  if (category === 'kids') return lineGuideId === 'kids_48';
  if (category === 'holidays') return Boolean(interiorId);
  if (category === 'family') return Boolean(interiorId);

  return getAlbumPageCount(interiorId) > 0;
}

function resolveGiftSku(params: {
  albumId: string | null;
  coverType: string | null;
}): string | null {
  const { albumId, coverType } = params;

  const tryDiarySku = (value: string | null): string | null => {
    if (!value) return null;
    if (/^DD\d+$/i.test(value)) return value.toUpperCase();
    const diaryMatch = value.match(/diary_dd(\d+)/i);
    if (diaryMatch) return `DD${diaryMatch[1]}`;
    return null;
  };

  const tryDfaSku = (value: string | null): string | null => {
    if (!value) return null;
    const normalized = value.toLowerCase();
    if (!normalized.startsWith('dfa_')) return null;
    const numPart = normalized.replace('dfa_', '');
    return numPart ? `DFA${numPart.toUpperCase()}` : null;
  };

  const diarySku = tryDiarySku(albumId) || tryDiarySku(coverType);
  if (diarySku) return diarySku;

  const dfaSku = tryDfaSku(coverType) || tryDfaSku(albumId);
  if (dfaSku) return dfaSku;

  const pregnancySku = getPregnancyCoverPdf(coverType) || getPregnancyCoverPdf(albumId);
  if (pregnancySku) return pregnancySku;

  return null;
}

function resolveProjectTitleFromWildberries(params: {
  title: string;
  albumId: string | null;
  coverType: string | null;
}): string {
  const { title, albumId, coverType } = params;
  const fallbackTitle = title.trim();
  const sku = resolveGiftSku({ albumId, coverType });
  if (sku) {
    const wbTitleBySku = getGiftDisplayTitle(sku, fallbackTitle);
    if (wbTitleBySku.trim().length > 0) return wbTitleBySku.trim();
  }

  const wbByAlbumName = getGiftItemByAlbumName(fallbackTitle);
  if (wbByAlbumName?.title?.trim()) return wbByAlbumName.title.trim();

  if (albumId) {
    const template = getAlbumTemplateById(albumId);
    if (template?.name) {
      const wbByTemplateName = getGiftItemByAlbumName(template.name);
      if (wbByTemplateName?.title?.trim()) return wbByTemplateName.title.trim();
    }
  }

  return fallbackTitle;
}

async function hydrateProject(p: Record<string, unknown>): Promise<UserProject> {
  const projectId = String(p?.id ?? '');
  const albumId = typeof p?.albumId === 'string' ? p.albumId : null;
  const coverType = (p?.coverType as string) || null;
  const createdAt =
    typeof p?.createdAt === 'string' ? p.createdAt : new Date().toISOString();
  const remindersCount = p?.reminderDate || p?.date ? 1 : 0;

  const keys = [
    `@project_images_${projectId}`,
    `@project_annotations_${projectId}`,
    `@project_cover_annotations_${projectId}`,
  ] as const;

  let pagesCount = typeof p?.pagesCount === 'number' ? p.pagesCount : 0;
  let photosCount = 0;

  try {
    const results = await AsyncStorage.multiGet(keys as unknown as string[]);
    const imagesRaw = results.find(([k]) => k === keys[0])?.[1] ?? null;
    const annotationsRaw = results.find(([k]) => k === keys[1])?.[1] ?? null;
    const coverAnnotationsRaw = results.find(([k]) => k === keys[2])?.[1] ?? null;

    const savedImages = safeParseArray(imagesRaw);
    if (savedImages.length > 0) {
      pagesCount = savedImages.length;
    } else if (pagesCount === 0 && albumId) {
      const interiorId = resolveInteriorAlbumId(albumId, String(p?.category ?? ''));
      pagesCount = getAlbumPageCount(interiorId);
    }

    const anns = safeParseArray(annotationsRaw);
    const coverAnns = safeParseArray(coverAnnotationsRaw);
    photosCount = countPhotoAnnotations(anns) + countPhotoAnnotations(coverAnns);
  } catch {
    // ignore
  }

  let lastOpenedAt =
    typeof p?.lastOpenedAt === 'string' && p.lastOpenedAt.trim()
      ? p.lastOpenedAt
      : null;

  // Предпочитаем свежее значение из карточки проекта, если оно новее списка.
  try {
    const projectRaw = await AsyncStorage.getItem(`@project_${projectId}`);
    if (projectRaw) {
      const parsed = JSON.parse(projectRaw) as Record<string, unknown>;
      const fromProject =
        typeof parsed?.lastOpenedAt === 'string' && parsed.lastOpenedAt.trim()
          ? parsed.lastOpenedAt
          : null;
      if (fromProject) {
        const listTime = lastOpenedAt ? Date.parse(lastOpenedAt) : 0;
        const projectTime = Date.parse(fromProject);
        if (
          !lastOpenedAt ||
          (Number.isFinite(projectTime) && projectTime >= listTime)
        ) {
          lastOpenedAt = fromProject;
        }
      }
    }
  } catch {
    // ignore
  }

  return {
    id: projectId,
    title: resolveProjectTitleFromWildberries({
      title: String(p?.title ?? ''),
      albumId,
      coverType,
    }),
    category: String(p?.category ?? ''),
    albumId,
    coverType,
    pagesCount,
    photosCount,
    remindersCount,
    dateStarted: createdAt,
    lastOpenedAt,
    isReadyMadeAlbum: !!p?.isReadyMadeAlbum,
    hasPdfTemplate: !!p?.hasPdfTemplate,
    thumbnailPath: p?.thumbnailPath ?? null,
    reminderDate: (p?.reminderDate as string) ?? null,
    date: (p?.date as string) ?? null,
  };
}

function projectRecencyTime(project: UserProject): number {
  const opened = project.lastOpenedAt ? Date.parse(project.lastOpenedAt) : NaN;
  if (Number.isFinite(opened)) return opened;
  const started = Date.parse(project.dateStarted);
  return Number.isFinite(started) ? started : 0;
}

/** Отметить проект как недавно открытый — поднимает его в начало списков. */
export async function touchProjectLastOpened(projectId: string): Promise<void> {
  const id = String(projectId ?? '').trim();
  if (!id) return;

  const now = new Date().toISOString();

  try {
    const projectRaw = await AsyncStorage.getItem(`@project_${id}`);
    if (projectRaw) {
      const parsed = JSON.parse(projectRaw) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object') {
        parsed.lastOpenedAt = now;
        await AsyncStorage.setItem(`@project_${id}`, JSON.stringify(parsed));
      }
    }
  } catch {
    // ignore per-project write failures
  }

  try {
    const listRaw = await AsyncStorage.getItem('@user_projects');
    if (!listRaw) return;
    const list = JSON.parse(listRaw) as unknown[];
    if (!Array.isArray(list) || list.length === 0) return;

    let changed = false;
    const next = list.map((entry) => {
      if (!entry || typeof entry !== 'object') return entry;
      const item = entry as Record<string, unknown>;
      if (String(item.id ?? '') !== id) return entry;
      changed = true;
      return { ...item, lastOpenedAt: now };
    });

    if (changed) {
      await AsyncStorage.setItem('@user_projects', JSON.stringify(next));
    }
  } catch {
    // ignore list write failures
  }
}

/** Все проекты пользователя из AsyncStorage, недавно открытые первыми */
export async function loadUserProjects(): Promise<UserProject[]> {
  try {
    await pruneLegacyFreeformProjects();
  } catch (error) {
    console.warn('[loadUserProjects] prune legacy freeform projects failed', error);
  }

  try {
    await pruneGhostAlbumProjects();
  } catch (error) {
    console.warn('[loadUserProjects] prune ghost projects failed', error);
  }

  const savedProjects = await AsyncStorage.getItem('@user_projects');
  if (!savedProjects) return [];

  const parsedProjects = JSON.parse(savedProjects) as unknown[];
  if (!Array.isArray(parsedProjects) || parsedProjects.length === 0) return [];

  const deletedIds = await loadDeletedProjectIds();
  const visibleProjects = filterProjectsByDeleted(
    parsedProjects as Array<{ id?: string }>,
    deletedIds
  ).filter((project) => hasValidReadyMadeMeta(project as Record<string, unknown>));
  if (visibleProjects.length === 0) return [];

  const formatted = await Promise.all(
    visibleProjects.map((p) => hydrateProject(p as Record<string, unknown>))
  );

  return formatted.sort((a, b) => projectRecencyTime(b) - projectRecencyTime(a));
}
