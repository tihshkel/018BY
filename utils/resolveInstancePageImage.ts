import type { PageInstance } from '@/types/album-page-schema';
import {
  isDiaryInteriorAlbumId,
  resolveDiaryInteriorPageUriSync,
} from '@/utils/diaryPageImages';

/** Номер PDF-страницы из URI вида …/page_009.png */
export function parseAlbumPageNumberFromUri(uri: string): number | null {
  if (!uri) return null;
  const match = decodeURIComponent(uri).match(/page_(\d+)\.png/i);
  if (!match?.[1]) return null;
  const page = Number.parseInt(match[1], 10);
  return Number.isFinite(page) && page > 0 ? page : null;
}

/**
 * Фон страницы привязан к шаблону (sourcePageNumber), а не к позиции в альбоме.
 * После «+ Добавить страницу» imageIndex смещается, но PDF-шаблон остаётся прежним.
 *
 * Для личных дневников макет всегда из бандла (require PNG) — не из @project_images,
 * иначе после урезания массива URI страницы 12+ остаются серыми.
 */
export function resolveInstancePageImageUri(
  images: string[],
  instance: PageInstance,
  lineGuideId?: string | null,
): string | undefined {
  if (!instance.addedByUser && isDiaryInteriorAlbumId(lineGuideId)) {
    const bundled = resolveDiaryInteriorPageUriSync(
      lineGuideId,
      instance.sourcePageNumber,
    );
    if (bundled) return bundled;
  }

  if (instance.addedByUser) {
    return images[instance.imageIndex] ?? undefined;
  }

  const sourceIndex = instance.sourcePageNumber - 1;
  if (sourceIndex >= 0 && sourceIndex < images.length) {
    const bySource = images[sourceIndex];
    if (bySource) return bySource;
  }

  const atIndex = images[instance.imageIndex];
  if (atIndex) return atIndex;

  return undefined;
}

/**
 * Фон для экспорта: шаблонные страницы — по sourcePageNumber в каталоге альбома,
 * пользовательские копии — по imageIndex в проекте.
 */
export function resolveExportPageImageUri(
  projectImages: readonly string[],
  instance: PageInstance,
  templatePageUris?: readonly string[],
  lineGuideId?: string | null,
): string | undefined {
  if (!instance.addedByUser && isDiaryInteriorAlbumId(lineGuideId)) {
    const bundled = resolveDiaryInteriorPageUriSync(
      lineGuideId,
      instance.sourcePageNumber,
    );
    if (bundled) return bundled;
  }

  if (instance.addedByUser) {
    return projectImages[instance.imageIndex] ?? undefined;
  }

  const templateIndex = instance.sourcePageNumber - 1;
  if (
    templatePageUris &&
    templateIndex >= 0 &&
    templateIndex < templatePageUris.length
  ) {
    const bySource = templatePageUris[templateIndex];
    if (bySource) return bySource;
  }

  return resolveInstancePageImageUri([...projectImages], instance, lineGuideId);
}
