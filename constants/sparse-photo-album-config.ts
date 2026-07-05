import { LINE_SLOTS, type NormalizedLineSlot } from '@/constants/line-slots';
import type { SafeZone } from '@/constants/photo-layout-templates';

export type AlbumSparsePhotoConfig = {
  eventSafe: SafeZone;
  gapMm: number;
  /** @deprecated use pageWidthMm/pageHeightMm for non-square albums */
  pageSizeMm: number;
  pageWidthMm?: number;
  pageHeightMm?: number;
  sparseMaxLineSlots: number;
  sideBySideTwoPhotoPages?: ReadonlySet<number>;
  excludePages?: ReadonlySet<number>;
  photoBandMaxBottom?: number;
  stackedTwoMinBandHeight?: number;
  minFullWidthBandHeight?: number;
  minPhotoSafeHeight?: number;
};

export const EVENT_PHOTO_SAFE: SafeZone = {
  x: 0.08,
  y: 0.2,
  width: 0.84,
  height: 0.6,
};

export const PREGNANCY_PHOTO_SAFE: SafeZone = {
  x: 0.11,
  y: 0.26,
  width: 0.78,
  height: 0.5,
};

export const BLANK_PAGE_PHOTO_SAFE: SafeZone = {
  x: 0.1,
  y: 0.15,
  width: 0.8,
  height: 0.7,
};

const KIDS_SIDE_BY_SIDE = new Set([1, 3, 4, 8, 13, 21]);
const KIDS_EXCLUDE = new Set([5, 10, 11]);
const BIRTHDAY_EXCLUDE_PAGES = new Set([1, 40, 48]);

const DEFAULTS = {
  gapMm: 4,
  pageSizeMm: 210,
  sparseMaxLineSlots: 4,
  photoBandMaxBottom: 0.86,
  stackedTwoMinBandHeight: 0.54,
  minFullWidthBandHeight: 0.35,
  minPhotoSafeHeight: 0.12,
};

function config(partial: Omit<AlbumSparsePhotoConfig, 'gapMm' | 'pageSizeMm' | 'sparseMaxLineSlots'> & {
  gapMm?: number;
  pageSizeMm?: number;
  sparseMaxLineSlots?: number;
}): AlbumSparsePhotoConfig {
  return {
    gapMm: partial.gapMm ?? DEFAULTS.gapMm,
    pageSizeMm: partial.pageSizeMm ?? DEFAULTS.pageSizeMm,
    sparseMaxLineSlots: partial.sparseMaxLineSlots ?? DEFAULTS.sparseMaxLineSlots,
    photoBandMaxBottom: partial.photoBandMaxBottom ?? DEFAULTS.photoBandMaxBottom,
    stackedTwoMinBandHeight: partial.stackedTwoMinBandHeight ?? DEFAULTS.stackedTwoMinBandHeight,
    minFullWidthBandHeight: partial.minFullWidthBandHeight ?? DEFAULTS.minFullWidthBandHeight,
    minPhotoSafeHeight: partial.minPhotoSafeHeight ?? DEFAULTS.minPhotoSafeHeight,
    eventSafe: partial.eventSafe,
    sideBySideTwoPhotoPages: partial.sideBySideTwoPhotoPages,
    excludePages: partial.excludePages,
  };
}

export const SPARSE_PHOTO_ALBUM_CONFIG: Record<string, AlbumSparsePhotoConfig> = {
  kids_48: config({
    eventSafe: EVENT_PHOTO_SAFE,
    sideBySideTwoPhotoPages: KIDS_SIDE_BY_SIDE,
    excludePages: KIDS_EXCLUDE,
  }),
  pregnancy_60: config({
    eventSafe: PREGNANCY_PHOTO_SAFE,
    pageSizeMm: 180,
    pageWidthMm: 180,
    pageHeightMm: 240,
  }),
  pregnancy_a5: config({
    eventSafe: PREGNANCY_PHOTO_SAFE,
    pageSizeMm: 210,
  }),
  holidays_birthday_60: config({
    eventSafe: EVENT_PHOTO_SAFE,
    excludePages: BIRTHDAY_EXCLUDE_PAGES,
  }),
  diary_interior_brown: config({
    eventSafe: EVENT_PHOTO_SAFE,
  }),
  diary_interior_purple: config({
    eventSafe: EVENT_PHOTO_SAFE,
    gapMm: 3,
  }),
  family_blank: config({
    eventSafe: BLANK_PAGE_PHOTO_SAFE,
  }),
  holidays_blank: config({
    eventSafe: BLANK_PAGE_PHOTO_SAFE,
  }),
  family_blank_21x21: config({
    eventSafe: BLANK_PAGE_PHOTO_SAFE,
  }),
};

