import type { Annotation } from '@/components/pdf-annotations';
import { getTemplateTypographyProfile } from '@/constants/album-text-margins';
import type { AlbumPageSchema, PageInstance, PageValues } from '@/types/album-page-schema';
import { getAlbumPageSchemaByPageId } from '@/constants/generated/album-page-schemas';
import { createId } from '@/utils/id';
import { getContentRect } from '@/utils/imageContentRect';
import {
  getLineSlotsForPage,
  layoutAnnotationFromSlot,
  type GetLineSlotsParams,
} from '@/utils/textLineSlots';
import {
  distributeTextWithinFieldLines,
} from '@/utils/templateLineText';
import { computePageStatus } from '@/utils/pageStatus';
import { getPhotoSlotViewportRect } from '@/utils/photoSlots';

const DEFAULT_VIEWPORT = { width: 390, height: 844 };

type AdapterParams = {
  lineGuideId: string;
  pageNumber: number;
  schema: AlbumPageSchema;
  values: PageValues;
  viewportWidth?: number;
  viewportHeight?: number;
  sourceWidth?: number;
  sourceHeight?: number;
};

function buildSlotParams(
  lineGuideId: string,
  pageNumber: number,
  viewportWidth: number,
  viewportHeight: number,
  sourceWidth?: number,
  sourceHeight?: number
): GetLineSlotsParams {
  return {
    lineGuideId,
    page: pageNumber,
    viewportWidth,
    viewportHeight,
    sourceWidth,
    sourceHeight,
  };
}

export function pageValuesToAnnotations(params: AdapterParams): Annotation[] {
  const {
    lineGuideId,
    pageNumber,
    schema,
    values,
    viewportWidth = DEFAULT_VIEWPORT.width,
    viewportHeight = DEFAULT_VIEWPORT.height,
    sourceWidth,
    sourceHeight,
  } = params;

  const slotParams = buildSlotParams(
    lineGuideId,
    schema.sourcePageNumber,
    viewportWidth,
    viewportHeight,
    sourceWidth,
    sourceHeight
  );
  const slots = getLineSlotsForPage(slotParams);
  const editorContentRect = getContentRect(
    viewportWidth,
    viewportHeight,
    sourceWidth ?? viewportWidth,
    sourceHeight ?? viewportHeight,
  );
  const profile = getTemplateTypographyProfile(lineGuideId);
  const fontSize = profile.fixedLineFontSize ?? 16;
  const textFontFamily = values.textFontFamily ?? 'default';
  const annotations: Annotation[] = [];
  let zIndex = 1;

  for (const field of schema.fields ?? []) {
    const text = values.fields[field.fieldId]?.trim();
    if (!text) continue;

    const startSlot = slots[field.templateLineStart];
    if (!startSlot) continue;

    const distributed = distributeTextWithinFieldLines({
      text,
      startSlotIndex: field.templateLineStart,
      lineCount: field.templateLineCount,
      slots,
      fontSize,
      lineGuideId,
    });

    for (const segment of distributed.segments) {
      if (!segment.content) continue;
      const slot = slots[segment.slotIndex];
      if (!slot) continue;
      const layout = layoutAnnotationFromSlot(slot);
      annotations.push({
        id: createId('ann'),
        type: 'text',
        page: pageNumber,
        content: segment.content,
        fontSize,
        fontFamily: textFontFamily,
        color: '#3D3D3D',
        zIndex: zIndex++,
        ...layout,
      });
    }
  }

  for (const block of schema.photoBlocks ?? []) {
    const blockValues = values.photoBlocks[block.blockId];
    if (!blockValues) continue;

    const variant =
      block.variants.find((v) => v.variantId === blockValues.variantId) ?? block.variants[0];
    if (!variant) continue;

    for (let i = 0; i < variant.slots; i += 1) {
      const uri = blockValues.slots[i];
      if (!uri) continue;

      const photoRect = getPhotoSlotViewportRect({
        lineGuideId,
        page: schema.sourcePageNumber,
        variantId: variant.variantId,
        slotIndex: i,
        viewportWidth,
        viewportHeight,
        sourceWidth,
        sourceHeight,
        contentRect: editorContentRect,
      });

      if (photoRect) {
        annotations.push({
          id: createId('ann'),
          type: 'image',
          page: pageNumber,
          x: photoRect.x,
          y: photoRect.y,
          width: photoRect.width,
          height: photoRect.height,
          imageUri: uri,
          imageContentFit: 'cover',
          zIndex: zIndex++,
        });
        continue;
      }

      const slotIndex = variant.slotIndices[i] ?? i;
      const slot = slots[slotIndex];
      if (!slot) continue;

      const layout = layoutAnnotationFromSlot(slot);
      annotations.push({
        id: createId('ann'),
        type: 'image',
        page: pageNumber,
        x: layout.x,
        y: layout.y,
        width: layout.width,
        height: layout.height,
        imageUri: uri,
        imageContentFit: 'cover',
        zIndex: zIndex++,
      });
    }
  }

  if (values.caption?.trim()) {
    const captionSlot = slots.find((s) => s.hasLabel) ?? slots[0];
    if (captionSlot) {
      const layout = layoutAnnotationFromSlot(captionSlot);
      annotations.push({
        id: createId('ann'),
        type: 'text',
        page: pageNumber,
        content: values.caption.trim(),
        fontSize,
        fontFamily: textFontFamily,
        color: '#3D3D3D',
        zIndex: zIndex++,
        ...layout,
      });
    }
  }

  if (schema.pageType === 'caption_photo_page' && values.photoCaptions?.length) {
    const labelSlots = slots.filter((s) => s.hasLabel);
    for (let i = 0; i < values.photoCaptions.length; i += 1) {
      const text = values.photoCaptions[i]?.trim();
      if (!text) continue;
      const slot = labelSlots[i];
      if (!slot) continue;
      const layout = layoutAnnotationFromSlot(slot);
      annotations.push({
        id: createId('ann'),
        type: 'text',
        page: pageNumber,
        content: text,
        fontSize,
        fontFamily: textFontFamily,
        color: '#3D3D3D',
        zIndex: zIndex++,
        templateLineStart: slot.index,
        ...layout,
      });
    }
  }

  return annotations;
}

