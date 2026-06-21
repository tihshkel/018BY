import type { Annotation } from '@/components/pdf-annotations';
import type { Color, PDFPage, PDFFont } from 'pdf-lib';
import {
  getContentRect,
  getViewportToPdfScale,
  type ContentRect,
} from '@/utils/imageContentRect';
import {
  distributeTextWithinContinuationGroup,
  getContinuationGroupSlots,
  getEffectiveTemplateFontSize,
  getTemplateLineTextTop,
  getTemplateLineTypography,
  joinContinuationSegmentTexts,
  truncateTextToSlotWidth,
  type TextWidthMeasure,
} from '@/utils/templateLineText';
import { getLineSlotsForPage } from '@/utils/textLineSlots';

type DrawTemplateTextParams = {
  page: PDFPage;
  ann: Annotation;
  lineGuideId: string;
  pageNumber: number;
  pagesViewport: { width: number; height: number };
  sourceWidth: number;
  sourceHeight: number;
  offsetX: number;
  offsetY: number;
  actualImageWidth: number;
  actualImageHeight: number;
  font?: PDFFont;
  color: Color;
  /** Все текстовые аннотации страницы — для merge групп продолжения (как в редакторе). */
  pageAnnotations?: Annotation[];
};

function resolveTemplateAnnotationPage(ann: Annotation, slotPage: number): number {
  return typeof ann.sourcePageNumber === 'number' ? ann.sourcePageNumber : ann.page ?? slotPage;
}

function findExportAnnotationForSlot(
  pageAnnotations: Annotation[],
  slotPage: number,
  slotIndex: number,
): Annotation | undefined {
  return pageAnnotations.find((ann) => {
    if (ann.type !== 'text') return false;
    if (resolveTemplateAnnotationPage(ann, slotPage) !== slotPage) return false;
    if (typeof ann.templateLineStart !== 'number') return false;
    const count = ann.templateLineCount ?? 1;
    if (count === 1) return ann.templateLineStart === slotIndex;
    return slotIndex >= ann.templateLineStart && slotIndex < ann.templateLineStart + count;
  });
}

/** Не рисуем «хвостовые» аннотации группы — только primary (startSlotIndex). */
export function shouldSkipTemplateLineExportSibling(
  ann: Annotation,
  slots: ReturnType<typeof getLineSlotsForPage>,
  pageAnnotations: Annotation[],
  slotPage: number,
): boolean {
  if (typeof ann.templateLineStart !== 'number') return false;

  const { startSlotIndex, groupSlots } = getContinuationGroupSlots(slots, ann.templateLineStart);
  if (groupSlots.length <= 1) return false;

  const templateAnns = pageAnnotations.filter(
    (item) =>
      item.type === 'text' &&
      resolveTemplateAnnotationPage(item, slotPage) === slotPage &&
      typeof item.templateLineStart === 'number',
  );
  const primary = templateAnns.find((item) => (item.templateLineStart ?? -1) === startSlotIndex);
  if (!primary) return ann.templateLineStart !== startSlotIndex;
  return ann.id !== primary.id;
}

function getMergedExportTemplateGroupText(
  ann: Annotation,
  slots: ReturnType<typeof getLineSlotsForPage>,
  pageAnnotations: Annotation[],
  slotPage: number,
): string {
  if (typeof ann.templateLineStart !== 'number') return ann.content ?? '';

  const { groupSlots } = getContinuationGroupSlots(slots, ann.templateLineStart);
  if (groupSlots.length <= 1) return ann.content ?? '';

  const parts = groupSlots.map((slot) => ({
    content: findExportAnnotationForSlot(pageAnnotations, slotPage, slot.index)?.content ?? '',
  }));
  const merged = joinContinuationSegmentTexts(parts);
  return merged.trim() || ann.content || '';
}

/**
 * Рисует текст построчно по слотам шаблона (для PDF fallback-экспорта).
 */
