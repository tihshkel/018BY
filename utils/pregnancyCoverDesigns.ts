/**
 * 6 дизайнов обложки для беременности (DB1–DB6).
 * Тип (твёрдая/мягкая) выбирается при экспорте.
 */

export const PREGNANCY_COVER_DESIGNS = [
  // Для превью на экране выбора обложки используем первую страницу из `albums/DB*/page_001.png`.
  { id: 'pregnancy_60', image: require('@/albums/DB1/page_001.png'), sku: 'DB1', title: 'DB1' },
  { id: 'pregnancy_db2', image: require('@/albums/DB2/page_001.png'), sku: 'DB2', title: 'DB2' },
  { id: 'pregnancy_db3', image: require('@/albums/DB3/page_001.png'), sku: 'DB3', title: 'DB3' },
  { id: 'pregnancy_db4', image: require('@/albums/DB4/page_001.png'), sku: 'DB4', title: 'DB4' },
  { id: 'pregnancy_db5', image: require('@/albums/DB5/page_001.png'), sku: 'DB5', title: 'DB5' },
  { id: 'pregnancy_2', image: require('@/albums/DB6/page_001.png'), sku: 'DB6', title: 'DB6' },
] as const;
