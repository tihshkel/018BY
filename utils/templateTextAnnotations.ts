import type { Annotation } from '@/components/pdf-annotations';
import { getAlbumFontCharWidthMultiplier } from '@/constants/album-fonts';
import type { AlbumPageSchema, PageValues } from '@/types/album-page-schema';
import { shouldRenderPhotoSlotCaptions } from '@/utils/photoCaptions';
import { stableAnnotationId } from '@/utils/stableAnnotationId';
import type { ContentRect } from '@/utils/imageContentRect';
import {
  computePhotoBlockLayout,
  resolvePhotoBlockSlotRects,
} from '@/utils/photoBlockLayout';
import {
  getPageFormatForLineGuide,
  getTemplateLayout,
  isBlankTemplateLineGuide,
} from '@/utils/photoPageTemplateManifest';
import { isNonDefaultPhotoSlotTransform } from '@/utils/photoSlotTransform';
import { getTextBlockRect } from '@/utils/resolveTemplatePageLayout';
import {
  estimateTemplateFontSize,
  fitTextToTemplateBlock,
  mapTemplateFrameToViewport,
} from '@/utils/templateTextLayout';
import { wrapTextToLines } from '@/utils/textWrap';

type AppendParams = {
  schema: AlbumPageSchema;
  values: PageValues;
  lineGuideId: string;
  editorContentRect: ContentRect;
  viewportHeight: number;
  fontSize: number;
  textFontFamily: string;
  zIndex: number;
};

