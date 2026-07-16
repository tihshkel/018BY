/**
 * Normalized photo placement regions (0–1 relative to page PNG).
 * y is the vertical center of the slot, matching line-slots convention.
 */

import {
  buildPageLayoutsFromTemplates,
  type SafeZone,
} from '@/constants/photo-layout-templates';
import { normalizeDesignedAlbumVariantId } from '@/utils/variantPreview';

export type NormalizedPhotoSlot = {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio?: [number, number];
  shape?: 'rect' | 'circle';
  slotId?: string;
  branch?: 'child' | 'mother' | 'father';
};

export type PhotoVariantLayout = {
  variantId: string;
  slots: NormalizedPhotoSlot[];
};

export type PhotoPageLayouts = {
  variants: PhotoVariantLayout[];
};

/** Calibrated safe zone for pregnancy «Для фото» — below top decor, above bottom margin */
const PREGNANCY_PHOTO_SAFE: SafeZone = {
  x: 0.11,
  y: 0.26,
  width: 0.78,
  height: 0.5,
};

const EVENT_PHOTO_SAFE: SafeZone = {
  x: 0.05,
  y: 0.18,
  width: 0.9,
  height: 0.64,
};

/** 15 mm print margins — sync with getBlankPagePhotoSafe(180, 240). */
const BLANK_PAGE_SAFE_18X24: SafeZone = {
  x: 15 / 180,
  y: 15 / 240,
  width: 1 - 30 / 180,
  height: 1 - 30 / 240,
};

/** 15 mm print margins — sync with getBlankPagePhotoSafe(210, 210). */
const BLANK_PAGE_SAFE_21X21: SafeZone = {
  x: 15 / 210,
  y: 15 / 210,
  width: 1 - 30 / 210,
  height: 1 - 30 / 210,
};

const BLANK_PAGE_SAFE = BLANK_PAGE_SAFE_18X24;

const FULL_PHOTO_TEMPLATES = [
  'one_large',
  'two_vertical',
  'three_hero',
  'four_grid',
] as const;

const EVENT_PHOTO_TEMPLATES = [
  'one_horizontal',
  'two_horizontal',
  'two_vertical',
  'three_hero',
  'four_vertical',
] as const;

function layoutsFromTemplates(safeZone: SafeZone, templateIds: readonly string[]): PhotoPageLayouts {
  return buildPageLayoutsFromTemplates(safeZone, [...templateIds]) as PhotoPageLayouts;
}

/** «Люблю» / memory block (p56–59): center zone below title, above rose decor */
const PREGNANCY_MEMORY_PHOTO_SAFE: SafeZone = {
  x: 0.08,
  y: 0.14,
  width: 0.84,
  height: 0.52,
};

function pregnancyMemoryPhotoLayouts(): PhotoPageLayouts {
  return layoutsFromTemplates(PREGNANCY_MEMORY_PHOTO_SAFE, FULL_PHOTO_TEMPLATES);
}

const PREGNANCY_60_MEMORY_PAGES = [56, 57, 58, 59];

function pregnancyPhotoLayouts(): PhotoPageLayouts {
  return layoutsFromTemplates(PREGNANCY_PHOTO_SAFE, FULL_PHOTO_TEMPLATES);
}

function eventPhotoLayouts(): PhotoPageLayouts {
  return layoutsFromTemplates(EVENT_PHOTO_SAFE, EVENT_PHOTO_TEMPLATES);
}

export { EVENT_PHOTO_TEMPLATES, eventPhotoLayouts };

function blankPageLayouts(safeZone: SafeZone = BLANK_PAGE_SAFE): PhotoPageLayouts {
  return layoutsFromTemplates(safeZone, FULL_PHOTO_TEMPLATES);
}

/** Fallback for photo/event pages without explicit profile */
export const DEFAULT_PHOTO_PAGE_LAYOUTS: PhotoPageLayouts = blankPageLayouts();

function eventPages(pages: number[]): Record<string, PhotoPageLayouts> {
  const layout = eventPhotoLayouts();
  return Object.fromEntries(pages.map((p) => [String(p), layout]));
}

function blankAlbumPages(
  count: number,
  safeZone: SafeZone = BLANK_PAGE_SAFE_18X24,
): Record<string, PhotoPageLayouts> {
  const layout = blankPageLayouts(safeZone);
  return Object.fromEntries(
    Array.from({ length: count }, (_, i) => [String(i + 1), layout]),
  );
}

function repeatPhotoLayout(
  pageNumbers: number[],
  layout: PhotoPageLayouts,
): Record<string, PhotoPageLayouts> {
  return Object.fromEntries(pageNumbers.map((page) => [String(page), layout]));
}

/** Synthetic primary для sparse expand — фото под верхним текстом (age pages). */
const BIRTHDAY_AGE_PHOTO_LAYOUT: PhotoPageLayouts = {
  variants: [
    {
      variantId: 'one_large',
      slots: [{ x: 0.09, y: 0.75, width: 0.82, height: 0.35, aspectRatio: [4, 3] }],
    },
  ],
};

