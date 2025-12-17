import { getAlbumTemplateById } from '@/albums';
import type { ImageSourcePropType } from 'react-native';

/**
 * Маппинг обложек для беременности
 * Ключ - ID альбома, значение - путь к обложке
 */
const PREGNANCY_COVER_MAPPING: Record<string, ImageSourcePropType> = {
  'pregnancy_60': require('../assets/images/albums/DB1_0.png'),
  'pregnancy_a5': require('../assets/images/albums/DB1_п.png'),
  'pregnancy_db2': require('../assets/images/albums/DB2_0.png'),
  'pregnancy_db2_soft': require('../assets/images/albums/DB2_п.png'),
  'pregnancy_db3': require('../assets/images/albums/DB3_0.png'),
  'pregnancy_db3_soft': require('../assets/images/albums/DB3_п.png'),
  'pregnancy_db4': require('../assets/images/albums/DB4_0.png'),
  'pregnancy_db4_soft': require('../assets/images/albums/DB4_п.png'),
  'pregnancy_db5': require('../assets/images/albums/DB5_0.png'),
  'pregnancy_db5_soft': require('../assets/images/albums/DB5_п.png'),
};

/**
 * Получает обложку для альбома беременности по ID альбома
 * @param albumId - ID альбома
 * @returns Путь к обложке или null, если не найдено
 */
export function getPregnancyCover(albumId: string | null): ImageSourcePropType | null {
  if (!albumId) return null;
  
  // Прямой поиск в маппинге
  if (PREGNANCY_COVER_MAPPING[albumId]) {
    return PREGNANCY_COVER_MAPPING[albumId];
  }
  
  // Если не найдено напрямую, пытаемся получить через шаблон альбома
  try {
    const albumTemplate = getAlbumTemplateById(albumId);
    if (albumTemplate && albumTemplate.category === 'pregnancy' && albumTemplate.thumbnailPath) {
      return albumTemplate.thumbnailPath;
    }
  } catch (error) {
    console.warn(`[Cover Mapping] Не удалось получить обложку для ${albumId}:`, error);
  }
  
  return null;
}

/**
 * Проверяет, является ли альбом альбомом беременности
 * @param albumId - ID альбома
 * @returns true, если это альбом беременности
 */
export function isPregnancyAlbum(albumId: string | null): boolean {
  if (!albumId) return false;
  
  // Проверяем по префиксу
  if (albumId.startsWith('pregnancy_')) {
    return true;
  }
  
  // Проверяем через шаблон альбома
  try {
    const albumTemplate = getAlbumTemplateById(albumId);
    return albumTemplate?.category === 'pregnancy';
  } catch (error) {
    return false;
  }
}

/**
 * Получает обложку для экспорта по ID альбома и категории
 * @param albumId - ID альбома
 * @param category - Категория альбома (опционально)
 * @returns Путь к обложке или null
 */
export function getCoverForExport(albumId: string | null, category?: string): ImageSourcePropType | null {
  if (!albumId) return null;
  
  // Для беременности используем специальный маппинг
  if (category === 'pregnancy' || isPregnancyAlbum(albumId)) {
    return getPregnancyCover(albumId);
  }
  
  // Для других категорий пытаемся получить через шаблон
  try {
    const albumTemplate = getAlbumTemplateById(albumId);
    if (albumTemplate?.thumbnailPath) {
      return albumTemplate.thumbnailPath;
    }
  } catch (error) {
    console.warn(`[Cover Mapping] Не удалось получить обложку для ${albumId}:`, error);
  }
  
  return null;
}

