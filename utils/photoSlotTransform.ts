import type { PhotoSlotTransform } from '@/types/album-page-schema';

export const DEFAULT_PHOTO_SLOT_TRANSFORM: PhotoSlotTransform = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

export const MIN_PHOTO_SCALE = 0.6;
export const MAX_PHOTO_SCALE = 3.5;
export const MAX_PHOTO_OFFSET = 1.2;

export function photoSlotTransformKey(blockId: string, slotIndex: number): string {
  return `${blockId}_${slotIndex}`;
}

export function clampPhotoScale(scale: number): number {
  'worklet';
  return Math.min(MAX_PHOTO_SCALE, Math.max(MIN_PHOTO_SCALE, scale));
}

export function clampPhotoOffset(value: number): number {
  'worklet';
  return Math.min(MAX_PHOTO_OFFSET, Math.max(-MAX_PHOTO_OFFSET, value));
}

export function normalizePhotoSlotTransform(
  transform?: PhotoSlotTransform | null,
): PhotoSlotTransform {
  'worklet';
  if (!transform) {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }
  return {
    scale: clampPhotoScale(transform.scale || 1),
    offsetX: clampPhotoOffset(transform.offsetX || 0),
    offsetY: clampPhotoOffset(transform.offsetY || 0),
  };
}

export function applyPhotoSlotTransform(
  rect: { x: number; y: number; width: number; height: number },
  transform?: PhotoSlotTransform | null,
): { x: number; y: number; width: number; height: number } {
  'worklet';
  const normalized = normalizePhotoSlotTransform(transform);
  const width = rect.width * normalized.scale;
  const height = rect.height * normalized.scale;
  const offsetX = normalized.offsetX * rect.width;
  const offsetY = normalized.offsetY * rect.height;
  const x = rect.x + (rect.width - width) / 2 + offsetX;
  const y = rect.y + (rect.height - height) / 2 + offsetY;
  return { x, y, width, height };
}
