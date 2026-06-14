import {
  DEFAULT_PHOTO_PAGE_LAYOUTS,
  PHOTO_SLOTS,
  type NormalizedPhotoSlot,
} from '@/constants/photo-slots';
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

export function getNormalizedPhotoSlot(
  lineGuideId: string,
  page: number,
  variantId: string,
  slotIndex: number,
): NormalizedPhotoSlot | null {
  const pageLayouts =
    PHOTO_SLOTS[lineGuideId]?.[String(page)] ?? DEFAULT_PHOTO_PAGE_LAYOUTS;

  const resolvedVariantId = variantId === 'two_stacked' ? 'two_photos' : variantId;
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
