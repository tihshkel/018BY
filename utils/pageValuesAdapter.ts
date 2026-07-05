import { resolveKids48TeethTemplateLineStart } from '@/constants/kids-48-teeth-slots';
import { clampFieldInput, getFieldCharacterLimit } from '@/utils/albumFieldLimits';
import type { Annotation } from '@/components/pdf-annotations';
import { normalizeAlbumFontId } from '@/constants/album-fonts';
import { getTemplateTypographyProfile } from '@/constants/album-text-margins';
import type { AlbumPageField, AlbumPageSchema, PageInstance, PageValues, PhotoSlotTransform } from '@/types/album-page-schema';
import { getAlbumPageSchemaByPageId } from '@/constants/generated/album-page-schemas';
import { stableAnnotationId } from '@/utils/stableAnnotationId';
import { getSchemaForInstance } from '@/utils/albumProjectInit';
import { getContentRect } from '@/utils/imageContentRect';
import {
  getLineSlotsForPage,
  isPregnancyWeeklyStructuredPage,
  layoutAnnotationFromSlot,
  layoutTextAnnotationFromSlot,
  resolveWeeklyFieldLineSlots,
  type GetLineSlotsParams,
} from '@/utils/textLineSlots';
import { resolveCustomFields } from '@/utils/birthdayCustomFields';
import { computePageStatus } from '@/utils/pageStatus';
import { computePhotoBlockLayout, resolvePhotoBlockSlotRects } from '@/utils/photoBlockLayout';
import { getPhotoSlotViewportRect } from '@/utils/photoSlots';
import {
  isNonDefaultPhotoSlotTransform,
  photoSlotTransformKey,
} from '@/utils/photoSlotTransform';
import {
  getBranchFillColor,
  mapGenderFillToViewport,
  mapRectFillToViewport,
} from '@/utils/circleSlotColors';
import { getOptionFillTargets } from '@/utils/pdfCircleSlots';
import { getNormalizedPhotoSlot } from '@/utils/photoSlots';
import { isBlankTemplateLineGuide } from '@/utils/photoPageTemplateManifest';
import { TRAVEL_MAP_COLORS } from '@/constants/travel-world-map';
import { mapMarkerToViewport } from '@/utils/travelMap';
import {
  appendBlankTemplateFreeImageAnnotations,
  appendBlankTemplateTextAnnotations,
  appendTemplatePhotoCaptionAnnotations,
} from '@/utils/templateTextAnnotations';

const DEFAULT_VIEWPORT = { width: 390, height: 844 };
/** Text annotations render above photo overlays in preview and PageRenderer snapshots. */
const TEXT_ANNOTATION_ZINDEX_BASE = 10_000;

const PURPLE_MY_DAY_PAGES = new Set([
  9, 11, 13, 15, 17, 19, 23, 34, 35, 36, 37, 38, 39,
]);

function isPurpleMyDayPage(lineGuideId: string, pageNumber: number): boolean {
  return lineGuideId === 'diary_interior_purple' && PURPLE_MY_DAY_PAGES.has(pageNumber);
}

function resolvePregnancyWeeklyFieldText(
  field: AlbumPageField,
  values: PageValues,
  lineGuideId: string,
  sourcePageNumber: number,
): string | null {
  if (!isPregnancyWeeklyStructuredPage(lineGuideId, sourcePageNumber)) {
    return values.fields[field.fieldId]?.trim() || null;
  }

  if (field.fieldId.endsWith('_plans')) {
    const direct = values.fields[field.fieldId]?.trim() ?? '';
    if (direct) return direct;
    const prefix = field.fieldId.replace(/_plans$/, '');
    const header = values.fields[`${prefix}_plans_header`]?.trim() ?? '';
    const body = values.fields[`${prefix}_plans_body`]?.trim() ?? '';
    const merged = [header, body].filter(Boolean).join('\n');
    return merged || null;
  }

  return values.fields[field.fieldId]?.trim() || null;
}

