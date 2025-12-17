import { getAlbumTemplateById } from '@/albums';

/**
 * Маппинг PDF разверток обложек для беременности
 * Ключ - ID альбома, значение - путь к PDF развертке из папки albums
 * Используются развертки DB1.pdf, DB2.pdf, DB3.pdf, DB4.pdf, DB5.pdf, DB6.pdf
 */
const PREGNANCY_COVER_PDF_MAPPING: Record<string, any> = {
  'pregnancy_60': require('../albums/DB1.pdf'),
  'pregnancy_a5': require('../albums/DB1.pdf'),
  'pregnancy_db2': require('../albums/DB2.pdf'),
  'pregnancy_db2_soft': require('../albums/DB2.pdf'),
  'pregnancy_db3': require('../albums/DB3.pdf'),
  'pregnancy_db3_soft': require('../albums/DB3.pdf'),
  'pregnancy_db4': require('../albums/DB4.pdf'),
  'pregnancy_db4_soft': require('../albums/DB4.pdf'),
  'pregnancy_db5': require('../albums/DB5.pdf'),
  'pregnancy_db5_soft': require('../albums/DB5.pdf'),
  'pregnancy_2': require('../albums/DB6.pdf'),
  'pregnancy_2_3': require('../albums/DB6.pdf'),
};

/**
 * Маппинг PDF разверток обложек для детей (kids)
 * Ключ - ID альбома, значение - объект с путями к PDF разверткам (твердый переплет и пружина)
 * Используются развертки DFA{номер}_{тип}.pdf из папки albums
 */