/** Synthetic primary для sparse expand — фото между верхним и нижним текстом (p2). */
const BIRTHDAY_HELLO_PHOTO_LAYOUT: PhotoPageLayouts = {
  variants: [
    {
      variantId: 'one_horizontal',
      slots: [{ x: 0.08, y: 0.515, width: 0.84, height: 0.37, aspectRatio: [4, 3] }],
    },
  ],
};

const BIRTHDAY_AGE_PAGES = [
  4,
  ...Array.from({ length: 17 }, (_, index) => 6 + index * 2),
];

const BIRTHDAY_FREE_PAGES = [
  3,
  5,
  ...Array.from({ length: 17 }, (_, index) => 7 + index * 2),
];

const BIRTHDAY_CAPTION_PAGES = Array.from({ length: 7 }, (_, index) => 41 + index);

/** Manual layouts for pregnancy memory blocks and photo-only pages. */
export const PHOTO_SLOTS: Record<string, Record<string, PhotoPageLayouts>> = {
  pregnancy_60: {
    '56': {
    variants: [
    {
      variantId: 'one_large',
      slots: [
      { x: 0.1256, y: 0.51, width: 0.7488, height: 0.42, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_photos',
      slots: [
      { x: 0.1256, y: 0.39, width: 0.7488, height: 0.22, aspectRatio: [4, 3] },
      { x: 0.1256, y: 0.63, width: 0.7488, height: 0.22, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.1256, y: 0.41, width: 0.7488, height: 0.26, aspectRatio: [4, 3] },
      { x: 0.1256, y: 0.645, width: 0.3588, height: 0.19, aspectRatio: [3, 4] },
      { x: 0.5156, y: 0.645, width: 0.3588, height: 0.19, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'four_grid',
      slots: [
      { x: 0.1256, y: 0.39, width: 0.3588, height: 0.22, aspectRatio: [1, 1] },
      { x: 0.5156, y: 0.39, width: 0.3588, height: 0.22, aspectRatio: [1, 1] },
      { x: 0.1256, y: 0.63, width: 0.3588, height: 0.22, aspectRatio: [1, 1] },
      { x: 0.5156, y: 0.63, width: 0.3588, height: 0.22, aspectRatio: [1, 1] },
      ],
    },
    ],
  },
    '57': {
    variants: [
    {
      variantId: 'one_large',
      slots: [
      { x: 0.1256, y: 0.51, width: 0.7488, height: 0.42, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_photos',
      slots: [
      { x: 0.1256, y: 0.39, width: 0.7488, height: 0.22, aspectRatio: [4, 3] },
      { x: 0.1256, y: 0.63, width: 0.7488, height: 0.22, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.1256, y: 0.41, width: 0.7488, height: 0.26, aspectRatio: [4, 3] },
      { x: 0.1256, y: 0.645, width: 0.3588, height: 0.19, aspectRatio: [3, 4] },
      { x: 0.5156, y: 0.645, width: 0.3588, height: 0.19, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'four_grid',
      slots: [
      { x: 0.1256, y: 0.39, width: 0.3588, height: 0.22, aspectRatio: [1, 1] },
      { x: 0.5156, y: 0.39, width: 0.3588, height: 0.22, aspectRatio: [1, 1] },
      { x: 0.1256, y: 0.63, width: 0.3588, height: 0.22, aspectRatio: [1, 1] },
      { x: 0.5156, y: 0.63, width: 0.3588, height: 0.22, aspectRatio: [1, 1] },
      ],
    },
    ],
  },
    '58': {
    variants: [
    {
      variantId: 'one_large',
      slots: [
      { x: 0.1256, y: 0.51, width: 0.7488, height: 0.42, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_photos',
      slots: [
      { x: 0.1256, y: 0.39, width: 0.7488, height: 0.22, aspectRatio: [4, 3] },
      { x: 0.1256, y: 0.63, width: 0.7488, height: 0.22, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.1256, y: 0.41, width: 0.7488, height: 0.26, aspectRatio: [4, 3] },
      { x: 0.1256, y: 0.645, width: 0.3588, height: 0.19, aspectRatio: [3, 4] },
      { x: 0.5156, y: 0.645, width: 0.3588, height: 0.19, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'four_grid',
      slots: [
      { x: 0.1256, y: 0.39, width: 0.3588, height: 0.22, aspectRatio: [1, 1] },
      { x: 0.5156, y: 0.39, width: 0.3588, height: 0.22, aspectRatio: [1, 1] },
      { x: 0.1256, y: 0.63, width: 0.3588, height: 0.22, aspectRatio: [1, 1] },
      { x: 0.5156, y: 0.63, width: 0.3588, height: 0.22, aspectRatio: [1, 1] },
      ],
    },
    ],
  },
    '59': {
    variants: [
    {
      variantId: 'one_large',
      slots: [
      { x: 0.1256, y: 0.51, width: 0.7488, height: 0.42, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_photos',
      slots: [
      { x: 0.1256, y: 0.39, width: 0.7488, height: 0.22, aspectRatio: [4, 3] },
      { x: 0.1256, y: 0.63, width: 0.7488, height: 0.22, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.1256, y: 0.41, width: 0.7488, height: 0.26, aspectRatio: [4, 3] },
      { x: 0.1256, y: 0.645, width: 0.3588, height: 0.19, aspectRatio: [3, 4] },
      { x: 0.5156, y: 0.645, width: 0.3588, height: 0.19, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'four_grid',
      slots: [
      { x: 0.1256, y: 0.39, width: 0.3588, height: 0.22, aspectRatio: [1, 1] },
      { x: 0.5156, y: 0.39, width: 0.3588, height: 0.22, aspectRatio: [1, 1] },
      { x: 0.1256, y: 0.63, width: 0.3588, height: 0.22, aspectRatio: [1, 1] },
      { x: 0.5156, y: 0.63, width: 0.3588, height: 0.22, aspectRatio: [1, 1] },
      ],
    },
    ],
  },
  },
  pregnancy_a5: {
    '46': pregnancyPhotoLayouts(),
    '47': pregnancyPhotoLayouts(),
    '48': pregnancyPhotoLayouts(),
  },
    kids_48: {
    '1': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.2024, y: 0.24, width: 0.5952, height: 0.112, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.2024, y: 0.2078, width: 0.5952, height: 0.0588, aspectRatio: [4, 3] },
      { x: 0.2024, y: 0.2722, width: 0.5952, height: 0.0588, aspectRatio: [4, 3] },
      ],
    },
    ],
  },
    '3': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.164, y: 0.38, width: 0.672, height: 0.176, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.164, y: 0.3294, width: 0.672, height: 0.0924, aspectRatio: [4, 3] },
      { x: 0.164, y: 0.4306, width: 0.672, height: 0.0924, aspectRatio: [4, 3] },
      ],
    },
    ],
  },
    '4': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.1352, y: 0.22, width: 0.7296, height: 0.224, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.1352, y: 0.1556, width: 0.7296, height: 0.1176, aspectRatio: [4, 3] },
      { x: 0.1352, y: 0.2844, width: 0.7296, height: 0.1176, aspectRatio: [4, 3] },
      ],
    },
    ],
  },
    '5': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    ],
  },
    '6': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '7': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '8': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    ],
  },
    '9': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '12': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.626, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    ],
  },
    '13': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    ],
  },
    '14': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '15': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '16': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '17': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '18': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '19': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '20': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '21': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    ],
  },
    '22': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '23': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '24': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '25': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '26': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '27': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '28': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '29': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '30': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '31': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '32': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '33': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '34': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '35': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '36': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '37': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '38': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '39': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '40': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '41': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '42': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '43': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '44': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '45': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '46': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
    '47': {
    variants: [
    {
      variantId: 'one_horizontal',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.8064, height: 0.48, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_horizontal',
      slots: [
      { x: 0.0968, y: 0.362, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.638, width: 0.8064, height: 0.252, aspectRatio: [4, 3] },
      ],
    },
    {
      variantId: 'two_vertical',
      slots: [
      { x: 0.0968, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.5, width: 0.3864, height: 0.504, aspectRatio: [3, 4] },
      ],
    },
    {
      variantId: 'three_hero',
      slots: [
      { x: 0.0968, y: 0.38, width: 0.8064, height: 0.312, aspectRatio: [4, 3] },
      { x: 0.0968, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      { x: 0.5168, y: 0.662, width: 0.3864, height: 0.228, aspectRatio: [3, 4] },
      ],
    },
    ],
  },
  },
  diary_interior_brown: {
    '5': blankPageLayouts(),
  },
  family_blank: blankAlbumPages(20, BLANK_PAGE_SAFE_18X24),
  holidays_blank: blankAlbumPages(20, BLANK_PAGE_SAFE_18X24),
  family_blank_21x21: blankAlbumPages(20, BLANK_PAGE_SAFE_21X21),
};

export function getPhotoPageLayouts(
  lineGuideId: string,
  page: number,
): PhotoPageLayouts {
  const { resolvePhotoPageLayouts } = require('@/utils/resolvePhotoPageLayouts') as typeof import('@/utils/resolvePhotoPageLayouts');
  return resolvePhotoPageLayouts(lineGuideId, page);
}
export function getPhotoSlotAspectRatio(
  lineGuideId: string,
  page: number,
  variantId: string,
  slotIndex: number,
): [number, number] | undefined {
  const resolvedVariantId = variantId === 'two_stacked' ? 'two_vertical' : normalizeDesignedAlbumVariantId(variantId);
  const pageLayouts = getPhotoPageLayouts(lineGuideId, page);
  const slot =
    pageLayouts.variants.find((v) => v.variantId === resolvedVariantId)?.slots[slotIndex] ??
    pageLayouts.variants.find((v) => v.variantId === variantId)?.slots[slotIndex];
  return slot?.aspectRatio;
}
