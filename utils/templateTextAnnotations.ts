import type { Annotation } from '@/components/pdf-annotations';
import type { AlbumPageSchema, PageValues } from '@/types/album-page-schema';
import { stableAnnotationId } from '@/utils/stableAnnotationId';
import type { ContentRect } from '@/utils/imageContentRect';
import {
  getPageFormatForLineGuide,
  getTemplateLayout,
  isBlankTemplateLineGuide,
  isTemplateCaptionEditable,
} from '@/utils/photoPageTemplateManifest';
import { getTextBlockRect } from '@/utils/resolveTemplatePageLayout';
import {
  estimateTemplateFontSize,
  fitTextToTemplateBlock,
  mapTemplateFrameToViewport,
} from '@/utils/templateTextLayout';

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

  const pushText = (
    text: string,
    fieldIdSuffix: string,
    styleKey?: string,
    defaultAlign: 'left' | 'center' | 'right' = 'left',
  ) => {
    const block = getTextBlockRect(schema.templateLibraryId!, format, fieldIdSuffix);
    if (!block) return;
    const rect = mapTemplateFrameToViewport(block, editorContentRect);
    const fieldStyle = styleKey ? values.fieldTextStyles?.[styleKey] : undefined;
    const captionStyle =
      fieldIdSuffix.includes('caption') && !styleKey ? values.captionTextStyle : undefined;
    const textAlign =
      fieldStyle?.textAlign ?? captionStyle?.textAlign ?? defaultAlign;
    const preferredFontSize =
      fieldStyle?.fontSize ??
      captionStyle?.fontSize ??
      (estimateTemplateFontSize(block.h, viewportHeight) || fontSize);
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
      fontSize: fieldStyle?.fontSize ?? captionStyle?.fontSize ?? fitted.fontSize,
      fontFamily: textFontFamily,
      color: '#3D3D3D',
      textAlign,
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
    const defaultAlign = field.fieldId.endsWith('_title') || field.label === 'Заголовок'
      ? 'center'
      : 'left';
    pushText(text!, field.fieldId, field.fieldId, defaultAlign);
  }

  const captionBlocks =
    layout.textBlocks?.filter((block) => block.type === 'caption') ?? [];
  const captionsEditable = isTemplateCaptionEditable(schema.templateLibraryId, layout);
  const useSingleCaption =
    captionsEditable &&
    captionBlocks.length === 1 &&
    !layout.perPhotoCaptions &&
    hasText(values.caption);

  if (useSingleCaption && values.caption) {
    pushText(values.caption, `_${captionBlocks[0]!.id}`, undefined, 'center');
  }

  if (layout.perPhotoCaptions && captionsEditable && values.photoCaptions?.length) {
    for (let i = 0; i < values.photoCaptions.length; i += 1) {
      const text = values.photoCaptions[i];
      if (!hasText(text)) continue;
      pushText(text!, `_caption${i + 1}`, `caption${i + 1}`, 'center');
    }
  }

  for (const element of values.freeElements ?? []) {
    if (element.type === 'text' && hasText(element.content)) {
      const rect = mapTemplateFrameToViewport(element, editorContentRect);
      const elementStyle = values.fieldTextStyles?.[`free_${element.id}`];
      annotations.push({
        id: stableAnnotationId('free-text', lineGuideId, schema.sourcePageNumber, element.id),
        type: 'text',
        page: schema.sourcePageNumber,
        content: element.content!.trim(),
        fontSize:
          elementStyle?.fontSize ??
          (estimateTemplateFontSize(element.h, viewportHeight) || fontSize),
        fontFamily: textFontFamily,
        color: '#3D3D3D',
        textAlign: elementStyle?.textAlign ?? 'left',
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
    const fieldStyle = values.fieldTextStyles?.[`caption${i + 1}`];
    const preferredFontSize =
      fieldStyle?.fontSize ??
      (estimateTemplateFontSize(block.h, viewportHeight) || fontSize);
    const fitted = fitTextToTemplateBlock({
      text: text!.trim(),
      boxWidth: rect.width,
      boxHeight: rect.height,
      fontId: textFontFamily,
      preferredFontSize,
    });
    if (fitted.lines.length === 0) continue;

    annotations.push({
      id: stableAnnotationId('template-caption', lineGuideId, schema.sourcePageNumber, block.id, i),
      type: 'text',
      page: schema.sourcePageNumber,
      content: fitted.lines.join('\n'),
      fontSize: fieldStyle?.fontSize ?? fitted.fontSize,
      fontFamily: textFontFamily,
      color: '#3D3D3D',
      textAlign: fieldStyle?.textAlign ?? 'center',
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
      imageSlotTransform: element.crop,
      sourcePageNumber: schema.sourcePageNumber,
      zIndex: zIndex++,
    });
  }

  return { annotations, zIndex };
}
