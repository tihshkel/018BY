import type { PhotoBlockSchema } from '@/types/album-page-schema';

/** Full photo page: 1 / 2 / 3 / 4 photo collages */
export const FULL_PHOTO_BLOCK: PhotoBlockSchema = {
  blockId: 'main_photo',
  label: 'Фото для страницы',
  variants: [
    {
      variantId: 'one_large',
      label: 'Одно большое фото',
      slots: 1,
      slotIndices: [0],
    },
    {
      variantId: 'two_photos',
      label: 'Два фото',
      slots: 2,
      slotIndices: [0, 1],
    },
    {
      variantId: 'three_hero',
      label: 'Три фото (коллаж)',
      slots: 3,
      slotIndices: [0, 1, 2],
    },
    {
      variantId: 'four_grid',
      label: 'Четыре фото (коллаж)',
      slots: 4,
      slotIndices: [0, 1, 2, 3],
    },
  ],
};

/** Pregnancy «Для фото» — same layouts, pregnancy labels */
export const PREGNANCY_PHOTO_BLOCK: PhotoBlockSchema = {
  ...FULL_PHOTO_BLOCK,
  variants: [
    { variantId: 'one_large', label: 'Одно большое фото', slots: 1, slotIndices: [0] },
    { variantId: 'two_photos', label: 'Два фото', slots: 2, slotIndices: [0, 1] },
    { variantId: 'three_hero', label: 'Три фото', slots: 3, slotIndices: [0, 1, 2] },
    { variantId: 'four_grid', label: 'Четыре фото', slots: 4, slotIndices: [0, 1, 2, 3] },
  ],
};

/** Standard event photo block from TZ + 3-photo collage */
export const EVENT_PHOTO_BLOCK: PhotoBlockSchema = {
  blockId: 'event_photos',
  label: 'Фото для страницы',
  variants: [
    {
      variantId: 'one_horizontal',
      label: '1 горизонтальное фото',
      slots: 1,
      slotIndices: [0],
    },
    {
      variantId: 'two_horizontal',
      label: '2 горизонтальных фото',
      slots: 2,
      slotIndices: [0, 1],
    },
    {
      variantId: 'two_vertical',
      label: '2 вертикальных фото',
      slots: 2,
      slotIndices: [0, 1],
    },
    {
      variantId: 'three_hero',
      label: '3 фото (коллаж)',
      slots: 3,
      slotIndices: [0, 1, 2],
    },
    {
      variantId: 'four_vertical',
      label: '4 фото (коллаж)',
      slots: 4,
      slotIndices: [0, 1, 2, 3],
    },
  ],
};

/** Page 1 / 3 / 4: 1 horizontal or 2 vertical (small zone) */
export const PARENTS_PHOTO_BLOCK: PhotoBlockSchema = {
  blockId: 'main_photo',
  label: 'Фото',
  variants: [
    {
      variantId: 'one_horizontal',
      label: '1 горизонтальное фото',
      slots: 1,
      slotIndices: [0],
    },
    {
      variantId: 'two_horizontal',
      label: '2 горизонтальных фото',
      slots: 2,
      slotIndices: [0, 1],
    },
  ],
};

/** Page 21 godparents: common or separate */
export const GODPARENTS_PHOTO_BLOCK: PhotoBlockSchema = {
  blockId: 'godparents_photo',
  label: 'Фото крестных',
  variants: [
    {
      variantId: 'one_horizontal',
      label: 'Одно общее фото',
      slots: 1,
      slotIndices: [0],
    },
    {
      variantId: 'two_horizontal',
      label: 'Два фото',
      slots: 2,
      slotIndices: [0, 1],
    },
  ],
};

/** Structured pages with a single photo zone (e.g. kids p12). */
export const SINGLE_HORIZONTAL_PHOTO_BLOCK: PhotoBlockSchema = {
  blockId: 'main_photo',
  label: 'Фото',
  variants: [
    {
      variantId: 'one_horizontal',
      label: '1 горизонтальное фото',
      slots: 1,
      slotIndices: [0],
    },
  ],
};
