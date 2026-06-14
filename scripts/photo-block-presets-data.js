/**
 * Shared photo block presets for Node scripts (generate-page-schemas, kids-48-tz-builders).
 * Keep in sync with constants/photo-block-presets.ts
 */

const FULL_PHOTO_BLOCK = {
  blockId: 'main_photo',
  label: 'Фото для страницы',
  variants: [
    { variantId: 'one_large', label: 'Одно большое фото', slots: 1, slotIndices: [0] },
    { variantId: 'two_photos', label: 'Два фото', slots: 2, slotIndices: [0, 1] },
    { variantId: 'three_hero', label: 'Три фото', slots: 3, slotIndices: [0, 1, 2] },
    { variantId: 'four_grid', label: 'Четыре фото', slots: 4, slotIndices: [0, 1, 2, 3] },
  ],
};

const PREGNANCY_PHOTO_BLOCK = FULL_PHOTO_BLOCK;

const EVENT_PHOTO_BLOCK = {
  blockId: 'event_photos',
  label: 'Фото для страницы',
  variants: [
    { variantId: 'one_horizontal', label: '1 горизонтальное фото', slots: 1, slotIndices: [0] },
    { variantId: 'two_horizontal', label: '2 горизонтальных фото', slots: 2, slotIndices: [0, 1] },
    { variantId: 'two_vertical', label: '2 вертикальных фото', slots: 2, slotIndices: [0, 1] },
    { variantId: 'three_hero', label: '3 фото (коллаж)', slots: 3, slotIndices: [0, 1, 2] },
    { variantId: 'four_vertical', label: '4 фото (коллаж)', slots: 4, slotIndices: [0, 1, 2, 3] },
  ],
};

const PARENTS_PHOTO_BLOCK = {
  blockId: 'main_photo',
  label: 'Фото',
  variants: [
    { variantId: 'one_horizontal', label: '1 горизонтальное фото', slots: 1, slotIndices: [0] },
    { variantId: 'two_vertical', label: '2 вертикальных фото', slots: 2, slotIndices: [0, 1] },
  ],
};

const GODPARENTS_PHOTO_BLOCK = {
  blockId: 'godparents_photo',
  label: 'Фото крестных',
  variants: [
    { variantId: 'one_horizontal_common', label: 'Одно общее фото', slots: 1, slotIndices: [0] },
    { variantId: 'two_vertical_separate', label: 'Два отдельных фото', slots: 2, slotIndices: [0, 1] },
  ],
};

module.exports = {
  FULL_PHOTO_BLOCK,
  PREGNANCY_PHOTO_BLOCK,
  EVENT_PHOTO_BLOCK,
  PARENTS_PHOTO_BLOCK,
  GODPARENTS_PHOTO_BLOCK,
};
