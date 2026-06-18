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
