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

const TRANSFORM_EPSILON = 0.001;

/** True when the user moved/scaled the photo block in preview (not the default state). */
export function isNonDefaultPhotoSlotTransform(
  transform?: PhotoSlotTransform | null,
): boolean {
  if (!transform) return false;
  const normalized = normalizePhotoSlotTransform(transform);
  return (
    Math.abs(normalized.scale - 1) > TRANSFORM_EPSILON ||
    Math.abs(normalized.offsetX) > TRANSFORM_EPSILON ||
    Math.abs(normalized.offsetY) > TRANSFORM_EPSILON
  );
}

function applyPhotoSlotTransformRaw(
  rect: { x: number; y: number; width: number; height: number },
  transform: PhotoSlotTransform,
): { x: number; y: number; width: number; height: number } {
  'worklet';
  const scale = transform.scale ?? 1;
  const width = rect.width * scale;
  const height = rect.height * scale;
  const offsetX = (transform.offsetX ?? 0) * rect.width;
  const offsetY = (transform.offsetY ?? 0) * rect.height;
  const x = rect.x + (rect.width - width) / 2 + offsetX;
  const y = rect.y + (rect.height - height) / 2 + offsetY;
  return { x, y, width, height };
}

export function applyPhotoSlotTransform(
  rect: { x: number; y: number; width: number; height: number },
  transform?: PhotoSlotTransform | null,
): { x: number; y: number; width: number; height: number } {
  'worklet';
  return applyPhotoSlotTransformRaw(rect, normalizePhotoSlotTransform(transform));
}

type ViewportBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Keeps transformed block inside safeBounds; falls back to generic clamps when bounds absent. */
export function clampPhotoBlockTransform(
  baseBlock: ViewportBounds,
  transform: PhotoSlotTransform,
  safeBounds: ViewportBounds | null | undefined,
): PhotoSlotTransform {
  'worklet';
  let scale = clampPhotoScale(transform.scale ?? 1);
  let offsetX = transform.offsetX ?? 0;
  let offsetY = transform.offsetY ?? 0;

  if (!safeBounds || safeBounds.width <= 0 || safeBounds.height <= 0) {
    return {
      scale,
      offsetX: clampPhotoOffset(offsetX),
      offsetY: clampPhotoOffset(offsetY),
    };
  }

  const maxScale = Math.min(
    safeBounds.width / Math.max(baseBlock.width, 1),
    safeBounds.height / Math.max(baseBlock.height, 1),
    MAX_PHOTO_SCALE,
  );
  scale = Math.max(MIN_PHOTO_SCALE, Math.min(scale, maxScale));

  const fitOffsets = () => {
    const rect = applyPhotoSlotTransformRaw(baseBlock, { scale, offsetX, offsetY });

    if (rect.width > safeBounds.width) {
      scale = Math.max(
        MIN_PHOTO_SCALE,
        Math.min(scale, safeBounds.width / Math.max(baseBlock.width, 1)),
      );
    }
    if (rect.height > safeBounds.height) {
      scale = Math.max(
        MIN_PHOTO_SCALE,
        Math.min(scale, safeBounds.height / Math.max(baseBlock.height, 1)),
      );
    }

    const fitted = applyPhotoSlotTransformRaw(baseBlock, { scale, offsetX, offsetY });

    if (fitted.x < safeBounds.x) {
      offsetX += (safeBounds.x - fitted.x) / Math.max(baseBlock.width, 1);
    }
    if (fitted.y < safeBounds.y) {
      offsetY += (safeBounds.y - fitted.y) / Math.max(baseBlock.height, 1);
    }

    const adjusted = applyPhotoSlotTransformRaw(baseBlock, { scale, offsetX, offsetY });

    if (adjusted.x + adjusted.width > safeBounds.x + safeBounds.width) {
      offsetX +=
        (safeBounds.x + safeBounds.width - (adjusted.x + adjusted.width)) /
        Math.max(baseBlock.width, 1);
    }
    if (adjusted.y + adjusted.height > safeBounds.y + safeBounds.height) {
      offsetY +=
        (safeBounds.y + safeBounds.height - (adjusted.y + adjusted.height)) /
        Math.max(baseBlock.height, 1);
    }
  };

  fitOffsets();
  fitOffsets();

  return { scale, offsetX, offsetY };
}
