import { clampFieldInput, getFieldCharacterLimit } from '@/utils/albumFieldLimits';
import type { Annotation } from '@/components/pdf-annotations';
import { normalizeAlbumFontId } from '@/constants/album-fonts';
import { getTemplateTypographyProfile, KIDS48_TEETH_TOOTH_DATE_FONT_SIZE } from '@/constants/album-text-margins';
import type { AlbumPageField, AlbumPageSchema, PageInstance, PageValues, PhotoSlotTransform } from '@/types/album-page-schema';
import { getAlbumPageSchemaByPageId } from '@/constants/generated/album-page-schemas';
import { stableAnnotationId } from '@/utils/stableAnnotationId';
import { getSchemaForInstance } from '@/utils/albumProjectInit';
import { getContentRect } from '@/utils/imageContentRect';
import { formatAlbumDateDayMonth } from '@/utils/albumDateFormat';
import { isKids48TeethToothDateField } from '@/utils/kids48TeethDates';
import {
  formatPregnancyBirthQuestionnaireAdmissionDate,
  isPregnancyBirthQuestionnaireAdmissionDateField,
} from '@/utils/pregnancyBirthQuestionnaireDates';
import {
  getLineSlotsForPage,
  layoutAnnotationFromSlot,
  layoutTextAnnotationFromSlot,
  type GetLineSlotsParams,
} from '@/utils/textLineSlots';
import {
  DIARY_BROWN_JEWELRY_COUNT,
  DIARY_BROWN_JEWELRY_START,
} from '@/utils/diaryJewelryTextPack';
import { joinContinuationSegmentTexts } from '@/utils/templateLineText';
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
  appendPhotoSlotCaptionAnnotations,
  appendTemplatePhotoCaptionAnnotations,
} from '@/utils/templateTextAnnotations';

const DEFAULT_VIEWPORT = { width: 390, height: 844 };
/** Text annotations render above photo overlays in preview and PageRenderer snapshots. */
const TEXT_ANNOTATION_ZINDEX_BASE = 10_000;

const PURPLE_MY_DAY_PAGES = new Set([
  9, 11, 13, 15, 17, 19, 23, 34, 35, 36, 37, 38, 39,
]);

const BROWN_MY_DAY_PAGES = new Set([
  16, 20, 23, 25, 28, 33, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
]);

function isDiaryMyDayPage(lineGuideId: string, pageNumber: number): boolean {
  if (lineGuideId === 'diary_interior_purple') {
    return PURPLE_MY_DAY_PAGES.has(Number(pageNumber));
  }
  if (lineGuideId === 'diary_interior_brown') {
    return BROWN_MY_DAY_PAGES.has(Number(pageNumber));
  }
  return false;
}

/**
 * «Твой день»:
 * - фиолетовый: дата отдельно напротив «ЗА СЕГОДНЯ:»;
 * - коричневый: дата отдельно под «Твой день» (поле «(ДАТА)»), рассказ без префикса даты.
 */
function resolvePurpleMyDayFieldText(
  field: AlbumPageField,
  schema: AlbumPageSchema,
  values: PageValues,
  lineGuideId: string,
): string | null {
  if (!isDiaryMyDayPage(lineGuideId, schema.sourcePageNumber)) {
    return values.fields[field.fieldId]?.trim() || null;
  }

  // Фиолетовый и коричневый: дата и рассказ — разные поля/слоты.
  if (field.fieldId.endsWith('_date')) {
    const rawDate = values.fields[field.fieldId]?.trim() ?? '';
    if (rawDate) return rawDate;
    // Старые сохранения: дата только в начале day_story.
    const storyFieldId = field.fieldId.replace(/_date$/, '_day_story');
    const rawStory = values.fields[storyFieldId]?.trim() ?? '';
    const match = rawStory.match(/^(\d{1,2}[./]\d{1,2}[./]\d{2,4})\b/);
    return match?.[1] ?? null;
  }

  if (field.fieldId.endsWith('_day_story')) {
    const dateFieldId = field.fieldId.replace(/_day_story$/, '_date');
    const dateText = values.fields[dateFieldId]?.trim() ?? '';
    let story = values.fields[field.fieldId]?.trim() ?? '';
    if (!story) return null;
    if (dateText && story.startsWith(dateText)) {
      story = story.slice(dateText.length).trimStart();
    } else {
      story = story.replace(/^\d{1,2}[./]\d{1,2}[./]\d{2,4}\s*/, '').trimStart();
    }
    return story || null;
  }

  return values.fields[field.fieldId]?.trim() || null;
}

const PURPLE_FRIEND_QUESTIONNAIRE_PAGES = new Set([28, 29, 30, 31, 32, 33]);

