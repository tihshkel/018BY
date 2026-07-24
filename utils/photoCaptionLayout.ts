import type { ViewportRect } from '@/utils/photoBlockLayout';
import {
  resolvePhotoZoneViewportRects,
  type PhotoZoneLayoutParams,
} from '@/utils/photoZoneLayout';

export {
  fitPhotoBlockLayoutForCaptions,
  fitPhotoRectForCaptions,
} from '@/utils/photoBlockLayout';
export { pageNeedsPhotoCaptionRoom } from '@/utils/designedAlbumPerPhotoCaptions';

function captionBandHeight(viewportHeight: number, scale: number, lineGuideId?: string): number {
  // Birthday pills under photos — taller, closer to printed «Цвет волос» fields.
  if (lineGuideId === 'holidays_birthday_60') {
    return Math.max(26, viewportHeight * 0.05) * scale;
  }
  // Enough room for Amatic captions without clipping descenders.
  return Math.max(22, viewportHeight * 0.042) * scale;
}

function captionGap(viewportHeight: number, scale: number): number {
  return Math.max(8, viewportHeight * 0.014) * scale;
}

/** Band height under a photo at scale 1 (px) — for live captions inside photo block editor. */
export function getPhotoCaptionBandHeightPx(
  viewportHeight: number,
  lineGuideId?: string,
): number {
  return captionBandHeight(viewportHeight, 1, lineGuideId);
}

/** Gap between photo and caption at scale 1 (px). */
export function getPhotoCaptionGapPx(viewportHeight: number): number {
  return captionGap(viewportHeight, 1);
}

/** Scale factor from collage group transform (1 when unset). */
export function resolvePhotoCaptionGroupScale(params: PhotoZoneLayoutParams): number {
  const scale = params.values.photoGroupTransform?.scale;
  if (typeof scale !== 'number' || !(scale > 0)) return 1;
  return scale;
}

function captionBandBelowRect(
  rect: ViewportRect,
  viewportHeight: number,
  scale: number,
  lineGuideId?: string,
): ViewportRect {
  const bandHeight = captionBandHeight(viewportHeight, scale, lineGuideId);
  const gap = captionGap(viewportHeight, scale);
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
  const scale = resolvePhotoCaptionGroupScale(params);
  const zones = resolvePhotoZoneViewportRects(params);
  const gap = captionGap(params.viewportHeight, scale);
  const desiredHeight = captionBandHeight(params.viewportHeight, scale, params.lineGuideId);

  const gutterHeights = zones.map((rect, index) => {
    const nextRow = zones.find(
      (other, otherIndex) =>
        otherIndex !== index &&
        other.y >= rect.y + rect.height - 1 &&
        other.x < rect.x + rect.width &&
        other.x + other.width > rect.x,
    );
    if (!nextRow) return null;
    return nextRow.y - gap * 0.35 - (rect.y + rect.height + gap);
  });
  const tightestGutter = gutterHeights.reduce<number | null>((min, gutter) => {
    if (gutter == null || !(gutter > 0)) return min;
    if (min == null) return gutter;
    return Math.min(min, gutter);
  }, null);
  const uniformHeight = Math.max(
    14 * scale,
    Math.min(desiredHeight, tightestGutter ?? desiredHeight),
  );

  return zones.map((rect) => ({
    x: rect.x,
    y: rect.y + rect.height + gap,
    width: rect.width,
    height: uniformHeight,
  }));
}

/**
 * kids_48 p21 «Мои крестные» — имена под кадрами, следят за photoGroupTransform.
 * 2 фото → имя под каждым; 1 фото → два имени рядом под общим кадром.
 */
export function resolveGodparentsNameViewportLayouts(
  params: PhotoZoneLayoutParams,
  nameCount: number,
): ViewportRect[] {
  if (nameCount <= 0) return [];
  const zones = resolvePhotoZoneViewportRects(params);
  if (zones.length === 0) return [];
  const scale = resolvePhotoCaptionGroupScale(params);

  if (zones.length >= nameCount) {
    return zones
      .slice(0, nameCount)
      .map((rect) =>
        captionBandBelowRect(rect, params.viewportHeight, scale, params.lineGuideId),
      );
  }

  const band = captionBandBelowRect(
    zones[0],
    params.viewportHeight,
    scale,
    params.lineGuideId,
  );
  if (nameCount === 1) return [band];

  const gap = Math.max(4, band.width * 0.04);
  const colWidth = Math.max(1, (band.width - gap * (nameCount - 1)) / nameCount);
  return Array.from({ length: nameCount }, (_, index) => ({
    x: band.x + index * (colWidth + gap),
    y: band.y,
    width: colWidth,
    height: band.height,
  }));
}

/** Single page caption below the primary (transformed) photo zone. */
export function resolvePrimaryPhotoCaptionLayout(
  params: PhotoZoneLayoutParams,
): ViewportRect | null {
  const zones = resolvePhotoZoneViewportRects(params);
  if (zones.length === 0) return null;
  const scale = resolvePhotoCaptionGroupScale(params);

  if (zones.length === 1) {
    return captionBandBelowRect(zones[0], params.viewportHeight, scale, params.lineGuideId);
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
  return captionBandBelowRect(union, params.viewportHeight, scale, params.lineGuideId);
}
