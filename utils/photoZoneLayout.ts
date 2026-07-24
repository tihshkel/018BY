import type { AlbumPageSchema, PageValues } from '@/types/album-page-schema';
import type { ContentRect } from '@/utils/imageContentRect';
import { pageNeedsPhotoCaptionRoom } from '@/utils/designedAlbumPerPhotoCaptions';
import {
  computePhotoBlockLayout,
  fitPhotoBlockLayoutForCaptions,
  fitPhotoRectForCaptions,
  resolvePhotoBlockSlotRects,
  type ViewportRect,
} from '@/utils/photoBlockLayout';
import { getPhotoSlotViewportRect } from '@/utils/photoSlots';
import {
  applyPhotoSlotTransform,
  isNonDefaultPhotoSlotTransform,
  photoSlotTransformKey,
  type PhotoSlotTransform,
} from '@/utils/photoSlotTransform';

export type PhotoZoneLayoutParams = {
  schema: AlbumPageSchema;
  values: PageValues;
  lineGuideId: string;
  viewportWidth: number;
  viewportHeight: number;
  sourceWidth?: number;
  sourceHeight?: number;
  contentRect: ContentRect;
};

function unionViewportRects(rects: ViewportRect[]): ViewportRect | null {
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

function applyOptionalTransform(
  rect: ViewportRect,
  transform?: PhotoSlotTransform | null,
): ViewportRect {
  if (!transform || !isNonDefaultPhotoSlotTransform(transform)) return rect;
  return applyPhotoSlotTransform(rect, transform);
}

function resolveBlockPhotoZoneRects(
  params: PhotoZoneLayoutParams,
  block: NonNullable<AlbumPageSchema['photoBlocks']>[number],
  variant: NonNullable<AlbumPageSchema['photoBlocks']>[number]['variants'][number],
): ViewportRect[] {
  const rawSlots = params.values.photoBlocks?.[block.blockId]?.slots ?? [];
  // Dense slot list so caption index i always matches photo slot i (even if some empty).
  const slotUris = Array.from({ length: variant.slots }, (_, slotIndex) => {
    const uri = rawSlots[slotIndex];
    return uri && uri.trim() ? uri : `__caption_slot_${slotIndex}`;
  });

  const blockLayoutRaw = computePhotoBlockLayout({
    lineGuideId: params.lineGuideId,
    sourcePageNumber: params.schema.sourcePageNumber,
    variantId: variant.variantId,
    slotUris,
    viewportWidth: params.viewportWidth,
    viewportHeight: params.viewportHeight,
    sourceWidth: params.sourceWidth,
    sourceHeight: params.sourceHeight,
    contentRect: params.contentRect,
    templateLibraryId: params.schema.templateLibraryId,
  });
  const reserveCaptions = pageNeedsPhotoCaptionRoom(
    params.schema,
    params.lineGuideId,
    params.values,
  );
  const blockLayout =
    blockLayoutRaw && reserveCaptions
      ? fitPhotoBlockLayoutForCaptions(blockLayoutRaw)
      : blockLayoutRaw;

  if (blockLayout) {
    const groupTransform = params.values.photoGroupTransform;
    const transform = isNonDefaultPhotoSlotTransform(groupTransform)
      ? groupTransform
      : null;
    const resolved = resolvePhotoBlockSlotRects(blockLayout, transform);
    const byIndex = new Map(resolved.map((slot) => [slot.slotIndex, slot.rect]));
    const rects: ViewportRect[] = [];
    for (let slotIndex = 0; slotIndex < variant.slots; slotIndex += 1) {
      const rect = byIndex.get(slotIndex);
      if (rect) rects.push(rect);
    }
    if (rects.length === variant.slots) return rects;
  }

  if (variant.slots === 1) {
    const photoRect = getPhotoSlotViewportRect({
      lineGuideId: params.lineGuideId,
      page: params.schema.sourcePageNumber,
      variantId: variant.variantId,
      slotIndex: 0,
      viewportWidth: params.viewportWidth,
      viewportHeight: params.viewportHeight,
      sourceWidth: params.sourceWidth,
      sourceHeight: params.sourceHeight,
      contentRect: params.contentRect,
      templateLibraryId: params.schema.templateLibraryId,
    });
    if (photoRect) {
      const transformed = applyOptionalTransform(
        photoRect,
        params.values.photoGroupTransform,
      );
      return [reserveCaptions ? fitPhotoRectForCaptions(transformed) : transformed];
    }
  }

  const rects: ViewportRect[] = [];
  for (let slotIndex = 0; slotIndex < variant.slots; slotIndex += 1) {
    const photoRect = getPhotoSlotViewportRect({
      lineGuideId: params.lineGuideId,
      page: params.schema.sourcePageNumber,
      variantId: variant.variantId,
      slotIndex,
      viewportWidth: params.viewportWidth,
      viewportHeight: params.viewportHeight,
      sourceWidth: params.sourceWidth,
      sourceHeight: params.sourceHeight,
      contentRect: params.contentRect,
      templateLibraryId: params.schema.templateLibraryId,
    });
    if (!photoRect) continue;

    const transformKey = photoSlotTransformKey(block.blockId, slotIndex);
    const slotTransform = params.values.photoSlotTransforms?.[transformKey];
    const transformed = applyOptionalTransform(photoRect, slotTransform);
    rects.push(reserveCaptions ? fitPhotoRectForCaptions(transformed) : transformed);
  }

  return rects;
}

/** Photo zone rects in viewport px — follows group/slot transforms (for captions). */
export function resolvePhotoZoneViewportRects(params: PhotoZoneLayoutParams): ViewportRect[] {
  const rects: ViewportRect[] = [];

  for (const block of params.schema.photoBlocks ?? []) {
    const blockValues = params.values.photoBlocks?.[block.blockId];
    if (!blockValues) continue;

    const variant =
      block.variants.find((item) => item.variantId === blockValues.variantId) ??
      block.variants[0];
    if (!variant) continue;

    const blockRects = resolveBlockPhotoZoneRects(params, block, variant);
    if (variant.slots === 1) {
      const zone = blockRects[0];
      if (zone) rects.push(zone);
      continue;
    }

    rects.push(...blockRects);
  }

  return rects;
}

/** Union of all photo zones on a multi-slot block (caption anchor). */
export function unionPhotoZoneViewportRects(params: PhotoZoneLayoutParams): ViewportRect | null {
  const zones = resolvePhotoZoneViewportRects(params);
  return unionViewportRects(zones);
}