function findFriendFieldId(
  schema: AlbumPageSchema,
  suffix: '_wishes' | '_instagram' | '_vk' | '_tiktok',
): string | undefined {
  return schema.fields?.find((field) => {
    if (!field.fieldId.endsWith(suffix)) return false;
    if (suffix === '_instagram' && field.fieldId.includes('Nickname')) return false;
    return true;
  })?.fieldId;
}

function isPurpleFriendQuestionnaireSchema(schema: AlbumPageSchema, lineGuideId: string): boolean {
  if (lineGuideId !== 'diary_interior_purple') return false;
  if (PURPLE_FRIEND_QUESTIONNAIRE_PAGES.has(Number(schema.sourcePageNumber))) return true;
  // Дубликаты / сдвиг sourcePageNumber — детектим по полям.
  return Boolean(
    findFriendFieldId(schema, '_wishes') &&
      findFriendFieldId(schema, '_instagram') &&
      findFriendFieldId(schema, '_vk') &&
      findFriendFieldId(schema, '_tiktok'),
  );
}

/**
 * Только значения IG/VK: если «Сердце…» ещё в wishes, а «Было…» в Instagram и VK пуст —
 * переносим на IG/VK. Слоты и геометрия «Пожелания…» не меняются.
 */
export function remapPurpleFriendSocialValuesForDraw(
  schema: AlbumPageSchema,
  values: PageValues,
  lineGuideId: string,
): PageValues {
  if (!isPurpleFriendQuestionnaireSchema(schema, lineGuideId)) return values;

  const wishesId = findFriendFieldId(schema, '_wishes');
  const igId = findFriendFieldId(schema, '_instagram');
  const vkId = findFriendFieldId(schema, '_vk');
  if (!wishesId || !igId || !vkId) return values;

  const wish = (values.fields[wishesId] ?? '').trim();
  const ig = (values.fields[igId] ?? '').trim();
  const vk = (values.fields[vkId] ?? '').trim();

  // Уже разложено по IG/VK, но seed остался в wishes → убрать, линии пожеланий пустые.
  if (vk && wish && (wish.slice(0, 15) === ig || ig.startsWith(wish.slice(0, Math.min(8, wish.length))))) {
    return {
      ...values,
      fields: {
        ...values.fields,
        [wishesId]: '',
      },
    };
  }

  // Уже разложены по IG/VK.
  if (vk) return values;
  if (!wish || !ig) return values;

  return {
    ...values,
    fields: {
      ...values.fields,
      // Убираем из wishes, чтобы 2-я линия не рисовала соцтекст у «Ники…».
      [wishesId]: '',
      [igId]: wish.slice(0, 15),
      [vkId]: ig.slice(0, 15),
    },
  };
}

function resolvePurpleFriendFieldText(
  field: AlbumPageField,
  _schema: AlbumPageSchema,
  values: PageValues,
  lineGuideId: string,
): string | null {
  const text = values.fields[field.fieldId]?.trim() ?? '';
  if (!text) return null;

  if (
    lineGuideId === 'diary_interior_purple' &&
    (field.fieldId.endsWith('_instagram') ||
      field.fieldId.endsWith('_vk') ||
      field.fieldId.endsWith('_tiktok'))
  ) {
    return text.slice(0, 15);
  }

  return text;
}

