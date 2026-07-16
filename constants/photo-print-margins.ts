import type { PhotoPageLayouts } from '@/constants/photo-slots';
import { getSparsePhotoAlbumConfig } from '@/constants/sparse-photo-album-config';

/** Минимальный отступ фото от обреза листа (10 мм на альбоме 210×210). */
export const PRINT_PHOTO_MARGIN_MM = 10;

/** Отступ от края листа на страницах только с фото (2 см). */
export const PHOTO_ONLY_PAGE_MARGIN_MM = 20;

/** Поле pinch/zoom на разреженных страницах (мало строк текста). */
export const SPARSE_PHOTO_ZOOM_MARGIN_MM = 15;

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

function usesSparsePhotoZoomMargins(lineGuideId: string): boolean {
  return (
    lineGuideId === 'pregnancy_60' ||
    lineGuideId === 'pregnancy_a5' ||
    lineGuideId === 'kids_48'
  );
}

/** Blank Семья / Свадьба / Праздники — те же 1.5 см, что sparse zoom. */
export function isBlankPrintAlbum(lineGuideId: string): boolean {
  return (
    lineGuideId === 'family_blank' ||
    lineGuideId === 'family_blank_21x21' ||
    lineGuideId === 'holidays_blank'
  );
}

function usesFifteenMmPhotoMargins(lineGuideId: string): boolean {
  return usesSparsePhotoZoomMargins(lineGuideId) || isBlankPrintAlbum(lineGuideId);
}

/** Физический размер страницы альбома в мм (для нормализованных полей). */
export function getAlbumPageSizeMm(lineGuideId: string): AlbumPageSizeMm {
  if (
    lineGuideId === 'diary_interior_brown' ||
    lineGuideId === 'diary_interior_purple' ||
    lineGuideId === 'pregnancy_60'
  ) {
    return { widthMm: 180, heightMm: 240 };
  }
  if (lineGuideId === 'family_blank' || lineGuideId === 'holidays_blank') {
    return { widthMm: 180, heightMm: 240 };
  }

  const sparseConfig = getSparsePhotoAlbumConfig(lineGuideId);
  if (sparseConfig?.pageWidthMm != null && sparseConfig?.pageHeightMm != null) {
    return { widthMm: sparseConfig.pageWidthMm, heightMm: sparseConfig.pageHeightMm };
  }
  const sparseSide = sparseConfig?.pageSizeMm;
  const side = sparseSide ?? 210;
  return { widthMm: side, heightMm: side };
}

export function getDefaultPagePhotoBounds(
  pageWidthMm = 210,
  pageHeightMm?: number,
): PagePhotoBounds {
  const heightMm = pageHeightMm ?? pageWidthMm;
  return {
    left: PRINT_PHOTO_MARGIN_MM / pageWidthMm,
    top: PRINT_PHOTO_MARGIN_MM / heightMm,
    right: 1 - PRINT_PHOTO_MARGIN_MM / pageWidthMm,
    bottom: 1 - PRINT_PHOTO_MARGIN_MM / heightMm,
  };
}

/** Поле перемещения фото на страницах без текстовых полей.
 * Pregnancy / kids / blank: 1.5 см; остальные designed photo-only: 2 см. */
export function getPhotoOnlyPageBounds(lineGuideId: string): PagePhotoBounds {
  if (usesFifteenMmPhotoMargins(lineGuideId)) {
    return getSparsePhotoZoomBounds(lineGuideId);
  }
  const { widthMm, heightMm } = getAlbumPageSizeMm(lineGuideId);
  return {
    left: PHOTO_ONLY_PAGE_MARGIN_MM / widthMm,
    top: PHOTO_ONLY_PAGE_MARGIN_MM / heightMm,
    right: 1 - PHOTO_ONLY_PAGE_MARGIN_MM / widthMm,
    bottom: 1 - PHOTO_ONLY_PAGE_MARGIN_MM / heightMm,
  };
}

/** Поле pinch/zoom на разреженных страницах — 1.5 см от края листа. */
export function getSparsePhotoZoomBounds(lineGuideId: string): PagePhotoBounds {
  const { widthMm, heightMm } = getAlbumPageSizeMm(lineGuideId);
  const left = SPARSE_PHOTO_ZOOM_MARGIN_MM / widthMm;
  const top = SPARSE_PHOTO_ZOOM_MARGIN_MM / heightMm;
  return {
    left,
    top,
    right: 1 - left,
    bottom: 1 - top,
  };
}

function clampSlotToBounds(
  slot: {
    x: number;
    y: number;
    width: number;
    height: number;
    aspectRatio?: [number, number];
    shape?: 'rect' | 'circle';
  },
  bounds: PagePhotoBounds,
) {
  const maxWidth = bounds.right - bounds.left;
  const maxHeight = bounds.bottom - bounds.top;

  let width = Math.min(slot.width, maxWidth);
  let height = Math.min(slot.height, maxHeight);

  const isSquare = slot.aspectRatio?.[0] === 1 && slot.aspectRatio?.[1] === 1;
  if (isSquare) {
    const side = Math.min(width, height, maxWidth, maxHeight);
    width = side;
    height = side;
  }

  const isCircle = slot.shape === 'circle';
  // Circle slots: x/y = center. Keep center, clamp inside bounds.
  if (isCircle) {
    let centerX = slot.x;
    let centerY = slot.y;
    centerX = Math.min(
      Math.max(centerX, bounds.left + width / 2),
      bounds.right - width / 2,
    );
    centerY = Math.min(
      Math.max(centerY, bounds.top + height / 2),
      bounds.bottom - height / 2,
    );
    return {
      ...slot,
      x: centerX,
      y: centerY,
      width,
      height,
    };
  }

  // Rect slots: x = left edge, y = vertical center.
  // Keep left edge when shrinking (don't re-center — that shifted photos right
  // relative to the design frame when only the right edge overflowed).
  let x = slot.x;
  if (x < bounds.left) x = bounds.left;
  if (x + width > bounds.right) x = bounds.right - width;
  if (x < bounds.left) {
    x = bounds.left;
    width = maxWidth;
  }

  let centerY = slot.y;
  centerY = Math.min(
    Math.max(centerY, bounds.top + height / 2),
    bounds.bottom - height / 2,
  );

  return {
    ...slot,
    x,
    y: centerY,
    width,
    height,
  };
}

/** Удерживает все слоты внутри типографских полей (не касаются обреза). */
export function clampPhotoPageLayoutsToPrintMargins(
  layouts: PhotoPageLayouts,
  lineGuideIdOrWidthMm: string | number = 210,
  pageHeightMm?: number,
): PhotoPageLayouts {
  const bounds =
    typeof lineGuideIdOrWidthMm === 'string'
      ? usesFifteenMmPhotoMargins(lineGuideIdOrWidthMm)
        ? getSparsePhotoZoomBounds(lineGuideIdOrWidthMm)
        : getDefaultPagePhotoBounds(...Object.values(getAlbumPageSizeMm(lineGuideIdOrWidthMm)))
      : getDefaultPagePhotoBounds(lineGuideIdOrWidthMm, pageHeightMm);

  return {
    variants: layouts.variants.map((variant) => ({
      ...variant,
      slots: variant.slots.map((slot) => clampSlotToBounds(slot, bounds)),
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
