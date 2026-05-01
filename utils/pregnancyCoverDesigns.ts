/**
 * 6 дизайнов обложки для беременности (DB1–DB6).
 * Тип (твёрдая/мягкая) выбирается при экспорте.
 */
export const PREGNANCY_COVER_DESIGNS = [
  { id: 'pregnancy_60', image: require('@/assets/images/albums/DB1_0.png'), sku: 'DB1', title: 'DB1' },
  { id: 'pregnancy_db2', image: require('@/assets/images/albums/DB2_0.png'), sku: 'DB2', title: 'DB2' },
  { id: 'pregnancy_db3', image: require('@/assets/images/albums/DB3_0.png'), sku: 'DB3', title: 'DB3' },
  { id: 'pregnancy_db4', image: require('@/assets/images/albums/DB4_0.png'), sku: 'DB4', title: 'DB4' },
  { id: 'pregnancy_db5', image: require('@/assets/images/albums/DB5_0.png'), sku: 'DB5', title: 'DB5' },
  { id: 'pregnancy_2', image: require('@/albums/DB6/page_001.png'), sku: 'DB6', title: 'DB6' },
] as const;
