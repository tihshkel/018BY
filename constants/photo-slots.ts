/**
 * Normalized photo placement regions (0–1 relative to page PNG).
 * y is the vertical center of the slot, matching line-slots convention.
 */

import {
  buildPageLayoutsFromTemplates,
  type SafeZone,
} from '@/constants/photo-layout-templates';
import { PHOTO_ONLY_PAGE_SAFE } from '@/constants/sparse-photo-album-config';
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
  /** Index in variant.slots — used by family-tree picker. */
  slotIndex?: number;
};

export type PhotoVariantLayout = {
  variantId: string;
  slots: NormalizedPhotoSlot[];
};

export type PhotoPageLayouts = {
  variants: PhotoVariantLayout[];
};

export { PHOTO_ONLY_PAGE_SAFE };

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

function layoutsFromTemplates(
  safeZone: SafeZone,
  templateIds: readonly string[],
  options?: { reserveCaptionRows?: boolean; fillSafeZoneSlots?: boolean },
): PhotoPageLayouts {
  return buildPageLayoutsFromTemplates(safeZone, [...templateIds], options) as PhotoPageLayouts;
}

/** Photo-only pages: ~80% листа во всех целевых альбомах. */
function photoOnlyPageLayouts(options?: { reserveCaptionRows?: boolean }): PhotoPageLayouts {
  return layoutsFromTemplates(PHOTO_ONLY_PAGE_SAFE, FULL_PHOTO_TEMPLATES, {
    fillSafeZoneSlots: true,
    reserveCaptionRows: options?.reserveCaptionRows ?? true,
  });
}

function pregnancyMemoryPhotoLayouts(): PhotoPageLayouts {
  return photoOnlyPageLayouts({ reserveCaptionRows: true });
}

const PREGNANCY_60_MEMORY_PAGES = [56, 57, 58, 59];

function pregnancyPhotoLayouts(): PhotoPageLayouts {
  return photoOnlyPageLayouts({ reserveCaptionRows: true });
}

function eventPhotoLayouts(): PhotoPageLayouts {
  return layoutsFromTemplates(PHOTO_ONLY_PAGE_SAFE, EVENT_PHOTO_TEMPLATES, {
    fillSafeZoneSlots: true,
  });
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

/** Manual primary slots for holidays birthday — sparse expand режет зону по line-slots. */
function buildHolidaysBirthdayPhotoSlots(): Record<string, PhotoPageLayouts> {
  const slots: Record<string, PhotoPageLayouts> = {
    '2': BIRTHDAY_HELLO_PHOTO_LAYOUT,
  };
  for (const page of BIRTHDAY_AGE_PAGES) {
    slots[String(page)] = BIRTHDAY_AGE_PHOTO_LAYOUT;
  }
  // Свободные / caption-страницы — единый ~80% стандарт (как pregnancy/kids/diary).
  const freeLayout = photoOnlyPageLayouts({ reserveCaptionRows: true });
  for (const page of BIRTHDAY_FREE_PAGES) {
    slots[String(page)] = freeLayout;
  }
  for (const page of BIRTHDAY_CAPTION_PAGES) {
    slots[String(page)] = freeLayout;
  }
  return slots;
}

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
  diary_interior_brown: {
    '5': photoOnlyPageLayouts({ reserveCaptionRows: true }),
  },
  /** «Дни рождения» 21×21 — p2 «Привет, мир!» + age/free/caption через sparse. */
  holidays_birthday_60: buildHolidaysBirthdayPhotoSlots(),
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