function hasText(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function appendBlankTemplateTextAnnotations(params: AppendParams): {
  annotations: Annotation[];
  zIndex: number;
} {
  const {
    schema,
    values,
    lineGuideId,
    editorContentRect,
    viewportHeight,
    fontSize,
    textFontFamily,
  } = params;

  let zIndex = params.zIndex;
  const annotations: Annotation[] = [];

  if (!schema.templateLibraryId || !isBlankTemplateLineGuide(lineGuideId)) {
    return { annotations, zIndex };
  }

  const format = getPageFormatForLineGuide(lineGuideId);
  const layout = getTemplateLayout(schema.templateLibraryId, format);
  if (!layout) return { annotations, zIndex };

  const pushText = (text: string, fieldIdSuffix: string) => {
    const block = getTextBlockRect(schema.templateLibraryId!, format, fieldIdSuffix);
    if (!block) return;
    const rect = mapTemplateFrameToViewport(block, editorContentRect);
    const preferredFontSize = estimateTemplateFontSize(block.h, viewportHeight) || fontSize;
    const fitted = fitTextToTemplateBlock({
      text,
      boxWidth: rect.width,
      boxHeight: rect.height,
      fontId: textFontFamily,
      preferredFontSize,
    });
    if (fitted.lines.length === 0) return;
    annotations.push({
      id: stableAnnotationId('blank-field', lineGuideId, schema.sourcePageNumber, fieldIdSuffix),
      type: 'text',
      page: schema.sourcePageNumber,
      content: fitted.lines.join('\n'),
      fontSize: fitted.fontSize,
      fontFamily: textFontFamily,
      color: '#3D3D3D',
      zIndex: zIndex++,
      sourcePageNumber: schema.sourcePageNumber,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    });
  };

  for (const field of schema.fields ?? []) {
    const text = values.fields[field.fieldId];
    if (!hasText(text)) continue;
    pushText(text!, field.fieldId);
  }

  const captionBlocks =
    layout.textBlocks?.filter((block) => block.type === 'caption') ?? [];
  const useSingleCaption =
    captionBlocks.length === 1 && !layout.perPhotoCaptions && hasText(values.caption);

  if (useSingleCaption && values.caption) {
    pushText(values.caption, `_${captionBlocks[0]!.id}`);
  }

  if (layout.perPhotoCaptions && values.photoCaptions?.length) {
    for (let i = 0; i < values.photoCaptions.length; i += 1) {
      const text = values.photoCaptions[i];
      if (!hasText(text)) continue;
      pushText(text!, `_caption${i + 1}`);
    }
  }

  for (const element of values.freeElements ?? []) {
    if (element.type === 'text' && hasText(element.content)) {
      const rect = mapTemplateFrameToViewport(element, editorContentRect);
      annotations.push({
        id: stableAnnotationId('free-text', lineGuideId, schema.sourcePageNumber, element.id),
        type: 'text',
        page: schema.sourcePageNumber,
        content: element.content!.trim(),
        fontSize: estimateTemplateFontSize(element.h, viewportHeight) || fontSize,
        fontFamily: textFontFamily,
        color: '#3D3D3D',
        zIndex: zIndex++,
        sourcePageNumber: schema.sourcePageNumber,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      });
    }
  }

  return { annotations, zIndex };
}

export function appendTemplatePhotoCaptionAnnotations(params: AppendParams): {
  annotations: Annotation[];
  zIndex: number;
} {
  const {
    schema,
    values,
    lineGuideId,
    editorContentRect,
    viewportHeight,
    fontSize,
    textFontFamily,
  } = params;

  let zIndex = params.zIndex;
  const annotations: Annotation[] = [];

  if (!schema.templateLibraryId || !values.photoCaptions?.length) {
    return { annotations, zIndex };
  }

  const format = getPageFormatForLineGuide(lineGuideId);
  const layout = getTemplateLayout(schema.templateLibraryId, format);
  if (!layout?.perPhotoCaptions) {
    return { annotations, zIndex };
  }

  const captionBlocks =
    layout.textBlocks?.filter((block) => block.type === 'caption') ?? [];

  for (let i = 0; i < values.photoCaptions.length; i += 1) {
    const text = values.photoCaptions[i];
    if (!hasText(text)) continue;

    const block =
      captionBlocks[i] ??
      layout.textBlocks?.find((item) => item.id === `caption${i + 1}`);
    if (!block) continue;

    const rect = mapTemplateFrameToViewport(block, editorContentRect);
    annotations.push({
      id: stableAnnotationId('template-caption', lineGuideId, schema.sourcePageNumber, block.id, i),
      type: 'text',
      page: schema.sourcePageNumber,
      content: text!.trim(),
      fontSize: estimateTemplateFontSize(block.h, viewportHeight) || fontSize,
      fontFamily: textFontFamily,
      color: '#3D3D3D',
      textAlign: 'center',
      zIndex: zIndex++,
      sourcePageNumber: schema.sourcePageNumber,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    });
  }

  return { annotations, zIndex };
}

type PhotoSlotCaptionParams = AppendParams & {
  viewportWidth: number;
  viewportHeight: number;
  sourceWidth?: number;
  sourceHeight?: number;
};

const PHOTO_CAPTION_LINE_HEIGHT = 1.15;
const PHOTO_CAPTION_PADDING = 4;

function layoutCaptionNearPhoto(params: {
  text: string;
  photoRect: { x: number; y: number; width: number; height: number };
  contentRect: ContentRect;
  fontSize: number;
  textFontFamily: string;
  /** Подпись над фото (верхний ряд в 3/4-коллаже). */
  placeAbove: boolean;
}): {
  x: number;
  y: number;
  width: number;
  height: number;
  lines: string[];
  fontSize: number;
} | null {
  const { text, photoRect, contentRect, fontSize, textFontFamily, placeAbove } = params;
  const trimmed = text.trim();
  if (!trimmed || photoRect.width <= 0) return null;

  const gap = contentRect.height * 0.012;
  const pageTop = contentRect.offsetY + contentRect.height * 0.04;
  const pageBottom = contentRect.offsetY + contentRect.height * 0.94;
  const maxHeight = placeAbove
    ? Math.max(28, photoRect.y - gap - pageTop)
    : Math.max(32, pageBottom - (photoRect.y + photoRect.height + gap));
  const charWidthRatio =
    0.62 * getAlbumFontCharWidthMultiplier(textFontFamily) * 1.04;
  const preferredFontSize = Math.max(fontSize, 16);
  const minFontSize = 12;

  const buildLayout = (captionFontSize: number, lines: string[], height: number) => {
    const captionY = placeAbove
      ? Math.max(pageTop, photoRect.y - gap - height)
      : photoRect.y + photoRect.height + gap;
    return {
      x: photoRect.x,
      y: captionY,
      width: photoRect.width,
      height,
      lines,
      fontSize: captionFontSize,
    };
  };

  for (let captionFontSize = preferredFontSize; captionFontSize >= minFontSize; captionFontSize -= 1) {
    const lines = wrapTextToLines(trimmed, photoRect.width, captionFontSize, {
      paddingPx: PHOTO_CAPTION_PADDING,
      charWidthRatio,
    });
    const neededHeight =
      lines.length * captionFontSize * PHOTO_CAPTION_LINE_HEIGHT + PHOTO_CAPTION_PADDING;
    if (neededHeight <= maxHeight) {
      return buildLayout(captionFontSize, lines, neededHeight);
    }
  }

  const captionFontSize = minFontSize;
  const lines = wrapTextToLines(trimmed, photoRect.width, captionFontSize, {
    paddingPx: PHOTO_CAPTION_PADDING,
    charWidthRatio,
  });
  const lineBlockHeight = captionFontSize * PHOTO_CAPTION_LINE_HEIGHT;
  const maxLines = Math.max(1, Math.floor((maxHeight - PHOTO_CAPTION_PADDING) / lineBlockHeight));
  const height = Math.min(maxHeight, maxLines * lineBlockHeight + PHOTO_CAPTION_PADDING);
  return buildLayout(captionFontSize, lines.slice(0, maxLines), height);
}

/** 3 фото: верхний слот — подпись сверху; 4 фото: верхний ряд — сверху. */
function shouldPlaceCaptionAbovePhoto(slotCount: number, slotIndex: number): boolean {
  if (slotCount === 3) return slotIndex === 0;
  if (slotCount === 4) return slotIndex <= 1;
  return false;
}

/** Подписи под фото по позиции слота — для designed-альбомов без templateLibraryId и line-slots. */
export function appendPhotoSlotCaptionAnnotations(params: PhotoSlotCaptionParams): {
  annotations: Annotation[];
  zIndex: number;
} {
  const {
    schema,
    values,
    lineGuideId,
    editorContentRect,
    viewportWidth,
    viewportHeight,
    sourceWidth,
    sourceHeight,
    fontSize,
    textFontFamily,
  } = params;

  let zIndex = params.zIndex;
  const annotations: Annotation[] = [];

  if (!shouldRenderPhotoSlotCaptions(schema) || !values.photoCaptions?.length) {
    return { annotations, zIndex };
  }

  for (const block of schema.photoBlocks ?? []) {
    const blockValues = values.photoBlocks?.[block.blockId];
    if (!blockValues) continue;

    const variant =
      block.variants.find((item) => item.variantId === blockValues.variantId) ??
      block.variants[0];
    if (!variant) continue;

    const blockLayout = computePhotoBlockLayout({
      lineGuideId,
      sourcePageNumber: schema.sourcePageNumber,
      variantId: variant.variantId,
      slotUris: blockValues.slots,
      viewportWidth,
      viewportHeight,
      sourceWidth,
      sourceHeight,
      contentRect: editorContentRect,
      templateLibraryId: schema.templateLibraryId,
    });
    if (!blockLayout) continue;

    const groupTransform = isNonDefaultPhotoSlotTransform(values.photoGroupTransform)
      ? values.photoGroupTransform
      : null;
    const slotRects = resolvePhotoBlockSlotRects(blockLayout, groupTransform);

    for (let slotIndex = 0; slotIndex < variant.slots; slotIndex += 1) {
      const text = values.photoCaptions[slotIndex];
      if (!hasText(text)) continue;

      const photoRect =
        slotRects.find((slot) => slot.slotIndex === slotIndex)?.rect ?? null;
      if (!photoRect) continue;

      const layout = layoutCaptionNearPhoto({
        text: text!,
        photoRect,
        contentRect: editorContentRect,
        fontSize,
        textFontFamily,
        placeAbove: shouldPlaceCaptionAbovePhoto(variant.slots, slotIndex),
      });
      if (!layout || layout.lines.length === 0) continue;

      annotations.push({
        id: stableAnnotationId(
          'photo-slot-caption',
          lineGuideId,
          schema.sourcePageNumber,
          block.blockId,
          slotIndex,
        ),
        type: 'text',
        page: schema.sourcePageNumber,
        content: layout.lines.join('\n'),
        fontSize: layout.fontSize,
        fontFamily: textFontFamily,
        color: '#3D3D3D',
        textAlign: 'center',
        zIndex: zIndex++,
        sourcePageNumber: schema.sourcePageNumber,
        x: layout.x,
        y: layout.y,
        width: layout.width,
        height: layout.height,
      });
    }
  }

  return { annotations, zIndex };
}

export function appendBlankTemplateFreeImageAnnotations(params: {
  schema: AlbumPageSchema;
  values: PageValues;
  lineGuideId: string;
  editorContentRect: ContentRect;
  zIndex: number;
}): { annotations: Annotation[]; zIndex: number } {
  const { schema, values, lineGuideId, editorContentRect } = params;
  let zIndex = params.zIndex;
  const annotations: Annotation[] = [];

  if (schema.pageType !== 'free_page' || !isBlankTemplateLineGuide(lineGuideId)) {
    return { annotations, zIndex };
  }

  for (const element of values.freeElements ?? []) {
    if (element.type !== 'image' || !hasText(element.content)) continue;
    const rect = mapTemplateFrameToViewport(element, editorContentRect);
    annotations.push({
      id: stableAnnotationId('free-image', lineGuideId, schema.sourcePageNumber, element.id),
      type: 'image',
      page: schema.sourcePageNumber,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      imageUri: element.content!,
      imageContentFit: 'cover',
      sourcePageNumber: schema.sourcePageNumber,
      zIndex: zIndex++,
    });
  }

  return { annotations, zIndex };
}
