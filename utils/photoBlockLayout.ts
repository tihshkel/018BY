import type { PhotoSlotTransform } from '@/types/album-page-schema';
import { getContentRect, type ContentRect } from '@/utils/imageContentRect';
import { getPhotoSlotViewportRect } from '@/utils/photoSlots';
import { applyPhotoSlotTransform } from '@/utils/photoSlotTransform';

export type ViewportRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PhotoBlockSlotLayout = {
  slotIndex: number;
  uri: string;
  relative: ViewportRect;
};

export type PhotoBlockLayout = {
  baseBlock: ViewportRect;
  slots: PhotoBlockSlotLayout[];
};

/** Horizontal inset so photos look slightly narrower when caption pills sit under them. */
const CAPTION_PHOTO_INSET_X_RATIO = 0.055;
/** Leave a clear band under the frame for the pill (relative to slot height). */
const CAPTION_PHOTO_SHRINK_Y_RATIO = 0.12;

/** Viewport photo frame: slightly narrower + shorter so caption pills sit cleanly under. */
export function fitPhotoRectForCaptions(rect: ViewportRect): ViewportRect {
  const insetX = Math.min(Math.max(rect.width * CAPTION_PHOTO_INSET_X_RATIO, 4), 18);
  const shrinkH = Math.min(
    Math.max(rect.height * CAPTION_PHOTO_SHRINK_Y_RATIO, 8),
    rect.height * 0.22,
  );
  return {
    x: rect.x + insetX,
    y: rect.y,
    width: Math.max(1, rect.width - insetX * 2),
    height: Math.max(1, rect.height - shrinkH),
  };
}

/**
 * Relative collage slots: same inset/shrink as fitPhotoRectForCaptions.
 * baseBlock stays unchanged so group pinch/pan handles keep the full collage frame.
 */
export function fitPhotoBlockLayoutForCaptions(layout: PhotoBlockLayout): PhotoBlockLayout {
  return {
    baseBlock: layout.baseBlock,
    slots: layout.slots.map((slot) => ({
      ...slot,
      relative: {
        x: slot.relative.x + slot.relative.width * CAPTION_PHOTO_INSET_X_RATIO,
        y: slot.relative.y,
        width: Math.max(0.02, slot.relative.width * (1 - CAPTION_PHOTO_INSET_X_RATIO * 2)),
        height: Math.max(0.02, slot.relative.height * (1 - CAPTION_PHOTO_SHRINK_Y_RATIO)),
      },
    })),
  };
}

type ComputePhotoBlockLayoutParams = {
  lineGuideId: string;
  sourcePageNumber: number;
  variantId: string;
  slotUris: (string | null)[];
  viewportWidth: number;
  viewportHeight: number;
  sourceWidth?: number;
  sourceHeight?: number;
  contentRect?: ContentRect;
  templateLibraryId?: string;
};

function unionRect(rects: ViewportRect[]): ViewportRect | null {
  if (rects.length === 0) return null;
  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export function computePhotoBlockLayout(
  params: ComputePhotoBlockLayoutParams,
): PhotoBlockLayout | null {
  const contentRect =
    params.contentRect ??
    getContentRect(
      params.viewportWidth,
      params.viewportHeight,
      params.sourceWidth ?? params.viewportWidth,
      params.sourceHeight ?? params.viewportHeight,
    );

  const slotRects: Array<{ slotIndex: number; uri: string; rect: ViewportRect }> = [];

  params.slotUris.forEach((uri, slotIndex) => {
    if (!uri) return;
    const rect = getPhotoSlotViewportRect({
      lineGuideId: params.lineGuideId,
      page: params.sourcePageNumber,
      variantId: params.variantId,
      slotIndex,
      viewportWidth: params.viewportWidth,
      viewportHeight: params.viewportHeight,
      sourceWidth: params.sourceWidth,
      sourceHeight: params.sourceHeight,
      contentRect,
      templateLibraryId: params.templateLibraryId,
    });
    if (!rect) return;
    slotRects.push({ slotIndex, uri, rect });
  });

  const baseBlock = unionRect(slotRects.map((item) => item.rect));
  if (!baseBlock) return null;

  return {
    baseBlock,
    slots: slotRects.map(({ slotIndex, uri, rect }) => ({
      slotIndex,
      uri,
      relative: {
        x: (rect.x - baseBlock.x) / baseBlock.width,
        y: (rect.y - baseBlock.y) / baseBlock.height,
        width: rect.width / baseBlock.width,
        height: rect.height / baseBlock.height,
      },
    })),
  };
}

export function resolvePhotoBlockRect(
  baseBlock: ViewportRect,
  groupTransform?: PhotoSlotTransform | null,
): ViewportRect {
  return applyPhotoSlotTransform(baseBlock, groupTransform);
}

export function resolvePhotoBlockSlotRect(
  blockRect: ViewportRect,
  relative: ViewportRect,
): ViewportRect {
  return {
    x: blockRect.x + relative.x * blockRect.width,
    y: blockRect.y + relative.y * blockRect.height,
    width: relative.width * blockRect.width,
    height: relative.height * blockRect.height,
  };
}

export function resolvePhotoBlockSlotRects(
  layout: PhotoBlockLayout,
  groupTransform?: PhotoSlotTransform | null,
): Array<{ slotIndex: number; uri: string; rect: ViewportRect }> {
  const blockRect = resolvePhotoBlockRect(layout.baseBlock, groupTransform);
  return layout.slots.map((slot) => ({
    slotIndex: slot.slotIndex,
    uri: slot.uri,
    rect: resolvePhotoBlockSlotRect(blockRect, slot.relative),
  }));
}

/**
 * Подгоняет рамку слота под пропорции фото (portrait в landscape-пине и наоборот).
 * Ручки resize совпадают с фото, без пустой половины рамки.
 */
export function fitSlotRectToImageAspect(
  slot: ViewportRect,
  imageAspect: number,
): ViewportRect {
  if (imageAspect <= 0 || slot.width <= 0 || slot.height <= 0) return slot;

  const slotAspect = slot.width / slot.height;
  if (Math.abs(slotAspect - imageAspect) < 0.04) return slot;

  if (imageAspect < slotAspect) {
    const width = slot.height * imageAspect;
    return {
      x: slot.x + (slot.width - width) / 2,
      y: slot.y,
      width,
      height: slot.height,
    };
  }

  const height = slot.width / imageAspect;
  return {
    x: slot.x,
    y: slot.y + (slot.height - height) / 2,
    width: slot.width,
    height,
  };
}
