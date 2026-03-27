/**
 * 6 дизайнов обложки для беременности (DB1–DB6).
 * Тип (твёрдая/мягкая) выбирается при экспорте.
 */
const PLACEHOLDER_IMAGE = require('@/assets/images/albums/blank_white.png');
export const PREGNANCY_COVER_DESIGNS = [
  { id: 'pregnancy_60', image: PLACEHOLDER_IMAGE, sku: 'DB1', title: 'DB1' },
  { id: 'pregnancy_db2', image: PLACEHOLDER_IMAGE, sku: 'DB2', title: 'DB2' },
  { id: 'pregnancy_db3', image: PLACEHOLDER_IMAGE, sku: 'DB3', title: 'DB3' },
  { id: 'pregnancy_db4', image: PLACEHOLDER_IMAGE, sku: 'DB4', title: 'DB4' },
  { id: 'pregnancy_db5', image: PLACEHOLDER_IMAGE, sku: 'DB5', title: 'DB5' },
  { id: 'pregnancy_2', image: PLACEHOLDER_IMAGE, sku: 'DB6', title: 'DB6' },
] as const;
