import type { PhotoBlockVariant } from '@/types/album-page-schema';
import { getPhotoSlotAspectRatio } from '@/constants/photo-slots';

export function getPhotoVariantAspect(
  variantId: string,
): [number, number] | undefined {
  if (variantId === 'three_hero') return [4, 3];
  if (variantId === 'three_equal') return [4, 3];
  if (variantId === 'four_grid') return [1, 1];
  if (
    variantId.includes('vertical') ||
    variantId === 'two_photos' ||
    variantId === 'four_vertical' ||
    variantId === 'four_photos'
  ) {
    return [3, 4];
  }
  if (
    variantId.includes('horizontal') ||
    variantId === 'one_large' ||
    variantId === 'two_stacked'
  ) {
    return [4, 3];
  }
  return undefined;
}

export function getPhotoVariantAspectFromVariant(
  variant: Pick<PhotoBlockVariant, 'variantId'> | undefined,
): [number, number] | undefined {
  if (!variant) return undefined;
  return getPhotoVariantAspect(variant.variantId);
}

export function getSlotAspectRatio(params: {
  lineGuideId: string;
  page: number;
  variantId: string;
  slotIndex: number;
}): [number, number] | undefined {
  const fromSlot = getPhotoSlotAspectRatio(
    params.lineGuideId,
    params.page,
    params.variantId,
    params.slotIndex,
  );
  if (fromSlot) return fromSlot;
  return getPhotoVariantAspect(params.variantId);
}

export function findFirstEmptyPhotoSlotIndex(slotUris: (string | null)[]): number {
  return slotUris.findIndex((uri) => !uri);
}

export function countFilledPhotoSlots(slotUris: (string | null)[]): number {
  return slotUris.filter(Boolean).length;
}

export function canAddMorePhotos(slotUris: (string | null)[]): boolean {
  return findFirstEmptyPhotoSlotIndex(slotUris) >= 0;
}
