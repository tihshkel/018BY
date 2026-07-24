import type { Annotation } from '@/components/pdf-annotations';
import type { AlbumPageSchema, PageValues } from '@/types/album-page-schema';
import { stableAnnotationId } from '@/utils/stableAnnotationId';
import type { ContentRect } from '@/utils/imageContentRect';
import {
  getPageFormatForLineGuide,
  getTemplateLayout,
  isBlankTemplateLineGuide,
} from '@/utils/photoPageTemplateManifest';
import { getTextBlockRect } from '@/utils/resolveTemplatePageLayout';
import {
  estimateTemplateFontSize,
  fitTextToTemplateBlock,
  mapTemplateFrameToViewport,
  TEMPLATE_CAPTION_MAX_FONT_SIZE,
  TEMPLATE_CAPTION_MIN_FONT_SIZE,
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

/** Default align for blank Семья/Свадьба/Праздники form fields. */
export function getBlankFieldDefaultTextAlign(field: {
  fieldId: string;
  label?: string;
}): 'left' | 'center' | 'right' {
  if (field.fieldId.endsWith('_title') || field.label === 'Заголовок') return 'center';
  if (/_caption\d*$/i.test(field.fieldId) || field.label?.startsWith('Подпись')) {
    return 'center';
  }
  // Body / «Текст» — left, so lines use the full template block width.
  return 'left';
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

  // Timeline event titles share one font size so short/long rows look consistent.
  let timelineDescriptionFontSize: number | undefined;
  if (layout.pageType === 'timeline_page') {
    const descSizes: number[] = [];
    for (const field of schema.fields ?? []) {
      if (!field.fieldId.endsWith('_description')) continue;
      const text = values.fields[field.fieldId];
      if (!hasText(text)) continue;
      const block = getTextBlockRect(schema.templateLibraryId!, format, field.fieldId);
      if (!block) continue;
      const rect = mapTemplateFrameToViewport(block, editorContentRect);
      const fieldStyle = values.fieldTextStyles?.[field.fieldId];
      if (typeof fieldStyle?.fontSize === 'number') {
        descSizes.push(fieldStyle.fontSize);
        continue;
      }
      const preferredFontSize = Math.max(
        18,
        estimateTemplateFontSize(block.h, viewportHeight) || fontSize,
      );
      const fitted = fitTextToTemplateBlock({
        text: text!.trim(),
        boxWidth: rect.width,
        boxHeight: rect.height,
        fontId: textFontFamily,
        preferredFontSize,
        preferSingleLine: false,
        maxFontSize: 22,
      });
      if (fitted.lines.length > 0) descSizes.push(fitted.fontSize);
    }
    if (descSizes.length > 0) {
      timelineDescriptionFontSize = Math.min(...descSizes);
    }
  }

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
    const isTimelineDescription = fieldIdSuffix.endsWith('_description');
    const preferredFontSize =
      fieldStyle?.fontSize ??
      captionStyle?.fontSize ??
      (isTimelineDescription && timelineDescriptionFontSize != null
        ? timelineDescriptionFontSize
        : isTimelineDescription
          ? Math.max(18, estimateTemplateFontSize(block.h, viewportHeight) || fontSize)
          : estimateTemplateFontSize(block.h, viewportHeight) || fontSize);
    const fitted = fitTextToTemplateBlock({
      text,
      boxWidth: rect.width,
      boxHeight: rect.height,
      fontId: textFontFamily,
      preferredFontSize,
      preferSingleLine: false,
      maxFontSize: 22,
    });
    if (fitted.lines.length === 0) return;
    annotations.push({
      id: stableAnnotationId('blank-field', lineGuideId, schema.sourcePageNumber, fieldIdSuffix),
      type: 'text',
      page: schema.sourcePageNumber,
      // Исходный текст — перенос по ширине блока в превью/экспорте, без «коротких» \n.
      content: text.trim(),
      fontSize:
        fieldStyle?.fontSize ??
        captionStyle?.fontSize ??
        (isTimelineDescription && timelineDescriptionFontSize != null
          ? timelineDescriptionFontSize
          : fitted.fontSize),
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
    // Caption fields / photoCaptions — через photoCaptionLayout (следуют за фото).
    if (field.fieldId.includes('caption')) continue;
    const text = values.fields[field.fieldId];
    if (!hasText(text)) continue;
    pushText(
      text!,
      field.fieldId,
      field.fieldId,
      getBlankFieldDefaultTextAlign(field),
    );
  }

  // Fixed-frame captions отключены: blank captions рисует pageValuesAdapter
  // через resolvePhotoCaptionViewportLayouts (паритет с designed).

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

  // Designed albums (birthday и др.): кадры CaptionGallery не совпадают с PDF-слотами.
  // Подписи рисует pageValuesAdapter через resolvePhotoCaptionViewportLayouts.
  if (!isBlankTemplateLineGuide(lineGuideId)) {
    return { annotations, zIndex };
  }

  const format = getPageFormatForLineGuide(lineGuideId);
  const layout = getTemplateLayout(schema.templateLibraryId, format);
  if (!layout?.perPhotoCaptions) {
    return { annotations, zIndex };
  }

  const captionBlocks =
    layout.textBlocks?.filter((block) => block.type === 'caption') ?? [];
  if (captionBlocks.length === 0) {
    return { annotations, zIndex };
  }

  for (let i = 0; i < values.photoCaptions.length; i += 1) {
    const text = values.photoCaptions[i];
    if (!hasText(text)) continue;

    const block =
      captionBlocks[i] ??
      layout.textBlocks?.find((item) => item.id === `caption${i + 1}`);
    if (!block) continue;

    const rect = mapTemplateFrameToViewport(block, editorContentRect);
    const fieldStyle = values.fieldTextStyles?.[`caption${i + 1}`];
    const preferredFontSize = Math.min(
      fieldStyle?.fontSize ??
        (estimateTemplateFontSize(block.h, viewportHeight) || fontSize),
      TEMPLATE_CAPTION_MAX_FONT_SIZE,
    );
    const fitted = fitTextToTemplateBlock({
      text: text!.trim(),
      boxWidth: rect.width,
      boxHeight: rect.height,
      fontId: textFontFamily,
      preferredFontSize,
      minFontSize: TEMPLATE_CAPTION_MIN_FONT_SIZE,
      maxFontSize: TEMPLATE_CAPTION_MAX_FONT_SIZE,
      preferSingleLine: true,
    });
    if (fitted.lines.length === 0) continue;

    annotations.push({
      id: stableAnnotationId('template-caption', lineGuideId, schema.sourcePageNumber, block.id, i),
      type: 'text',
      page: schema.sourcePageNumber,
      // Fitted size wins: manual toolbar size must not overflow the caption frame.
      content: fitted.lines.join('\n'),
      fontSize: fitted.fontSize,
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
