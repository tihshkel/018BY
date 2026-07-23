import { resolveKids48TeethTemplateLineStart } from '@/constants/kids-48-teeth-slots';
import { clampFieldInput, getFieldCharacterLimit } from '@/utils/albumFieldLimits';
import type { Annotation } from '@/components/pdf-annotations';
import { normalizeAlbumFontId } from '@/constants/album-fonts';
import { getTemplateTypographyProfile } from '@/constants/album-text-margins';
import type { AlbumPageField, AlbumPageSchema, PageInstance, PageValues, PhotoSlotTransform, FieldTextStyle } from '@/types/album-page-schema';
import { getSchemaForInstance } from '@/utils/albumProjectInit';
import { stableAnnotationId } from '@/utils/stableAnnotationId';
import { resolveBirthQuestionnaireBlockTextAlign } from '@/utils/templateLineText';
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
import {
  resolveGodparentsNameViewportLayouts,
  resolvePhotoCaptionGroupScale,
  resolvePhotoCaptionViewportLayouts,
  resolvePrimaryPhotoCaptionLayout,
} from '@/utils/photoCaptionLayout';
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
import {
  getOptionFillTargets,
  type OptionFillTarget,
  type RectFillTarget,
} from '@/utils/pdfCircleSlots';
import { getNormalizedPhotoSlot } from '@/utils/photoSlots';
import {
  getPageFormatForLineGuide,
  getTemplateLayout,
  isBlankTemplateLineGuide,
} from '@/utils/photoPageTemplateManifest';
import { TRAVEL_MAP_COLORS } from '@/constants/travel-world-map';
import { mapMarkerToViewport } from '@/utils/travelMap';
import {
  appendBlankTemplateFreeImageAnnotations,
  appendBlankTemplateTextAnnotations,
  appendTemplatePhotoCaptionAnnotations,
} from '@/utils/templateTextAnnotations';
import { mapTemplateFrameToViewport } from '@/utils/templateTextLayout';
import { usesDesignedAlbumPerPhotoCaptions } from '@/utils/designedAlbumPerPhotoCaptions';
import { shouldShowAnyPhotoCaption } from '@/utils/photoCaptions';

const DEFAULT_VIEWPORT = { width: 390, height: 844 };
/** Text annotations render above photo overlays in preview and PageRenderer snapshots. */
const TEXT_ANNOTATION_ZINDEX_BASE = 10_000;

function resolveFieldAnnotationTextAlign(
  field: AlbumPageField,
  startSlot: { page: number; index: number; inputKind?: 'line' | 'block' },
  lineGuideId: string,
  fieldStyle?: FieldTextStyle,
): 'left' | 'center' | 'right' {
  if (fieldStyle?.textAlign) return fieldStyle.textAlign;
  if (field.fieldId.endsWith('_title') || field.label === 'Заголовок') return 'center';
  // Дни рождения: короткие pill (вес/рост) — по центру;
  // свободные страницы / многострочные подписи — с начала белого блока.
  if (lineGuideId === 'holidays_birthday_60') {
    if ((startSlot.inputKind ?? 'line') !== 'block') return 'left';
    const isFreePageCaption =
      (field.templateLineCount ?? 1) > 1 || /_field_\d+$/.test(field.fieldId);
    return isFreePageCaption ? 'left' : 'center';
  }
  // «Твой день» — дата по центру над печатным «(ДАТА)».
  if (
    lineGuideId === 'diary_interior_brown' &&
    field.type === 'date' &&
    field.fieldId.endsWith('_date')
  ) {
    return 'center';
  }
  // Семейное дерево — короткие имена в узких внешних полосах, центр читается лучше.
  if (lineGuideId === 'kids_48' && startSlot.page === 5) return 'center';
  // Крестные — имена под фото, по центру кадра.
  if (lineGuideId === 'kids_48' && startSlot.page === 21) return 'center';
  // Достижения — дата слева от «(ДАТА)», по центру своего слота.
  if (lineGuideId === 'kids_48' && startSlot.page === 13 && startSlot.index === 0) {
    return 'center';
  }
  return resolveBirthQuestionnaireBlockTextAlign(startSlot, lineGuideId);
}

