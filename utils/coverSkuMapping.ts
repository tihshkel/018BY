import { getDiaryCoverById } from '@/utils/diaryCovers';
import { extractDFANumber } from '@/utils/albumFirstLastPages';
import { getWeddingCoverById } from '@/utils/weddingCoverDesigns';

/**
 * Маппинг ID альбомов беременности к SKU из каталога (DB1-DB6)
 */
const PREGNANCY_SKU_MAPPING: Record<string, string> = {
  'pregnancy_60': 'DB1',
  'pregnancy_db2': 'DB2',
  'pregnancy_db3': 'DB3',
  'pregnancy_db4': 'DB4',
  'pregnancy_db5': 'DB5',
  'pregnancy_2': 'DB6',
};

/**
 * Получает внутренний артикул (SKU) обложки на основе coverType и category
 * @param coverType - ID обложки (например, 'diary_dd1', 'dfa_5', 'pregnancy_60')
 * @param category - Категория альбома ('diary', 'kids', 'pregnancy')
 * @returns SKU обложки (например, 'DD1', 'DFA5', 'DB1') или null, если не найдено
 */
export function getCoverSku(coverType: string | null | undefined, category: string | null | undefined): string | null {
  if (!coverType || !category) {
    return null;
  }

  // Нормализуем coverType - убираем префикс категории если есть
  const normalizedCoverType = coverType.replace(/^(kids|pregnancy|diary)_/, '');

  // Для дневников: coverType = 'diary_dd1' -> SKU = 'DD1'
  if (category === 'diary') {
    const diaryCover = getDiaryCoverById(coverType);
    if (diaryCover && diaryCover.sku) {
      return diaryCover.sku;
    }
    // Fallback: пробуем найти по нормализованному ID
    const diaryCoverFallback = getDiaryCoverById(normalizedCoverType);
    if (diaryCoverFallback && diaryCoverFallback.sku) {
      return diaryCoverFallback.sku;
    }
    return null;
  }

  // Для детских альбомов: coverType = 'dfa_8' -> SKU = 'DFA8'
  if (category === 'kids') {
    return extractDFANumber(coverType) || extractDFANumber(normalizedCoverType);
  }

  // Для беременности: coverType = 'pregnancy_60' -> SKU = 'DB1'
  if (category === 'pregnancy') {
    if (PREGNANCY_SKU_MAPPING[coverType]) {
      return PREGNANCY_SKU_MAPPING[coverType];
    }
    // Fallback: пробуем найти по нормализованному ID
    if (PREGNANCY_SKU_MAPPING[normalizedCoverType]) {
      return PREGNANCY_SKU_MAPPING[normalizedCoverType];
    }
    // Fallback: если coverType содержит 'db' + цифра
    const dbMatch = coverType.match(/db(\d)/i);
    if (dbMatch) {
      return `DB${dbMatch[1]}`;
    }
    return null;
  }

  if (category === 'wedding') {
    return getWeddingCoverById(coverType)?.sku ?? null;
  }

  return null;
}
