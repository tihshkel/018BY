import type { Annotation } from '@/components/pdf-annotations';
import { getTemplateTypographyProfile } from '@/constants/album-text-margins';
import type { AlbumPageSchema, PageInstance, PageValues } from '@/types/album-page-schema';
import { getAlbumPageSchemaByPageId } from '@/constants/generated/album-page-schemas';
import { createId } from '@/utils/id';
import {
  distributeTextAcrossSlots,
  getLineSlotsForPage,
  layoutAnnotationFromSlot,
  type GetLineSlotsParams,
} from '@/utils/textLineSlots';
import { computePageStatus } from '@/utils/pageStatus';

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
  const profile = getTemplateTypographyProfile(lineGuideId);
  const fontSize = profile.fixedLineFontSize ?? 16;
  const annotations: Annotation[] = [];
  let zIndex = 1;

  for (const field of schema.fields ?? []) {
    const text = values.fields[field.fieldId]?.trim();
    if (!text) continue;

    const startSlot = slots[field.templateLineStart];
    if (!startSlot) continue;

    const distributed = distributeTextAcrossSlots({
      text,
      startSlotIndex: field.templateLineStart,
      slots,
      fontSize,
    });

    const lines = distributed.content.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const slot = slots[field.templateLineStart + i];
      if (!slot || !lines[i]) continue;
      const layout = layoutAnnotationFromSlot(slot);
      annotations.push({
        id: createId('ann'),
        type: 'text',
        page: pageNumber,
        content: lines[i],
        fontSize,
        fontFamily: 'default',
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

      const slotIndex = variant.slotIndices[i] ?? i;
      const slot = slots[slotIndex];
      if (!slot) continue;

      annotations.push({
        id: createId('ann'),
        type: 'image',
        page: pageNumber,
        x: slot.x,
        y: slot.y,
        width: slot.width,
        height: slot.lineHeight,
        imageUri: uri,
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
        fontFamily: 'default',
        color: '#3D3D3D',
        zIndex: zIndex++,
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