/** Фиолетовый «Твой день»: дата и текст «За сегодня» идут одним потоком по 5 строкам. */
function resolvePurpleMyDayFieldText(
  field: AlbumPageField,
  schema: AlbumPageSchema,
  values: PageValues,
  lineGuideId: string,
): string | null {
  const weeklyText = resolvePregnancyWeeklyFieldText(
    field,
    values,
    lineGuideId,
    schema.sourcePageNumber,
  );
  if (
    isPregnancyWeeklyStructuredPage(lineGuideId, schema.sourcePageNumber) &&
    field.fieldId.endsWith('_plans')
  ) {
    return weeklyText;
  }

  if (!isPurpleMyDayPage(lineGuideId, schema.sourcePageNumber)) {
    return weeklyText;
  }

  if (field.fieldId.endsWith('_date')) {
    return null;
  }

  if (field.fieldId.endsWith('_day_story')) {
    const dateFieldId = field.fieldId.replace(/_day_story$/, '_date');
    const dateText = values.fields[dateFieldId]?.trim() ?? '';
    const storyText = values.fields[field.fieldId]?.trim() ?? '';
    if (!dateText && !storyText) return null;
    if (dateText && storyText) return `${dateText} ${storyText}`;
    return dateText || storyText;
  }

  return values.fields[field.fieldId]?.trim() || null;
}

