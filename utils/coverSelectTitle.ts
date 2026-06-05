import { getGiftDisplayTitle } from '@/utils/albumGiftMapping';
import { getCoverSku } from '@/utils/coverSkuMapping';
import { getDiaryCoverById } from '@/utils/diaryAlbumsLoader';
import { FAMILY_COVER_DESIGNS } from '@/utils/familyCoverDesigns';
import { HOLIDAY_COVER_DESIGNS } from '@/utils/holidayCoverDesigns';
import { KIDS_COVER_DESIGNS } from '@/utils/kidsCoverDesigns';
import { PREGNANCY_COVER_DESIGNS } from '@/utils/pregnancyCoverDesigns';

type CoverDesignEntry = { id: string; sku: string; title: string };

const COVER_DESIGN_BY_ID: Record<string, CoverDesignEntry> = {};

for (const design of [
  ...PREGNANCY_COVER_DESIGNS,
  ...KIDS_COVER_DESIGNS,
  ...HOLIDAY_COVER_DESIGNS,
  ...FAMILY_COVER_DESIGNS,
]) {
  COVER_DESIGN_BY_ID[design.id] = design;
}

const CATEGORY_DEFAULT_FALLBACK: Record<string, string> = {
  pregnancy: 'Дневник беременности',
  kids: 'Фотоальбом от 0 до 1 года',
  holidays: 'Праздничный альбом',
  family: 'Семейный альбом',
  diary: 'Личный дневник',
};

function isSkuLikeTitle(title: string, sku: string): boolean {
  const normalized = title.trim().toUpperCase();
  return normalized === sku.toUpperCase() || normalized === sku.replace(/^DFA/i, 'DFA').toUpperCase();
}

function getReadableDesignFallback(design: CoverDesignEntry | undefined, celebration: string): string {
  if (!design) {
    return CATEGORY_DEFAULT_FALLBACK[celebration] ?? '';
  }
  const designTitle = design.title?.trim();
  if (designTitle && !isSkuLikeTitle(designTitle, design.sku)) {
    return designTitle;
  }
  return CATEGORY_DEFAULT_FALLBACK[celebration] ?? designTitle ?? '';
}

/** Название обложки для экрана выбора — из каталога (GIFT_ITEMS) по SKU. */
export function getCoverSelectTitleBySku(sku: string, celebration: string): string {
  if (celebration === 'holidays' || celebration === 'family') {
    const design = Object.values(COVER_DESIGN_BY_ID).find((entry) => entry.sku === sku);
    return design?.title?.trim() || CATEGORY_DEFAULT_FALLBACK[celebration] || '';
  }

  const design = Object.values(COVER_DESIGN_BY_ID).find((entry) => entry.sku === sku);
  const fallback = getReadableDesignFallback(design, celebration);
  return getGiftDisplayTitle(sku, fallback);
}

/** Название обложки по id (coverType) и разделу. */
export function getCoverSelectTitle(coverType: string, celebration: string): string {
  const design = COVER_DESIGN_BY_ID[coverType];
  const fallback = getReadableDesignFallback(design, celebration);

  const diaryCover = celebration === 'diary' ? getDiaryCoverById(coverType) : null;
  if (diaryCover?.sku) {
    return getGiftDisplayTitle(
      diaryCover.sku,
      diaryCover.name?.trim() || fallback || CATEGORY_DEFAULT_FALLBACK.diary
    );
  }

  const sku = design?.sku ?? getCoverSku(coverType, celebration);
  if (sku && celebration !== 'holidays' && celebration !== 'family') {
    return getGiftDisplayTitle(sku, fallback);
  }

  if (design?.title?.trim()) {
    return design.title.trim();
  }

  return fallback;
}
