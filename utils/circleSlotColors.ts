import { colors } from '@/constants/design-tokens';
import type { NormalizedPhotoSlot } from '@/constants/photo-slots';
import { getContentRect, mapSourceNormToViewport, type ContentRect } from '@/utils/imageContentRect';

export function getBranchFillColor(branch?: NormalizedPhotoSlot['branch']): string {
  switch (branch) {
    case 'mother':
      return colors.genderGirl;
    case 'father':
      return colors.genderBoy;
    case 'child':
      return colors.genderChild;
    default:
      return colors.genderChild;
  }
}

export function mapCircleSlotToViewport(
  slot: Pick<NormalizedPhotoSlot, 'x' | 'y' | 'width' | 'height'>,
  contentRect: ContentRect,
): { x: number; y: number; width: number; height: number } {
  const diameter = Math.max(slot.width, slot.height);
  const size = diameter * contentRect.width;
  const centerX = contentRect.offsetX + slot.x * contentRect.width;
  const centerY = contentRect.offsetY + slot.y * contentRect.height;
  return {
    x: centerX - size / 2,
    y: centerY - size / 2,
    width: size,
    height: size,
  };
}

/** Gender fills: slight bleed so color covers the full ring on the design PNG. */
const GENDER_FILL_DIAMETER_BLEED = 1.06;

export function mapGenderFillToViewport(
  cx: number,
  cy: number,
  diameter: number,
  contentRect: ContentRect,
  diameterBleed = GENDER_FILL_DIAMETER_BLEED,
): { x: number; y: number; width: number; height: number } {
  const fillDiameter = diameter * diameterBleed;
  return mapCircleSlotToViewport(
    { x: cx, y: cy, width: fillDiameter, height: fillDiameter },
    contentRect,
  );
}

/** Normalized top-left rect (PDF slot coords) → viewport pixels. */
export function mapRectFillToViewport(
  x: number,
  y: number,
  width: number,
  height: number,
  contentRect: ContentRect,
): { x: number; y: number; width: number; height: number } {
  return mapSourceNormToViewport(x, y, width, height, contentRect);
}

export function buildContentRect(
  viewportWidth: number,
  viewportHeight: number,
  sourceWidth?: number,
  sourceHeight?: number,
): ContentRect {
  return getContentRect(
    viewportWidth,
    viewportHeight,
    sourceWidth ?? viewportWidth,
    sourceHeight ?? viewportHeight,
  );
}
