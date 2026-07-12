import type { Annotation } from '@/components/pdf-annotations';
import { getAlbumFontCharWidthMultiplier } from '@/constants/album-fonts';
import type { AlbumPageSchema, PageValues } from '@/types/album-page-schema';
import { stableAnnotationId } from '@/utils/stableAnnotationId';
import type { ContentRect } from '@/utils/imageContentRect';
import {
  getPageFormatForLineGuide,
  getTemplateLayout,
  isBlankTemplateLineGuide,
} from '@/utils/photoPageTemplateManifest';
import { getPhotoSlotViewportRect } from '@/utils/photoSlots';
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

function layoutCaptionBelowPhoto(params: {
  text: string;
  photoRect: { x: number; y: number; width: number; height: number };
  contentRect: ContentRect;
  fontSize: number;
  textFontFamily: string;
}): {
  x: number;
  y: number;
  width: number;
  height: number;
  lines: string[];
  fontSize: number;
} | null {
  const { text, photoRect, contentRect, fontSize, textFontFamily } = params;
  const trimmed = text.trim();
  if (!trimmed || photoRect.width <= 0) return null;

  const gap = contentRect.height * 0.012;
  const captionY = photoRect.y + photoRect.height + gap;
  const pageBottom = contentRect.offsetY + contentRect.height * 0.93;
  const maxHeight = Math.max(28, pageBottom - captionY);
  const charWidthRatio =
    0.62 * getAlbumFontCharWidthMultiplier(textFontFamily) * 1.04;
  const preferredFontSize = Math.max(fontSize, 18);
  const minFontSize = 14;

  for (let captionFontSize = preferredFontSize; captionFontSize >= minFontSize; captionFontSize -= 1) {
    const lines = wrapTextToLines(trimmed, photoRect.width, captionFontSize, {
      paddingPx: PHOTO_CAPTION_PADDING,
      charWidthRatio,
    });
    const neededHeight =
      lines.length * captionFontSize * PHOTO_CAPTION_LINE_HEIGHT + PHOTO_CAPTION_PADDING;
    if (neededHeight <= maxHeight) {
      return {
        x: photoRect.x,
        y: captionY,
        width: photoRect.width,
        height: neededHeight,
        lines,
        fontSize: captionFontSize,
      };
    }
  }

  const captionFontSize = minFontSize;
  const lines = wrapTextToLines(trimmed, photoRect.width, captionFontSize, {
    paddingPx: PHOTO_CAPTION_PADDING,
    charWidthRatio,
  });
  const lineBlockHeight = captionFontSize * PHOTO_CAPTION_LINE_HEIGHT;
  const maxLines = Math.max(1, Math.floor((maxHeight - PHOTO_CAPTION_PADDING) / lineBlockHeight));
  return {
    x: photoRect.x,
    y: captionY,
    width: photoRect.width,
    height: Math.min(maxHeight, maxLines * lineBlockHeight + PHOTO_CAPTION_PADDING),
    lines: lines.slice(0, maxLines),
    fontSize: captionFontSize,
  };
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

  if (schema.pageType !== 'caption_photo_page' || !values.photoCaptions?.length) {
    return { annotations, zIndex };
  }

  for (const block of schema.photoBlocks ?? []) {
    const blockValues = values.photoBlocks?.[block.blockId];
    if (!blockValues) continue;

    const variant =
      block.variants.find((item) => item.variantId === blockValues.variantId) ??
      block.variants[0];
    if (!variant) continue;

    for (let slotIndex = 0; slotIndex < variant.slots; slotIndex += 1) {
      const text = values.photoCaptions[slotIndex];
      if (!hasText(text)) continue;

      const photoRect = getPhotoSlotViewportRect({
        lineGuideId,
        page: schema.sourcePageNumber,
        variantId: variant.variantId,
        slotIndex,
        viewportWidth,
        viewportHeight,
        sourceWidth,
        sourceHeight,
        contentRect: editorContentRect,
        templateLibraryId: schema.templateLibraryId,
      });
      if (!photoRect) continue;

      const layout = layoutCaptionBelowPhoto({
        text: text!,
        photoRect,
        contentRect: editorContentRect,
        fontSize,
        textFontFamily,
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
