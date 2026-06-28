import type { PhotoPageLayouts } from '@/constants/photo-slots';

type PhotoSlotLike = {
  width: number;
  height: number;
};

type PhotoVariantLike = {
  variantId: string;
  slots: PhotoSlotLike[];
};

/** Minimum slot size (page-normalized) per collage density. */
const MIN_SLOT_BY_COUNT: Record<number, { width: number; height: number }> = {
  1: { width: 0.22, height: 0.1 },
  2: { width: 0.13, height: 0.1 },
  3: { width: 0.17, height: 0.17 },
  4: { width: 0.17, height: 0.17 },
};

function minSlotForCount(slotCount: number): { width: number; height: number } {
  if (slotCount >= 4) return MIN_SLOT_BY_COUNT[4];
  return MIN_SLOT_BY_COUNT[slotCount] ?? MIN_SLOT_BY_COUNT[1];
}

export function isPhotoVariantFeasible(variant: PhotoVariantLike): boolean {
  const { slots } = variant;
  if (!slots.length) return false;

  const mins = minSlotForCount(slots.length);
  return slots.every((slot) => slot.width >= mins.width && slot.height >= mins.height);
}

export function filterFeasiblePhotoLayouts(layouts: PhotoPageLayouts): PhotoPageLayouts {
  const variants = layouts.variants.filter(isPhotoVariantFeasible);
  return { variants };
}

export function maxFeasiblePhotoCount(variants: readonly PhotoVariantLike[]): number {
  let max = 0;
  for (const variant of variants) {
    if (isPhotoVariantFeasible(variant)) {
      max = Math.max(max, variant.slots.length);
    }
  }
  return max;
}
