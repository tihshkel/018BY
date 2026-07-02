import type { PhotoBlockSchema } from '@/types/album-page-schema';

/** Standard 4-layout block for all designed albums (1 / 2 / 3 / 4 photos). */
export const DESIGNED_ALBUM_PHOTO_BLOCK: PhotoBlockSchema = {
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
      variantId: 'two_vertical',
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

/** @deprecated Use DESIGNED_ALBUM_PHOTO_BLOCK */
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

/** @deprecated Use DESIGNED_ALBUM_PHOTO_BLOCK */
export const PREGNANCY_PHOTO_BLOCK: PhotoBlockSchema = DESIGNED_ALBUM_PHOTO_BLOCK;

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

/** «Мои следы»: одно или два фото (руки / ноги). */
export const FOOTPRINTS_PHOTO_BLOCK: PhotoBlockSchema = {
  blockId: 'main_photo',
  label: 'Фото следов',
  variants: [
    {
      variantId: 'one_horizontal',
      label: '1 фото',
      slots: 1,
      slotIndices: [0],
    },
    {
      variantId: 'two_horizontal',
      label: '2 фото (руки и ноги)',
      slots: 2,
      slotIndices: [0, 1],
    },
  ],
};
