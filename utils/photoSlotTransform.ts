import type { PhotoSlotTransform } from '@/types/album-page-schema';

export type { PhotoSlotTransform };

export const DEFAULT_PHOTO_SLOT_TRANSFORM: PhotoSlotTransform = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

export const MIN_PHOTO_SCALE = 0.6;
export const MAX_PHOTO_SCALE = 3.5;
export const MAX_PHOTO_OFFSET = 1.2;
/** Доп. зум в пределах safe zone (кадрирование в рамке «Место для фото»). */
export const PHOTO_SAFE_ZONE_SCALE_HEADROOM = 2;

export function clampPhotoScaleBetween(scale: number, minScale: number, maxScale = MAX_PHOTO_SCALE): number {
  'worklet';
  return Math.min(maxScale, Math.max(minScale, scale));
}

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

/** Для предпросмотра/экспорта: groupTransform или кадрирование слота 0 из формы. */
export function resolvePhotoGroupTransform(
  values: {
    photoGroupTransform?: PhotoSlotTransform | null;
    photoSlotTransforms?: Record<string, PhotoSlotTransform>;
  },
  blockId: string,
  slotIndex = 0,
): PhotoSlotTransform {
  if (isNonDefaultPhotoSlotTransform(values.photoGroupTransform)) {
    return normalizePhotoSlotTransform(values.photoGroupTransform);
  }
  const slotTransform = values.photoSlotTransforms?.[photoSlotTransformKey(blockId, slotIndex)];
  if (isNonDefaultPhotoSlotTransform(slotTransform)) {
    return normalizePhotoSlotTransform(slotTransform);
  }
  return DEFAULT_PHOTO_SLOT_TRANSFORM;
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

function computePhotoCoverSizeWorklet(
  slotWidth: number,
  slotHeight: number,
  imageAspect: number,
): { width: number; height: number } {
  'worklet';
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

export function computePhotoContainScaleWorklet(
  slotWidth: number,
  slotHeight: number,
  imageAspect: number,
): number {
  'worklet';
  const cover = computePhotoCoverSizeWorklet(slotWidth, slotHeight, imageAspect);
  if (cover.width <= 0 || cover.height <= 0) return 1;
  return Math.min(slotWidth / cover.width, slotHeight / cover.height);
}

export function applyAspectAwarePhotoSlotTransform(
  rect: { x: number; y: number; width: number; height: number },
  transform: PhotoSlotTransform | null | undefined,
  imageAspect: number,
): { x: number; y: number; width: number; height: number } {
  'worklet';
  const slotW = rect.width;
  const slotH = rect.height;
  const scale = transform?.scale ?? 1;
  const cover = computePhotoCoverSizeWorklet(slotW, slotH, imageAspect);
  const width = cover.width * scale;
  const height = cover.height * scale;
  const offsetX = (transform?.offsetX ?? 0) * slotW;
  const offsetY = (transform?.offsetY ?? 0) * slotH;
  return {
    x: rect.x + (slotW - width) / 2 + offsetX,
    y: rect.y + (slotH - height) / 2 + offsetY,
    width,
    height,
  };
}

export function clampAspectAwarePhotoOffset(
  slotWidth: number,
  slotHeight: number,
  imageAspect: number,
  scale: number,
  offsetX: number,
  offsetY: number,
): { offsetX: number; offsetY: number } {
  'worklet';
  const cover = computePhotoCoverSizeWorklet(slotWidth, slotHeight, imageAspect);
  const imgW = cover.width * scale;
  const imgH = cover.height * scale;
  const maxOffX = imgW > slotWidth ? (imgW - slotWidth) / (2 * slotWidth) : 0;
  const maxOffY = imgH > slotHeight ? (imgH - slotHeight) / (2 * slotHeight) : 0;
  return {
    offsetX: Math.min(maxOffX, Math.max(-maxOffX, offsetX)),
    offsetY: Math.min(maxOffY, Math.max(-maxOffY, offsetY)),
  };
}

export function normalizePhotoSlotTransformWithMin(
  transform: PhotoSlotTransform | null | undefined,
  minScale: number,
): PhotoSlotTransform {
  'worklet';
  if (!transform) {
    return { scale: Math.max(minScale, 1), offsetX: 0, offsetY: 0 };
  }
  return {
    scale: clampPhotoScaleBetween(transform.scale || 1, minScale),
    offsetX: transform.offsetX ?? 0,
    offsetY: transform.offsetY ?? 0,
  };
}

export function applyPhotoSlotTransform(
  rect: { x: number; y: number; width: number; height: number },
  transform?: PhotoSlotTransform | null,
  imageAspect?: number,
): { x: number; y: number; width: number; height: number } {
  'worklet';
  if (imageAspect && imageAspect > 0) {
    return applyAspectAwarePhotoSlotTransform(rect, transform, imageAspect);
  }
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
    (safeBounds.width / Math.max(baseBlock.width, 1)) * PHOTO_SAFE_ZONE_SCALE_HEADROOM,
    (safeBounds.height / Math.max(baseBlock.height, 1)) * PHOTO_SAFE_ZONE_SCALE_HEADROOM,
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
