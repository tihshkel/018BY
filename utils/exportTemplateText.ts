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
  getTemplateLineAscenderPadding,
  getTemplateLineTextTop,
  getTemplateLineTypography,
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
    text: ann.content,
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
    const ascenderPadding = getTemplateLineAscenderPadding(
      rowTypography.fontSize,
      inputKind,
    );
    const relX = slot.x - editorContentRect.offsetX;
    const viewportBaseline = textTop + ascenderPadding + rowTypography.fontSize;
    const relBaseline = viewportBaseline - editorContentRect.offsetY;

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
