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
  getTemplateLineFitSlot,
  getTemplateLinePdfDrawLayout,
  truncateTextToSlotWidth,
} from '@/utils/templateLineText';
import { getLineSlotsForPage, getPregnancyWeeklyFieldStartIndex } from '@/utils/textLineSlots';

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

  const fitSlots = slots.map((s) => ({
    ...s,
    ...getTemplateLineFitSlot(s, lineGuideId),
  }));

  const startSlot = slots[ann.templateLineStart];
  if (!startSlot) return false;

  const effectiveFontSize = getEffectiveTemplateFontSize(
    lineGuideId,
    startSlot,
    ann.fontSize || 16
  );

  const { startSlotIndex } = getContinuationGroupSlots(slots, ann.templateLineStart);
  const lineCount = ann.templateLineCount ?? 1;
  const fieldStartForLayout =
    lineCount > 1 ? ann.templateLineStart : getPregnancyWeeklyFieldStartIndex(ann.templateLineStart, slots);

  const pdfImageRect: ContentRect = {
    offsetX,
    offsetY,
    width: actualImageWidth,
    height: actualImageHeight,
  };

  const { scaleX, scaleY } = getViewportToPdfScale(editorContentRect, actualImageWidth, actualImageHeight);
  const textAlign = ann.textAlign ?? 'left';
  const fontId = ann.fontFamily;

  const drawSegmentAtSlot = (
    slotIndex: number,
    content: string,
    preDistributed = false,
  ): void => {
    const slot = slots[slotIndex];
    if (!slot || !content) return;

    const fitSlot = getTemplateLineFitSlot(slot, lineGuideId);

    const drawLayout = getTemplateLinePdfDrawLayout({
      slot,
      fontSize: effectiveFontSize,
      lineGuideId,
      fontId,
      allSlots: slots,
      fieldStartIndex: fieldStartForLayout,
      textContent: content,
    });

    // Те же оценки ширины, что в превью — pdf-lib метрики иначе вмещают больше символов в строку.
    const truncated = preDistributed
      ? content
      : truncateTextToSlotWidth(
          content,
          fitSlot as typeof slot,
          drawLayout.fontSize,
          lineGuideId,
          fontId,
        );
    if (!truncated) return;

    const relX = drawLayout.x - editorContentRect.offsetX;
    const relBaseline = drawLayout.baselineY - editorContentRect.offsetY;
    const scaledFontSize = drawLayout.fontSize * scaleY;

    const scaledX = pdfImageRect.offsetX + relX * scaleX;
    const scaledY =
      pdfImageRect.offsetY + pdfImageRect.height - relBaseline * scaleY;

    let drawX = scaledX;
    if (font && textAlign !== 'left') {
      const textWidth = font.widthOfTextAtSize(truncated, scaledFontSize);
      const slotWidth = drawLayout.width * scaleX;
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
    slots: fitSlots,
    fontSize: effectiveFontSize,
    lineGuideId,
    fontId,
    lineCount,
  });

  for (const segment of segments) {
    if (!segment.content) continue;
    drawSegmentAtSlot(segment.slotIndex, segment.content, true);
  }

  return true;
}
