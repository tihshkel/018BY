/**
 * Normalized photo placement regions (0–1 relative to page PNG).
 * y is the vertical center of the slot, matching line-slots convention.
 */

import {
  buildPageLayoutsFromTemplates,
  type SafeZone,
} from '@/constants/photo-layout-templates';
import { getPageAspectRatio } from '@/utils/photoSlotAspect';
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
  x: 0.05,
  y: 0.14,
  width: 0.9,
  height: 0.76,
};

const EVENT_PHOTO_SAFE: SafeZone = {
  x: 0.04,
  y: 0.06,
  width: 0.92,
  height: 0.82,
};

const BLANK_PAGE_SAFE: SafeZone = {
  x: 0.05,
  y: 0.05,
  width: 0.9,
  height: 0.84,
};

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

function layoutsFromTemplates(
  safeZone: SafeZone,
  templateIds: readonly string[],
  lineGuideId?: string,
): PhotoPageLayouts {
  return buildPageLayoutsFromTemplates(
    safeZone,
    [...templateIds],
    getPageAspectRatio(lineGuideId),
  ) as PhotoPageLayouts;
}

/** «Люблю» / memory block (p56–59): center zone below title, above rose decor */
const PREGNANCY_MEMORY_PHOTO_SAFE: SafeZone = {
  x: 0.04,
  y: 0.08,
  width: 0.92,
  height: 0.72,
};

function pregnancyMemoryPhotoLayouts(): PhotoPageLayouts {
  return layoutsFromTemplates(PREGNANCY_MEMORY_PHOTO_SAFE, FULL_PHOTO_TEMPLATES, 'pregnancy_60');
}

const PREGNANCY_60_MEMORY_PAGES = [56, 57, 58, 59];

function pregnancyPhotoLayouts(): PhotoPageLayouts {
  return layoutsFromTemplates(PREGNANCY_PHOTO_SAFE, FULL_PHOTO_TEMPLATES, 'pregnancy_a5');
}

function eventPhotoLayouts(): PhotoPageLayouts {
  return layoutsFromTemplates(EVENT_PHOTO_SAFE, EVENT_PHOTO_TEMPLATES);
}

export { EVENT_PHOTO_TEMPLATES, eventPhotoLayouts };

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
    ...repeatPhotoLayout(PREGNANCY_60_MEMORY_PAGES, pregnancyMemoryPhotoLayouts()),
  },
  pregnancy_a5: {
    '46': pregnancyPhotoLayouts(),
    '47': pregnancyPhotoLayouts(),
    '48': pregnancyPhotoLayouts(),
  },
  kids_48: {},
  holidays_birthday_60: {
    '2': BIRTHDAY_HELLO_PHOTO_LAYOUT,
    ...repeatPhotoLayout(BIRTHDAY_AGE_PAGES, BIRTHDAY_AGE_PHOTO_LAYOUT),
    ...repeatPhotoLayout(BIRTHDAY_FREE_PAGES, blankPageLayouts()),
    ...repeatPhotoLayout(BIRTHDAY_CAPTION_PAGES, blankPageLayouts()),
  },
  diary_interior_brown: {
    '5': blankPageLayouts(),
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
  const resolvedVariantId = variantId === 'two_stacked' ? 'two_vertical' : normalizeDesignedAlbumVariantId(variantId);
  const pageLayouts = getPhotoPageLayouts(lineGuideId, page);
  const slot =
    pageLayouts.variants.find((v) => v.variantId === resolvedVariantId)?.slots[slotIndex] ??
    pageLayouts.variants.find((v) => v.variantId === variantId)?.slots[slotIndex];
  return slot?.aspectRatio;
}
