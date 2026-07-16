import {
  type NormalizedPhotoSlot,
  type PhotoPageLayouts,
} from '@/constants/photo-slots';
import { refineFamilyTreeSlotForViewport } from '@/utils/familyTreeSlots';
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
  if (variantId === 'two_stacked') return 'two_vertical';
  if (variantId === 'two_photos') return 'two_vertical';
  if (variantId === 'two_horizontal') return 'two_vertical';
  if (variantId === 'two_vertical_separate') return 'two_vertical';
  if (variantId === 'one_horizontal_common') return 'one_large';
  if (variantId === 'one_horizontal') return 'one_large';
  if (variantId === 'four_vertical') return 'four_grid';
  return variantId;
}

const STRUCTURED_VARIANT_ALIASES: Record<string, string[]> = {
  one_horizontal: ['one_horizontal', 'one_large', 'template'],
  one_large: ['one_large', 'one_horizontal', 'template'],
  two_photos: ['two_photos', 'two_horizontal', 'two_vertical'],
  two_horizontal: ['two_horizontal', 'two_photos', 'two_vertical'],
  two_vertical: ['two_vertical', 'two_photos', 'two_horizontal'],
  four_vertical: ['four_vertical', 'four_grid'],
  four_grid: ['four_grid', 'four_vertical'],
};

function resolvePageLayoutVariant(
  pageLayouts: PhotoPageLayouts,
  variantId: string,
): PhotoPageLayouts['variants'][number] | undefined {
  // Точный id важнее alias: two_horizontal (стеки 4:3) не должен
  // подменяться на two_vertical («башни»), если стек есть в layouts.
  const exact = pageLayouts.variants.find((variant) => variant.variantId === variantId);
  if (exact) return exact;

  const resolvedVariantId = resolveLayoutVariantId(variantId);
  const candidates = [
    resolvedVariantId,
    ...(STRUCTURED_VARIANT_ALIASES[resolvedVariantId] ?? []),
    ...(STRUCTURED_VARIANT_ALIASES[variantId] ?? []),
  ];
  const seen = new Set<string>([variantId]);
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
  lineGuideId?: string,
  page?: number,
): { x: number; y: number; width: number; height: number } {
  const refined =
    lineGuideId != null && page != null
      ? refineFamilyTreeSlotForViewport(lineGuideId, page, slot)
      : slot;

  if (refined.shape === 'circle') {
    return mapCircleSlotToViewport(refined, contentRect);
  }
  const topNormY = refined.y - refined.height / 2;
  return mapSourceNormToViewport(refined.x, topNormY, refined.width, refined.height, contentRect);
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
  return mapPhotoSlotToViewport(
    normalized,
    contentRect,
    params.lineGuideId,
    params.page,
  );
}