export function getSparsePhotoAlbumConfig(lineGuideId: string): AlbumSparsePhotoConfig | undefined {
  return SPARSE_PHOTO_ALBUM_CONFIG[lineGuideId];
}

export function hasSparsePhotoConfig(lineGuideId: string): boolean {
  return lineGuideId in SPARSE_PHOTO_ALBUM_CONFIG;
}

export function usesBlankPagePhotoFallback(lineGuideId: string): boolean {
  return (
    lineGuideId === 'family_blank' ||
    lineGuideId === 'holidays_blank' ||
    lineGuideId === 'family_blank_21x21'
  );
}

/** Недельные страницы: фото между верхним блоком полей и нижними заметками. */
export function isPregnancyWeeklyMiddlePage(lineGuideId: string, page: number): boolean {
  if (lineGuideId === 'pregnancy_60') {
    return (
      (page >= 9 && page <= 17) ||
      (page >= 19 && page <= 32) ||
      (page >= 34 && page <= 47)
    );
  }
  if (lineGuideId === 'pregnancy_a5') {
    return (
      (page >= 5 && page <= 13) ||
      (page >= 15 && page <= 28) ||
      (page >= 30 && page <= 43)
    );
  }
  return false;
}

/** Текст внизу страницы — фото в верхней полосе (p54/p46, pregnancy_a5 p48). */
export function isPregnancyUpperBandPage(lineGuideId: string, page: number): boolean {
  if (lineGuideId === 'pregnancy_60') return page === 54;
  if (lineGuideId === 'pregnancy_a5') return page === 46 || page === 48;
  return false;
}

/** PDF-рамка фото без sparse expansion — все designed-альбомы с PDF-слотом. */
export function prefersPdfPinnedPhotoLayout(lineGuideId: string, page: number): boolean {
  if (prefersManualPhotoLayout(lineGuideId, page)) return false;
  if (shouldSkipSparsePhotoExpansion(lineGuideId, page)) return false;
  if (usesBlankPagePhotoFallback(lineGuideId)) return false;
  return hasSparsePhotoConfig(lineGuideId);
}

/** Memory blocks (p56–59) use fixed manual layouts. */
export function prefersManualPhotoLayout(lineGuideId: string, page: number): boolean {
  if (lineGuideId === 'pregnancy_60') {
    return page >= 56 && page <= 59;
  }
  return false;
}

export function shouldSkipSparsePhotoExpansion(lineGuideId: string, page: number): boolean {
  if (prefersManualPhotoLayout(lineGuideId, page)) return true;
  const albumConfig = getSparsePhotoAlbumConfig(lineGuideId);
  if (!albumConfig) return true;
  if (albumConfig.excludePages?.has(page)) return true;
  return false;
}

export type PhotoSafeZoneStrategy =
  | 'photo_only'
  | 'bottom_band'
  | 'weekly_middle'
  | 'upper_band'
  | 'mixed';

function getPageLineSlots(lineGuideId: string, page: number): readonly NormalizedLineSlot[] {
  return (
    (LINE_SLOTS as Record<string, Record<string, readonly NormalizedLineSlot[]>>)[lineGuideId]?.[
      String(page)
    ] ?? []
  );
}

/** Авто-классификация safe zone по расположению line-slots (birthday, diary, blank). */
export function classifyPhotoSafeZoneStrategy(
  lineGuideId: string,
  page: number,
): PhotoSafeZoneStrategy {
  if (isPregnancyWeeklyMiddlePage(lineGuideId, page)) return 'weekly_middle';
  if (isPregnancyUpperBandPage(lineGuideId, page)) return 'upper_band';

  const slots = getPageLineSlots(lineGuideId, page);
  if (!slots.length) return 'photo_only';

  const upperLines = slots.filter((slot) => slot.y < 0.45);
  const lowerLines = slots.filter((slot) => slot.y > 0.65);
  if (upperLines.length > 0 && lowerLines.length > 0) return 'weekly_middle';

  const minTextTop = Math.min(...slots.map((slot) => slot.y - slot.height / 2));
  if (minTextTop > 0.55) return 'upper_band';

  const maxTextBottom = Math.max(...slots.map((slot) => slot.y + slot.height / 2));
  if (maxTextBottom < 0.55) return 'bottom_band';

  return 'mixed';
}

export function isBirthdayFreePage(page: number): boolean {
  if (page === 3 || page === 5) return true;
  return page >= 7 && page <= 39 && page % 2 === 1;
}

export function isBirthdayAgePage(page: number): boolean {
  return page === 4 || (page >= 6 && page <= 38 && page % 2 === 0);
}

export function isBirthdayCaptionPhotoPage(page: number): boolean {
  return page >= 41 && page <= 47;
}

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

export {
  BIRTHDAY_AGE_PAGES,
  BIRTHDAY_CAPTION_PAGES,
  BIRTHDAY_FREE_PAGES,
};
