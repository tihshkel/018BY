import { PHOTO_LAYOUT_TEMPLATES } from '@/constants/photo-layout-templates';
import { getNormalizedPhotoSlot } from '@/utils/photoSlots';

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

type NormalizedSlotRect = {
  slotIndex: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

function unionBBoxAspectRatio(
  slots: Array<{ left: number; top: number; width: number; height: number }>,
): number {
  const minLeft = Math.min(...slots.map((slot) => slot.left));
  const minTop = Math.min(...slots.map((slot) => slot.top));
  const maxRight = Math.max(...slots.map((slot) => slot.left + slot.width));
  const maxBottom = Math.max(...slots.map((slot) => slot.top + slot.height));
  const unionWidth = Math.max(0.001, maxRight - minLeft);
  const unionHeight = Math.max(0.001, maxBottom - minTop);
  return unionWidth / unionHeight;
}

function toCollageSlotFrames(
  slots: NormalizedSlotRect[],
  unionWidth: number,
  unionHeight: number,
): CollageSlotFrame[] {
  const minLeft = Math.min(...slots.map((slot) => slot.left));
  const minTop = Math.min(...slots.map((slot) => slot.top));

  return slots.map((slot) => ({
    slotIndex: slot.slotIndex,
    leftPercent: ((slot.left - minLeft) / unionWidth) * 100,
    topPercent: ((slot.top - minTop) / unionHeight) * 100,
    widthPercent: (slot.width / unionWidth) * 100,
    heightPercent: (slot.height / unionHeight) * 100,
  }));
}

export type PageCalibratedCollageLayout = {
  frames: CollageSlotFrame[];
  /** width / height of the union bbox in normalized page coordinates */
  aspectRatio: number;
};

export function getPageCalibratedCollageLayout(params: {
  lineGuideId?: string;
  sourcePageNumber?: number;
  variantId: string;
  slotCount: number;
  templateLibraryId?: string;
  /** Индексы слотов в манифесте шаблона (для timeline и частичных сеток). */
  slotIndices?: number[];
}): PageCalibratedCollageLayout | null {
  const { lineGuideId, sourcePageNumber, variantId, slotCount, templateLibraryId, slotIndices } =
    params;
  if (!lineGuideId || !sourcePageNumber || slotCount <= 0) return null;

  const resolvedIndices =
    slotIndices && slotIndices.length === slotCount
      ? slotIndices
      : Array.from({ length: slotCount }, (_, slotIndex) => slotIndex);

  const slots = resolvedIndices
    .map((templateSlotIndex, frameIndex) => {
      const slot = getNormalizedPhotoSlot(
        lineGuideId,
        sourcePageNumber,
        variantId,
        templateSlotIndex,
        templateLibraryId,
      );
      if (!slot) return null;
      const width = slot.width;
      const height = slot.height;
      return {
        slotIndex: frameIndex,
        left: slot.x,
        top: slot.y - height / 2,
        width,
        height,
      };
    })
    .filter((slot): slot is NormalizedSlotRect => Boolean(slot));

  if (slots.length !== slotCount) return null;

  const minLeft = Math.min(...slots.map((slot) => slot.left));
  const minTop = Math.min(...slots.map((slot) => slot.top));
  const maxRight = Math.max(...slots.map((slot) => slot.left + slot.width));
  const maxBottom = Math.max(...slots.map((slot) => slot.top + slot.height));
  const unionWidth = Math.max(0.001, maxRight - minLeft);
  const unionHeight = Math.max(0.001, maxBottom - minTop);

  return {
    frames: toCollageSlotFrames(slots, unionWidth, unionHeight),
    aspectRatio: unionWidth / unionHeight,
  };
}

export function getPageCalibratedCollageSlotFrames(params: {
  lineGuideId?: string;
  sourcePageNumber?: number;
  variantId: string;
  slotCount: number;
  templateLibraryId?: string;
  slotIndices?: number[];
}): CollageSlotFrame[] | null {
  return getPageCalibratedCollageLayout(params)?.frames ?? null;
}

export function getCollageAspectRatio(variantId: string, slotCount: number): number {
  const templateId = resolveTemplateId(variantId);
  const template = PHOTO_LAYOUT_TEMPLATES[templateId];
  if (template && slotCount > 0) {
    const slots = template.slots.slice(0, slotCount).map((slot, slotIndex) => ({
      slotIndex,
      left: slot.x,
      top: slot.y,
      width: slot.width,
      height: slot.height,
    }));
    return unionBBoxAspectRatio(slots);
  }

  if (slotCount <= 1) return 4 / 3;
  if (variantId.includes('vertical') || variantId === 'four_vertical') return 3 / 4;
  if (variantId === 'three_hero') return 3 / 4;
  if (slotCount === 2) return 3 / 4;
  return 1;
}
