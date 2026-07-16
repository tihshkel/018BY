import { Image as ExpoImage } from 'expo-image';
import { Image } from 'react-native';

export type PageSourceSize = {
  width: number;
  height: number;
};

/** Печатный блок дневника 180×240 мм (все PNG `Блок *_180х240_print`). */
export const DIARY_BLOCK_PAGE_SIZE: PageSourceSize = {
  width: 2219,
  height: 2927,
};

const cache = new Map<string, PageSourceSize>();

export function getCachedPageSourceSize(uri: string): PageSourceSize | null {
  return cache.get(uri) ?? null;
}

export function setPageSourceSize(uri: string, size: PageSourceSize): void {
  if (size.width > 0 && size.height > 0) {
    cache.set(uri, size);
  }
}

function probeUriForSize(uri: string): string {
  return uri.includes('?') && !uri.startsWith('http://') && !uri.startsWith('https://')
    ? uri.slice(0, uri.indexOf('?'))
    : uri;
}

function cacheAndReturn(uri: string, probeUri: string, size: PageSourceSize): PageSourceSize {
  setPageSourceSize(uri, size);
  setPageSourceSize(probeUri, size);
  return size;
}

/**
 * Oriented pixel size (EXIF-aware via expo-image when possible).
 * Needed so portrait phone photos get a portrait frame, not a landscape letterbox.
 * Always re-probes when uncached; callers may overwrite via setPageSourceSize after Image onLoad.
 */
export function resolvePageSourceSize(uri: string): Promise<PageSourceSize | null> {
  const cached = cache.get(uri);
  if (cached) return Promise.resolve(cached);

  const probeUri = probeUriForSize(uri);

  return ExpoImage.loadAsync(probeUri)
    .then((ref) => {
      if (ref.width > 0 && ref.height > 0) {
        return cacheAndReturn(uri, probeUri, { width: ref.width, height: ref.height });
      }
      return null;
    })
    .catch(() => null)
    .then((fromExpo) => {
      if (fromExpo) return fromExpo;
      return new Promise<PageSourceSize | null>((resolve) => {
        Image.getSize(
          probeUri,
          (width, height) => {
            resolve(cacheAndReturn(uri, probeUri, { width, height }));
          },
          () => resolve(null),
        );
      });
    });
}

/** Prefetch oriented sizes for user photos so layout fit works in export/annotations. */
export async function prefetchPhotoUrisSourceSizes(
  uris: Iterable<string | null | undefined>,
): Promise<void> {
  const unique = [...new Set([...uris].filter((uri): uri is string => Boolean(uri)))];
  await Promise.all(unique.map((uri) => resolvePageSourceSize(uri)));
}
