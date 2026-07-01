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

const safeParseObject = (raw: string | null): Record<string, unknown> => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

function hasPageValuesContent(raw: string | null): boolean {
  const map = safeParseObject(raw);
  return Object.values(map).some((value) => {
    if (!value || typeof value !== 'object') return false;
    const page = value as {
      fields?: Record<string, string>;
      photoBlocks?: Record<string, { slots?: Array<string | null> }>;
      caption?: string;
      photoCaptions?: Array<string | null>;
      mapMarkers?: unknown[];
      freeElements?: unknown[];
      customFields?: Array<{ value?: string }>;
    };
    if (Object.values(page.fields ?? {}).some((text) => String(text ?? '').trim().length > 0)) {
      return true;
    }
    if (
      Object.values(page.photoBlocks ?? {}).some((block) =>
        (block.slots ?? []).some((uri) => String(uri ?? '').trim().length > 0),
      )
    ) {
      return true;
    }
    if (String(page.caption ?? '').trim().length > 0) return true;
    if ((page.photoCaptions ?? []).some((text) => String(text ?? '').trim().length > 0)) {
      return true;
    }
    if ((page.mapMarkers ?? []).length > 0 || (page.freeElements ?? []).length > 0) {
      return true;
    }
    return (page.customFields ?? []).some((field) => String(field.value ?? '').trim().length > 0);
  });
}

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
  const hasContent = hasPageValuesContent(
    await AsyncStorage.getItem(`@project_page_values_${id}`),
  );
  const introSeen = await hasSeenAlbumIntro(id);
  const pagesCount = typeof project.pagesCount === 'number' ? project.pagesCount : 0;

  return (
    (hasContent ? 20_000 : 0) +
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
