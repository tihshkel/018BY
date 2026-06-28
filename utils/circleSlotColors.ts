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
  const topNormY = slot.y - diameter / 2;
  const leftNormX = slot.x - diameter / 2;
  return mapSourceNormToViewport(leftNormX, topNormY, diameter, diameter, contentRect);
}

/** Gender fills: slight bleed so color covers the full ring on the design PNG. */
const GENDER_FILL_DIAMETER_BLEED = 1.06;

export function mapGenderFillToViewport(
  cx: number,
  cy: number,
  diameter: number,
  contentRect: ContentRect,
): { x: number; y: number; width: number; height: number } {
  const fillDiameter = diameter * GENDER_FILL_DIAMETER_BLEED;
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
