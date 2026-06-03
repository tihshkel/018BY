import { getAlbumTextMargins, isBlankLineGuideAlbum } from '@/constants/album-text-margins';
import { LINE_GUIDES } from '@/constants/line-guides';
import {
  LINE_SLOTS,
  type NormalizedLineSlot,
} from '@/constants/line-slots';
import type { Annotation } from '@/components/pdf-annotations';
import {
  getContentRect,
  mapSourceNormToViewport,
  type ContentRect,
} from '@/utils/imageContentRect';
import { wrapTextToLines } from '@/utils/textWrap';

export type TextLineSlot = {
  index: number;
  page: number;
  y: number;
  x: number;
  width: number;
  lineHeight: number;
  hasLabel: boolean;
  continuationGroup: number;
  inputKind?: 'line' | 'block';
  /** Нормализованный центр слота по Y (0–1), для типографики */
  normY?: number;
  /** Нормализованная высота слота (0–1), для типографики */
  normHeight?: number;
};

export type GetLineSlotsParams = {
  lineGuideId: string;
  page: number;
  viewportWidth: number;
  viewportHeight: number;
  sourceWidth?: number;
  sourceHeight?: number;
  contentRect?: ContentRect;
};

function getNormalizedSlotsForPage(
  lineGuideId: string,
  page: number
): readonly NormalizedLineSlot[] {
  const slotSet = (LINE_SLOTS as Record<string, Record<string, readonly NormalizedLineSlot[]>>)[
    lineGuideId
  ];
  const fromSlots = slotSet?.[String(page)];
  if (fromSlots?.length) return fromSlots;

  const guideSet = (LINE_GUIDES as Record<string, Record<string, readonly number[]>>)[lineGuideId];
  const normalizedLines = guideSet?.[String(page)];
  if (!normalizedLines?.length) return [];

  const margins = getAlbumTextMargins(lineGuideId);
  return normalizedLines.map((normY, index) => {
    const prev = index > 0 ? normalizedLines[index - 1] : null;
    const next = index < normalizedLines.length - 1 ? normalizedLines[index + 1] : null;
    let band = 0.028;
    if (prev !== null && next !== null) band = (next - prev) / 2;
    else if (next !== null) band = next - normY;
    else if (prev !== null) band = normY - prev;
    band = Math.min(Math.max(band, 0.012), 0.12);

    return {
      x: margins.x,
      y: normY,
      width: margins.width,
      height: band,
      hasLabel: true,
      continuationGroup: index + 1,
    };
  });
}

export function hasLineGuides(lineGuideId?: string): boolean {
  if (!lineGuideId || isBlankLineGuideAlbum(lineGuideId)) return false;
  const slotSet = (LINE_SLOTS as Record<string, Record<string, readonly unknown[]>>)[lineGuideId];
  if (slotSet && Object.keys(slotSet).length > 0) return true;
  const guideSet = (LINE_GUIDES as Record<string, Record<string, readonly number[]>>)[lineGuideId];
  return !!guideSet && Object.keys(guideSet).length > 0;
}

export function resolveContentRectForPage(params: GetLineSlotsParams): ContentRect {
  const { viewportWidth, viewportHeight, sourceWidth, sourceHeight, contentRect } = params;
  if (contentRect) return contentRect;
  return getContentRect(
    viewportWidth,
    viewportHeight,
    sourceWidth ?? viewportWidth,
    sourceHeight ?? viewportHeight
  );
}

export function getLineSlotsForPage(params: GetLineSlotsParams): TextLineSlot[] {
  const { lineGuideId, page, viewportWidth, viewportHeight } = params;
  if (!hasLineGuides(lineGuideId) || viewportWidth <= 0 || viewportHeight <= 0) {
    return [];
  }

  const normalized = getNormalizedSlotsForPage(lineGuideId, page);
  if (!normalized.length) return [];

  const rect = resolveContentRectForPage(params);

  return normalized.map((norm, index) => {
    const mapped = mapSourceNormToViewport(
      norm.x,
      norm.y - norm.height / 2,
      norm.width,
      norm.height,
      rect
    );

    return {
      index,
      page,
      x: mapped.x,
      y: mapped.y,
      width: mapped.width,
      lineHeight: mapped.height,
      hasLabel: norm.hasLabel ?? true,
      continuationGroup: norm.continuationGroup ?? index + 1,
      inputKind: norm.inputKind,
      normY: norm.y,
      normHeight: norm.height,
    };
  });
}

export function hitTestLineSlot(params: {
  x: number;
  y: number;
  slots: TextLineSlot[];
}): TextLineSlot | null {
  const { x, y, slots } = params;

  let best: TextLineSlot | null = null;
  let bestCenterDistance = Infinity;

  for (const slot of slots) {
    const inX = x >= slot.x && x <= slot.x + slot.width;
    const inY = y >= slot.y && y <= slot.y + slot.lineHeight;
    if (!inX || !inY) continue;

    const centerY = slot.y + slot.lineHeight / 2;
    const centerDistance = Math.abs(y - centerY);
    if (centerDistance < bestCenterDistance) {
      bestCenterDistance = centerDistance;
      best = slot;
    }
  }

  return best;
}

export function findAnnotationForSlot(
  annotations: Annotation[],
  page: number,
  slotIndex: number
): Annotation | undefined {
  return annotations.find((ann) => {
    if (ann.type !== 'text' || ann.page !== page) return false;
    if (typeof ann.templateLineStart !== 'number') return false;
    const count = ann.templateLineCount ?? 1;
    if (count === 1) return ann.templateLineStart === slotIndex;
    return slotIndex >= ann.templateLineStart && slotIndex < ann.templateLineStart + count;
  });
}

export function distributeTextAcrossSlots(params: {
  text: string;
  startSlotIndex: number;
  slots: TextLineSlot[];
  fontSize: number;
}): { content: string; lineCount: number; truncated: boolean } {
  const { text, startSlotIndex, slots, fontSize } = params;
  const availableSlots = slots.slice(startSlotIndex);
  if (availableSlots.length === 0) {
    return { content: text, lineCount: 1, truncated: false };
  }

  const slotWidth = availableSlots[0]?.width ?? 200;
  const allLines: string[] = [];
  const paragraphs = text.split('\n');
  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      allLines.push('');
      continue;
    }
    allLines.push(...wrapTextToLines(paragraph, slotWidth, fontSize));
  }

  const maxLines = availableSlots.length;
  const used = allLines.slice(0, maxLines);
  const truncated = allLines.length > maxLines;

  return {
    content: used.join('\n'),
    lineCount: Math.max(1, used.length),
    truncated,
  };
}

export function getSlotYForLineIndex(
  slots: TextLineSlot[],
  startIndex: number,
  lineOffset: number
): number {
  const slot = slots[startIndex + lineOffset];
  return slot?.y ?? slots[startIndex]?.y ?? 0;
}

export function layoutAnnotationFromSlot(slot: TextLineSlot): Pick<
  Annotation,
  'x' | 'y' | 'width' | 'height' | 'templateLineStart' | 'templateLineCount'
> {
  return {
    x: slot.x,
    y: slot.y,
    width: slot.width,
    height: slot.lineHeight,
    templateLineStart: slot.index,
    templateLineCount: 1,
  };
}

export function buildLineSlotsContext(params: GetLineSlotsParams): {
  contentRect: ContentRect;
  slots: TextLineSlot[];
} {
  const contentRect = resolveContentRectForPage(params);
  const slots = getLineSlotsForPage({ ...params, contentRect });
  return { contentRect, slots };
}