function isKidsGodparentsPage(
  lineGuideId: string,
  schema: Pick<AlbumPageSchema, 'pageType' | 'sourcePageNumber'>,
): boolean {
  return (
    lineGuideId === 'kids_48' &&
    (schema.pageType === 'godparents_page' || schema.sourcePageNumber === 21)
  );
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

/** Resolve structured field text (pregnancy weekly merges + plain diary fields). */
function resolveStructuredFieldText(
  field: AlbumPageField,
  schema: AlbumPageSchema,
  values: PageValues,
  lineGuideId: string,
): string | null {
  return resolvePregnancyWeeklyFieldText(
    field,
    values,
    lineGuideId,
    schema.sourcePageNumber,
  );
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

function resolveTemplateHasPerPhotoCaptions(
  schema: AlbumPageSchema,
  lineGuideId: string,
): boolean {
  if (usesDesignedAlbumPerPhotoCaptions(schema, lineGuideId)) return true;
  if (!schema.templateLibraryId) return false;
  const format = getPageFormatForLineGuide(lineGuideId);
  const layout = getTemplateLayout(schema.templateLibraryId, format);
  // Как iOS e24a739: только явный perPhotoCaptions (CaptionGallery / Timeline).
  return Boolean(layout?.perPhotoCaptions);
}

/** Blank TwoVertical / TwoHorizontal 21×21 — captionN как schema.fields. */
function resolveBlankTemplateFieldCaptions(
  schema: AlbumPageSchema,
  values: PageValues,
): (string | null)[] | undefined {
  const captionFields = (schema.fields ?? [])
    .filter((field) => /_caption\d+$/i.test(field.fieldId) || /caption\d+$/i.test(field.fieldId))
    .sort((a, b) => {
      const num = (id: string) => {
        const match = id.match(/caption(\d+)/i);
        return match ? Number(match[1]) : 0;
      };
      return num(a.fieldId) - num(b.fieldId);
    });
  if (captionFields.length === 0) return undefined;
  return captionFields.map((field) => values.fields[field.fieldId] ?? null);
}

function resolveEffectivePhotoCaptions(
  schema: AlbumPageSchema,
  lineGuideId: string,
  values: PageValues,
): (string | null)[] | undefined {
  const perPhoto = resolveTemplateHasPerPhotoCaptions(schema, lineGuideId);
  if (!shouldShowAnyPhotoCaption(schema, perPhoto)) {
    return undefined;
  }

  if (perPhoto) {
    if (values.photoCaptions?.some((c) => Boolean(c?.trim()))) {
      return values.photoCaptions;
    }
    if (isBlankTemplateLineGuide(lineGuideId)) {
      const fieldCaptions = resolveBlankTemplateFieldCaptions(schema, values);
      if (fieldCaptions?.some((c) => Boolean(c?.trim()))) {
        return fieldCaptions;
      }
    }
    if (
      (usesDesignedAlbumPerPhotoCaptions(schema, lineGuideId) ||
        (isBlankTemplateLineGuide(lineGuideId) && schema.captionEnabled)) &&
      values.caption?.trim()
    ) {
      return [values.caption];
    }
    return values.photoCaptions;
  }

  // Не per-photo (FourPhotos / Single / Three…): одна page-caption под всей группой фото.
  // TwoVertical / TwoHorizontal 21×21: несколько caption-полей → под каждым фото.
  if (isBlankTemplateLineGuide(lineGuideId) && schema.captionEnabled) {
    const fieldCaptions = resolveBlankTemplateFieldCaptions(schema, values);
    if (fieldCaptions && fieldCaptions.length > 1 && fieldCaptions.some((c) => Boolean(c?.trim()))) {
      return fieldCaptions;
    }
    // Legacy Android: раньше TwoVertical писал в photoCaptions[] без perPhotoCaptions.
    if (
      (values.photoCaptions?.filter((c) => Boolean(c?.trim())).length ?? 0) > 1
    ) {
      return values.photoCaptions;
    }
    if (values.caption?.trim()) {
      return [values.caption];
    }
    const firstPhotoCaption = values.photoCaptions?.find((c) => Boolean(c?.trim()));
    if (firstPhotoCaption?.trim()) {
      return [firstPhotoCaption];
    }
    if (fieldCaptions?.some((c) => Boolean(c?.trim()))) {
      return fieldCaptions;
    }
  }

  if (
    usesDesignedAlbumPerPhotoCaptions(schema, lineGuideId) &&
    values.caption?.trim()
  ) {
    return [values.caption];
  }

  return values.photoCaptions;
}

/** Подписи blank: те же textBlock-кадры, что у TemplateWireframePreview (пока нет pinch). */
function resolveBlankCaptionLayoutsFromTemplate(params: {
  schema: AlbumPageSchema;
  values: PageValues;
  lineGuideId: string;
  editorContentRect: ReturnType<typeof getContentRect>;
}): { x: number; y: number; width: number; height: number }[] | null {
  const { schema, values, lineGuideId, editorContentRect } = params;
  if (!schema.templateLibraryId || !isBlankTemplateLineGuide(lineGuideId)) {
    return null;
  }
  if (isNonDefaultPhotoSlotTransform(values.photoGroupTransform)) {
    return null;
  }
  const slotTransforms = Object.values(values.photoSlotTransforms ?? {});
  if (slotTransforms.some((t) => isNonDefaultPhotoSlotTransform(t))) {
    return null;
  }

  const format = getPageFormatForLineGuide(lineGuideId);
  const layout = getTemplateLayout(schema.templateLibraryId, format);
  const captionBlocks =
    layout?.textBlocks?.filter((block) => block.type === 'caption') ?? [];
  if (captionBlocks.length === 0) return null;

  return captionBlocks.map((block) => mapTemplateFrameToViewport(block, editorContentRect));
}

/** Подписи под фото blank — превью-кадры шаблона; после pinch — bands под зонами фото. */
function appendBlankPhotoCaptionsFollowingPhotos(params: {
  schema: AlbumPageSchema;
  values: PageValues;
  lineGuideId: string;
  viewportWidth: number;
  viewportHeight: number;
  sourceWidth?: number;
  sourceHeight?: number;
  editorContentRect: ReturnType<typeof getContentRect>;
  fontSize: number;
  textFontFamily: string;
  zIndex: number;
  annotations: Annotation[];
}): number {
  const {
    schema,
    values,
    lineGuideId,
    viewportWidth,
    viewportHeight,
    sourceWidth,
    sourceHeight,
    editorContentRect,
    fontSize,
    textFontFamily,
    annotations,
  } = params;
  let zIndex = params.zIndex;

  if (!schema.captionEnabled && schema.pageType !== 'caption_photo_page') {
    return zIndex;
  }

  if (
    !shouldShowAnyPhotoCaption(
      schema,
      resolveTemplateHasPerPhotoCaptions(schema, lineGuideId),
    )
  ) {
    return zIndex;
  }

  const effectivePhotoCaptions = resolveEffectivePhotoCaptions(schema, lineGuideId, values);
  if (!effectivePhotoCaptions?.some((c) => Boolean(c?.trim()))) {
    return zIndex;
  }

  const captionLayoutParams = {
    schema,
    values,
    lineGuideId,
    viewportWidth,
    viewportHeight,
    sourceWidth,
    sourceHeight,
    contentRect: editorContentRect,
  };
  const captionScale = resolvePhotoCaptionGroupScale(captionLayoutParams);
  const perPhoto = resolveTemplateHasPerPhotoCaptions(schema, lineGuideId);
  const filledCaptions = effectivePhotoCaptions.filter((c) => Boolean(c?.trim()));
  const usePrimaryUnderGroup = !perPhoto && filledCaptions.length <= 1;

  const templateCaptionLayouts = resolveBlankCaptionLayoutsFromTemplate({
    schema,
    values,
    lineGuideId,
    editorContentRect,
  });

  const pushCaption = (
    index: number,
    text: string,
    layout: { x: number; y: number; width: number; height: number },
    styleKey?: string,
  ) => {
    const fieldStyle =
      (styleKey ? values.fieldTextStyles?.[styleKey] : undefined) ??
      (index === 0 ? values.captionTextStyle : undefined) ??
      values.fieldTextStyles?.[`caption${index + 1}`];
    const baseSize = fieldStyle?.fontSize ?? fontSize;
    annotations.push({
      id: stableAnnotationId('photo-caption', lineGuideId, schema.sourcePageNumber, index),
      type: 'text',
      page: schema.sourcePageNumber,
      content: text,
      fontSize: baseSize * captionScale,
      fontFamily: textFontFamily,
      color: '#3D3D3D',
      textAlign: fieldStyle?.textAlign ?? 'center',
      zIndex: zIndex++,
      sourcePageNumber: schema.sourcePageNumber,
      ...layout,
    });
  };

  // Паритет с превью шаблона: те же x/y/w/h caption textBlocks из манифеста.
  if (templateCaptionLayouts?.length) {
    if (usePrimaryUnderGroup) {
      const text = filledCaptions[0]?.trim();
      if (text && templateCaptionLayouts[0]) {
        pushCaption(0, text, templateCaptionLayouts[0]);
      }
      return zIndex;
    }

    for (let i = 0; i < effectivePhotoCaptions.length; i += 1) {
      const text = effectivePhotoCaptions[i]?.trim();
      if (!text) continue;
      const layout = templateCaptionLayouts[i];
      if (!layout) continue;
      pushCaption(i, text, layout);
    }
    return zIndex;
  }

  // После pinch / без textBlocks — подпись следует за фотозонами.
  if (usePrimaryUnderGroup) {
    const text = filledCaptions[0]?.trim();
    if (!text) return zIndex;
    const layout = resolvePrimaryPhotoCaptionLayout(captionLayoutParams);
    if (!layout) return zIndex;
    pushCaption(0, text, layout);
    return zIndex;
  }

  const photoCaptionLayouts = resolvePhotoCaptionViewportLayouts(captionLayoutParams);
  for (let i = 0; i < effectivePhotoCaptions.length; i += 1) {
    const text = effectivePhotoCaptions[i]?.trim();
    if (!text) continue;
    const layout = photoCaptionLayouts[i];
    if (!layout) continue;
    pushCaption(i, text, layout);
  }

  return zIndex;
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

  const godparentsNameFields: AlbumPageField[] = [];

  for (const field of schema.fields ?? []) {
    if (field.type === 'radio') continue;
    if (isBlankTemplate) continue;

    // Имена крестных — под фото (ниже), не на фиксированных line slots.
    if (isKidsGodparentsPage(lineGuideId, schema)) {
      godparentsNameFields.push(field);
      continue;
    }

    const rawText = resolveStructuredFieldText(field, schema, values, lineGuideId);
    if (!rawText) continue;

    const fieldStyle = values.fieldTextStyles?.[field.fieldId];
    const characterLimit = getFieldCharacterLimit({
      field,
      lineGuideId,
      sourcePageNumber: schema.sourcePageNumber,
      viewportWidth,
      viewportHeight,
      fontId: textFontFamily,
      fontSize: fieldStyle?.fontSize,
    });
    const text = clampFieldInput(field, rawText, characterLimit, {
      lineGuideId,
      sourcePageNumber: schema.sourcePageNumber,
      fontId: textFontFamily,
      fontSize: fieldStyle?.fontSize,
    });
    if (!text) continue;

    const lineSlotStart = resolveKids48TeethTemplateLineStart(field, schema, lineGuideId);
    const startSlot = slots[lineSlotStart];
    if (!startSlot) continue;

    const layout = layoutTextAnnotationFromSlot(
      startSlot,
      fieldStyle?.fontSize ?? fontSize,
      lineGuideId,
      text,
      textFontFamily,
    );
    annotations.push({
      id: stableAnnotationId('field', lineGuideId, schema.sourcePageNumber, field.fieldId),
      type: 'text',
      page: schema.sourcePageNumber,
      content: text,
      fontFamily: textFontFamily,
      color: '#3D3D3D',
      zIndex: zIndex++,
      sourcePageNumber: schema.sourcePageNumber,
      ...layout,
      // После ...layout: иначе layout.fontSize затирает стиль / дефолт альбома.
      fontSize: fieldStyle?.fontSize ?? fontSize,
      textAlign: resolveFieldAnnotationTextAlign(field, startSlot, lineGuideId, fieldStyle),
      templateLineStart: lineSlotStart,
      templateLineCount: field.templateLineCount ?? 1,
    });
  }

  if (godparentsNameFields.length > 0) {
    const nameLayouts = resolveGodparentsNameViewportLayouts(
      {
        schema,
        values,
        lineGuideId,
        viewportWidth,
        viewportHeight,
        sourceWidth,
        sourceHeight,
        contentRect: editorContentRect,
      },
      godparentsNameFields.length,
    );
    const captionScale = resolvePhotoCaptionGroupScale({
      schema,
      values,
      lineGuideId,
      viewportWidth,
      viewportHeight,
      sourceWidth,
      sourceHeight,
      contentRect: editorContentRect,
    });

    for (let i = 0; i < godparentsNameFields.length; i += 1) {
      const field = godparentsNameFields[i];
      const layout = nameLayouts[i];
      if (!layout) continue;

      const textValue = resolveStructuredFieldText(field, schema, values, lineGuideId);
      if (!textValue?.trim()) continue;

      const fieldStyle = values.fieldTextStyles?.[field.fieldId];
      const characterLimit = getFieldCharacterLimit({
        field,
        lineGuideId,
        sourcePageNumber: schema.sourcePageNumber,
        viewportWidth,
        viewportHeight,
        fontId: textFontFamily,
        fontSize: fieldStyle?.fontSize,
      });
      const text = clampFieldInput(field, textValue, characterLimit, {
        lineGuideId,
        sourcePageNumber: schema.sourcePageNumber,
        fontId: textFontFamily,
        fontSize: fieldStyle?.fontSize,
      });
      if (!text) continue;

      const baseSize = fieldStyle?.fontSize ?? fontSize;
      // Без templateLineStart — иначе export/preview привяжут к OCR-слотам и текст
      // перестанет следовать за photoGroupTransform.
      annotations.push({
        id: stableAnnotationId('field', lineGuideId, schema.sourcePageNumber, field.fieldId),
        type: 'text',
        page: schema.sourcePageNumber,
        content: text,
        fontSize: baseSize * captionScale,
        fontFamily: textFontFamily,
        color: '#3D3D3D',
        textAlign: fieldStyle?.textAlign ?? 'center',
        zIndex: zIndex++,
        sourcePageNumber: schema.sourcePageNumber,
        x: layout.x,
        y: layout.y,
        width: layout.width,
        height: layout.height,
      });
    }
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

  const isRectFillTarget = (target: OptionFillTarget): target is RectFillTarget =>
    'shape' in target && target.shape === 'rect';

  const optionFillTargets = getOptionFillTargets(lineGuideId, schema.sourcePageNumber);
  for (const target of optionFillTargets) {
    const selected = values.fields[target.fieldId]?.trim();
    if (selected !== target.option) continue;

    const rect = isRectFillTarget(target)
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
      fillCornerRadiusRatio: isRectFillTarget(target) ? target.cornerRadiusRatio : undefined,
      clipShape: isRectFillTarget(target) ? undefined : 'circle',
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
      const isMultiSlotCollage = variant.slots > 1;

      for (const slot of resolvedSlots) {
        const transformKey = photoSlotTransformKey(block.blockId, slot.slotIndex);
        const slotTransform = isMultiSlotCollage
          ? undefined
          : values.photoSlotTransforms?.[transformKey];
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

  const designedPerPhotoCaptions = usesDesignedAlbumPerPhotoCaptions(schema, lineGuideId);
  const allowPhotoCaptions = shouldShowAnyPhotoCaption(
    schema,
    resolveTemplateHasPerPhotoCaptions(schema, lineGuideId),
  );
  const effectivePhotoCaptions = allowPhotoCaptions
    ? resolveEffectivePhotoCaptions(schema, lineGuideId, values)
    : undefined;

  if (
    allowPhotoCaptions &&
    !isBlankTemplate &&
    values.caption?.trim() &&
    !(designedPerPhotoCaptions && effectivePhotoCaptions?.some((c) => Boolean(c?.trim())))
  ) {
    const captionStyle = values.captionTextStyle;
    const captionFontSize = captionStyle?.fontSize ?? fontSize;
    const captionLayoutParams = {
      schema,
      values,
      lineGuideId,
      viewportWidth,
      viewportHeight,
      sourceWidth,
      sourceHeight,
      contentRect: editorContentRect,
    };

    let captionLayout:
      | { x: number; y: number; width: number; height: number; fontSize?: number }
      | null = null;
    let templateLineStart: number | undefined;

    if ((schema.photoBlocks?.length ?? 0) > 0) {
      captionLayout = resolvePrimaryPhotoCaptionLayout(captionLayoutParams);
    } else {
      const captionSlot = slots.find((s) => s.hasLabel) ?? slots[0];
      if (captionSlot) {
        captionLayout = layoutTextAnnotationFromSlot(
          captionSlot,
          captionFontSize,
          lineGuideId,
        );
        templateLineStart = captionSlot.index;
      }
    }

    if (captionLayout) {
      annotations.push({
        id: stableAnnotationId('caption', lineGuideId, schema.sourcePageNumber),
        type: 'text',
        page: schema.sourcePageNumber,
        content: values.caption.trim(),
        fontSize: captionLayout.fontSize ?? captionFontSize,
        fontFamily: textFontFamily,
        color: '#3D3D3D',
        textAlign: captionStyle?.textAlign ?? 'center',
        zIndex: zIndex++,
        sourcePageNumber: schema.sourcePageNumber,
        x: captionLayout.x,
        y: captionLayout.y,
        width: captionLayout.width,
        height: captionLayout.height,
        templateLineStart,
        templateLineCount: 1,
      });
    }
  }

  if (allowPhotoCaptions && !isBlankTemplate && effectivePhotoCaptions?.length) {
    // Designed collage pages (holidays «Свободная фотостраница», pregnancy/kids memory):
    // always place captions under photo zones. Template CaptionGallery textBlocks stay at
    // fixed 4-grid holes and overlap after sparse expands the photo frames.
    const useUnderPhotoCaptions =
      designedPerPhotoCaptions ||
      schema.pageType === 'caption_photo_page' ||
      schema.pageType === 'free_photo_caption' ||
      lineGuideId === 'holidays_birthday_60';

    const templateCaptions = useUnderPhotoCaptions
      ? { annotations: [] as Annotation[], zIndex }
      : appendTemplatePhotoCaptionAnnotations({
          schema,
          values: { ...values, photoCaptions: effectivePhotoCaptions },
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
      effectivePhotoCaptions.length &&
      (schema.pageType === 'caption_photo_page' ||
        schema.pageType === 'photo' ||
        schema.pageType === 'free_photo_caption' ||
        schema.captionEnabled)
    ) {
      const labelSlots = slots.filter((s) => s.hasLabel);
      const captionLayoutParams = {
        schema,
        values,
        lineGuideId,
        viewportWidth,
        viewportHeight,
        sourceWidth,
        sourceHeight,
        contentRect: editorContentRect,
      };
      const photoCaptionLayouts = resolvePhotoCaptionViewportLayouts(captionLayoutParams);
      const captionScale = resolvePhotoCaptionGroupScale(captionLayoutParams);

      const appendCaption = (
        index: number,
        text: string,
        layout: { x: number; y: number; width: number; height: number },
        options?: { templateLineStart?: number },
      ) => {
        const fieldStyle = values.fieldTextStyles?.[`caption${index + 1}`];
        const baseSize = fieldStyle?.fontSize ?? fontSize;
        // Under-photo captions must NOT set templateLineStart — otherwise preview/export
        // snap them to OCR line slots and they stop following photoGroupTransform.
        annotations.push({
          id: stableAnnotationId('photo-caption', lineGuideId, schema.sourcePageNumber, index),
          type: 'text',
          page: schema.sourcePageNumber,
          content: text,
          fontSize: baseSize * captionScale,
          fontFamily: textFontFamily,
          color: '#3D3D3D',
          textAlign: fieldStyle?.textAlign ?? 'center',
          zIndex: zIndex++,
          sourcePageNumber: schema.sourcePageNumber,
          ...layout,
          ...(typeof options?.templateLineStart === 'number'
            ? { templateLineStart: options.templateLineStart, templateLineCount: 1 }
            : {}),
        });
      };

      if (photoCaptionLayouts.length > 0) {
        for (let i = 0; i < effectivePhotoCaptions.length; i += 1) {
          const text = effectivePhotoCaptions[i]?.trim();
          if (!text) continue;
          const layout = photoCaptionLayouts[i];
          if (!layout) continue;
          appendCaption(i, text, layout);
        }
      } else if (labelSlots.length > 0) {
        for (let i = 0; i < effectivePhotoCaptions.length; i += 1) {
          const text = effectivePhotoCaptions[i]?.trim();
          if (!text) continue;
          const slot = labelSlots[i];
          if (!slot) continue;
          appendCaption(
            i,
            text,
            layoutTextAnnotationFromSlot(slot, fontSize, lineGuideId),
            { templateLineStart: slot.index },
          );
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

    zIndex = appendBlankPhotoCaptionsFollowingPhotos({
      schema,
      values,
      lineGuideId,
      viewportWidth,
      viewportHeight,
      sourceWidth,
      sourceHeight,
      editorContentRect,
      fontSize,
      textFontFamily,
      zIndex,
      annotations,
    });

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
      ? getLineSlotsForPage({
          lineGuideId,
          page: schema.sourcePageNumber,
          viewportWidth: DEFAULT_VIEWPORT.width,
          viewportHeight: DEFAULT_VIEWPORT.height,
        })
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
