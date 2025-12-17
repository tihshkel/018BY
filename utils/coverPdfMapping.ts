import { getAlbumTemplateById } from '@/albums';

/**
 * Маппинг PDF обложек для беременности
 * Ключ - ID альбома, значение - путь к PDF обложке
 * Формат имени файла: DB{номер}_{тип}.pdf
 * Типы: "твердый переплет" для твердых обложек, "пружина" для мягких
 */
const PREGNANCY_COVER_PDF_MAPPING: Record<string, any> = {
  'pregnancy_60': require('../assets/pdfs/covers/pregnancy/DB1_твердый переплет.pdf'),
  'pregnancy_a5': require('../assets/pdfs/covers/pregnancy/DB1_пружина.pdf'),
  'pregnancy_db2': require('../assets/pdfs/covers/pregnancy/DB2_твердый переплет.pdf'),
  'pregnancy_db2_soft': require('../assets/pdfs/covers/pregnancy/DB2_пружина.pdf'),
  'pregnancy_db3': require('../assets/pdfs/covers/pregnancy/DB3_твердый переплет.pdf'),
  'pregnancy_db3_soft': require('../assets/pdfs/covers/pregnancy/DB3_пружина.pdf'),
  'pregnancy_db4': require('../assets/pdfs/covers/pregnancy/DB4_твердый переплет.pdf'),
  'pregnancy_db4_soft': require('../assets/pdfs/covers/pregnancy/DB4_пружина.pdf'),
  'pregnancy_db5': require('../assets/pdfs/covers/pregnancy/DB5_твердый переплет.pdf'),
  'pregnancy_db5_soft': require('../assets/pdfs/covers/pregnancy/DB5_пружина.pdf'),
};

/**
 * Получает PDF обложку для альбома беременности по ID альбома
 * @param albumId - ID альбома
 * @returns Путь к PDF обложке или null, если не найдено
 */
export function getPregnancyCoverPdf(albumId: string | null): any | null {
  if (!albumId) return null;
  
  // Прямой поиск в маппинге
  if (PREGNANCY_COVER_PDF_MAPPING[albumId]) {
    return PREGNANCY_COVER_PDF_MAPPING[albumId];
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
 * Получает PDF обложку для экспорта по ID альбома и категории
 * @param albumId - ID альбома
 * @param category - Категория альбома (опционально)
 * @returns Путь к PDF обложке или null
 */
export function getCoverPdfForExport(albumId: string | null, category?: string): any | null {
  if (!albumId) return null;
  
  // Для беременности используем специальный маппинг PDF обложек
  if (category === 'pregnancy' || isPregnancyAlbum(albumId)) {
    return getPregnancyCoverPdf(albumId);
  }
  
  return null;
}

