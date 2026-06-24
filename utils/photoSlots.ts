import {
  type NormalizedPhotoSlot,
  type PhotoPageLayouts,
} from '@/constants/photo-slots';
import { resolvePhotoPageLayouts } from '@/utils/resolvePhotoPageLayouts';
import { mapCircleSlotToViewport } from '@/utils/circleSlotColors';
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
  templateLibraryId?: string;
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
  if (variantId === 'two_vertical_separate') return 'two_vertical';
  if (variantId === 'one_horizontal_common') return 'one_horizontal';
  return variantId;
}

const STRUCTURED_VARIANT_ALIASES: Record<string, string[]> = {
  one_horizontal: ['one_horizontal', 'one_large', 'template'],
  one_large: ['one_large', 'one_horizontal', 'template'],
};

function resolvePageLayoutVariant(
  pageLayouts: PhotoPageLayouts,
  variantId: string,
): PhotoPageLayouts['variants'][number] | undefined {
  const resolvedVariantId = resolveLayoutVariantId(variantId);
  const candidates = [
    resolvedVariantId,
    variantId,
    ...(STRUCTURED_VARIANT_ALIASES[resolvedVariantId] ?? []),
  ];
  const seen = new Set<string>();
  for (const id of candidates) {
    if (seen.has(id)) continue;
    seen.add(id);
    const found = pageLayouts.variants.find((v) => v.variantId === id);
    if (found) return found;
  }
  if (pageLayouts.variants.length === 1) {
    return pageLayouts.variants[0];
  }
  return undefined;
}

export function getNormalizedPhotoSlot(
  lineGuideId: string,
  page: number,
  variantId: string,
  slotIndex: number,
  templateLibraryId?: string,
): NormalizedPhotoSlot | null {
  const pageLayouts = resolvePhotoPageLayouts(lineGuideId, page, templateLibraryId);
  const variant = resolvePageLayoutVariant(pageLayouts, variantId);
  if (!variant) return null;

  return variant.slots[slotIndex] ?? null;
}

export function mapPhotoSlotToViewport(
  slot: NormalizedPhotoSlot,
  contentRect: ContentRect,
): { x: number; y: number; width: number; height: number } {
  if (slot.shape === 'circle') {
    return mapCircleSlotToViewport(slot, contentRect);
  }
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
    params.templateLibraryId,
  );
  if (!normalized) return null;

  const contentRect = resolveContentRect(params);
  return mapPhotoSlotToViewport(normalized, contentRect);
}
