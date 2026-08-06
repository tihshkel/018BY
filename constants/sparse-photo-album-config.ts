import { LINE_SLOTS, type NormalizedLineSlot } from '@/constants/line-slots';
import type { SafeZone } from '@/constants/photo-layout-templates';

/** Sync with SPARSE_PHOTO_ZOOM_MARGIN_MM in photo-print-margins.ts (avoid cycle). */
const BLANK_PRINT_MARGIN_MM = 15;

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

/**
 * Единый стандарт: свободные страницы «только фото + подписи»
 * (pregnancy / kids / holidays / diary) — шаблоны ≈ 80% листа.
 * Blank / свадьба не используют эту зону.
 */
export const PHOTO_ONLY_PAGE_SAFE: SafeZone = {
  x: 0.1,
  y: 0.1,
  width: 0.8,
  height: 0.8,
};

/** Event / diary / kids / birthday free — тот же 80% стандарт. */
export const EVENT_PHOTO_SAFE: SafeZone = PHOTO_ONLY_PAGE_SAFE;

/** Pregnancy weekly / mixed — зона между текстом, не 80% листа. */
export const PREGNANCY_PHOTO_SAFE: SafeZone = {
  x: 0.05,
  y: 0.14,
  width: 0.9,
  height: 0.76,
};

/** Крупная зона (≥ ~72%) — заполняем слоты без сжатия 4:3/3:4. */
export function isLargePhotoSafeZone(safeZone: SafeZone): boolean {
  return safeZone.width >= 0.72 && safeZone.height >= 0.72;
}

/** Альбомы, где на photo-only страницах раздуваем шаблоны до PHOTO_ONLY_PAGE_SAFE. */
export function isDesignedFreePhotoExpandAlbum(lineGuideId: string): boolean {
  return (
    lineGuideId === 'pregnancy_60' ||
    lineGuideId === 'pregnancy_a5' ||
    lineGuideId === 'kids_48' ||
    lineGuideId === 'holidays_birthday_60' ||
    lineGuideId === 'diary_interior_brown' ||
    lineGuideId === 'diary_interior_purple'
  );
}

/** Printable zone for blank pages — 15 mm from trim (same as sparse zoom). */
export function getBlankPagePhotoSafe(widthMm: number, heightMm: number): SafeZone {
  const left = BLANK_PRINT_MARGIN_MM / widthMm;
  const top = BLANK_PRINT_MARGIN_MM / heightMm;
  return {
    x: left,
    y: top,
    width: 1 - 2 * left,
    height: 1 - 2 * top,
  };
}

/** 180×240 mm blank (family / holidays portrait). */
export const BLANK_PAGE_PHOTO_SAFE_18X24: SafeZone = getBlankPagePhotoSafe(180, 240);

/** 210×210 mm blank (wedding / family square). */
export const BLANK_PAGE_PHOTO_SAFE_21X21: SafeZone = getBlankPagePhotoSafe(210, 210);

/** @deprecated Prefer format-specific safe zones; kept as 18×24 alias. */
export const BLANK_PAGE_PHOTO_SAFE: SafeZone = BLANK_PAGE_PHOTO_SAFE_18X24;

/** Side-by-side two-photo + полная ширина band (в т.ч. стою / крещение / месяцы). */
const KIDS_SIDE_BY_SIDE = new Set([
  1, 3, 4, 8, 13, 19, 20, 21,
  22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
]);
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
    photoBandMaxBottom: 0.92,
  }),
  pregnancy_60: config({
    eventSafe: PREGNANCY_PHOTO_SAFE,
    pageSizeMm: 180,
    pageWidthMm: 180,
    pageHeightMm: 240,
    photoBandMaxBottom: 0.95,
  }),
  pregnancy_a5: config({
    eventSafe: PREGNANCY_PHOTO_SAFE,
    pageSizeMm: 210,
    photoBandMaxBottom: 0.95,
  }),
  holidays_birthday_60: config({
    eventSafe: EVENT_PHOTO_SAFE,
    excludePages: BIRTHDAY_EXCLUDE_PAGES,
    photoBandMaxBottom: 0.92,
  }),
  diary_interior_brown: config({
    eventSafe: EVENT_PHOTO_SAFE,
    photoBandMaxBottom: 0.92,
  }),
  diary_interior_purple: config({
    eventSafe: EVENT_PHOTO_SAFE,
    gapMm: 3,
    photoBandMaxBottom: 0.92,
  }),
  family_blank: config({
    eventSafe: BLANK_PAGE_PHOTO_SAFE_18X24,
    pageSizeMm: 180,
    pageWidthMm: 180,
    pageHeightMm: 240,
    photoBandMaxBottom: 1 - BLANK_PRINT_MARGIN_MM / 240,
  }),
  holidays_blank: config({
    eventSafe: BLANK_PAGE_PHOTO_SAFE_18X24,
    pageSizeMm: 180,
    pageWidthMm: 180,
    pageHeightMm: 240,
    photoBandMaxBottom: 1 - BLANK_PRINT_MARGIN_MM / 240,
  }),
  family_blank_21x21: config({
    eventSafe: BLANK_PAGE_PHOTO_SAFE_21X21,
    pageSizeMm: 210,
    pageWidthMm: 210,
    pageHeightMm: 210,
    photoBandMaxBottom: 1 - BLANK_PRINT_MARGIN_MM / 210,
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
  // p1 «У нас будет малыш» — фото под анкетой. Ложный OCR внизу A5
  // иначе даёт weekly_middle и узкую полосу.
  if (
    (lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5') &&
    page === 1
  ) {
    return 'bottom_band';
  }

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

/**
 * 2×2 + подписи под фото — целевые designed-альбомы на free/caption страницах.
 */
export function shouldReserveFourGridCaptionRows(lineGuideId: string, _page?: number): boolean {
  return (
    lineGuideId === 'holidays_birthday_60' ||
    lineGuideId === 'pregnancy_60' ||
    lineGuideId === 'pregnancy_a5' ||
    lineGuideId === 'kids_48' ||
    lineGuideId === 'diary_interior_brown' ||
    lineGuideId === 'diary_interior_purple'
  );
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