function resolveAlbumFieldText(
  field: AlbumPageField,
  schema: AlbumPageSchema,
  values: PageValues,
  lineGuideId: string,
): string | null {
  if (isPurpleFriendQuestionnaireSchema(schema, lineGuideId)) {
    return resolvePurpleFriendFieldText(field, schema, values, lineGuideId);
  }
  return resolvePurpleMyDayFieldText(field, schema, values, lineGuideId);
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
    values: rawValues,
    viewportWidth = DEFAULT_VIEWPORT.width,
    viewportHeight = DEFAULT_VIEWPORT.height,
    sourceWidth,
    sourceHeight,
  } = params;

  // Опускаем только тексты IG/VK; слоты пожеланий не двигаем.
  const values = remapPurpleFriendSocialValuesForDraw(schema, rawValues, lineGuideId);

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
    if (field.type === 'radio' || field.type === 'checkbox') continue;
    if (isBlankTemplate) continue;

    const rawText = resolveAlbumFieldText(field, schema, values, lineGuideId);
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

    const isTeethToothDate = isKids48TeethToothDateField(
      field,
      lineGuideId,
      schema.sourcePageNumber,
    );
    const isAdmissionDate = isPregnancyBirthQuestionnaireAdmissionDateField(
      field,
      lineGuideId,
      schema.sourcePageNumber,
    );
    const displayText = (() => {
      const formatted = isTeethToothDate
        ? formatAlbumDateDayMonth(text)
        : isAdmissionDate
          ? formatPregnancyBirthQuestionnaireAdmissionDate(text)
          : text;
      if (
        (field.templateLineCount ?? 1) > 1 ||
        (lineGuideId === 'diary_interior_brown' &&
          (schema.sourcePageNumber === 26 || schema.sourcePageNumber === 38))
      ) {
        // Без trim: иначе пробел при наборе на превью пропадает.
        return formatted
          .replace(/[\r\n\u2028\u2029]+/g, ' ')
          .replace(/[ \t]+/g, ' ');
      }
      return formatted;
    })();
    if (!displayText) continue;

    let startIndex = field.templateLineStart;
    let lineCount = field.templateLineCount ?? 1;
    // «Украшения» — жёстко хвост + 2 полные строки (не зависеть от устаревшей схемы).
    if (
      lineGuideId === 'diary_interior_brown' &&
      schema.sourcePageNumber === 26 &&
      field.fieldId.endsWith('_wearsJewelry')
    ) {
      startIndex = DIARY_BROWN_JEWELRY_START;
      lineCount = DIARY_BROWN_JEWELRY_COUNT;
    }
    // Постановка на учёт: телефон только на хвосте после подписи (без 2-й OCR-линии).
    if (
      lineGuideId === 'pregnancy_60' &&
      schema.sourcePageNumber === 4 &&
      field.fieldId.endsWith('_phone')
    ) {
      startIndex = 8;
      lineCount = 1;
    }
    if (isDiaryMyDayPage(lineGuideId, schema.sourcePageNumber)) {
      if (field.fieldId.endsWith('_date')) {
        startIndex = Math.max(0, slots.length - 1);
      } else if (field.fieldId.endsWith('_day_story')) {
        startIndex = 0;
      } else if (field.fieldId.endsWith('_things_that_made_smile')) {
        startIndex = lineGuideId === 'diary_interior_purple' ? 8 : 6;
      }
    }
    // Анкета для друзей: IG/VK/TT жёстко на слотах 18/19/20 (иконки).
    // Пожелания — schema start 16, count 2 (слоты 16–17), геометрию не трогаем.
    if (isPurpleFriendQuestionnaireSchema(schema, lineGuideId) && slots.length >= 21) {
      if (field.fieldId.endsWith('_instagram') && !field.fieldId.includes('Nickname')) {
        startIndex = 18;
      } else if (field.fieldId.endsWith('_vk')) {
        startIndex = 19;
      } else if (field.fieldId.endsWith('_tiktok')) {
        startIndex = 20;
      }
    }
    if (!slots[startIndex]) continue;

    const fieldFontSize = isTeethToothDate ? KIDS48_TEETH_TOOTH_DATE_FONT_SIZE : fontSize;
    const layout = layoutTextAnnotationFromSlot(
      slots[startIndex],
      fieldFontSize,
      lineGuideId,
      // Не подгонять fontSize под весь многострочный текст через ширину хвоста.
      lineCount > 1 ? undefined : displayText,
    );
    annotations.push({
      id: stableAnnotationId('field', lineGuideId, schema.sourcePageNumber, field.fieldId),
      type: 'text',
      page: schema.sourcePageNumber,
      content: displayText,
      fontSize: fieldFontSize,
      fontFamily: textFontFamily,
      color: '#3D3D3D',
      zIndex: zIndex++,
      sourcePageNumber: schema.sourcePageNumber,
      ...layout,
      templateLineStart: startIndex,
      templateLineCount: lineCount,
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
      fillCornerRadius:
        'shape' in target &&
        target.shape === 'rect' &&
        target.cornerRadius != null &&
        target.width > 0
          ? target.cornerRadius * (rect.width / (target.width * editorContentRect.width))
          : undefined,
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
      schema.pageType === 'caption_photo_page'
    ) {
      const labelSlots = slots.filter((s) => s.hasLabel);
      let labelCaptionCount = 0;
      for (let i = 0; i < values.photoCaptions.length; i += 1) {
        const text = values.photoCaptions[i]?.trim();
        if (!text) continue;
        const slot = labelSlots[i];
        if (!slot) continue;
        const layout = layoutTextAnnotationFromSlot(slot, fontSize, lineGuideId);
        annotations.push({
          id: stableAnnotationId('photo-caption', lineGuideId, schema.sourcePageNumber, i),
          type: 'text',
          page: schema.sourcePageNumber,
          content: text,
          fontSize,
          fontFamily: textFontFamily,
          color: '#3D3D3D',
          zIndex: zIndex++,
          sourcePageNumber: schema.sourcePageNumber,
          ...layout,
          templateLineStart: slot.index,
          templateLineCount: 1,
        });
        labelCaptionCount += 1;
      }

      if (labelCaptionCount === 0) {
        const slotCaptions = appendPhotoSlotCaptionAnnotations({
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
          zIndex,
        });
        annotations.push(...slotCaptions.annotations);
        zIndex = slotCaptions.zIndex;
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
      // Пробел, не \n: иначе перенос на макете «залипает» по одной «словесной» строке на слот.
      fields[field.fieldId] = joinContinuationSegmentTexts(
        related.map((ann) => ({ content: ann.content ?? '' })),
      );
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
