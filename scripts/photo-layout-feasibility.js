/**
 * Mirrors utils/photoLayoutFeasibility.ts for Node audit/resolver scripts.
 */

const MIN_SLOT_BY_COUNT = {
  1: { width: 0.22, height: 0.1 },
  2: { width: 0.13, height: 0.1 },
  3: { width: 0.17, height: 0.17 },
  4: { width: 0.17, height: 0.17 },
};

function minSlotForCount(slotCount) {
  if (slotCount >= 4) return MIN_SLOT_BY_COUNT[4];
  return MIN_SLOT_BY_COUNT[slotCount] ?? MIN_SLOT_BY_COUNT[1];
}

function isPhotoVariantFeasible(variant) {
  const { slots } = variant;
  if (!slots?.length) return false;

  const mins = minSlotForCount(slots.length);
  return slots.every((slot) => slot.width >= mins.width && slot.height >= mins.height);
}

function filterFeasiblePhotoLayouts(layouts) {
  if (!layouts?.variants) return layouts;
  return {
    ...layouts,
    variants: layouts.variants.filter(isPhotoVariantFeasible),
  };
}

function maxFeasiblePhotoCount(variants) {
  let max = 0;
  for (const variant of variants ?? []) {
    if (isPhotoVariantFeasible(variant)) {
      max = Math.max(max, variant.slots.length);
    }
  }
  return max;
}

module.exports = {
  MIN_SLOT_BY_COUNT,
  isPhotoVariantFeasible,
  filterFeasiblePhotoLayouts,
  maxFeasiblePhotoCount,
};
