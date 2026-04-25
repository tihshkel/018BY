/**
 * 6 дизайнов обложки для беременности (DB1–DB6).
 * Тип (твёрдая/мягкая) выбирается при экспорте.
 *
 * Важно: эти картинки лежат в `assets/images/albums` (вшиваются в iOS bundle),
 * поэтому они должны отображаться и при запуске из Xcode, и в EAS build.
 */
import { COVER_BY_SKU } from '@/app/(tabs)/gifts';

export const PREGNANCY_COVER_DESIGNS = [
  { id: 'pregnancy_60', image: COVER_BY_SKU.DB1, sku: 'DB1', title: 'DB1' },
  { id: 'pregnancy_db2', image: COVER_BY_SKU.DB2, sku: 'DB2', title: 'DB2' },
  { id: 'pregnancy_db3', image: COVER_BY_SKU.DB3, sku: 'DB3', title: 'DB3' },
  { id: 'pregnancy_db4', image: COVER_BY_SKU.DB4, sku: 'DB4', title: 'DB4' },
  { id: 'pregnancy_db5', image: COVER_BY_SKU.DB5, sku: 'DB5', title: 'DB5' },
  { id: 'pregnancy_2', image: COVER_BY_SKU.DB6, sku: 'DB6', title: 'DB6' },
] as const;
