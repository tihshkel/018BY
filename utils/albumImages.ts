import { Asset } from 'expo-asset';
import {
  cacheDirectory,
  downloadAsync,
  getInfoAsync,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';
import { usesSquareBlankInterior } from '@/constants/square-blank-interior';
import {
  BIRTHDAY_48_PAGE_COUNT,
  getBirthday48AssetPageNumber,
  isBirthday48Album,
} from '@/utils/birthday48AssetRemap';
import { GITHUB_RAW_MAIN_BASE, githubRawFileUrl } from '@/utils/githubRawAssets';

/**
 * Маппинг изображений страниц альбомов
 * Используется для загрузки всех страниц альбома как изображений
 */

type RemoteAlbumSpec = {
  folderPath: string;
  pageCount: number;
};

const GITHUB_REPO_BASE = GITHUB_RAW_MAIN_BASE;
const REMOTE_ALBUM_CACHE_DIR = `${cacheDirectory}remote_album_pages/`;

const pregnancy60Preview = require('@/assets/app-bundled/pregnancy_60_preview.png');
const pregnancyA5Preview = require('@/assets/app-bundled/pregnancy_a5_preview.png');

export {
  getDefaultVariantIdForPage,
  getVariantPreviewManifest,
  getVariantPreviewThumbnails,
  hasVariantPreviewManifest,
  resolveVariantPreviewBackgroundUri,
} from '@/utils/variantPreview';
export type { VariantPreviewThumbnail } from '@/utils/variantPreview';
export {
  getDesignPreviewManifest,
  hasDesignPreviewManifest,
  resolveDesignPreviewUri,
} from '@/utils/designPreview';

function getRemoteAlbumSpec(albumId: string): RemoteAlbumSpec | null {
  switch (albumId) {
    case 'pregnancy_60':
      return { folderPath: 'assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр', pageCount: 60 };
    case 'pregnancy_a5':
      return { folderPath: 'assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок', pageCount: 48 };
    case 'kids_48':
      return { folderPath: 'assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр', pageCount: 48 };
    case 'holidays_birthday_60':
      return {
        folderPath: 'assets/pdfs/Блок ДНЕЙ РОЖДЕНИЯ 60 стр',
        pageCount: BIRTHDAY_48_PAGE_COUNT,
      };
    default: {
      // Для всех детских альбомов используем kids_48
      if (albumId.startsWith('dfa_') || albumId.startsWith('kids_')) {
        return { folderPath: 'assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр', pageCount: 48 };
      }
      return null;
    }
  }
}

function pageFileName(pageNumber: number): string {
  return `page_${String(pageNumber).padStart(3, '0')}.png`;
}

function resolveRemotePageFileName(albumId: string, logicalPage: number): string {
  const assetPage = isBirthday48Album(albumId)
    ? getBirthday48AssetPageNumber(logicalPage)
    : logicalPage;
  return pageFileName(assetPage);
}

async function loadRemoteAlbumPageUri(
  albumId: string,
  folderPath: string,
  logicalPage: number,
  preferCache: boolean
): Promise<string> {
  const fileName = resolveRemotePageFileName(albumId, logicalPage);
  if (preferCache) {
    const localPath = remotePageCachePath(folderPath, fileName);
    const info = await getInfoAsync(localPath);
    if (info.exists) {
      return normalizeFileUri(localPath);
    }
    return remotePageUrl(folderPath, fileName);
  }
  const uri = await downloadRemotePageToCache(folderPath, fileName);
  if (uri) return uri;
  return remotePageUrl(folderPath, fileName);
}

function toHex(n: number): string {
  return (n >>> 0).toString(16).padStart(8, '0');
}

// Короткий стабильный ключ для путей с пробелами/кириллицей (iOS FS + file:// URI).
function stablePathKey(input: string): string {
  // djb2
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return toHex(hash);
}

function normalizeFileUri(uri: string): string {
  if (!uri) return uri;
  // Иногда iOS отдаёт абсолютные пути без схемы.
  if (uri.startsWith('/')) return `file://${uri}`;
  return uri;
}

function remotePageCachePath(folderPath: string, fileName: string): string {
  // В пути не держим исходный folderPath (кириллица/пробелы) — используем короткий ключ.
  const key = stablePathKey(folderPath);
  return `${REMOTE_ALBUM_CACHE_DIR}${key}__${fileName}`;
}

function remotePageUrl(folderPath: string, fileName: string): string {
  return `${GITHUB_REPO_BASE}/${encodeURI(`${folderPath}/${fileName}`)}`;
}

async function ensureRemoteAlbumCacheDir(): Promise<void> {
  const dirInfo = await getInfoAsync(REMOTE_ALBUM_CACHE_DIR);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(REMOTE_ALBUM_CACHE_DIR, { intermediates: true });
  }
}

