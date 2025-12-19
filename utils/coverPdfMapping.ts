import { getAlbumTemplateById } from '@/albums';

/**
 * Маппинг PDF разверток обложек для беременности
 * Ключ - ID альбома, значение - имя файла PDF развертки (без расширения)
 * PDF файлы загружаются динамически, так как их нет в папке albums
 * Используются развертки DB1.pdf, DB2.pdf, DB3.pdf, DB4.pdf, DB5.pdf, DB6.pdf
 */
const PREGNANCY_COVER_PDF_MAPPING: Record<string, string | null> = {
  'pregnancy_60': 'DB1',
  'pregnancy_a5': 'DB1',
  'pregnancy_db2': 'DB2',
  'pregnancy_db2_soft': 'DB2',
  'pregnancy_db3': 'DB3',
  'pregnancy_db3_soft': 'DB3',
  'pregnancy_db4': 'DB4',
  'pregnancy_db4_soft': 'DB4',
  'pregnancy_db5': 'DB5',
  'pregnancy_db5_soft': 'DB5',
  'pregnancy_2': 'DB6',
  'pregnancy_2_3': 'DB6',
};

/**
 * Маппинг PDF разверток обложек для детей (kids)
 * Ключ - ID альбома, значение - объект с именами папок PDF разверток (твердый переплет и пружина)
 * PDF файлы загружаются динамически, так как их нет в папке albums
 * Используются папки DFA{номер}_{тип} из папки albums
 */
const KIDS_COVER_PDF_MAPPING: Record<string, { hard?: string | null; soft?: string | null }> = {
  'dfa_5': { hard: 'DFA5_твердый переплет', soft: 'DFA5_пружина' },
  'dfa_7': { hard: 'DFA7_твердый переплет', soft: 'DFA7_пружина' },
  'dfa_8': { hard: 'DFA8_твердый переплет', soft: 'DFA8_пружина' },
  'dfa_9': { hard: 'DFA9_твердый переплет', soft: 'DFA9_пружина' },
  'dfa_12': { hard: 'DFA12_твердый переплет', soft: 'DFA12_пружина' },
  'dfa_14': { hard: null, soft: null }, // Нет файла в папке albums
  'dfa_15': { hard: 'DFA15_твердый переплет', soft: 'DFA15_пружина' },
  'dfa_16': { hard: 'DFA16_твердый переплет', soft: 'DFA16_пружина' },
  'dfa_19': { hard: 'DFA19_твердый переплет', soft: 'DFA19_пружина' },
  'dfa_21': { hard: 'DFA21_твердый переплет', soft: 'DFA21_пружина' },
  'dfa_22': { hard: 'DFA22_твердый переплет', soft: 'DFA22_пружина' },
  'dfa_23': { hard: 'DFA23_твердый переплет', soft: 'DFA23_пружина' },
  'dfa_24': { hard: 'DFA24_твердый переплет', soft: 'DFA24_пружина' },
  'dfa_25': { hard: 'DFA25_твердый переплет', soft: 'DFA25_пружина' },
  'dfa_26': { hard: 'DFA26_твердый переплет', soft: 'DFA26_пружина' },
  'dfa_27': { hard: 'DFA27_твердый переплет', soft: 'DFA27_пружина' },
  'dfa_28': { hard: 'DFA28_твердый переплет', soft: 'DFA28_пружина' },
  'dfa_29': { hard: 'DFA29_твердый переплет', soft: 'DFA29_пружина' },
  'dfa_30': { hard: 'DFA30_твердый переплет', soft: 'DFA30_пружина' },
  'dfa_31': { hard: 'DFA31_твердый переплет', soft: 'DFA31_пружина' },
  'dfa_43': { hard: 'dfa43_твердый переплет', soft: 'dfa43_пружина' },
  'dfa_46': { hard: 'DFA46_твердый переплет', soft: 'DFA46_пружина' },
  'dfa_47': { hard: 'DFA47_твердый переплет', soft: 'DFA47_пружина' },
  'dfa_50': { hard: 'DFA50_твердый переплет', soft: 'DFA50_пружина' },
  'dfa_52': { hard: 'DFA52_твердый переплет', soft: 'DFA52_пружина' },
  'dfa_53': { hard: 'DFA53_твердый переплет', soft: 'DFA53_пружина' },
  'dfa_57': { hard: null, soft: null }, // Нет файла в папке albums
  'dfa_59': { hard: 'DFA59_твердый переплет', soft: 'DFA59_пружина' },
  'dfa_60': { hard: 'DFA60_твердый переплет', soft: 'DFA60_пружина' },
  'dfa_71': { hard: 'DFA71_твердый переплет', soft: 'DFA71_пружина' },
  'dfa_72': { hard: 'DFA72_твердый переплет', soft: 'DFA72_пружина' },
  'dfa_74': { hard: 'DFA74_твердый переплет', soft: 'DFA74_пружина' },
  'dfa_205': { hard: 'DFA205_твердый переплет', soft: 'DFA205_пружина' },
  'dfa_206': { hard: 'DFA206_твердый переплет', soft: 'DFA206_пружина' },
  'dfa_207': { hard: 'DFA207_твердый переплет', soft: 'DFA207_пружина' },
  'dfa_208': { hard: 'DFA208_твердый переплет', soft: 'DFA208_пружина' },
  'dfa_300': { hard: null, soft: null }, // Нет файла в папке albums
  'dfa_301': { hard: 'DFA301_твердый переплет', soft: 'DFA301_пружина' },
  'dfa_302': { hard: 'DFA302_твердый переплет', soft: 'DFA302_пружина' },
  'dfa_304': { hard: 'DFA304_твердый переплет', soft: 'DFA304_пружина' },
  'dfa_305': { hard: 'DFA305_твердый переплет', soft: 'DFA305_пружина' },
  'dfa_306': { hard: 'DFA306_твердый переплет', soft: 'DFA306_пружина' },
  'dfa_307': { hard: 'DFA307_твердый переплет', soft: 'DFA307_пружина' },
  'dfa_308': { hard: null, soft: null }, // Нет файла в папке albums
  'dfa_309': { hard: 'DFA309_твердый переплет', soft: 'DFA309_пружина' },
};

