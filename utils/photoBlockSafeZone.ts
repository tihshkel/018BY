import type { ViewportRect } from '@/utils/photoBlockLayout';
import { getPhotoOnlyPageBounds } from '@/constants/photo-print-margins';
import {
  hasSparsePhotoConfig,
  isPregnancyWeeklyMiddlePage,
  usesBlankPagePhotoFallback,
} from '@/constants/sparse-photo-album-config';
import { getContentRect, mapSourceNormToViewport, type ContentRect } from '@/utils/imageContentRect';
import { getPdfPhotoPageLayouts } from '@/utils/pdfPhotoSlots';
import { resolvePhotoPageLayouts } from '@/utils/resolvePhotoPageLayouts';
import { getPhotoSlotViewportRect } from '@/utils/photoSlots';
import {
  resolveSparsePhotoSafeZone,
  resolveSparsePhotoZoomSafeZone,
  slotToSafeZone,
} from '@/utils/sparseTextPhotoSafeZone';

type ResolvePhotoBlockSafeZoneParams = {
  lineGuideId: string;
  sourcePageNumber: number;
  variantId: string;
  coordinateWidth: number;
  coordinateHeight: number;
  sourceWidth?: number;
  sourceHeight?: number;
  templateLibraryId?: string;
  contentRect?: ContentRect;
  /** Страница без полей ввода — почти весь лист (pregnancy 1.5 см, иначе 2 см от края). */
  photoOnlyPage?: boolean;
};

function unionViewportRects(rects: ViewportRect[]): ViewportRect | null {
  if (rects.length === 0) return null;
  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

/** Viewport-зона перемещения фото на photo-only страницах (pregnancy 1.5 см, иначе 2 см). */
export function resolvePhotoOnlyPageSafeZoneViewportRect(
  contentRect: ContentRect,
  lineGuideId: string,
): ViewportRect {
  const bounds = getPhotoOnlyPageBounds(lineGuideId);
  return mapSourceNormToViewport(
    bounds.left,
    bounds.top,
    bounds.right - bounds.left,
    bounds.bottom - bounds.top,
    contentRect,
  );
}

/** PDF «Место для фото» или union слотов variant → viewport px. */
export function resolvePhotoBlockSafeZoneViewportRect(
  params: ResolvePhotoBlockSafeZoneParams,
): ViewportRect | null {
  const contentRect =
    params.contentRect ??
    getContentRect(
      params.coordinateWidth,
      params.coordinateHeight,
      params.sourceWidth ?? params.coordinateWidth,
      params.sourceHeight ?? params.coordinateHeight,
    );

  if (params.photoOnlyPage) {
    return resolvePhotoOnlyPageSafeZoneViewportRect(contentRect, params.lineGuideId);
  }

  // Blank Семья/Свадьба/Праздники: pinch до полей 1.5 см (как sparse zoom), не до bbox слота.
  if (usesBlankPagePhotoFallback(params.lineGuideId)) {
    return resolvePhotoOnlyPageSafeZoneViewportRect(contentRect, params.lineGuideId);
  }

  const pdf = getPdfPhotoPageLayouts(params.lineGuideId, params.sourcePageNumber);
  const primarySlot = pdf?.variants?.[0]?.slots?.[0];
  if (primarySlot) {
    const usesSparseSafeZone =
      hasSparsePhotoConfig(params.lineGuideId) &&
      !usesBlankPagePhotoFallback(params.lineGuideId);

    // kids_48 / pregnancy weekly: pinch/pan — max zoom zone (пустые линии планов и т.п.),
    // рамка layout/export остаётся уже — не раздуваем слот по умолчанию.
    if (
      usesSparseSafeZone &&
      (params.lineGuideId === 'kids_48' ||
        isPregnancyWeeklyMiddlePage(params.lineGuideId, params.sourcePageNumber))
    ) {
      const zoomSafe = resolveSparsePhotoZoomSafeZone(
        params.lineGuideId,
        params.sourcePageNumber,
      );
      return mapSourceNormToViewport(
        zoomSafe.x,
        zoomSafe.y,
        zoomSafe.width,
        zoomSafe.height,
        contentRect,
      );
    }

    const safeZone = usesSparseSafeZone
      ? resolveSparsePhotoSafeZone(
          params.lineGuideId,
          params.sourcePageNumber,
          primarySlot,
        )
      : slotToSafeZone(primarySlot);
    return mapSourceNormToViewport(
      safeZone.x,
      safeZone.y,
      safeZone.width,
      safeZone.height,
      contentRect,
    );
  }

  if (
    hasSparsePhotoConfig(params.lineGuideId) &&
    !usesBlankPagePhotoFallback(params.lineGuideId)
  ) {
    const safeZone = resolveSparsePhotoZoomSafeZone(
      params.lineGuideId,
      params.sourcePageNumber,
    );
    return mapSourceNormToViewport(
      safeZone.x,
      safeZone.y,
      safeZone.width,
      safeZone.height,
      contentRect,
    );
  }

  const layouts = resolvePhotoPageLayouts(
    params.lineGuideId,
    params.sourcePageNumber,
    params.templateLibraryId,
  );
  const variant =
    layouts.variants.find((item) => item.variantId === params.variantId) ??
    layouts.variants[0];
  if (!variant?.slots.length) return null;

  const slotRects = variant.slots.flatMap((_, slotIndex) => {
    const rect = getPhotoSlotViewportRect({
      lineGuideId: params.lineGuideId,
      page: params.sourcePageNumber,
      variantId: variant.variantId,
      slotIndex,
      viewportWidth: params.coordinateWidth,
      viewportHeight: params.coordinateHeight,
      sourceWidth: params.sourceWidth,
      sourceHeight: params.sourceHeight,
      contentRect,
      templateLibraryId: params.templateLibraryId,
    });
    return rect ? [rect] : [];
  });

  return unionViewportRects(slotRects);
}
