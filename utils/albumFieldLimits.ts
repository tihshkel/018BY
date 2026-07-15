import { getTemplateTypographyProfile } from '@/constants/album-text-margins';
import type { AlbumPageField } from '@/types/album-page-schema';
import {
  getMeasurementDigitLimit,
  sanitizeMeasurementInput,
} from '@/utils/albumMeasurementFields';
import {
  getFieldMaxLength,
  sanitizeFieldInput,
} from '@/utils/albumFieldInput';
import { getLineSlotsForPage } from '@/utils/textLineSlots';
import { clampTextToFieldLines } from '@/utils/templateLineText';

const DEFAULT_VIEWPORT = { width: 390, height: 844 };
const FIELD_LIMIT_PROBE = 'n'.repeat(500);

type FieldLimitParams = {
  field: AlbumPageField;
  lineGuideId: string;
  sourcePageNumber: number;
  viewportWidth?: number;
  viewportHeight?: number;
};

type FieldClampLayoutParams = {
  lineGuideId: string;
  sourcePageNumber: number;
  viewportWidth?: number;
  viewportHeight?: number;
};

function computeLayoutCharacterLimit(
  field: AlbumPageField,
  lineGuideId: string,
  sourcePageNumber: number,
  viewportWidth: number,
  viewportHeight: number
): number | undefined {
  const slots = getLineSlotsForPage({
    lineGuideId,
    page: sourcePageNumber,
    viewportWidth,
    viewportHeight,
  });

  const fieldSlots = slots.slice(
    field.templateLineStart,
    field.templateLineStart + field.templateLineCount
  );

  if (fieldSlots.length === 0) return undefined;

  const profile = getTemplateTypographyProfile(lineGuideId);
  const fontSize = profile.fixedLineFontSize ?? 16;

  const clamped = clampTextToFieldLines({
    text: FIELD_LIMIT_PROBE,
    startSlotIndex: field.templateLineStart,
    lineCount: field.templateLineCount,
    slots,
    fontSize,
    lineGuideId,
  });

  return clamped.length;
}

function getBirthdayFieldLimit(params: FieldLimitParams): number | undefined {
  if (params.lineGuideId !== 'holidays_birthday_60') {
    return undefined;
  }

  if (params.sourcePageNumber === 1 && params.field.fieldId.endsWith('_ownerName')) {
    return 60;
  }

  if (params.sourcePageNumber === 40) {
    if (params.field.fieldId.endsWith('_favorite_travel_memory')) {
      return 400;
    }
  }

  if (params.sourcePageNumber === 48 && params.field.fieldId.endsWith('_letter_text')) {
    return 1600;
  }

  return undefined;
}

/** Семейное дерево (kids_48, стр. 5): имена под кругами — до 7 символов. */
export const FAMILY_TREE_NAME_MAX_LENGTH = 7;

function getFamilyTreeFieldLimit(params: FieldLimitParams): number | undefined {
  if (params.lineGuideId !== 'kids_48' || params.sourcePageNumber !== 5) {
    return undefined;
  }
  if (params.field.type !== 'text') {
    return undefined;
  }
  return FAMILY_TREE_NAME_MAX_LENGTH;
}

/** Постановка на учёт: телефон — одна строка на макете, длинный ввод не помещается. */
function getPregnancyFieldLimit(params: FieldLimitParams): number | undefined {
  if (params.lineGuideId !== 'pregnancy_60' || params.sourcePageNumber !== 4) {
    return undefined;
  }

  if (params.field.fieldId === 'pregnancy_60_p4_phone') {
    return 25;
  }

  if (params.field.fieldId === 'pregnancy_60_p4_wellbeing') {
    return 70;
  }

  return undefined;
}

/** «Кем я хочу стать» (коричневый дневник, стр. 6) — две строки ответа. */
export const DIARY_BROWN_CAREER_WISH_MAX_LENGTH = 54;

/** «Самое сокровенное» на странице «Мечты». */
export const DIARY_BROWN_DREAMS_SECRET_MAX_LENGTH = 10;