export function drawTemplateTextOnPdfPage(params: DrawTemplateTextParams): boolean {
  const {
    page,
    ann,
    lineGuideId,
    pageNumber,
    pagesViewport,
    sourceWidth,
    sourceHeight,
    offsetX,
    offsetY,
    actualImageWidth,
    actualImageHeight,
    font,
    color,
    pageAnnotations = [],
  } = params;

  if (ann.type !== 'text') return false;
  if (typeof ann.templateLineStart !== 'number') return false;

  const editorContentRect = getContentRect(
    pagesViewport.width,
    pagesViewport.height,
    sourceWidth,
    sourceHeight
  );

  const slots = getLineSlotsForPage({
    lineGuideId,
    page: pageNumber,
    viewportWidth: pagesViewport.width,
    viewportHeight: pagesViewport.height,
    sourceWidth,
    sourceHeight,
    contentRect: editorContentRect,
  });

  if (slots.length === 0) return false;

  if (
    pageAnnotations.length > 0 &&
    shouldSkipTemplateLineExportSibling(ann, slots, pageAnnotations, pageNumber)
  ) {
    return true;
  }

  const startSlot = slots[ann.templateLineStart];
  if (!startSlot) return false;

  const mergedText =
    pageAnnotations.length > 0
      ? getMergedExportTemplateGroupText(ann, slots, pageAnnotations, pageNumber)
      : ann.content;
  if (!mergedText) return false;

  const effectiveFontSize = getEffectiveTemplateFontSize(
    lineGuideId,
    startSlot,
    ann.fontSize || 16
  );

  const pdfImageRect: ContentRect = {
    offsetX,
    offsetY,
    width: actualImageWidth,
    height: actualImageHeight,
  };

  const { scaleX, scaleY } = getViewportToPdfScale(editorContentRect, actualImageWidth, actualImageHeight);
  const scaledFontSize = effectiveFontSize * scaleY;
  const textAlign = ann.textAlign ?? 'left';
  const fontId = ann.fontFamily;

  const measureTextWidth: TextWidthMeasure | undefined = font
    ? (text) => font.widthOfTextAtSize(text, scaledFontSize) / scaleX
    : undefined;

  const { startSlotIndex } = getContinuationGroupSlots(slots, ann.templateLineStart);
  const { segments } = distributeTextWithinContinuationGroup({
    text: mergedText,
    startSlotIndex,
    slots,
    fontSize: effectiveFontSize,
    lineGuideId,
    fontId,
    measureTextWidth,
  });

  for (const segment of segments) {
    if (!segment.content) continue;

    const slot = slots[segment.slotIndex];
    if (!slot) break;

    const content = truncateTextToSlotWidth(
      segment.content,
      slot,
      effectiveFontSize,
      lineGuideId,
      fontId,
      measureTextWidth
    );
    if (!content) continue;

    const textTop = getTemplateLineTextTop(slot, effectiveFontSize, lineGuideId);
    const inputKind = slot.inputKind ?? 'line';
    const rowTypography = getTemplateLineTypography(
      effectiveFontSize,
      slot.lineHeight,
      inputKind,
      lineGuideId,
    );
    const relX = slot.x - editorContentRect.offsetX;
    const relTextTop = textTop - editorContentRect.offsetY;
    // pdf-lib drawText(y) — typographic baseline; в UI верх текста = textTop (getTemplateLineTextTop).
    let ascentFromTop = rowTypography.fontSize * (inputKind === 'block' ? 0.88 : 0.85);
    if (font) {
      const boxHeight = font.heightAtSize(scaledFontSize);
      ascentFromTop =
        rowTypography.fontSize *
        Math.min(0.92, Math.max(0.72, (boxHeight * 0.78) / scaledFontSize));
    }
    const relBaseline = relTextTop + ascentFromTop;

    const scaledX = pdfImageRect.offsetX + relX * scaleX;
    const scaledY =
      pdfImageRect.offsetY + pdfImageRect.height - relBaseline * scaleY;

    let drawX = scaledX;
    if (font && textAlign !== 'left') {
      const textWidth = font.widthOfTextAtSize(content, scaledFontSize);
      const slotWidth = slot.width * scaleX;
      if (textAlign === 'center') {
        drawX = scaledX + (slotWidth - textWidth) / 2;
      } else if (textAlign === 'right') {
        drawX = scaledX + slotWidth - textWidth;
      }
    }

    page.drawText(content, {
      x: drawX,
      y: scaledY,
      size: scaledFontSize,
      color,
      font,
    });
  }

  return true;
}
