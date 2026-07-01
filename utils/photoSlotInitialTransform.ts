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

export function buildInitialPhotoSlotTransform(params: {
  slotAspect?: [number, number];
  imageWidth?: number;
  imageHeight?: number;
}): PhotoSlotTransform {
  const { slotAspect, imageWidth, imageHeight } = params;
  if (!slotAspect || !imageWidth || !imageHeight) {
    return { ...DEFAULT_PHOTO_SLOT_TRANSFORM };
  }
  const imageAspect = imageWidth / imageHeight;
  const containScale = computePhotoContainScale(
    slotAspect[0],
    slotAspect[1],
    imageAspect,
  );
  return {
    scale: containScale,
    offsetX: 0,
    offsetY: 0,
  };
}
