import type { AlbumPageSchema, PageValues } from '@/types/album-page-schema';
import type { ContentRect } from '@/utils/imageContentRect';
import {
  computePhotoBlockLayout,
  resolvePhotoBlockRect,
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
  const blockLayout = computePhotoBlockLayout({
    lineGuideId: params.lineGuideId,
    sourcePageNumber: params.schema.sourcePageNumber,
    variantId: variant.variantId,
    slotUris: params.values.photoBlocks?.[block.blockId]?.slots ?? [],
    viewportWidth: params.viewportWidth,
    viewportHeight: params.viewportHeight,
    sourceWidth: params.sourceWidth,
    sourceHeight: params.sourceHeight,
    contentRect: params.contentRect,
    templateLibraryId: params.schema.templateLibraryId,
  });

  if (blockLayout) {
    const groupTransform = params.values.photoGroupTransform;
    return [
      resolvePhotoBlockRect(
        blockLayout.baseBlock,
        isNonDefaultPhotoSlotTransform(groupTransform) ? groupTransform : null,
      ),
    ];
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
      return [applyOptionalTransform(photoRect, params.values.photoGroupTransform)];
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
    rects.push(applyOptionalTransform(photoRect, slotTransform));
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
