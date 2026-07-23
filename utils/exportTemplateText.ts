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
  getTemplateBlockTextInsets,
  resolveBirthQuestionnaireBlockTextAlign,
  resolvePregnancyWeeklyFieldRowLayout,
  resolveTemplateLineViewportBaseline,
  resolveTemplateTextRenderBox,
  shouldClipPregnancyWeeklyFieldRow,
  type TextWidthMeasure,
} from '@/utils/templateLineText';
import { normalizeAlbumUserText } from '@/utils/normalizeAlbumUserText';
import { resolveMeasureTextWidth } from '@/utils/templateTextMeasure';
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

  const annContent = normalizeAlbumUserText(ann.content);

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

  const baseFontSize = ann.fontSize || 16;
  const fontId = ann.fontFamily;
  /** Те же метрики, что в read-only preview — иначе переносы строк расходятся с PDF. */
  const measureTextWidth: TextWidthMeasure | undefined = resolveMeasureTextWidth(fontId);

  const { startSlotIndex } = getContinuationGroupSlots(slots, ann.templateLineStart);

  const pdfImageRect: ContentRect = {
    offsetX,
    offsetY,
    width: actualImageWidth,
    height: actualImageHeight,
  };

  const { scaleX, scaleY } = getViewportToPdfScale(editorContentRect, actualImageWidth, actualImageHeight);

  const drawSegmentAtSlot = (slotIndex: number, content: string): void => {
    const slot = slots[slotIndex];
    if (!slot || !content) return;

    const segmentFontSize = getEffectiveTemplateFontSize(
      lineGuideId,
      slot,
      baseFontSize,
      { textContent: content, fontId },
    );
    const scaledFontSize = segmentFontSize * scaleY;

    const textInsets = getTemplateBlockTextInsets(slot, lineGuideId, slots);
    const renderBox = shouldClipPregnancyWeeklyFieldRow(slot, lineGuideId, slots)
      ? resolvePregnancyWeeklyFieldRowLayout(
          slot,
          content,
          lineGuideId,
          slots,
          segmentFontSize,
          fontId,
          measureTextWidth,
        )
      : resolveTemplateTextRenderBox(slot, textInsets);
    const textAlign =
      ann.textAlign ?? resolveBirthQuestionnaireBlockTextAlign(slot, lineGuideId);
    const relX = renderBox.viewLeft + renderBox.textLeft - editorContentRect.offsetX;
    const viewportBaseline = resolveTemplateLineViewportBaseline({
      slot,
      fontSize: segmentFontSize,
      lineGuideId,
      allSlots: slots,
      fontId,
    });
    const relBaseline = viewportBaseline - editorContentRect.offsetY;

    const scaledX = pdfImageRect.offsetX + relX * scaleX;
    const scaledY =
      pdfImageRect.offsetY + pdfImageRect.height - relBaseline * scaleY;

    let drawX = scaledX;
    if (font && textAlign !== 'left') {
      const textWidth = font.widthOfTextAtSize(content, scaledFontSize);
      const slotWidth = renderBox.textWidth * scaleX;
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
  };

  // Legacy split segments: single-line fragment on a non-head slot only.
  const isLegacySplitSegment =
    (ann.templateLineCount ?? 1) === 1 &&
    startSlotIndex !== ann.templateLineStart;

  if (isLegacySplitSegment) {
    drawSegmentAtSlot(ann.templateLineStart, annContent);
    return true;
  }

  // Кегль как при draw — иначе на узких слотах (зубные даты) distribute
  // режет текст до shrinkFontSizeToFitSlotText.
  const distributeFontSize = getEffectiveTemplateFontSize(
    lineGuideId,
    startSlot,
    baseFontSize,
    { textContent: annContent, fontId },
  );

  const { segments } = distributeTextForTemplateAnnotation({
    text: annContent,
    startSlotIndex: ann.templateLineStart,
    slots,
    fontSize: distributeFontSize,
    lineGuideId,
    fontId,
    lineCount: ann.templateLineCount ?? 1,
    measureTextWidth,
  });

  for (const segment of segments) {
    if (!segment.content) continue;
    drawSegmentAtSlot(segment.slotIndex, segment.content);
  }

  return true;
}
