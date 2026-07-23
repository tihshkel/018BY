import { Image } from 'react-native';

import { isRemotePhotoUri, stripPhotoCacheBust } from '@/utils/persistAlbumPhoto';

export type PageSourceSize = {
  width: number;
  height: number;
};

/** Печатный блок дневника 180×240 мм (все PNG `Блок *_180х240_print`). */
export const DIARY_BLOCK_PAGE_SIZE: PageSourceSize = {
  width: 2219,
  height: 2927,
};

/** Блок беременности 60 стр / детские 180×240 мм @ 300 dpi. */
export const PREGNANCY_BLOCK_PAGE_SIZE: PageSourceSize = {
  width: 2126,
  height: 2835,
};

/** Блок «Первые годы малыша» (kids_48) — квадратные PNG @ 300 dpi. */
export const KIDS_48_PAGE_SIZE: PageSourceSize = {
  width: 2528,
  height: 2528,
};

/** «Праздники и события» / дни рождения — те же квадратные PNG 2528×2528. */
export const BIRTHDAY_48_PAGE_SIZE: PageSourceSize = KIDS_48_PAGE_SIZE;

/** Блок беременности A5 @ 300 dpi (фактический размер PNG page_*.png). */
export const PREGNANCY_A5_PAGE_SIZE: PageSourceSize = {
  width: 1796,
  height: 2528,
};

const cache = new Map<string, PageSourceSize>();
const SOURCE_SIZE_CACHE_MAX = 120;

function isNetworkUri(uri: string): boolean {
  return isRemotePhotoUri(uri);
}

/** Локальный путь без `?v=` — иначе Android Image.getSize не находит файл. */
function uriForNativeSizeLookup(uri: string): string {
  if (isNetworkUri(uri)) return uri;
  return stripPhotoCacheBust(uri);
}

/** Известные размеры по пути/имени файла — без сетевого Image.getSize. */
export function inferPageSourceSizeFromUri(uri: string): PageSourceSize | null {
  if (!uri || typeof uri !== 'string') return null;

  const decoded = (() => {
    try {
      return decodeURIComponent(uri).toLowerCase();
    } catch {
      return uri.toLowerCase();
    }
  })();

  if (decoded.includes('бохо_дет') || decoded.includes('фотоальбом_ 48')) {
    return KIDS_48_PAGE_SIZE;
  }
  if (
    decoded.includes('180х240') ||
    decoded.includes('180x240') ||
    decoded.includes('diary_interior')
  ) {
    return DIARY_BLOCK_PAGE_SIZE;
  }
  if (decoded.includes('беременность a5') || decoded.includes('pregnancy_a5')) {
    return PREGNANCY_A5_PAGE_SIZE;
  }
  if (
    decoded.includes('дней рождения') ||
    decoded.includes('holidays_birthday') ||
    decoded.includes('birthday_60')
  ) {
    return BIRTHDAY_48_PAGE_SIZE;
  }
  if (
    decoded.includes('беременность') ||
    decoded.includes('pregnancy_60') ||
    decoded.includes('kids_')
  ) {
    return PREGNANCY_BLOCK_PAGE_SIZE;
  }
  if (/page_\d{1,3}\.png/i.test(uri)) {
    return PREGNANCY_BLOCK_PAGE_SIZE;
  }
  return null;
}

export function getCachedPageSourceSize(uri: string): PageSourceSize | null {
  return cache.get(uri) ?? null;
}

/** Синхронный lookup: кэш или эвристика по пути (без Image.getSize). */
export function resolvePageSourceSizeSync(uri: string): PageSourceSize | null {
  return getCachedPageSourceSize(uri) ?? inferPageSourceSizeFromUri(uri);
}

/** Канонические размеры шаблона по lineGuideId (не зависят от Image.getSize / JPEG). */
export function resolvePageSourceSizeByLineGuide(
  lineGuideId: string | null | undefined,
): PageSourceSize | null {
  if (!lineGuideId) return null;

  switch (lineGuideId) {
    case 'pregnancy_60':
      return PREGNANCY_BLOCK_PAGE_SIZE;
    case 'holidays_birthday_60':
      return BIRTHDAY_48_PAGE_SIZE;
    case 'kids_48':
      return KIDS_48_PAGE_SIZE;
    case 'pregnancy_a5':
      return PREGNANCY_A5_PAGE_SIZE;
    case 'diary_interior_brown':
    case 'diary_interior_purple':
      return DIARY_BLOCK_PAGE_SIZE;
    default:
      return null;
  }
}

export function resolvePageAspectRatio(
  uri: string | null | undefined,
  lineGuideId?: string | null,
): number {
  const byGuide = resolvePageSourceSizeByLineGuide(lineGuideId);
  if (byGuide) return byGuide.height / byGuide.width;

  if (uri) {
    const inferred = resolvePageSourceSizeSync(uri);
    if (inferred && inferred.width > 0) {
      return inferred.height / inferred.width;
    }
  }

  return 1.414;
}

