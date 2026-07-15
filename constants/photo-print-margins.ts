import type { PhotoPageLayouts } from '@/constants/photo-slots';
import { getSparsePhotoAlbumConfig } from '@/constants/sparse-photo-album-config';
import { fitNormalizedSlotToAspect } from '@/utils/photoSlotAspect';

/** Минимальный отступ фото от обреза листа (10 мм на альбоме 210×210). */
export const PRINT_PHOTO_MARGIN_MM = 10;

/** Отступ от края листа на страницах только с фото (2 см). */
export const PHOTO_ONLY_PAGE_MARGIN_MM = 20;

export const PRINT_PHOTO_MARGIN_NORM = PRINT_PHOTO_MARGIN_MM / 210;

export type PagePhotoBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type AlbumPageSizeMm = {
  widthMm: number;
  heightMm: number;
};

/** Физический размер страницы альбома в мм (для нормализованных полей). */
export function getAlbumPageSizeMm(lineGuideId: string): AlbumPageSizeMm {
  if (
    lineGuideId === 'diary_interior_brown' ||
    lineGuideId === 'diary_interior_purple' ||
    lineGuideId === 'family_blank' ||
    lineGuideId === 'holidays_blank' ||
    lineGuideId === 'pregnancy_60' ||
    lineGuideId === 'pregnancy_a5' ||
    lineGuideId === 'holidays_birthday_60'
  ) {
    return { widthMm: 180, heightMm: 240 };
  }
  if (lineGuideId === 'kids_48' || lineGuideId === 'family_blank_21x21') {
    return { widthMm: 210, heightMm: 210 };
  }

  const sparseSide = getSparsePhotoAlbumConfig(lineGuideId)?.pageSizeMm;
  const side = sparseSide ?? 210;
  return { widthMm: side, heightMm: side };
}

export function getDefaultPagePhotoBounds(pageSizeMm = 210): PagePhotoBounds {
  const inset = PRINT_PHOTO_MARGIN_MM / pageSizeMm;
  return {
    left: inset,
    top: inset,
    right: 1 - inset,
    bottom: 1 - inset,
  };
}

/** Поле перемещения фото на страницах без текстовых полей — 2 см от каждого края листа. */
export function getPhotoOnlyPageBounds(lineGuideId: string): PagePhotoBounds {
  const { widthMm, heightMm } = getAlbumPageSizeMm(lineGuideId);
  return {
    left: PHOTO_ONLY_PAGE_MARGIN_MM / widthMm,
    top: PHOTO_ONLY_PAGE_MARGIN_MM / heightMm,
    right: 1 - PHOTO_ONLY_PAGE_MARGIN_MM / widthMm,
    bottom: 1 - PHOTO_ONLY_PAGE_MARGIN_MM / heightMm,
  };
}

function clampSlotToBounds(
  slot: {
    x: number;
    y: number;
    width: number;
    height: number;
    aspectRatio?: [number, number];
  },
  bounds: PagePhotoBounds,
  pageAspect = 1,
) {
  const maxWidth = bounds.right - bounds.left;
  const maxHeight = bounds.bottom - bounds.top;

  let width = Math.min(slot.width, maxWidth);
  let height = Math.min(slot.height, maxHeight);

  if (slot.aspectRatio) {
    const fitted = fitNormalizedSlotToAspect(width, height, pageAspect, slot.aspectRatio);
    width = fitted.width;
    height = fitted.height;
  }

  const centerX = Math.min(
    Math.max(slot.x + slot.width / 2, bounds.left + width / 2),
    bounds.right - width / 2,
  );
  const centerY = Math.min(
    Math.max(slot.y, bounds.top + height / 2),
    bounds.bottom - height / 2,
  );

  return {
    ...slot,
    x: centerX - width / 2,
    y: centerY,
    width,
    height,
  };
}

/** Удерживает все слоты внутри типографских полей (не касаются обреза). */
export function clampPhotoPageLayoutsToPrintMargins(
  layouts: PhotoPageLayouts,
  pageSizeMm = 210,
  lineGuideId?: string,
): PhotoPageLayouts {
  const albumSize = lineGuideId ? getAlbumPageSizeMm(lineGuideId) : null;
  const pageAspect = albumSize
    ? albumSize.heightMm / albumSize.widthMm
    : 1;
  const bounds = getDefaultPagePhotoBounds(pageSizeMm);

  return {
    variants: layouts.variants.map((variant) => ({
      ...variant,
      slots: variant.slots.map((slot) => clampSlotToBounds(slot, bounds, pageAspect)),
    })),
  };
}

export function getSlotPageMarginsMm(
  slot: { x: number; y: number; width: number; height: number },
  pageSizeMm = 210,
): { left: number; top: number; right: number; bottom: number } {
  const top = slot.y - slot.height / 2;
  const bottom = slot.y + slot.height / 2;
  const right = slot.x + slot.width;
  return {
    left: Math.round(slot.x * pageSizeMm),
    top: Math.round(top * pageSizeMm),
    right: Math.round((1 - right) * pageSizeMm),
    bottom: Math.round((1 - bottom) * pageSizeMm),
  };
}

export function minSlotPageMarginMm(
  slot: { x: number; y: number; width: number; height: number },
  pageSizeMm = 210,
): number {
  const m = getSlotPageMarginsMm(slot, pageSizeMm);
  return Math.min(m.left, m.top, m.right, m.bottom);
}
