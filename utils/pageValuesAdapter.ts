import type { Annotation } from '@/components/pdf-annotations';
import { getTemplateTypographyProfile } from '@/constants/album-text-margins';
import type { AlbumPageSchema, PageInstance, PageValues } from '@/types/album-page-schema';
import { getAlbumPageSchemaByPageId } from '@/constants/generated/album-page-schemas';
import { createId } from '@/utils/id';
import { getSchemaForInstance } from '@/utils/albumProjectInit';
import { getContentRect } from '@/utils/imageContentRect';
import {
  getLineSlotsForPage,
  layoutAnnotationFromSlot,
  type GetLineSlotsParams,
} from '@/utils/textLineSlots';
import {
  distributeTextWithinFieldLines,
} from '@/utils/templateLineText';
import { resolveCustomFields } from '@/utils/birthdayCustomFields';
import { computePageStatus } from '@/utils/pageStatus';
import { computePhotoBlockLayout, resolvePhotoBlockSlotRects } from '@/utils/photoBlockLayout';
import { getPhotoSlotViewportRect } from '@/utils/photoSlots';
import { applyPhotoSlotTransform, photoSlotTransformKey } from '@/utils/photoSlotTransform';
import {
  getBranchFillColor,
  mapGenderFillToViewport,
} from '@/utils/circleSlotColors';
import { getGenderFillTargets } from '@/utils/pdfCircleSlots';
import { getNormalizedPhotoSlot } from '@/utils/photoSlots';
import { isBlankTemplateLineGuide } from '@/utils/photoPageTemplateManifest';
import {
  appendBlankTemplateFreeImageAnnotations,
  appendBlankTemplateTextAnnotations,
} from '@/utils/templateTextAnnotations';

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
  const isBlankTemplate =
    Boolean(schema.templateLibraryId) && isBlankTemplateLineGuide(lineGuideId);
  const annotations: Annotation[] = [];
  let zIndex = 1;

  for (const field of schema.fields ?? []) {
    if (field.type === 'radio') continue;
    if (isBlankTemplate) continue;

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
        page: schema.sourcePageNumber,
        content: segment.content,
        fontSize,
        fontFamily: textFontFamily,
        color: '#3D3D3D',
        zIndex: zIndex++,
        templateLineStart: segment.slotIndex,
        templateLineCount: 1,
        sourcePageNumber: schema.sourcePageNumber,
        ...layout,
      });
    }
  }

  if (schema.pageType === 'birthday_free_page') {
    const customFields = resolveCustomFields(schema, values);
    let slotCursor = 0;

    for (const field of customFields) {
      const text = field.value?.trim();
      if (!text) continue;

      const preferredLines = field.fieldType === 'long_text' ? 2 : 1;
      const remainingSlots = Math.max(0, slots.length - slotCursor);
      if (remainingSlots === 0) break;

      const lineCount = Math.min(preferredLines, remainingSlots);
      const distributed = distributeTextWithinFieldLines({
        text,
        startSlotIndex: slotCursor,
        lineCount,
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
          page: schema.sourcePageNumber,
          content: segment.content,
          fontSize,
          fontFamily: textFontFamily,
          color: '#3D3D3D',
          zIndex: zIndex++,
          templateLineStart: segment.slotIndex,
          templateLineCount: 1,
          sourcePageNumber: schema.sourcePageNumber,
          ...layout,
        });
      }

      slotCursor += lineCount;
    }
  }

  const genderTargets = getGenderFillTargets(lineGuideId, schema.sourcePageNumber);
  for (const target of genderTargets) {
    const selected = values.fields[target.fieldId]?.trim();
    if (selected !== target.option) continue;

    const rect = mapGenderFillToViewport(
      target.cx,
      target.cy,
      target.diameter,
      editorContentRect,
    );

    annotations.push({
      id: createId('ann'),
      type: 'image',
      page: schema.sourcePageNumber,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      fillColor: target.fillColor,
      clipShape: 'circle',
      sourcePageNumber: schema.sourcePageNumber,
      zIndex: zIndex++,
    });
  }

  for (const block of schema.photoBlocks ?? []) {
    if (schema.pageType === 'free_page') continue;

    const blockValues = values.photoBlocks[block.blockId];
    if (!blockValues) continue;

    const variant =
      block.variants.find((v) => v.variantId === blockValues.variantId) ?? block.variants[0];
    if (!variant) continue;

    const isCircleTree = block.layoutKind === 'circle_tree';

    const blockLayout = isCircleTree
      ? null
      : computePhotoBlockLayout({
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

    if (blockLayout) {
      const useGroupTransform = values.photoGroupTransform;
      const resolvedSlots = resolvePhotoBlockSlotRects(blockLayout, useGroupTransform);

      for (const slot of resolvedSlots) {
        const transformKey = photoSlotTransformKey(block.blockId, slot.slotIndex);
        const slotTransform = values.photoSlotTransforms?.[transformKey];
        let rect = slot.rect;
        if (slotTransform) {
          rect = applyPhotoSlotTransform(rect, slotTransform);
        }

        const normalizedSlot = getNormalizedPhotoSlot(
          lineGuideId,
          schema.sourcePageNumber,
          variant.variantId,
          slot.slotIndex,
          schema.templateLibraryId,
        );
        const clipShape = isCircleTree || normalizedSlot?.shape === 'circle' ? 'circle' : undefined;

        if (!slot.uri && clipShape) {
          annotations.push({
            id: createId('ann'),
            type: 'image',
            page: schema.sourcePageNumber,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            fillColor: getBranchFillColor(normalizedSlot?.branch),
            clipShape: 'circle',
            sourcePageNumber: schema.sourcePageNumber,
            zIndex: zIndex++,
          });
          continue;
        }

        if (!slot.uri) continue;

        annotations.push({
          id: createId('ann'),
          type: 'image',
          page: schema.sourcePageNumber,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          imageUri: slot.uri,
          imageContentFit: 'cover',
          clipShape,
          sourcePageNumber: schema.sourcePageNumber,
          zIndex: zIndex++,
        });
      }

      continue;
    }

    for (let i = 0; i < variant.slots; i += 1) {
      const uri = blockValues.slots[i];
      const normalizedSlot = getNormalizedPhotoSlot(
        lineGuideId,
        schema.sourcePageNumber,
        variant.variantId,
        i,
        schema.templateLibraryId,
      );
      const clipShape = isCircleTree || normalizedSlot?.shape === 'circle' ? 'circle' : undefined;

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
        templateLibraryId: schema.templateLibraryId,
      });

      if (photoRect) {
        const transformKey = photoSlotTransformKey(block.blockId, i);
        const slotTransform = values.photoSlotTransforms?.[transformKey];
        const groupTransform = values.photoGroupTransform;
        let rect = photoRect;
        if (groupTransform) {
          rect = applyPhotoSlotTransform(rect, groupTransform);
        }
        if (slotTransform) {
          rect = applyPhotoSlotTransform(rect, slotTransform);
        }

        if (!uri && clipShape) {
          annotations.push({
            id: createId('ann'),
            type: 'image',
            page: schema.sourcePageNumber,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            fillColor: getBranchFillColor(normalizedSlot?.branch),
            clipShape: 'circle',
            sourcePageNumber: schema.sourcePageNumber,
            zIndex: zIndex++,
          });
          continue;
        }

        if (!uri) continue;

        annotations.push({
          id: createId('ann'),
          type: 'image',
          page: schema.sourcePageNumber,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          imageUri: uri,
          imageContentFit: 'cover',
          clipShape,
          sourcePageNumber: schema.sourcePageNumber,
          zIndex: zIndex++,
        });
        continue;
      }

      if (!uri) continue;

      const slotIndex = variant.slotIndices[i] ?? i;
      const slot = slots[slotIndex];
      if (!slot) continue;

      const layout = layoutAnnotationFromSlot(slot);
      annotations.push({
        id: createId('ann'),
        type: 'image',
        page: schema.sourcePageNumber,
        x: layout.x,
        y: layout.y,
        width: layout.width,
        height: layout.height,
        imageUri: uri,
        imageContentFit: 'cover',
        sourcePageNumber: schema.sourcePageNumber,
        zIndex: zIndex++,
      });
    }
  }

  if (!isBlankTemplate && values.caption?.trim()) {
    const captionSlot = slots.find((s) => s.hasLabel) ?? slots[0];
    if (captionSlot) {
      const layout = layoutAnnotationFromSlot(captionSlot);
      annotations.push({
        id: createId('ann'),
        type: 'text',
        page: schema.sourcePageNumber,
        content: values.caption.trim(),
        fontSize,
        fontFamily: textFontFamily,
        color: '#3D3D3D',
        zIndex: zIndex++,
        templateLineStart: captionSlot.index,
        templateLineCount: 1,
        sourcePageNumber: schema.sourcePageNumber,
        ...layout,
      });
    }
  }

  if (!isBlankTemplate && schema.pageType === 'caption_photo_page' && values.photoCaptions?.length) {
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
        page: schema.sourcePageNumber,
        content: text,
        fontSize,
        fontFamily: textFontFamily,
        color: '#3D3D3D',
        zIndex: zIndex++,
        templateLineStart: slot.index,
        templateLineCount: 1,
        sourcePageNumber: schema.sourcePageNumber,
        ...layout,
      });
    }
  }

  if (isBlankTemplate) {
    const textResult = appendBlankTemplateTextAnnotations({
      schema,
      values,
      lineGuideId,
      editorContentRect,
      viewportHeight,
      fontSize,
      textFontFamily,
      zIndex,
    });
    annotations.push(...textResult.annotations);
    zIndex = textResult.zIndex;

    const freeResult = appendBlankTemplateFreeImageAnnotations({
      schema,
      values,
      lineGuideId,
      editorContentRect,
      zIndex,
    });
    annotations.push(...freeResult.annotations);
    zIndex = freeResult.zIndex;
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
  imageUris?: string[];
  sourceSizesByImageIndex?: Map<number, { width: number; height: number }>;
}): Annotation[] {
  const {
    instances,
    pageValuesMap,
    lineGuideId,
    viewportWidth,
    viewportHeight,
    imageUris,
    sourceSizesByImageIndex,
  } = params;
  const all: Annotation[] = [];

  for (const instance of instances) {
    const schema = getSchemaForInstance(instance, lineGuideId);
    const values = pageValuesMap[instance.instanceId];
    if (!schema || !values) continue;

    const pageNumber = schema.sourcePageNumber;
    const sourceSize = sourceSizesByImageIndex?.get(instance.imageIndex);
    all.push(
      ...pageValuesToAnnotations({
        lineGuideId,
        pageNumber,
        schema,
        values,
        viewportWidth,
        viewportHeight,
        sourceWidth: sourceSize?.width,
        sourceHeight: sourceSize?.height,
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
  viewportHeight?: number,
  imageUris?: string[],
  sourceSizesByImageIndex?: Map<number, { width: number; height: number }>
): Annotation[] {
  return buildProjectAnnotationsFromPageValues({
    instances,
    pageValuesMap,
    lineGuideId,
    viewportWidth,
    viewportHeight,
    imageUris,
    sourceSizesByImageIndex,
  });
}
