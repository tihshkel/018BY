import AsyncStorage from '@react-native-async-storage/async-storage';

import { deleteUserProjectLocally } from '@/utils/delete-user-project';
import type { UserProject } from '@/utils/userProjects';

/** Старый свободный редактор (edit-project) без PDF-шаблона — больше не поддерживается. */
export function isLegacyFreeformProject(project: Record<string, unknown> | null | undefined): boolean {
  if (!project || typeof project !== 'object') return false;
  const id = String(project.id ?? '').trim();
  if (!id) return false;
  return !project.isReadyMadeAlbum && !project.hasPdfTemplate;
}

function toUserProject(project: Record<string, unknown>): UserProject {
  return {
    id: String(project.id),
    title: String(project.title ?? 'Проект'),
    category: String(project.category ?? ''),
    albumId: typeof project.albumId === 'string' ? project.albumId : null,
    coverType: typeof project.coverType === 'string' ? project.coverType : null,
    pagesCount: typeof project.pagesCount === 'number' ? project.pagesCount : 0,
    photosCount: typeof project.photosCount === 'number' ? project.photosCount : 0,
    remindersCount: 0,
    dateStarted:
      typeof project.createdAt === 'string'
        ? project.createdAt
        : typeof project.dateStarted === 'string'
          ? project.dateStarted
          : new Date().toISOString(),
    isReadyMadeAlbum: false,
    hasPdfTemplate: false,
  };
}

/**
 * Удаляет legacy-проекты из списка и локального хранилища.
 * Предотвращает повторное появление «альбомов без обложки» после синхронизации.
 */
export async function pruneLegacyFreeformProjects(): Promise<number> {
  const raw = await AsyncStorage.getItem('@user_projects');
  if (!raw) return 0;

  let list: Record<string, unknown>[];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return 0;
    list = parsed.filter(
      (entry): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry),
    );
  } catch {
    return 0;
  }

  const legacy = list.filter((project) => isLegacyFreeformProject(project));
  if (legacy.length === 0) return 0;

  for (const project of legacy) {
    await deleteUserProjectLocally(toUserProject(project));
  }

  return legacy.length;
}

export function filterOutLegacyFreeformProjects<T extends { id?: string }>(
  projects: T[],
): T[] {
  return projects.filter(
    (project) => !isLegacyFreeformProject(project as Record<string, unknown>),
  );
}