/**
 * Получает имя папки PDF обложки для альбома беременности по ID альбома
 * @param albumId - ID альбома
 * @returns Имя папки PDF обложки или null, если не найдено
 */
export function getPregnancyCoverPdf(albumId: string | null): string | null {
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
 * Получает имя папки PDF развертки обложки для альбома детей по ID альбома и типу обложки
 * @param albumId - ID альбома
 * @param coverType - Тип обложки: 'hard' (твердый переплет) или 'soft' (пружина)
 * @returns Имя папки PDF развертки или null, если не найдено
 */
export function getKidsCoverPdf(albumId: string | null, coverType: 'hard' | 'soft' = 'hard'): string | null {
  if (!albumId) return null;
  
  // Нормализуем ID (dfa_7 -> dfa_7)
  const normalizedId = albumId.toLowerCase();
  
  // Прямой поиск в маппинге
  if (KIDS_COVER_PDF_MAPPING[normalizedId]) {
    const mapping = KIDS_COVER_PDF_MAPPING[normalizedId];
    const selectedCover = coverType === 'hard' ? mapping.hard : mapping.soft;
    
    // Если выбранный тип отсутствует, используем другой тип как fallback
    if (selectedCover) {
      return selectedCover;
    } else if (coverType === 'hard' && mapping.soft) {
      console.warn(`[Cover PDF] Для ${normalizedId} нет файла с твердым переплетом, используется пружина`);
      return mapping.soft;
    } else if (coverType === 'soft' && mapping.hard) {
      console.warn(`[Cover PDF] Для ${normalizedId} нет файла с пружиной, используется твердый переплет`);
      return mapping.hard;
    }
  }
  
  return null;
}

/**
 * Проверяет, является ли альбом альбомом детей
 * @param albumId - ID альбома
 * @returns true, если это альбом детей
 */
export function isKidsAlbum(albumId: string | null): boolean {
  if (!albumId) return false;
  
  // Проверяем по префиксу
  if (albumId.toLowerCase().startsWith('dfa_')) {
    return true;
  }
  
  // Проверяем через шаблон альбома
  try {
    const albumTemplate = getAlbumTemplateById(albumId);
    return albumTemplate?.category === 'kids';
  } catch (error) {
    return false;
  }
}

/**
 * Получает имя папки PDF развертки обложки для экспорта по ID альбома, категории и типу обложки
 * @param albumId - ID альбома
 * @param category - Категория альбома (опционально)
 * @param coverType - Тип обложки: 'hard' (твердый переплет) или 'soft' (пружина) (опционально)
 * @returns Имя папки PDF развертки или null
 * 
 * Примечание: PDF файлы не существуют в папке albums, поэтому возвращается имя папки.
 * Фактическая загрузка PDF должна происходить динамически или через другой механизм.
 */
export function getCoverPdfForExport(albumId: string | null, category?: string, coverType: 'hard' | 'soft' = 'hard'): string | null {
  if (!albumId) return null;
  
  // Для беременности используем специальный маппинг PDF разверток
  if (category === 'pregnancy' || isPregnancyAlbum(albumId)) {
    return getPregnancyCoverPdf(albumId);
  }
  
  // Для детей используем маппинг с учетом типа обложки
  if (category === 'kids' || isKidsAlbum(albumId)) {
    return getKidsCoverPdf(albumId, coverType);
  }
  
  return null;
}