const KIDS_COVER_PDF_MAPPING: Record<string, { hard?: any; soft?: any }> = {
  'dfa_5': { hard: require('../albums/DFA5_твердый переплет.pdf'), soft: require('../albums/DFA5_пружина.pdf') },
  'dfa_7': { hard: require('../albums/DFA7_твердый переплет.pdf'), soft: require('../albums/DFA7_пружина.pdf') },
  'dfa_8': { hard: require('../albums/DFA8_твердый переплет.pdf'), soft: require('../albums/DFA8_пружина.pdf') },
  'dfa_9': { hard: require('../albums/DFA9_твердый переплет.pdf'), soft: require('../albums/DFA9_пружина.pdf') },
  'dfa_12': { hard: require('../albums/DFA12_твердый переплет.pdf'), soft: require('../albums/DFA12_пружина.pdf') },
  'dfa_14': { hard: undefined, soft: undefined }, // Нет файла в папке albums
  'dfa_15': { hard: require('../albums/DFA15_твердый переплет.pdf'), soft: require('../albums/DFA15_пружина.pdf') },
  'dfa_16': { hard: require('../albums/DFA16_твердый переплет.pdf'), soft: require('../albums/DFA16_пружина.pdf') },
  'dfa_19': { hard: require('../albums/DFA19_твердый переплет.pdf'), soft: require('../albums/DFA19_пружина.pdf') },
  'dfa_21': { hard: require('../albums/DFA21_твердый переплет.pdf'), soft: require('../albums/DFA21_пружина.pdf') },
  'dfa_22': { hard: require('../albums/DFA22_твердый переплет.pdf'), soft: require('../albums/DFA22_пружина.pdf') },
  'dfa_23': { hard: require('../albums/DFA23_твердый переплет.pdf'), soft: require('../albums/DFA23_пружина.pdf') },
  'dfa_24': { hard: require('../albums/DFA24_твердый переплет.pdf'), soft: require('../albums/DFA24_пружина.pdf') },
  'dfa_25': { hard: require('../albums/DFA25_твердый переплет.pdf'), soft: require('../albums/DFA25_пружина.pdf') },
  'dfa_26': { hard: require('../albums/DFA26_твердый переплет.pdf'), soft: require('../albums/DFA26_пружина.pdf') },
  'dfa_27': { hard: require('../albums/DFA27_твердый переплет.pdf'), soft: require('../albums/DFA27_пружина.pdf') },
  'dfa_28': { hard: require('../albums/DFA28_твердый переплет.pdf'), soft: require('../albums/DFA28_пружина.pdf') },
  'dfa_29': { hard: require('../albums/DFA29_твердый переплет.pdf'), soft: require('../albums/DFA29_пружина.pdf') },
  'dfa_30': { hard: require('../albums/DFA30_твердый переплет.pdf'), soft: require('../albums/DFA30_пружина.pdf') },
  'dfa_31': { hard: require('../albums/DFA31_твердый переплет.pdf'), soft: require('../albums/DFA31_пружина.pdf') },
  'dfa_43': { hard: require('../albums/dfa43_твердый переплет.pdf'), soft: require('../albums/dfa43_пружина.pdf') },
  'dfa_46': { hard: require('../albums/DFA46_твердый переплет.pdf'), soft: require('../albums/DFA46_пружина.pdf') },
  'dfa_47': { hard: require('../albums/DFA47_твердый переплет.pdf'), soft: require('../albums/DFA47_пружина.pdf') },
  'dfa_50': { hard: require('../albums/DFA50_твердый переплет.pdf'), soft: require('../albums/DFA50_пружина.pdf') },
  'dfa_52': { hard: require('../albums/DFA52_твердый переплет.pdf'), soft: require('../albums/DFA52_пружина.pdf') },
  'dfa_53': { hard: require('../albums/DFA53_твердый переплет.pdf'), soft: require('../albums/DFA53_пружина.pdf') },
  'dfa_57': { hard: undefined, soft: undefined }, // Нет файла в папке albums
  'dfa_59': { hard: require('../albums/DFA59_твердый переплет.pdf'), soft: require('../albums/DFA59_пружина.pdf') },
  'dfa_60': { hard: require('../albums/DFA60_твердый переплет.pdf'), soft: require('../albums/DFA60_пружина.pdf') },
  'dfa_71': { hard: require('../albums/DFA71_твердый переплет.pdf'), soft: require('../albums/DFA71_пружина.pdf') },
  'dfa_72': { hard: require('../albums/DFA72_твердый переплет.pdf'), soft: require('../albums/DFA72_пружина.pdf') },
  'dfa_74': { hard: require('../albums/DFA74_твердый переплет.pdf'), soft: require('../albums/DFA74_пружина.pdf') },
  'dfa_205': { hard: require('../albums/DFA205_твердый переплет.pdf'), soft: require('../albums/DFA205_пружина.pdf') },
  'dfa_206': { hard: require('../albums/DFA206_твердый переплет.pdf'), soft: require('../albums/DFA206_пружина.pdf') },
  'dfa_207': { hard: require('../albums/DFA207_твердый переплет.pdf'), soft: require('../albums/DFA207_пружина.pdf') },
  'dfa_208': { hard: require('../albums/DFA208_твердый переплет.pdf'), soft: require('../albums/DFA208_пружина.pdf') },
  'dfa_300': { hard: undefined, soft: undefined }, // Нет файла в папке albums
  'dfa_301': { hard: require('../albums/DFA301_твердый переплет.pdf'), soft: require('../albums/DFA301_пружина.pdf') },
  'dfa_302': { hard: require('../albums/DFA302_твердый переплет.pdf'), soft: require('../albums/DFA302_пружина.pdf') },
  'dfa_304': { hard: require('../albums/DFA304_твердый переплет.pdf'), soft: require('../albums/DFA304_пружина.pdf') },
  'dfa_305': { hard: require('../albums/DFA305_твердый переплет.pdf'), soft: require('../albums/DFA305_пружина.pdf') },
  'dfa_306': { hard: require('../albums/DFA306_твердый переплет.pdf'), soft: require('../albums/DFA306_пружина.pdf') },
  'dfa_307': { hard: require('../albums/DFA307_твердый переплет.pdf'), soft: require('../albums/DFA307_пружина.pdf') },
  'dfa_308': { hard: undefined, soft: undefined }, // Нет файла в папке albums
  'dfa_309': { hard: require('../albums/DFA309_твердый переплет.pdf'), soft: require('../albums/DFA309_пружина.pdf') },
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
 * Получает PDF развертку обложки для альбома детей по ID альбома и типу обложки
 * @param albumId - ID альбома
 * @param coverType - Тип обложки: 'hard' (твердый переплет) или 'soft' (пружина)
 * @returns Путь к PDF развертке или null, если не найдено
 */
export function getKidsCoverPdf(albumId: string | null, coverType: 'hard' | 'soft' = 'hard'): any | null {
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
 * Получает PDF развертку обложки для экспорта по ID альбома, категории и типу обложки
 * @param albumId - ID альбома
 * @param category - Категория альбома (опционально)
 * @param coverType - Тип обложки: 'hard' (твердый переплет) или 'soft' (пружина) (опционально)
 * @returns Путь к PDF развертке или null
 */
export function getCoverPdfForExport(albumId: string | null, category?: string, coverType: 'hard' | 'soft' = 'hard'): any | null {
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

