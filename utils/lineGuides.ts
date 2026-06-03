import { LINE_GUIDES } from '@/constants/line-guides';
import { LINE_SLOTS, type NormalizedLineSlot } from '@/constants/line-slots';
import { getAlbumTextMargins } from '@/constants/album-text-margins';
import {
  getContentRect,
  mapSourceNormToViewport,
  type ContentRect,
} from '@/utils/imageContentRect';

interface SnapYToNearestTemplateLineParams {
  lineGuideId?: string;
  page: number;
  y: number;
  viewportHeight: number;
  viewportWidth?: number;
  sourceWidth?: number;
  sourceHeight?: number;
  contentRect?: ContentRect;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function getNearestNumber(params: { target: number; candidates: number[] }) {
  const { target, candidates } = params;

  if (candidates.length === 0) return target;

  let best = candidates[0];
  let bestDist = Math.abs(best - target);

  for (let i = 1; i < candidates.length; i += 1) {
    const next = candidates[i];
    const nextDist = Math.abs(next - target);
    if (nextDist < bestDist) {
      best = next;
      bestDist = nextDist;
    }
  }

  return best;
}

function getNormalizedSlots(lineGuideId: string, page: number): readonly NormalizedLineSlot[] {
  const slotSet = (LINE_SLOTS as Record<string, Record<string, readonly NormalizedLineSlot[]>>)[
    lineGuideId
  ];
  const fromSlots = slotSet?.[String(page)];
  if (fromSlots?.length) return fromSlots;

  const guideSet = (LINE_GUIDES as Record<string, Record<string, readonly number[]>>)[lineGuideId];
  const normalizedLines = guideSet?.[String(page)];
  if (!normalizedLines?.length) return [];

  const margins = getAlbumTextMargins(lineGuideId);
  return normalizedLines.map((normY) => ({
    x: margins.x,
    y: normY,
    width: margins.width,
    height: 0.028,
  }));
}

function getLineTopYsInViewport(params: {
  lineGuideId: string;
  page: number;
  viewportWidth: number;
  viewportHeight: number;
  sourceWidth?: number;
  sourceHeight?: number;
  contentRect?: ContentRect;
}): number[] {
  const {
    lineGuideId,
    page,
    viewportWidth,
    viewportHeight,
    sourceWidth,
    sourceHeight,
    contentRect,
  } = params;

  const rect =
    contentRect ??
    getContentRect(
      viewportWidth,
      viewportHeight,
      sourceWidth ?? viewportWidth,
      sourceHeight ?? viewportHeight
    );

  const normalized = getNormalizedSlots(lineGuideId, page);
  return normalized
    .map((norm) =>
      mapSourceNormToViewport(
        norm.x,
        norm.y - norm.height / 2,
        norm.width,
        norm.height,
        rect
      ).y
    )
    .filter(isFiniteNumber);
}

export function snapYToNearestTemplateLine(params: SnapYToNearestTemplateLineParams) {
  const {
    lineGuideId,
    page,
    y,
    viewportHeight,
    viewportWidth = 0,
    sourceWidth,
    sourceHeight,
    contentRect,
  } = params;

  if (!lineGuideId) return y;
  if (!isFiniteNumber(y)) return y;
  if (!isFiniteNumber(viewportHeight) || viewportHeight <= 0) return y;
  if (!isFiniteNumber(page) || page < 1) return y;

  const lineYs = getLineTopYsInViewport({
    lineGuideId,
    page,
    viewportWidth: viewportWidth > 0 ? viewportWidth : viewportHeight,
    viewportHeight,
    sourceWidth,
    sourceHeight,
    contentRect,
  });

  if (lineYs.length === 0) return y;

  return getNearestNumber({ target: y, candidates: lineYs });
}

export function getTemplateTextLineMetrics(params: {
  lineGuideId?: string;
  page?: number | string;
  y: number;
  viewportHeight: number;
  viewportWidth?: number;
  sourceWidth?: number;
  sourceHeight?: number;
  contentRect?: ContentRect;
}) {
  const {
    lineGuideId,
    page,
    y,
    viewportHeight,
    viewportWidth = 0,
    sourceWidth,
    sourceHeight,
    contentRect,
  } = params;
  if (!lineGuideId) return null;
  if (!isFiniteNumber(y)) return null;
  if (!isFiniteNumber(viewportHeight) || viewportHeight <= 0) return null;
  if (typeof page !== 'number' || !isFiniteNumber(page) || page < 1) return null;

  const vw = viewportWidth > 0 ? viewportWidth : viewportHeight;
  const lineSlots = getLineSlotsForPageFromGuides({
    lineGuideId,
    page,
    viewportWidth: vw,
    viewportHeight,
    sourceWidth,
    sourceHeight,
    contentRect,
  });

  if (lineSlots.length === 0) return null;

  let bestIndex = 0;
  let bestDist = Math.abs(lineSlots[0].y - y);
  for (let i = 1; i < lineSlots.length; i += 1) {
    const dist = Math.abs(lineSlots[i].y - y);
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }

  const snapped = lineSlots[bestIndex];
  return { snappedY: snapped.y, lineHeight: snapped.lineHeight };
}

function getLineSlotsForPageFromGuides(params: {
  lineGuideId: string;
  page: number;
  viewportWidth: number;
  viewportHeight: number;
  sourceWidth?: number;
  sourceHeight?: number;
  contentRect?: ContentRect;
}): { y: number; lineHeight: number }[] {
  const rect =
    params.contentRect ??
    getContentRect(
      params.viewportWidth,
      params.viewportHeight,
      params.sourceWidth ?? params.viewportWidth,
      params.sourceHeight ?? params.viewportHeight
    );

  const normalized = getNormalizedSlots(params.lineGuideId, params.page);
  return normalized.map((norm) => {
    const mapped = mapSourceNormToViewport(
      norm.x,
      norm.y - norm.height / 2,
      norm.width,
      norm.height,
      rect
    );
    return { y: mapped.y, lineHeight: mapped.height };
  });
}
