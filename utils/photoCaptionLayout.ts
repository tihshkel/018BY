import type { ViewportRect } from '@/utils/photoBlockLayout';
import {
  resolvePhotoZoneViewportRects,
  type PhotoZoneLayoutParams,
} from '@/utils/photoZoneLayout';

function captionBandHeight(viewportHeight: number): number {
  return Math.max(16, viewportHeight * 0.028);
}

function captionGap(viewportHeight: number): number {
  return Math.max(4, viewportHeight * 0.008);
}

function captionBandBelowRect(rect: ViewportRect, viewportHeight: number): ViewportRect {
  const bandHeight = captionBandHeight(viewportHeight);
  const gap = captionGap(viewportHeight);
  return {
    x: rect.x,
    y: rect.y + rect.height + gap,
    width: rect.width,
    height: bandHeight,
  };
}

/** Caption bands below photo zones — follow photoGroupTransform / slot transforms. */
export function resolvePhotoCaptionViewportLayouts(
  params: PhotoZoneLayoutParams,
): ViewportRect[] {
  return resolvePhotoZoneViewportRects(params).map((rect) =>
    captionBandBelowRect(rect, params.viewportHeight),
  );
}

/** Single page caption below the primary (transformed) photo zone. */
export function resolvePrimaryPhotoCaptionLayout(
  params: PhotoZoneLayoutParams,
): ViewportRect | null {
  const zones = resolvePhotoZoneViewportRects(params);
  if (zones.length === 0) return null;

  if (zones.length === 1) {
    return captionBandBelowRect(zones[0], params.viewportHeight);
  }

  const minX = Math.min(...zones.map((rect) => rect.x));
  const maxX = Math.max(...zones.map((rect) => rect.x + rect.width));
  const maxBottom = Math.max(...zones.map((rect) => rect.y + rect.height));
  const union: ViewportRect = {
    x: minX,
    y: Math.min(...zones.map((rect) => rect.y)),
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxBottom - Math.min(...zones.map((rect) => rect.y))),
  };
  return captionBandBelowRect(union, params.viewportHeight);
}