async function downloadRemotePageToCache(folderPath: string, fileName: string): Promise<string | null> {
  try {
    await ensureRemoteAlbumCacheDir();
    const localPath = remotePageCachePath(folderPath, fileName);

    const info = await getInfoAsync(localPath);
    if (info.exists) return normalizeFileUri(localPath);

    const url = remotePageUrl(folderPath, fileName);
    const res = await downloadAsync(url, localPath);
    return normalizeFileUri(res.uri);
  } catch (error) {
    console.warn('[albumImages] Не удалось скачать страницу', folderPath, fileName, error);
    return null;
  }
}

async function downloadRemotePageToCacheWithRetry(
  folderPath: string,
  fileName: string,
  maxAttempts = 3
): Promise<string | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const uri = await downloadRemotePageToCache(folderPath, fileName);
    if (uri) return uri;
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  return null;
}

async function warmRemoteAlbumCache(
  albumId: string,
  folderPath: string,
  pageCount: number
): Promise<void> {
  const maxParallel = 4;
  let idx = 1;

  const worker = async () => {
    while (true) {
      const current = idx;
      idx += 1;
      if (current > pageCount) return;
      const fileName = resolveRemotePageFileName(albumId, current);
      await downloadRemotePageToCache(folderPath, fileName);
    }
  };

  await Promise.all(Array.from({ length: maxParallel }, () => worker()));
}

/**
 * Быстрый список страниц для просмотра: полноразмерные page_XXX.png.
 * Локальный кэш (file://) предпочтительнее GitHub; прогрев в фоне.
 */
export async function getAlbumImageUrisForViewing(albumId: string): Promise<string[]> {
  const spec = getRemoteAlbumSpec(albumId);
  if (!spec) {
    return getAlbumImageUris(albumId);
  }

  const uris = await Promise.all(
    Array.from({ length: spec.pageCount }, async (_, index) => {
      const page = index + 1;
      return loadRemoteAlbumPageUri(albumId, spec.folderPath, page, true);
    }),
  );

  warmRemoteAlbumCache(albumId, spec.folderPath, spec.pageCount).catch(() => {});

  return uris;
}

/**
 * Получает массив URI изображений для альбома
 * Конвертирует require() модули в URI через Asset API
 */
/**
 * Перед экспортом PDF: выбранные страницы должны быть локальными file:// (не https из редактора).
 * Кэширует только переданный список URI (учитывает фильтр страниц на export-review).
 */
export async function ensurePageUrisCachedForExport(
  uris: string[],
  onProgress?: (done: number, total: number) => void
): Promise<string[]> {
  if (uris.length === 0) return [];

  await ensureRemoteAlbumCacheDir();
  const cached: string[] = [];

  for (let i = 0; i < uris.length; i += 1) {
    const sourceUri = uris[i];
    let localUri = await ensureSinglePageUriCachedForExport(sourceUri);
    if (!localUri && sourceUri.startsWith('http')) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      localUri = await ensureSinglePageUriCachedForExport(sourceUri);
    }
    if (!localUri) {
      console.warn(
        `[albumImages] Страница ${i + 1}/${uris.length} не закеширована локально, экспорт попробует загрузить по URL`
      );
      cached.push(sourceUri);
    } else {
      cached.push(localUri);
    }
    onProgress?.(i + 1, uris.length);
  }

  return cached.filter((uri): uri is string => Boolean(uri));
}

function parseRemoteAlbumPageUri(uri: string): { folderPath: string; fileName: string } | null {
  if (!uri.startsWith('http')) return null;

  const decoded = decodeURIComponent(uri);
  const fileNameMatch = decoded.match(/(page_\d+\.png)$/i);
  if (!fileNameMatch) return null;

  const fileName = fileNameMatch[1];
  const assetsIdx = decoded.indexOf('assets/pdfs/');
  if (assetsIdx === -1) return null;

  const folderPath = decoded.slice(assetsIdx, decoded.lastIndexOf('/'));
  return { folderPath, fileName };
}

