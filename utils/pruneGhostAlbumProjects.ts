import AsyncStorage from '@react-native-async-storage/async-storage';

import { hasSeenAlbumIntro } from '@/utils/albumIntro';
import { deleteUserProjectLocally } from '@/utils/delete-user-project';
import type { UserProject } from '@/utils/userProjects';

const safeParseArray = (raw: string | null): unknown[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

function projectFingerprint(project: Record<string, unknown>): string {
  return [
    String(project.category ?? ''),
    String(project.coverType ?? ''),
    String(project.interiorType ?? project.albumId ?? ''),
  ].join('|');
}

async function scoreProject(project: Record<string, unknown>): Promise<number> {
  const id = String(project.id ?? '');
  if (!id) return -1;

  const images = safeParseArray(await AsyncStorage.getItem(`@project_images_${id}`));
  const introSeen = await hasSeenAlbumIntro(id);
  const pagesCount = typeof project.pagesCount === 'number' ? project.pagesCount : 0;

  return (
    (images.length > 0 ? 10_000 : 0) +
    (introSeen ? 5_000 : 0) +
    Math.max(images.length, pagesCount)
  );
}

/**
 * Removes duplicate empty album shells created by repeated project initialization.
 * Keeps the richest project per cover/interior fingerprint.
 */
export async function pruneGhostAlbumProjects(): Promise<number> {
  const raw = await AsyncStorage.getItem('@user_projects');
  if (!raw) return 0;

  let list: Record<string, unknown>[];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return 0;
    list = parsed as Record<string, unknown>[];
  } catch {
    return 0;
  }

  const groups = new Map<string, Record<string, unknown>[]>();
  for (const project of list) {
    if (!project?.isReadyMadeAlbum && !project?.hasPdfTemplate) continue;
    const fp = projectFingerprint(project);
    const bucket = groups.get(fp) ?? [];
    bucket.push(project);
    groups.set(fp, bucket);
  }

  let removed = 0;

  for (const group of groups.values()) {
    if (group.length <= 1) continue;

    const ranked = await Promise.all(
      group.map(async (project) => ({
        project,
        score: await scoreProject(project),
      })),
    );
    ranked.sort((a, b) => b.score - a.score);

    for (let index = 1; index < ranked.length; index += 1) {
      const entry = ranked[index];
      if (entry.score >= 5_000) continue;

      await deleteUserProjectLocally({
        id: String(entry.project.id),
        title: String(entry.project.title ?? ''),
        category: String(entry.project.category ?? ''),
        pagesCount: 0,
        photosCount: 0,
        remindersCount: 0,
        dateStarted: String(entry.project.createdAt ?? new Date().toISOString()),
      } satisfies UserProject);
      removed += 1;
    }
  }

  return removed;
}
