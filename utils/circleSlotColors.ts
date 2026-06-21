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

export function mapGenderFillToViewport(
  cx: number,
  cy: number,
  diameter: number,
  contentRect: ContentRect,
): { x: number; y: number; width: number; height: number } {
  return mapCircleSlotToViewport(
    { x: cx, y: cy, width: diameter, height: diameter },
    contentRect,
  );
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
