import { getAlbumTemplateById } from '@/albums';
import { projectCategories } from '@/constants/projectTemplates';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const HOME_PROJECTS_PREVIEW_LIMIT = 2;

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

async function hydrateProject(p: Record<string, unknown>): Promise<UserProject> {
  const projectId = String(p?.id ?? '');
  const albumId = typeof p?.albumId === 'string' ? p.albumId : null;
  const createdAt =
    typeof p?.createdAt === 'string' ? p.createdAt : new Date().toISOString();
  const remindersCount = p?.reminderDate || p?.date ? 1 : 0;

  const keys = [
    `@project_images_${projectId}`,
    `@project_annotations_${projectId}`,
    `@project_cover_annotations_${projectId}`,
  ] as const;

  let pagesCount = 0;
  let photosCount = 0;

  try {
    const results = await AsyncStorage.multiGet(keys as unknown as string[]);
    const imagesRaw = results.find(([k]) => k === keys[0])?.[1] ?? null;
    const annotationsRaw = results.find(([k]) => k === keys[1])?.[1] ?? null;
    const coverAnnotationsRaw = results.find(([k]) => k === keys[2])?.[1] ?? null;

    const savedImages = safeParseArray(imagesRaw);
    if (savedImages.length > 0) {
      pagesCount = savedImages.length;
    } else if (albumId) {
      const template = getAlbumTemplateById(albumId);
      if (typeof template?.pages === 'number') {
        pagesCount = template.pages;
      }
    }

    const anns = safeParseArray(annotationsRaw);
    const coverAnns = safeParseArray(coverAnnotationsRaw);
    photosCount = countPhotoAnnotations(anns) + countPhotoAnnotations(coverAnns);
  } catch {
    // ignore
  }

  return {
    id: projectId,
    title: String(p?.title ?? ''),
    category: String(p?.category ?? ''),
    albumId,
    coverType: (p?.coverType as string) || null,
    pagesCount,
    photosCount,
    remindersCount,
    dateStarted: createdAt,
    isReadyMadeAlbum: !!p?.isReadyMadeAlbum,
    hasPdfTemplate: !!p?.hasPdfTemplate,
    thumbnailPath: p?.thumbnailPath ?? null,
    reminderDate: (p?.reminderDate as string) ?? null,
    date: (p?.date as string) ?? null,
  };
}

/** Все проекты пользователя из AsyncStorage, новые первыми */
export async function loadUserProjects(): Promise<UserProject[]> {
  const savedProjects = await AsyncStorage.getItem('@user_projects');
  if (!savedProjects) return [];

  const parsedProjects = JSON.parse(savedProjects) as unknown[];
  if (!Array.isArray(parsedProjects) || parsedProjects.length === 0) return [];

  const formatted = await Promise.all(
    parsedProjects.map((p) => hydrateProject(p as Record<string, unknown>))
  );

  return formatted.sort(
    (a, b) => new Date(b.dateStarted).getTime() - new Date(a.dateStarted).getTime()
  );
}
