import { getCoverSku } from './coverSkuMapping';

/**
 * Определяет формат имени файла для разных категорий обложек
 * Дневники используют "твердая обложка", остальные - "твердый переплет"
 */
function getCoverFileNameSuffix(sku: string, coverType: 'hard' | 'soft', category?: string): string {
  if (coverType === 'soft') {
    return 'пружина';
  }

  // Для дневников (DD*) используется "твердая обложка"
  if (sku.startsWith('DD')) {
    return 'твердая обложка';
  }

  // Для остальных используется "твердый переплет"
  return 'твердый переплет';
}

/**
 * Получает имя PDF файла обложки из папки export на основе SKU и типа обложки
 * @param coverSku - SKU обложки (например, 'DD1', 'DFA5', 'DB1')
 * @param coverType - Тип обложки: 'hard' (твердый переплет) или 'soft' (пружина)
 * @param category - Категория альбома (опционально, для определения формата имени)
 * @returns Имя файла PDF (например, 'DD1_твердая обложка.pdf', 'DFA5_твердый переплет.pdf') или null
 */
export function getCoverExportPdfFileName(
  coverSku: string | null,
  coverType: 'hard' | 'soft' = 'hard',
  category?: string | null
): string | null {
  if (!coverSku) {
    return null;
  }

  const suffix = getCoverFileNameSuffix(coverSku, coverType, category || undefined);
  return `${coverSku}_${suffix}.pdf`;
}

/**
 * Получает имя PDF файла обложки из папки export на основе coverType и category
 * @param coverType - ID обложки (например, 'diary_dd1', 'dfa_5', 'pregnancy_60')
 * @param category - Категория альбома ('diary', 'kids', 'pregnancy')
 * @param coverTypeFormat - Тип обложки: 'hard' (твердый переплет) или 'soft' (пружина)
 * @returns Имя файла PDF или null
 */
export function getCoverExportPdfFileNameFromCoverType(
  coverType: string | null | undefined,
  category: string | null | undefined,
  coverTypeFormat: 'hard' | 'soft' = 'hard'
): string | null {
  const sku = getCoverSku(coverType, category);
  if (!sku) {
    return null;
  }

  return getCoverExportPdfFileName(sku, coverTypeFormat, category || undefined);
}