export async function ensureSinglePageUriCachedForExport(uri: string): Promise<string | null> {
  if (!uri) return null;

  const normalized = normalizeFileUri(uri);
  if (normalized.startsWith('file://') || normalized.startsWith('/')) {
    const info = await getInfoAsync(normalized);
    return info.exists ? normalized : null;
  }

  if (uri.startsWith('http')) {
    const parsed = parseRemoteAlbumPageUri(uri);
    if (parsed) {
      return downloadRemotePageToCacheWithRetry(parsed.folderPath, parsed.fileName);
    }

    try {
      const ext = uri.toLowerCase().includes('.png') ? 'png' : 'jpg';
      const dest = `${REMOTE_ALBUM_CACHE_DIR}export_${stablePathKey(uri)}.${ext}`;
      const info = await getInfoAsync(dest);
      if (info.exists) return normalizeFileUri(dest);
      const res = await downloadAsync(uri, dest);
      return normalizeFileUri(res.uri);
    } catch (error) {
      console.warn('[albumImages] Не удалось скачать URI для экспорта', uri, error);
      return null;
    }
  }

  return null;
}

/** Скачивает одну страницу альбома по номеру (1-based) — запасной путь при экспорте PDF. */
export async function ensureRemoteAlbumPageCachedByIndex(
  albumId: string,
  category: string | null | undefined,
  pageNumber: number
): Promise<string | null> {
  if (pageNumber < 1) return null;
  const interiorId = resolveInteriorAlbumId(albumId, category);
  const spec = getRemoteAlbumSpec(interiorId);
  if (!spec || pageNumber > spec.pageCount) return null;
  const fileName = resolveRemotePageFileName(interiorId, pageNumber);
  return downloadRemotePageToCacheWithRetry(spec.folderPath, fileName);
}

/**
 * Перед экспортом PDF: все страницы альбома должны быть локальными file:// (не https из редактора).
 * Скачивает недостающие страницы в кэш и возвращает URI в порядке страниц.
 */
export async function ensureAlbumPagesCachedForExport(
  albumId: string,
  category?: string | null,
  onProgress?: (done: number, total: number) => void
): Promise<string[]> {
  const interiorId = resolveInteriorAlbumId(albumId, category);
  const spec = getRemoteAlbumSpec(interiorId);
  if (!spec) {
    const uris = await getAlbumImageUris(interiorId);
    if (uris.length > 0) {
      onProgress?.(uris.length, uris.length);
    }
    return uris;
  }

  await ensureRemoteAlbumCacheDir();
  const uris: string[] = [];
  for (let page = 1; page <= spec.pageCount; page += 1) {
    const fileName = resolveRemotePageFileName(interiorId, page);
    const uri = await downloadRemotePageToCacheWithRetry(spec.folderPath, fileName);
    if (!uri) {
      throw new Error(
        `Не удалось загрузить страницу ${page} из ${spec.pageCount}. Проверьте интернет и попробуйте снова.`
      );
    }
    uris.push(uri);
    onProgress?.(page, spec.pageCount);
  }

  if (uris.length !== spec.pageCount) {
    throw new Error(
      `Загружено только ${uris.length} из ${spec.pageCount} страниц. Проверьте интернет и попробуйте снова.`
    );
  }

  return uris
    .slice()
    .sort((a, b) => {
      const aNum = Number((a.match(/page_(\d+)\.png/) || [])[1] || 0);
      const bNum = Number((b.match(/page_(\d+)\.png/) || [])[1] || 0);
      return aNum - bNum;
    });
}

export async function getAlbumImageUris(albumId: string): Promise<string[]> {
  const spec = getRemoteAlbumSpec(albumId);
  if (spec) {
    const maxParallel = 6;
    const results: string[] = [];
    let idx = 1;

    const worker = async () => {
      while (true) {
        const current = idx;
        idx += 1;
        if (current > spec.pageCount) return;

        const uri = await loadRemoteAlbumPageUri(albumId, spec.folderPath, current, false);
        if (uri) results.push(uri);
      }
    };

    await Promise.all(Array.from({ length: maxParallel }, () => worker()));
    // Делаем порядок стабильным по номеру страницы (не по полному пути)
    return results
      .slice()
      .sort((a, b) => {
        const aNum = Number((a.match(/page_(\d+)\.png/) || [])[1] || 0);
        const bNum = Number((b.match(/page_(\d+)\.png/) || [])[1] || 0);
        return aNum - bNum;
      });
  }

  const images = getAlbumImages(albumId);

  if (images.length === 0) {
    console.warn(`Изображения не найдены для альбома: ${albumId}`);
    return [];
  }

  const uris: string[] = [];

  try {
    const assetPromises = images.map(async (image) => {
      try {
        const asset = Asset.fromModule(image);
        const immediateUri = asset.localUri || asset.uri;
        asset.downloadAsync().catch(() => {});
        return immediateUri;
      } catch (error) {
        console.warn('Ошибка загрузки изображения:', error);
        return null;
      }
    });

    const res = await Promise.all(assetPromises);
    uris.push(...res.filter((uri): uri is string => uri !== null));
  } catch (error) {
    console.error('Ошибка при загрузке изображений альбома:', error);
  }

  return uris;
}

