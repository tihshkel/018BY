import type { PhotoSlotTransform } from '@/types/album-page-schema';
import { DEFAULT_PHOTO_SLOT_TRANSFORM } from '@/utils/photoSlotTransform';

/** Cover-fit size of the image layer inside a slot (scale = 1). */
export function computePhotoCoverSize(
  slotWidth: number,
  slotHeight: number,
  imageAspect: number,
): { width: number; height: number } {
  if (slotWidth <= 0 || slotHeight <= 0 || imageAspect <= 0) {
    return { width: slotWidth, height: slotHeight };
  }
  const slotAspect = slotWidth / slotHeight;
  if (imageAspect > slotAspect) {
    const height = slotHeight;
    return { width: height * imageAspect, height };
  }
  const width = slotWidth;
  return { width, height: width / imageAspect };
}

/** Scale multiplier so the entire image fits inside the slot (letterbox). */
export function computePhotoContainScale(
  slotWidth: number,
  slotHeight: number,
  imageAspect: number,
): number {
  const cover = computePhotoCoverSize(slotWidth, slotHeight, imageAspect);
  if (cover.width <= 0 || cover.height <= 0) return 1;
  return Math.min(slotWidth / cover.width, slotHeight / cover.height);
}

const LEGACY_CONTAIN_SCALE_TOLERANCE = 0.08;
const OFFSET_EPSILON = 0.001;

export type ResolvePhotoSlotTransformForDisplayOptions = {
  /**
   * Preview/export: any letterbox without pan → cover (fills landscape frame for portrait photos).
   * Editor: false — keep pinch-out contain so the user can still see the full image.
   */
  fillLetterbox?: boolean;
};

/**
 * Normalizes stored crop for display.
 * - Legacy auto-contain (scale ≈ minContain, no pan) → cover.
 * - fillLetterbox: any scale < 1 → cover (preview/export). Pan while letterboxed
 *   is not a useful crop for designed landscape pins with portrait photos.
 */
export function resolvePhotoSlotTransformForDisplay(
  transform: PhotoSlotTransform | undefined | null,
  slotWidth: number,
  slotHeight: number,
  imageAspect?: number,
  options?: ResolvePhotoSlotTransformForDisplayOptions,
): PhotoSlotTransform {
  const base = transform ?? DEFAULT_PHOTO_SLOT_TRANSFORM;
  const fillLetterbox = options?.fillLetterbox === true;
  const scale = base.scale ?? 1;
  const offsetX = base.offsetX ?? 0;
  const offsetY = base.offsetY ?? 0;
  const hasPan =
    Math.abs(offsetX) >= OFFSET_EPSILON || Math.abs(offsetY) >= OFFSET_EPSILON;

  if (fillLetterbox && scale < 1) {
    return { ...DEFAULT_PHOTO_SLOT_TRANSFORM };
  }

  if (!imageAspect || imageAspect <= 0 || slotWidth <= 0 || slotHeight <= 0) {
    return base;
  }

  if (!hasPan && scale < 1) {
    const minContain = computePhotoContainScale(slotWidth, slotHeight, imageAspect);
    if (Math.abs(scale - minContain) < LEGACY_CONTAIN_SCALE_TOLERANCE) {
      return { ...DEFAULT_PHOTO_SLOT_TRANSFORM };
    }
  }

  return base;
}

export function buildInitialPhotoSlotTransform(params: {
  slotAspect?: [number, number];
  imageWidth?: number;
  imageHeight?: number;
}): PhotoSlotTransform {
  // Cover-fill by default; gesture layer enforces minContain as the zoom-out floor.
  void params;
  return { ...DEFAULT_PHOTO_SLOT_TRANSFORM };
}