function getDiaryFieldLimit(params: FieldLimitParams): number | undefined {
  if (
    (params.lineGuideId === 'diary_interior_brown' &&
      params.field.fieldId === 'diary_interior_brown_p6_careerWish') ||
    (params.lineGuideId === 'diary_interior_purple' &&
      params.field.fieldId === 'diary_interior_purple_p5_careerWish')
  ) {
    return DIARY_BROWN_CAREER_WISH_MAX_LENGTH;
  }

  if (
    params.lineGuideId === 'diary_interior_brown' &&
    params.field.fieldId.endsWith('_secretMost')
  ) {
    return DIARY_BROWN_DREAMS_SECRET_MAX_LENGTH;
  }

  return undefined;
}

export function getFieldCharacterLimit(params: FieldLimitParams): number | undefined {
  const measurementLimit = getMeasurementDigitLimit(params.field);
  if (measurementLimit != null) {
    return measurementLimit;
  }

  const birthdayLimit = getBirthdayFieldLimit(params);
  if (birthdayLimit != null) {
    return birthdayLimit;
  }

  const pregnancyLimit = getPregnancyFieldLimit(params);
  if (pregnancyLimit != null) {
    return pregnancyLimit;
  }

  const diaryLimit = getDiaryFieldLimit(params);
  if (diaryLimit != null) {
    return diaryLimit;
  }

  const familyTreeLimit = getFamilyTreeFieldLimit(params);
  if (familyTreeLimit != null) {
    return familyTreeLimit;
  }

  const typeLimit = getFieldMaxLength(params.field.type);
  // Дата и время имеют фиксированный формат (ДД.ММ.ГГГГ / ЧЧ:ММ), не зависят от ширины слота.
  if (params.field.type === 'date' || params.field.type === 'time') {
    return typeLimit;
  }

  const viewportWidth = params.viewportWidth ?? DEFAULT_VIEWPORT.width;
  const viewportHeight = params.viewportHeight ?? DEFAULT_VIEWPORT.height;
  const layoutLimit = computeLayoutCharacterLimit(
    params.field,
    params.lineGuideId,
    params.sourcePageNumber,
    viewportWidth,
    viewportHeight
  );

  const limits = [params.field.maxLength, typeLimit, layoutLimit].filter(
    (limit): limit is number => limit != null,
  );
  if (limits.length === 0) return undefined;
  return Math.min(...limits);
}

export function clampFieldInput(
  field: AlbumPageField,
  text: string,
  limit?: number,
  layout?: FieldClampLayoutParams,
): string {
  const measurementLimit = getMeasurementDigitLimit(field);
  if (measurementLimit != null) {
    const effectiveLimit = limit ?? measurementLimit;
    return sanitizeMeasurementInput(text, Math.min(measurementLimit, effectiveLimit));
  }

  const sanitized = sanitizeFieldInput(field.type, text);
  let result = limit == null ? sanitized : sanitized.slice(0, limit);

  if (field.templateLineCount > 1) {
    result = result.replace(/\r?\n/g, ' ');
  }

  if (
    layout &&
    field.templateLineCount > 1 &&
    result.length > 0
  ) {
    const viewportWidth = layout.viewportWidth ?? DEFAULT_VIEWPORT.width;
    const viewportHeight = layout.viewportHeight ?? DEFAULT_VIEWPORT.height;
    const slots = getLineSlotsForPage({
      lineGuideId: layout.lineGuideId,
      page: layout.sourcePageNumber,
      viewportWidth,
      viewportHeight,
    });

    if (slots.length > 0) {
      const profile = getTemplateTypographyProfile(layout.lineGuideId);
      const fontSize = profile.fixedLineFontSize ?? 16;
      result = clampTextToFieldLines({
        text: result,
        startSlotIndex: field.templateLineStart,
        lineCount: field.templateLineCount,
        slots,
        fontSize,
        lineGuideId: layout.lineGuideId,
      });
    }
  }

  return result;
}

export function countFieldCharacters(value: string): number {
  return value.length;
}
