import type { Annotation } from '@/components/pdf-annotations';
import type { Color, PDFPage, PDFFont } from 'pdf-lib';
import {
  getContentRect,
  getViewportToPdfScale,
  type ContentRect,
} from '@/utils/imageContentRect';
import {
  distributeTextForTemplateAnnotation,
  getContinuationGroupSlots,
  getEffectiveTemplateFontSize,
  getTemplateLinePdfBaselineY,
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
};

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
  } = params;

  if (ann.type !== 'text' || !ann.content) return false;
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

  const startSlot = slots[ann.templateLineStart];
  if (!startSlot) return false;

  const effectiveFontSize = getEffectiveTemplateFontSize(
    lineGuideId,
    startSlot,
    ann.fontSize || 16
  );

  const { startSlotIndex } = getContinuationGroupSlots(slots, ann.templateLineStart);

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

  const drawSegmentAtSlot = (slotIndex: number, content: string): void => {
    const slot = slots[slotIndex];
    if (!slot || !content) return;

    const truncated = truncateTextToSlotWidth(
      content,
      slot,
      effectiveFontSize,
      lineGuideId,
      fontId,
      measureTextWidth,
    );
    if (!truncated) return;

    const relX = slot.x - editorContentRect.offsetX;
    const viewportBaseline = getTemplateLinePdfBaselineY(
      slot,
      effectiveFontSize,
      lineGuideId,
    );
    const relBaseline = viewportBaseline - editorContentRect.offsetY;

    const scaledX = pdfImageRect.offsetX + relX * scaleX;
    const scaledY =
      pdfImageRect.offsetY + pdfImageRect.height - relBaseline * scaleY;

    let drawX = scaledX;
    if (font && textAlign !== 'left') {
      const textWidth = font.widthOfTextAtSize(truncated, scaledFontSize);
      const slotWidth = slot.width * scaleX;
      if (textAlign === 'center') {
        drawX = scaledX + (slotWidth - textWidth) / 2;
      } else if (textAlign === 'right') {
        drawX = scaledX + slotWidth - textWidth;
      }
    }

    page.drawText(truncated, {
      x: drawX,
      y: scaledY,
      size: scaledFontSize,
      color,
      font,
    });
  };

  // Legacy split segments: draw only on their slot (not at group head).
  if (startSlotIndex !== ann.templateLineStart) {
    drawSegmentAtSlot(ann.templateLineStart, ann.content);
    return true;
  }

  const { segments } = distributeTextForTemplateAnnotation({
    text: ann.content,
    startSlotIndex: ann.templateLineStart,
    slots,
    fontSize: effectiveFontSize,
    lineGuideId,
    fontId,
    lineCount: ann.templateLineCount ?? 1,
  });

  for (const segment of segments) {
    if (!segment.content) continue;
    drawSegmentAtSlot(segment.slotIndex, segment.content);
  }

  return true;
}
