import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

/**
 * Маппинг изображений страниц альбомов
 * Используется для загрузки всех страниц альбома как изображений
 */

type RemoteAlbumSpec = {
  folderPath: string;
  pageCount: number;
};

const GITHUB_REPO_BASE = 'https://raw.githubusercontent.com/tihshkel/018BY/main';
const REMOTE_ALBUM_CACHE_DIR = `${FileSystem.cacheDirectory}remote_album_pages/`;

const pregnancy60Preview = require('@/assets/pdfs/preview/pregnancy_60_preview.png');
const pregnancyA5Preview = require('@/assets/pdfs/preview/pregnancy_a5_preview.png');

function getRemoteAlbumSpec(albumId: string): RemoteAlbumSpec | null {
  switch (albumId) {
    case 'pregnancy_60':
      return { folderPath: 'assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр', pageCount: 60 };
    case 'pregnancy_a5':
      return { folderPath: 'assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок', pageCount: 48 };
    case 'kids_48':
      return { folderPath: 'assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр', pageCount: 48 };
    case 'holidays_birthday_60':
      return { folderPath: 'assets/pdfs/Блок ДНЕЙ РОЖДЕНИЯ 60 стр', pageCount: 60 };
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

async function ensureRemoteAlbumCacheDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(REMOTE_ALBUM_CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(REMOTE_ALBUM_CACHE_DIR, { intermediates: true });
  }
}

async function downloadRemotePageToCache(folderPath: string, fileName: string): Promise<string | null> {
  try {
    await ensureRemoteAlbumCacheDir();
    const safeFolder = encodeURIComponent(folderPath);
    const localPath = `${REMOTE_ALBUM_CACHE_DIR}${safeFolder}__${fileName}`;

    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists) return localPath;

    const url = `${GITHUB_REPO_BASE}/${encodeURI(`${folderPath}/${fileName}`)}`;
    const res = await FileSystem.downloadAsync(url, localPath);
    return res.uri;
  } catch (error) {
    console.warn('[albumImages] Не удалось скачать страницу', folderPath, fileName, error);
    return null;
  }
}

/**
 * Получает массив URI изображений для альбома
 * Конвертирует require() модули в URI через Asset API
 */
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

        const fileName = pageFileName(current);
        const uri = await downloadRemotePageToCache(spec.folderPath, fileName);
        if (uri) results.push(uri);
      }
    };

    await Promise.all(Array.from({ length: maxParallel }, () => worker()));
    // Делаем порядок стабильным
    return results.sort();
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
        await asset.downloadAsync();
        return asset.localUri || asset.uri;
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

// Пустая белая страница для раздела «Праздники и события»
const blankWhitePage = require('@/assets/images/albums/blank_white.png');
const HOLIDAY_BLANK_PAGE_COUNT = 20;
const FAMILY_BLANK_PAGE_COUNT = 20;

/**
 * Получает массив изображений для альбома (require модули)
 */
export function getAlbumImages(albumId: string): any[] {
  switch (albumId) {
    case 'pregnancy_60':
      return [pregnancy60Preview];
    case 'pregnancy_a5':
      return [pregnancyA5Preview];
    case 'kids_48':
      return [blankWhitePage];
    case 'holidays_blank':
      return Array(HOLIDAY_BLANK_PAGE_COUNT).fill(blankWhitePage);
    case 'holidays_birthday_60':
      return [blankWhitePage];
    case 'family_blank':
      return Array(FAMILY_BLANK_PAGE_COUNT).fill(blankWhitePage);
    default:
      // Для всех детских альбомов используем kids_48
      if (albumId.startsWith('dfa_') || albumId.startsWith('kids_')) {
        return [blankWhitePage];
      }
      if (albumId.startsWith('holiday_')) {
        return Array(HOLIDAY_BLANK_PAGE_COUNT).fill(blankWhitePage);
      }
      if (albumId.startsWith('family_')) {
        return Array(FAMILY_BLANK_PAGE_COUNT).fill(blankWhitePage);
      }
      return [];
  }
}

/**
 * Получает количество страниц для альбома
 */
export function getAlbumPageCount(albumId: string): number {
  switch (albumId) {
    case 'pregnancy_60':
      return 60;
    case 'pregnancy_a5':
      return 48;
    case 'kids_48':
      return 48;
    case 'holidays_blank':
      return HOLIDAY_BLANK_PAGE_COUNT;
    case 'holidays_birthday_60':
      return 60;
    case 'family_blank':
      return FAMILY_BLANK_PAGE_COUNT;
    default:
      // Для всех детских альбомов используем 48 страниц
      if (albumId.startsWith('dfa_') || albumId.startsWith('kids_')) {
        return 48;
      }
      if (albumId.startsWith('holiday_')) {
        return HOLIDAY_BLANK_PAGE_COUNT;
      }
      if (albumId.startsWith('family_')) {
        return FAMILY_BLANK_PAGE_COUNT;
      }
      return 0;
  }
}