function slotTransformForAnnotation(
  transform?: PhotoSlotTransform | null,
): PhotoSlotTransform | undefined {
  if (!transform || !isNonDefaultPhotoSlotTransform(transform)) return undefined;
  return transform;
}

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
  const textFontFamily = normalizeAlbumFontId(values.textFontFamily);
  const isBlankTemplate =
    Boolean(schema.templateLibraryId) && isBlankTemplateLineGuide(lineGuideId);
  const annotations: Annotation[] = [];
  let zIndex = 1;

  for (const field of schema.fields ?? []) {
    if (field.type === 'radio') continue;
    if (isBlankTemplate) continue;

    const rawText = resolvePurpleMyDayFieldText(field, schema, values, lineGuideId);
    if (!rawText) continue;

    const characterLimit = getFieldCharacterLimit({
      field,
      lineGuideId,
      sourcePageNumber: schema.sourcePageNumber,
      viewportWidth,
      viewportHeight,
    });
    const text = clampFieldInput(field, rawText, characterLimit, {
      lineGuideId,
      sourcePageNumber: schema.sourcePageNumber,
      viewportWidth,
      viewportHeight,
    });
    if (!text) continue;

    const lineSlotStart = resolveKids48TeethTemplateLineStart(field, schema, lineGuideId);
    const startSlot = slots[lineSlotStart];
    if (!startSlot) continue;

    const layout = layoutTextAnnotationFromSlot(
      startSlot,
      fontSize,
      lineGuideId,
      text,
      textFontFamily,
    );
    annotations.push({
      id: stableAnnotationId('field', lineGuideId, schema.sourcePageNumber, field.fieldId),
      type: 'text',
      page: schema.sourcePageNumber,
      content: text,
      fontSize: layout.fontSize ?? fontSize,
      fontFamily: textFontFamily,
      color: '#3D3D3D',
      zIndex: zIndex++,
      sourcePageNumber: schema.sourcePageNumber,
      ...layout,
      templateLineStart: lineSlotStart,
      templateLineCount: field.templateLineCount ?? 1,
    });
  }

  if (schema.pageType === 'birthday_free_page' && !(schema.fields?.length)) {
    const customFields = resolveCustomFields(schema, values);
    let slotCursor = 0;

    for (const field of customFields) {
      const text = field.value?.trim();
      if (!text) continue;

      const preferredLines = field.fieldType === 'long_text' ? 2 : 1;
      const remainingSlots = Math.max(0, slots.length - slotCursor);
      if (remainingSlots === 0) break;

      const lineCount = Math.min(preferredLines, remainingSlots);
      const startSlot = slots[slotCursor];
      if (startSlot) {
        const layout = layoutTextAnnotationFromSlot(startSlot, fontSize, lineGuideId);
        annotations.push({
          id: stableAnnotationId('custom', lineGuideId, schema.sourcePageNumber, field.id),
          type: 'text',
          page: schema.sourcePageNumber,
          content: text,
          fontSize,
          fontFamily: textFontFamily,
          color: '#3D3D3D',
          zIndex: zIndex++,
          sourcePageNumber: schema.sourcePageNumber,
          ...layout,
          templateLineStart: slotCursor,
          templateLineCount: lineCount,
        });
      }

      slotCursor += lineCount;
    }
  }

  const optionFillTargets = getOptionFillTargets(lineGuideId, schema.sourcePageNumber);
  for (const target of optionFillTargets) {
    const selected = values.fields[target.fieldId]?.trim();
    if (selected !== target.option) continue;

    const rect =
      'shape' in target && target.shape === 'rect'
        ? mapRectFillToViewport(
            target.x,
            target.y,
            target.width,
            target.height,
            editorContentRect,
          )
        : mapGenderFillToViewport(
            target.cx,
            target.cy,
            target.diameter,
            editorContentRect,
            target.diameterBleed,
          );

    annotations.push({
      id: stableAnnotationId('fill', lineGuideId, schema.sourcePageNumber, target.fieldId, target.option),
      type: 'image',
      page: schema.sourcePageNumber,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      fillColor: target.fillColor,
      fillOpacity: target.fillOpacity,
      clipShape: 'shape' in target && target.shape === 'rect' ? undefined : 'circle',
      sourcePageNumber: schema.sourcePageNumber,
      zIndex: zIndex++,
    });
  }

  if (schema.pageType === 'travel_map_page') {
    for (const marker of values.mapMarkers ?? []) {
      const rect = mapMarkerToViewport(marker, editorContentRect);
      annotations.push({
        id: stableAnnotationId('map-marker', lineGuideId, schema.sourcePageNumber, marker.id),
        type: 'image',
        page: schema.sourcePageNumber,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        fillColor: TRAVEL_MAP_COLORS.pin,
        clipShape: 'circle',
        sourcePageNumber: schema.sourcePageNumber,
        zIndex: zIndex++,
      });
    }
  }

  for (const block of schema.photoBlocks ?? []) {
    if (schema.pageType === 'free_page') continue;

    const blockValues = values.photoBlocks[block.blockId];
    if (!blockValues) continue;

    const variant =
      block.variants.find((v) => v.variantId === blockValues.variantId) ?? block.variants[0];
    if (!variant) continue;

    const isCircleTree = block.layoutKind === 'circle_tree';
    const isGridCollage = !isCircleTree && variant.slots > 1;

    if (isGridCollage) {
      for (let slotIndex = 0; slotIndex < variant.slots; slotIndex += 1) {
        const uri = blockValues.slots[slotIndex];
        const normalizedSlot = getNormalizedPhotoSlot(
          lineGuideId,
          schema.sourcePageNumber,
          variant.variantId,
          slotIndex,
          schema.templateLibraryId,
        );
        const clipShape = normalizedSlot?.shape === 'circle' ? 'circle' : undefined;

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

        const transformKey = photoSlotTransformKey(block.blockId, slotIndex);
        const slotTransform = values.photoSlotTransforms?.[transformKey];
        const rect = photoRect;

        if (!uri && clipShape) {
          annotations.push({
            id: stableAnnotationId('photo-fill', lineGuideId, schema.sourcePageNumber, block.blockId, slotIndex),
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
          id: stableAnnotationId('photo', lineGuideId, schema.sourcePageNumber, block.blockId, slotIndex),
          type: 'image',
          page: schema.sourcePageNumber,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          imageUri: uri,
          imageContentFit: 'cover',
          clipShape,
          imageSlotTransform: slotTransformForAnnotation(slotTransform),
          sourcePageNumber: schema.sourcePageNumber,
          zIndex: zIndex++,
        });
      }

      continue;
    }

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
      const useGroupTransform = isNonDefaultPhotoSlotTransform(values.photoGroupTransform)
        ? values.photoGroupTransform
        : null;
      const resolvedSlots = resolvePhotoBlockSlotRects(blockLayout, useGroupTransform);

      for (const slot of resolvedSlots) {
        const transformKey = photoSlotTransformKey(block.blockId, slot.slotIndex);
        const slotTransform = values.photoSlotTransforms?.[transformKey];
        const rect = slot.rect;

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
            id: stableAnnotationId('photo-fill', lineGuideId, schema.sourcePageNumber, block.blockId, slot.slotIndex),
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
          id: stableAnnotationId('photo', lineGuideId, schema.sourcePageNumber, block.blockId, slot.slotIndex),
          type: 'image',
          page: schema.sourcePageNumber,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          imageUri: slot.uri,
          imageContentFit: 'cover',
          clipShape,
          imageSlotTransform: slotTransformForAnnotation(slotTransform),
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
        const rect = photoRect;

        if (!uri && clipShape) {
          annotations.push({
            id: stableAnnotationId('photo-fill', lineGuideId, schema.sourcePageNumber, block.blockId, i),
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
          id: stableAnnotationId('photo', lineGuideId, schema.sourcePageNumber, block.blockId, i),
          type: 'image',
          page: schema.sourcePageNumber,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          imageUri: uri,
          imageContentFit: 'cover',
          clipShape,
          imageSlotTransform: slotTransformForAnnotation(slotTransform),
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
        id: stableAnnotationId('photo-slot', lineGuideId, schema.sourcePageNumber, block.blockId, slotIndex),
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
      const layout = layoutTextAnnotationFromSlot(captionSlot, fontSize, lineGuideId);
      annotations.push({
        id: stableAnnotationId('caption', lineGuideId, schema.sourcePageNumber),
        type: 'text',
        page: schema.sourcePageNumber,
        content: values.caption.trim(),
        fontSize,
        fontFamily: textFontFamily,
        color: '#3D3D3D',
        zIndex: zIndex++,
        sourcePageNumber: schema.sourcePageNumber,
        ...layout,
        templateLineStart: captionSlot.index,
        templateLineCount: 1,
      });
    }
  }

  if (!isBlankTemplate && values.photoCaptions?.length) {
    const templateCaptions = appendTemplatePhotoCaptionAnnotations({
      schema,
      values,
      lineGuideId,
      editorContentRect,
      viewportHeight,
      fontSize,
      textFontFamily,
      zIndex,
    });
    annotations.push(...templateCaptions.annotations);
    zIndex = templateCaptions.zIndex;

    if (
      templateCaptions.annotations.length === 0 &&
      values.photoCaptions?.length &&
      (schema.pageType === 'caption_photo_page' ||
        schema.pageType === 'photo' ||
        schema.captionEnabled)
    ) {
      const labelSlots = slots.filter((s) => s.hasLabel);
      const captionHeight = Math.max(16, viewportHeight * 0.028);

      const appendCaption = (
        index: number,
        text: string,
        layout: { x: number; y: number; width: number; height: number },
        slotIndex = index,
      ) => {
        annotations.push({
          id: stableAnnotationId('photo-caption', lineGuideId, schema.sourcePageNumber, index),
          type: 'text',
          page: schema.sourcePageNumber,
          content: text,
          fontSize,
          fontFamily: textFontFamily,
          color: '#3D3D3D',
          zIndex: zIndex++,
          sourcePageNumber: schema.sourcePageNumber,
          ...layout,
          templateLineStart: slotIndex,
          templateLineCount: 1,
        });
      };

      if (labelSlots.length > 0) {
        for (let i = 0; i < values.photoCaptions.length; i += 1) {
          const text = values.photoCaptions[i]?.trim();
          if (!text) continue;
          const slot = labelSlots[i];
          if (!slot) continue;
          appendCaption(i, text, layoutTextAnnotationFromSlot(slot, fontSize, lineGuideId), slot.index);
        }
      } else {
        const fallbackLayouts: Array<{ x: number; y: number; width: number; height: number }> = [];
        for (const block of schema.photoBlocks ?? []) {
          const blockValues = values.photoBlocks[block.blockId];
          if (!blockValues) continue;
          const variant =
            block.variants.find((v) => v.variantId === blockValues.variantId) ??
            block.variants[0];
          if (!variant) continue;

          for (let slotIndex = 0; slotIndex < variant.slots; slotIndex += 1) {
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
            fallbackLayouts.push({
              x: photoRect.x,
              y: photoRect.y + photoRect.height / 2 + captionHeight * 0.45,
              width: photoRect.width,
              height: captionHeight,
            });
          }
        }

        for (let i = 0; i < values.photoCaptions.length; i += 1) {
          const text = values.photoCaptions[i]?.trim();
          if (!text) continue;
          const layout = fallbackLayouts[i];
          if (!layout) continue;
          appendCaption(i, text, layout);
        }
      }
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

  for (const ann of annotations) {
    if (ann.type === 'text') {
      ann.zIndex = (ann.zIndex ?? 0) + TEXT_ANNOTATION_ZINDEX_BASE;
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
  const lineGuideId = schema.lineGuideId;
  const slots =
    lineGuideId && schema.sourcePageNumber
      ? getLineSlotsForPage(lineGuideId, schema.sourcePageNumber)
      : [];

  for (const field of schema.fields ?? []) {
    const lineCount = field.templateLineCount ?? 1;
    const fieldSlotIndices =
      lineGuideId &&
      isPregnancyWeeklyStructuredPage(lineGuideId, schema.sourcePageNumber) &&
      lineCount > 1 &&
      slots.length > 0
        ? resolveWeeklyFieldLineSlots(
            slots,
            field.templateLineStart,
            lineCount,
            lineGuideId,
          ).map((slot) => slot.index)
        : Array.from({ length: lineCount }, (_, offset) => field.templateLineStart + offset);

    const related = pageAnnotations
      .filter(
        (ann) =>
          ann.type === 'text' &&
          typeof ann.templateLineStart === 'number' &&
          fieldSlotIndices.includes(ann.templateLineStart),
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