/** Высота viewport по ширине и пропорциям шаблона (фикс Android Image.getSize). */
export function normalizeEditorViewportForLineGuide(
  viewport: { width: number; height: number },
  lineGuideId: string | null | undefined,
): { width: number; height: number } {
  const canonical = resolvePageSourceSizeByLineGuide(lineGuideId);
  if (!canonical || viewport.width <= 0) return viewport;

  return {
    width: viewport.width,
    height: viewport.width * (canonical.height / canonical.width),
  };
}

export function resolveExportSourceDimensions(params: {
  imageUri: string;
  lineGuideId?: string | null;
  embeddedWidth: number;
  embeddedHeight: number;
}): PageSourceSize {
  const { imageUri, lineGuideId, embeddedWidth, embeddedHeight } = params;

  const byGuide = resolvePageSourceSizeByLineGuide(lineGuideId);
  if (byGuide) return byGuide;

  const inferred = resolvePageSourceSizeSync(imageUri);
  if (inferred) return inferred;

  if (embeddedWidth > 0 && embeddedHeight > 0) {
    return { width: embeddedWidth, height: embeddedHeight };
  }

  return PREGNANCY_BLOCK_PAGE_SIZE;
}

/**
 * Размеры PNG для расчёта слотов текста при PDF-экспорте.
 * Совпадает с редактором (PageRenderer onLoad / image-viewer measured), а не с каноническим override.
 */
export function resolveExportTextSlotSourceDimensions(params: {
  lineGuideId?: string | null;
  imageUri: string;
  embeddedWidth: number;
  embeddedHeight: number;
  pagesViewport: { width: number; height: number };
}): PageSourceSize {
  const { lineGuideId, imageUri, embeddedWidth, embeddedHeight, pagesViewport } = params;

  if (lineGuideId?.startsWith('diary_interior_')) {
    return DIARY_BLOCK_PAGE_SIZE;
  }

  if (embeddedWidth > 0 && embeddedHeight > 0) {
    return { width: embeddedWidth, height: embeddedHeight };
  }

  const cached = resolvePageSourceSizeSync(imageUri);
  if (cached) return cached;

  return {
    width: pagesViewport.width,
    height: pagesViewport.height,
  };
}

/** Единый источник размеров страницы для редактора и экспорта (Android Image.getSize часто врёт). */
export function resolveEditorPageSourceSize(params: {
  lineGuideId?: string | null;
  imageUri?: string | null;
  measured?: PageSourceSize | null;
  viewportFallback?: PageSourceSize | null;
}): PageSourceSize {
  const byGuide = resolvePageSourceSizeByLineGuide(params.lineGuideId);
  if (byGuide) return byGuide;

  if (params.imageUri) {
    const inferred = resolvePageSourceSizeSync(params.imageUri);
    if (inferred) return inferred;
  }

  if (params.measured && params.measured.width > 0 && params.measured.height > 0) {
    return params.measured;
  }

  if (
    params.viewportFallback &&
    params.viewportFallback.width > 0 &&
    params.viewportFallback.height > 0
  ) {
    return params.viewportFallback;
  }

  return PREGNANCY_BLOCK_PAGE_SIZE;
}

export async function buildSourceSizesByUri(
  uris: Iterable<string>,
  lineGuideId?: string | null,
): Promise<Map<string, PageSourceSize>> {
  const sizes = new Map<string, PageSourceSize>();
  const canonical = resolvePageSourceSizeByLineGuide(lineGuideId);
  const unique = [...new Set([...uris].filter(Boolean))];

  await Promise.all(
    unique.map(async (uri) => {
      const size =
        canonical ??
        resolvePageSourceSizeSync(uri) ??
        (await resolvePageSourceSize(uri));
      if (size) sizes.set(uri, size);
    }),
  );

  return sizes;
}

export function setPageSourceSize(uri: string, size: PageSourceSize): void {
  if (size.width > 0 && size.height > 0) {
    if (cache.size >= SOURCE_SIZE_CACHE_MAX) {
      cache.clear();
    }
    cache.set(uri, size);
  }
}

function resolveViaImageGetSize(uri: string): Promise<PageSourceSize | null> {
  const lookupUri = uriForNativeSizeLookup(uri);
  return new Promise((resolve) => {
    Image.getSize(
      lookupUri,
      (width, height) => {
        const size = { width, height };
        setPageSourceSize(uri, size);
        if (lookupUri !== uri) setPageSourceSize(lookupUri, size);
        resolve(size);
      },
      () => resolve(null)
    );
  });
}

/**
 * Размеры страницы для contentRect / слотов.
 * Для https:// (GitHub) не качаем картинку через Image.getSize — иначе сыпятся Network request failed.
 */
export function resolvePageSourceSize(uri: string): Promise<PageSourceSize | null> {
  const cached = cache.get(uri) ?? cache.get(uriForNativeSizeLookup(uri));
  if (cached) return Promise.resolve(cached);

  const inferred = inferPageSourceSizeFromUri(uri);
  if (inferred) {
    setPageSourceSize(uri, inferred);
    if (isNetworkUri(uri)) {
      return Promise.resolve(inferred);
    }
    return resolveViaImageGetSize(uri).then((measured) => measured ?? inferred);
  }

  if (isNetworkUri(uri)) {
    return Promise.resolve(null);
  }

  return resolveViaImageGetSize(uri);
}
