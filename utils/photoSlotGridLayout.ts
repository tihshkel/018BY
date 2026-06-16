import { PHOTO_LAYOUT_TEMPLATES } from '@/constants/photo-layout-templates';

export type CollageSlotFrame = {
  slotIndex: number;
  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;
};

const FALLBACK_ONE: CollageSlotFrame[] = [
  { slotIndex: 0, leftPercent: 4, topPercent: 8, widthPercent: 92, heightPercent: 84 },
];

const FALLBACK_TWO: CollageSlotFrame[] = [
  { slotIndex: 0, leftPercent: 4, topPercent: 4, widthPercent: 92, heightPercent: 44 },
  { slotIndex: 1, leftPercent: 4, topPercent: 52, widthPercent: 92, heightPercent: 44 },
];

const FALLBACK_FOUR: CollageSlotFrame[] = [
  { slotIndex: 0, leftPercent: 2, topPercent: 2, widthPercent: 46, heightPercent: 46 },
  { slotIndex: 1, leftPercent: 52, topPercent: 2, widthPercent: 46, heightPercent: 46 },
  { slotIndex: 2, leftPercent: 2, topPercent: 52, widthPercent: 46, heightPercent: 46 },
  { slotIndex: 3, leftPercent: 52, topPercent: 52, widthPercent: 46, heightPercent: 46 },
];

function resolveTemplateId(variantId: string): string {
  if (variantId === 'two_stacked') return 'two_photos';
  if (variantId === 'four_photos') return 'four_grid';
  if (variantId === 'one_horizontal_common') return 'one_horizontal';
  return variantId;
}

export function getCollageSlotFrames(
  variantId: string,
  slotCount: number,
): CollageSlotFrame[] {
  const templateId = resolveTemplateId(variantId);
  const template = PHOTO_LAYOUT_TEMPLATES[templateId];

  if (template) {
    return template.slots.slice(0, slotCount).map((slot, slotIndex) => ({
      slotIndex,
      leftPercent: slot.x * 100,
      topPercent: slot.y * 100,
      widthPercent: slot.width * 100,
      heightPercent: slot.height * 100,
    }));
  }

  if (slotCount <= 1) return FALLBACK_ONE;
  if (slotCount === 2) return FALLBACK_TWO;
  if (slotCount >= 4) return FALLBACK_FOUR.slice(0, slotCount);

  return FALLBACK_TWO.slice(0, slotCount);
}

export function getCollageAspectRatio(variantId: string, slotCount: number): number {
  if (slotCount <= 1) return 4 / 3;
  if (variantId.includes('vertical') || variantId === 'four_vertical') return 3 / 4;
  if (variantId === 'three_hero') return 3 / 4;
  if (slotCount === 2) return 3 / 4;
  return 1;
}
