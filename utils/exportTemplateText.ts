import type { Annotation } from '@/components/pdf-annotations';
import type { Color, PDFPage, PDFFont } from 'pdf-lib';
import { getTemplateTypographyProfile } from '@/constants/album-text-margins';
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
  const profile = getTemplateTypographyProfile(lineGuideId);
  const baselineRatio = profile.lineFontOffsetRatio;

  const pdfImageRect: ContentRect = {
    offsetX,
    offsetY,
    width: actualImageWidth,
    height: actualImageHeight,
  };

  const { scaleX, scaleY } = getViewportToPdfScale(editorContentRect, actualImageWidth, actualImageHeight);
  const scaledFontSize = effectiveFontSize * scaleY;
  const textAlign = ann.textAlign ?? 'left';

  const { startSlotIndex } = getContinuationGroupSlots(slots, ann.templateLineStart);
  const { segments } = distributeTextWithinContinuationGroup({
    text: ann.content,
    startSlotIndex,
    slots,
    fontSize: effectiveFontSize,
    lineGuideId,
  });

  for (const segment of segments) {
    if (!segment.content) continue;

    const slot = slots[segment.slotIndex];
    if (!slot) break;

    const textTop = getTemplateLineTextTop(slot, effectiveFontSize, lineGuideId);
    const relX = slot.x - editorContentRect.offsetX;
    const relY = textTop - editorContentRect.offsetY;

    const scaledX = pdfImageRect.offsetX + relX * scaleX;
    const scaledY =
      pdfImageRect.offsetY +
      pdfImageRect.height -
      relY * scaleY -
      scaledFontSize * baselineRatio;

    let drawX = scaledX;
    if (font && textAlign !== 'left') {
      const textWidth = font.widthOfTextAtSize(segment.content, scaledFontSize);
      const slotWidth = slot.width * scaleX;
      if (textAlign === 'center') {
        drawX = scaledX + (slotWidth - textWidth) / 2;
      } else if (textAlign === 'right') {
        drawX = scaledX + slotWidth - textWidth;
      }
    }

    page.drawText(segment.content, {
      x: drawX,
      y: scaledY,
      size: scaledFontSize,
      color,
      font,
    });
  }

  return true;
}
