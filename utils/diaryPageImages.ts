import { Image as RNImage, type ImageSourcePropType } from 'react-native';

import { DIARY_BROWN_PAGES, DIARY_PURPLE_PAGES } from '@/utils/diaryInteriorAssets.generated';
import { resolveImageSourceUri } from '@/utils/imageSourceUri';

const DIARY_PAGES: Record<string, readonly ImageSourcePropType[]> = {
  diary_interior_brown: DIARY_BROWN_PAGES,
  diary_interior_purple: DIARY_PURPLE_PAGES,
};

export function isDiaryInteriorAlbumId(albumId?: string | null): boolean {
  return albumId === 'diary_interior_brown' || albumId === 'diary_interior_purple';
}

export function getDiaryInteriorPageCount(albumId: string): number {
  return DIARY_PAGES[albumId]?.length ?? 0;
}

export function getDiaryInteriorPageSource(
  albumId: string | null | undefined,
  sourcePageNumber: number | null | undefined,
): ImageSourcePropType | null {
  if (!albumId || !sourcePageNumber || sourcePageNumber < 1) return null;
  const pages = DIARY_PAGES[albumId];
  if (!pages) return null;
  return pages[sourcePageNumber - 1] ?? null;
}

/**
 * Metro иногда отдаёт file:// с пробелами без encoding — expo-image тогда молчит.
 */
function normalizeBundledAssetUri(uri: string | null | undefined): string | null {
  if (!uri) return null;
  try {
    if (uri.startsWith('file://') || uri.includes(' ') || /[^\x00-\x7F]/.test(uri)) {
      return encodeURI(decodeURI(uri));
    }
  } catch {
    try {
      return encodeURI(uri);
    } catch {
      return uri;
    }
  }
  return uri;
}

/**
 * Синхронный URI из Metro-бандла (список / превью).
 * Не зависит от @project_images_* — дневник всегда берёт макет по sourcePageNumber.
 */
export function resolveDiaryInteriorPageUriSync(
  albumId: string | null | undefined,
  sourcePageNumber: number | null | undefined,
): string | null {
  const source = getDiaryInteriorPageSource(albumId, sourcePageNumber);
  if (typeof source !== 'number') return null;
  try {
    return normalizeBundledAssetUri(RNImage.resolveAssetSource(source)?.uri);
  } catch {
    return null;
  }
}

/** Мгновенный полный список URI (без downloadAsync) — для «Загружаем альбом…». */
export function resolveAllDiaryInteriorPageUrisSync(albumId: string): string[] {
  const pages = DIARY_PAGES[albumId];
  if (!pages?.length) return [];
  const uris: string[] = new Array(pages.length);
  for (let i = 0; i < pages.length; i += 1) {
    uris[i] = resolveDiaryInteriorPageUriSync(albumId, i + 1) ?? '';
  }
  // Только полный комплект — иначе сдвинутся номера страниц.
  if (uris.every(Boolean)) return uris;
  return [];
}

/** Полный список URI с прогревом Asset (фон / экспорт). */
export async function resolveAllDiaryInteriorPageUris(
  albumId: string,
): Promise<string[]> {
  const pages = DIARY_PAGES[albumId];
  if (!pages?.length) return [];

  // Сначала sync — чтобы UI не ждал 40–60 downloadAsync.
  const sync = resolveAllDiaryInteriorPageUrisSync(albumId);
  if (sync.length === pages.length) {
    // Прогрев первых страниц в фоне.
    void (async () => {
      const warm = Math.min(6, pages.length);
      for (let i = 0; i < warm; i += 1) {
        try {
          await resolveImageSourceUri(pages[i]);
        } catch {
          // ignore
        }
      }
    })();
    return sync;
  }

  const maxParallel = 6;
  const uris: string[] = new Array(pages.length).fill('');
  let index = 0;

  const worker = async () => {
    while (index < pages.length) {
      const current = index;
      index += 1;
      const uri = await resolveImageSourceUri(pages[current]);
      uris[current] =
        uri ?? resolveDiaryInteriorPageUriSync(albumId, current + 1) ?? '';
    }
  };

  await Promise.all(Array.from({ length: maxParallel }, () => worker()));
  return uris.every(Boolean) ? uris : uris.filter(Boolean);
}