export function annotationsToPageValues(
  annotations: Annotation[],
  schema: AlbumPageSchema
): PageValues {
  const pageNumber = schema.sourcePageNumber;
  const pageAnnotations = annotations.filter((ann) => Number(ann.page) === pageNumber);

  const fields: Record<string, string> = {};
  for (const field of schema.fields ?? []) {
    const related = pageAnnotations
      .filter(
        (ann) =>
          ann.type === 'text' &&
          typeof ann.templateLineStart === 'number' &&
          ann.templateLineStart >= field.templateLineStart &&
          ann.templateLineStart < field.templateLineStart + field.templateLineCount
      )
      .sort((a, b) => (a.templateLineStart ?? 0) - (b.templateLineStart ?? 0));

    if (related.length > 0) {
      fields[field.fieldId] = related.map((ann) => ann.content ?? '').join('\n');
    }
  }

  const photoBlocks: PageValues['photoBlocks'] = {};
  const imageAnnotations = pageAnnotations.filter((ann) => ann.type === 'image' && ann.imageUri);

  for (const block of schema.photoBlocks ?? []) {
    const defaultVariant = block.variants[0];
    if (!defaultVariant) continue;

    const slots: (string | null)[] = Array(defaultVariant.slots).fill(null);
    for (let i = 0; i < Math.min(defaultVariant.slots, imageAnnotations.length); i += 1) {
      slots[i] = imageAnnotations[i]?.imageUri ?? null;
    }

    photoBlocks[block.blockId] = {
      variantId: defaultVariant.variantId,
      slots,
    };
  }

  const values: PageValues = {
    fields,
    photoBlocks,
    status: 'empty',
    updatedAt: new Date().toISOString(),
  };

  values.status = computePageStatus(schema, values);
  return values;
}

export function buildProjectAnnotationsFromPageValues(params: {
  instances: PageInstance[];
  pageValuesMap: Record<string, PageValues>;
  lineGuideId: string;
  viewportWidth?: number;
  viewportHeight?: number;
}): Annotation[] {
  const { instances, pageValuesMap, lineGuideId, viewportWidth, viewportHeight } = params;
  const all: Annotation[] = [];

  for (const instance of instances) {
    const schema = getAlbumPageSchemaByPageId(instance.schemaPageId);
    const values = pageValuesMap[instance.instanceId];
    if (!schema || !values) continue;

    const pageNumber = instance.imageIndex + 1;
    all.push(
      ...pageValuesToAnnotations({
        lineGuideId,
        pageNumber,
        schema,
        values,
        viewportWidth,
        viewportHeight,
      })
    );
  }

  return all;
}

export function syncPageValuesToAnnotationsStorage(
  instances: PageInstance[],
  pageValuesMap: Record<string, PageValues>,
  lineGuideId: string,
  viewportWidth?: number,
  viewportHeight?: number
): Annotation[] {
  return buildProjectAnnotationsFromPageValues({
    instances,
    pageValuesMap,
    lineGuideId,
    viewportWidth,
    viewportHeight,
  });
}
