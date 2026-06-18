/**
 * Normalized photo placement regions (0–1 relative to page PNG).
 * y is the vertical center of the slot, matching line-slots convention.
 */

import {
  buildPageLayoutsFromTemplates,
  type SafeZone,
} from '@/constants/photo-layout-templates';

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
  x: 0.08,
  y: 0.2,
  width: 0.84,
  height: 0.6,
};

const BLANK_PAGE_SAFE: SafeZone = {
  x: 0.1,
  y: 0.15,
  width: 0.8,
  height: 0.7,
};

const KIDS_P1_SAFE: SafeZone = { x: 0.19, y: 0.17, width: 0.62, height: 0.14 };
const KIDS_P3_SAFE: SafeZone = { x: 0.15, y: 0.27, width: 0.7, height: 0.22 };
const KIDS_P4_SAFE: SafeZone = { x: 0.12, y: 0.08, width: 0.76, height: 0.28 };
const KIDS_P21_SAFE: SafeZone = { x: 0.1, y: 0.2, width: 0.8, height: 0.3 };

const FULL_PHOTO_TEMPLATES = [
  'one_large',
  'two_photos',
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

const STRUCTURED_TWO_TEMPLATES = ['one_horizontal', 'two_vertical'] as const;

const GODPARENTS_VARIANTS: PhotoVariantLayout[] = [
  {
    variantId: 'one_horizontal_common',
    slots: [{ x: 0.16, y: 0.35, width: 0.68, height: 0.3, aspectRatio: [4, 3] }],
  },
  {
    variantId: 'two_vertical_separate',
    slots: [
      { x: 0.1, y: 0.35, width: 0.38, height: 0.3, aspectRatio: [3, 4] },
      { x: 0.52, y: 0.35, width: 0.38, height: 0.3, aspectRatio: [3, 4] },
    ],
  },
];

function layoutsFromTemplates(safeZone: SafeZone, templateIds: readonly string[]): PhotoPageLayouts {
  return buildPageLayoutsFromTemplates(safeZone, [...templateIds]) as PhotoPageLayouts;
}

function pregnancyPhotoLayouts(): PhotoPageLayouts {
  return layoutsFromTemplates(PREGNANCY_PHOTO_SAFE, FULL_PHOTO_TEMPLATES);
}

function eventPhotoLayouts(): PhotoPageLayouts {
  return layoutsFromTemplates(EVENT_PHOTO_SAFE, EVENT_PHOTO_TEMPLATES);
}

function blankPageLayouts(): PhotoPageLayouts {
  return layoutsFromTemplates(BLANK_PAGE_SAFE, FULL_PHOTO_TEMPLATES);
}

/** Fallback for photo/event pages without explicit profile */
export const DEFAULT_PHOTO_PAGE_LAYOUTS: PhotoPageLayouts = blankPageLayouts();

function eventPages(pages: number[]): Record<string, PhotoPageLayouts> {
  const layout = eventPhotoLayouts();
  return Object.fromEntries(pages.map((p) => [String(p), layout]));
}

function blankAlbumPages(count: number): Record<string, PhotoPageLayouts> {
  const layout = blankPageLayouts();
  return Object.fromEntries(
    Array.from({ length: count }, (_, i) => [String(i + 1), layout]),
  );
}

/** Нижняя зона «Место для фото» на недельных страницах беременности */
const PREGNANCY_WEEKLY_PHOTO_LAYOUT: PhotoPageLayouts = {
  variants: [
    {
      variantId: 'one_horizontal',
      slots: [{ x: 0.1, y: 0.85, width: 0.8, height: 0.22, aspectRatio: [4, 3] }],
    },
  ],
};

function repeatPhotoLayout(
  pageNumbers: number[],
  layout: PhotoPageLayouts,
): Record<string, PhotoPageLayouts> {
  return Object.fromEntries(pageNumbers.map((page) => [String(page), layout]));
}

const PREGNANCY_60_WEEKLY_PAGES = [
  ...Array.from({ length: 9 }, (_, index) => index + 9),
  ...Array.from({ length: 14 }, (_, index) => index + 19),
  ...Array.from({ length: 14 }, (_, index) => index + 34),
];
const PREGNANCY_A5_WEEKLY_PAGES = [
  ...Array.from({ length: 9 }, (_, index) => index + 5),
  ...Array.from({ length: 14 }, (_, index) => index + 15),
  ...Array.from({ length: 14 }, (_, index) => index + 30),
];

export const PHOTO_SLOTS: Record<string, Record<string, PhotoPageLayouts>> = {
    pregnancy_60: {
    ...repeatPhotoLayout(PREGNANCY_60_WEEKLY_PAGES, PREGNANCY_WEEKLY_PHOTO_LAYOUT),
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
    ...repeatPhotoLayout(PREGNANCY_A5_WEEKLY_PAGES, PREGNANCY_WEEKLY_PHOTO_LAYOUT),
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
  family_blank: blankAlbumPages(20),
  holidays_blank: blankAlbumPages(20),
  family_blank_21x21: blankAlbumPages(20),
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
  const resolvedVariantId = variantId === 'two_stacked' ? 'two_photos' : variantId;
  const pageLayouts = getPhotoPageLayouts(lineGuideId, page);
  const slot =
    pageLayouts.variants.find((v) => v.variantId === resolvedVariantId)?.slots[slotIndex] ??
    pageLayouts.variants.find((v) => v.variantId === variantId)?.slots[slotIndex];
  return slot?.aspectRatio;
}
