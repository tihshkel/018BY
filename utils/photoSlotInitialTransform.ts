import type { PhotoSlotTransform } from '@/types/album-page-schema';
import { DEFAULT_PHOTO_SLOT_TRANSFORM } from '@/utils/photoSlotTransform';

/** Minimum scale so the image covers the slot (enables pan to choose visible region). */
export function computePhotoCoverScale(
  slotWidth: number,
  slotHeight: number,
  imageWidth: number,
  imageHeight: number,
): number {
  if (slotWidth <= 0 || slotHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) {
    return 1;
  }
  const slotAspect = slotWidth / slotHeight;
  const imageAspect = imageWidth / imageHeight;
  if (imageAspect > slotAspect) {
    return imageAspect / slotAspect;
  }
  return slotAspect / imageAspect;
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
  const coverScale = computePhotoCoverScale(
    slotAspect[0],
    slotAspect[1],
    imageWidth,
    imageHeight,
  );
  return {
    scale: Math.max(1, coverScale),
    offsetX: 0,
    offsetY: 0,
  };
}