// Пустой лист 180×240 мм @ 300 dpi — тот же формат, что у печатных блоков и экспорта PDF.
const blankWhitePage = require('@/assets/images/albums/blank_interior_page.png');
const blankSquarePage = require('@/assets/images/albums/blank_interior_square_page.png');

/** 180×240 мм @ 300 dpi (совпадает с albums/.../180х240_print и export 510×680 pt) */
export const BLANK_INTERIOR_PAGE_WIDTH = 2126;
export const BLANK_INTERIOR_PAGE_HEIGHT = 2835;

/** 210×210 мм @ 300 dpi */
export const BLANK_SQUARE_PAGE_WIDTH = 2480;
export const BLANK_SQUARE_PAGE_HEIGHT = 2480;

/** Aspect ratio for blank interior preview/export (portrait 18×24 or square 21×21). */
export function getBlankInteriorPageAspect(lineGuideId?: string | null): number {
  if (lineGuideId === 'family_blank_21x21') {
    return BLANK_SQUARE_PAGE_WIDTH / BLANK_SQUARE_PAGE_HEIGHT;
  }
  return BLANK_INTERIOR_PAGE_WIDTH / BLANK_INTERIOR_PAGE_HEIGHT;
}

export function isSquareBlankLineGuide(lineGuideId?: string | null): boolean {
  return lineGuideId === 'family_blank_21x21';
}

/** Меняем при замене blank_interior_page.png, чтобы сбросить кеш expo-image */
export const BLANK_INTERIOR_CACHE_REVISION = 'white-v3-2126x2835';
const HOLIDAY_BLANK_PAGE_COUNT = 20;
const FAMILY_BLANK_PAGE_COUNT = 20;
const FAMILY_BLANK_21_PAGE_COUNT = 20;

function blankPageArray(count: number, square = false): typeof blankWhitePage[] {
  const page = square ? blankSquarePage : blankWhitePage;
  return Array(count).fill(page);
}

/** ID обложки семейного альбома (SDFA1–7), не внутренняя часть */
export function isFamilyCoverAlbumId(albumId: string | null | undefined): boolean {
  return !!albumId && albumId.startsWith('family_sdfa');
}

export function isWeddingCoverAlbumId(albumId: string | null | undefined): boolean {
  return !!albumId && (albumId.startsWith('wedding_sva') || albumId.startsWith('wedding_sa'));
}

/** Альбомы с одним пустым листом для добавления страниц (семья, праздники blank) */
export function isBlankInteriorAlbum(
  albumId: string | null | undefined,
  category?: string | null
): boolean {
  const interiorId = resolveInteriorAlbumId(albumId ?? '', category);
  return (
    interiorId === 'family_blank' ||
    interiorId === 'holidays_blank' ||
    interiorId === 'family_blank_21x21'
  );
}

/** Один URI белого листа — для выбора при добавлении страницы */
export async function getBlankInteriorPageUri(
  lineGuideId?: string | null,
): Promise<string | null> {
  try {
    const square = lineGuideId === 'family_blank_21x21';
    const asset = Asset.fromModule(square ? blankSquarePage : blankWhitePage);
    await asset.downloadAsync();
    return asset.localUri || asset.uri || null;
  } catch {
    return null;
  }
}

/**
 * ID альбома для загрузки внутренних страниц (пустые листы для семьи/праздников и т.д.)
 */
