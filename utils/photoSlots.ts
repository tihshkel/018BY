import {
  type NormalizedPhotoSlot,
  type PhotoPageLayouts,
} from '@/constants/photo-slots';
import { resolvePhotoPageLayouts } from '@/utils/resolvePhotoPageLayouts';
import {
  getContentRect,
  mapSourceNormToViewport,
  type ContentRect,
} from '@/utils/imageContentRect';

export type GetPhotoSlotParams = {
  lineGuideId: string;
  page: number;
  variantId: string;
  slotIndex: number;
  viewportWidth: number;
  viewportHeight: number;
  sourceWidth?: number;
  sourceHeight?: number;
  contentRect?: ContentRect;
};

function resolveContentRect(params: GetPhotoSlotParams): ContentRect {
  if (params.contentRect) return params.contentRect;
  return getContentRect(
    params.viewportWidth,
    params.viewportHeight,
    params.sourceWidth ?? params.viewportWidth,
    params.sourceHeight ?? params.viewportHeight,
  );
}

function resolveLayoutVariantId(variantId: string): string {
  if (variantId === 'two_stacked') return 'two_photos';
  if (variantId === 'two_vertical') return 'two_horizontal';
  if (variantId === 'four_vertical') return 'four_grid';
  if (variantId === 'one_horizontal_common') return 'one_horizontal';
  return variantId;
}

export function getNormalizedPhotoSlot(
  lineGuideId: string,
  page: number,
  variantId: string,
  slotIndex: number,
): NormalizedPhotoSlot | null {
  const pageLayouts = resolvePhotoPageLayouts(lineGuideId, page);

  const resolvedVariantId = resolveLayoutVariantId(variantId);
  const variant =
    pageLayouts.variants.find((v) => v.variantId === resolvedVariantId) ??
    pageLayouts.variants.find((v) => v.variantId === variantId);
  if (!variant) return null;

  return variant.slots[slotIndex] ?? null;
}

export function mapPhotoSlotToViewport(
  slot: NormalizedPhotoSlot,
  contentRect: ContentRect,
): { x: number; y: number; width: number; height: number } {
  const topNormY = slot.y - slot.height / 2;
  return mapSourceNormToViewport(slot.x, topNormY, slot.width, slot.height, contentRect);
}

export function getPhotoSlotViewportRect(
  params: GetPhotoSlotParams,
): { x: number; y: number; width: number; height: number } | null {
  const normalized = getNormalizedPhotoSlot(
    params.lineGuideId,
    params.page,
    params.variantId,
    params.slotIndex,
  );
  if (!normalized) return null;

  const contentRect = resolveContentRect(params);
  return mapPhotoSlotToViewport(normalized, contentRect);
}