export function resolveInteriorAlbumId(
  albumId: string | null | undefined,
  category?: string | null
): string {
  if (albumId === 'family_blank_21x21') return 'family_blank_21x21';
  if (albumId === 'family_blank') return 'family_blank';

  if (category === 'pregnancy') {
    if (albumId === 'pregnancy_a5') return 'pregnancy_a5';
    return 'pregnancy_60';
  }

  if (category === 'family') {
    if (usesSquareBlankInterior(albumId)) return 'family_blank_21x21';
    return 'family_blank';
  }
  if (category === 'wedding') {
    if (usesSquareBlankInterior(albumId)) return 'family_blank_21x21';
    return 'family_blank';
  }
  if (category === 'kids') return 'kids_48';

  if (!albumId) {
    if (category === 'holidays') return 'holidays_blank';
    return '';
  }

  if (usesSquareBlankInterior(albumId)) {
    return 'family_blank_21x21';
  }
  if (isFamilyCoverAlbumId(albumId)) return 'family_blank';
  if (isWeddingCoverAlbumId(albumId)) return 'family_blank';
  if (albumId.startsWith('dfa_') || albumId.startsWith('kids_')) return 'kids_48';
  if (albumId.startsWith('holiday_')) {
    if (albumId === 'holiday_dfa34' || albumId === 'holiday_dfa35') return 'holidays_birthday_60';
    return 'holidays_blank';
  }

  return albumId;
}

/** Канонические ID сетки строк (LINE_SLOTS / LINE_GUIDES). */
export const TEMPLATE_LINE_GUIDE_IDS = new Set([
  'pregnancy_60',
  'pregnancy_a5',
  'kids_48',
  'holidays_birthday_60',
  'diary_interior_brown',
  'diary_interior_purple',
]);

function isPregnancyA5LineGuide(albumId: string): boolean {
  return albumId === 'pregnancy_a5' || albumId.includes('a5');
}

/**
 * ID макета строк для редактора и экспорта (может отличаться от interior id обложки).
 * Беременность / дети / ДР / дневники → ввод по строкам; семья, свадьба, праздники blank и т.д. → free-form.
 */
export function resolveLineGuideId(
  albumId: string | null | undefined,
  category?: string | null
): string {
  const interior = resolveInteriorAlbumId(albumId, category);

  if (interior.startsWith('diary_interior_')) {
    return interior;
  }
  if (
    interior === 'kids_48' ||
    albumId?.startsWith('dfa_') ||
    albumId?.startsWith('kids_') ||
    category === 'kids'
  ) {
    return 'kids_48';
  }
  if (interior === 'holidays_birthday_60') {
    return 'holidays_birthday_60';
  }
  if (interior.startsWith('pregnancy_') || category === 'pregnancy') {
    return isPregnancyA5LineGuide(interior) ? 'pregnancy_a5' : 'pregnancy_60';
  }
  if (category === 'diary') {
    return interior.startsWith('diary_interior_') ? interior : 'diary_interior_brown';
  }

  return interior;
}

export function usesTemplateLineTextEditing(
  lineGuideId?: string | null,
  category?: string | null
): boolean {
  const resolved = resolveLineGuideId(lineGuideId ?? '', category);
  return TEMPLATE_LINE_GUIDE_IDS.has(resolved);
}

/**
 * Получает массив изображений для альбома (require модули)
 */
export function getAlbumImages(albumId: string): any[] {
  const interiorId = resolveInteriorAlbumId(albumId);

  switch (interiorId) {
    case 'pregnancy_60':
      return [pregnancy60Preview];
    case 'pregnancy_a5':
      return [pregnancyA5Preview];
    case 'kids_48':
      return blankPageArray(48, true);
    case 'holidays_blank':
      return blankPageArray(HOLIDAY_BLANK_PAGE_COUNT);
    case 'holidays_birthday_60':
      return blankPageArray(48, true);
    case 'family_blank':
      return blankPageArray(FAMILY_BLANK_PAGE_COUNT);
    case 'family_blank_21x21':
      return blankPageArray(FAMILY_BLANK_21_PAGE_COUNT, true);
    default:
      return [];
  }
}

/**
 * Получает количество страниц для альбома
 */
export function getAlbumPageCount(albumId: string): number {
  const interiorId = resolveInteriorAlbumId(albumId);

  switch (interiorId) {
    case 'pregnancy_60':
      return 60;
    case 'pregnancy_a5':
      return 48;
    case 'kids_48':
      return 48;
    case 'holidays_blank':
      return HOLIDAY_BLANK_PAGE_COUNT;
    case 'holidays_birthday_60':
      return 48;
    case 'family_blank':
      return FAMILY_BLANK_PAGE_COUNT;
    case 'family_blank_21x21':
      return FAMILY_BLANK_21_PAGE_COUNT;
    default:
      return 0;
  }
}

