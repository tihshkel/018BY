import { getTemplateTypographyProfile } from '@/constants/album-text-margins';
import { normalizeAlbumFontId } from '@/constants/album-fonts';
import type { AlbumPageField } from '@/types/album-page-schema';
import {
  getMeasurementDigitLimit,
  sanitizeMeasurementInput,
} from '@/utils/albumMeasurementFields';
import {
  getFieldMaxLength,
  sanitizeFieldInput,
} from '@/utils/albumFieldInput';
import { getLineSlotsForPage, resolveWeeklyFieldLineSlots } from '@/utils/textLineSlots';
import { clampTextToFieldLines } from '@/utils/templateLineText';
import { resolveMeasureTextWidth } from '@/utils/templateTextMeasure';

/** Эталонная ширина PDF-растра — лимит не зависит от ширины телефона. */
export const FIELD_LIMIT_REFERENCE_VIEWPORT = { width: 2480, height: 2480 };

const FIELD_LIMIT_PROBE_CYRILLIC =
  'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ0123456789. '.repeat(20);

type FieldLimitParams = {
  field: AlbumPageField;
  lineGuideId: string;
  sourcePageNumber: number;
  viewportWidth?: number;
  viewportHeight?: number;
  fontId?: string | null;
};

function computeLayoutCharacterLimit(
  field: AlbumPageField,
  lineGuideId: string,
  sourcePageNumber: number,
  viewportWidth: number,
  viewportHeight: number,
  fontId?: string | null,
): number | undefined {
  const slots = getLineSlotsForPage({
    lineGuideId,
    page: sourcePageNumber,
    viewportWidth,
    viewportHeight,
  });

  const fieldSlots = resolveWeeklyFieldLineSlots(
    slots,
    field.templateLineStart,
    field.templateLineCount ?? 1,
    lineGuideId,
  );

  if (fieldSlots.length === 0) return undefined;

  const profile = getTemplateTypographyProfile(lineGuideId);
  const fontSize = profile.fixedLineFontSize ?? 16;
  const measureTextWidth = resolveMeasureTextWidth(fontId);

  const clamped = clampTextToFieldLines({
    text: FIELD_LIMIT_PROBE_CYRILLIC,
    startSlotIndex: field.templateLineStart,
    lineCount: field.templateLineCount,
    slots,
    fontSize,
    lineGuideId,
    fontId: normalizeAlbumFontId(fontId),
    measureTextWidth,
  });

  return clamped.length;
}

function getKids48FieldLimit(params: FieldLimitParams): number | undefined {
  if (params.lineGuideId !== 'kids_48') {
    return undefined;
  }

  if (params.sourcePageNumber === 5 && params.field.type === 'text') {
    return params.field.maxLength ?? 28;
  }

  return undefined;
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

export function getFieldCharacterLimit(params: FieldLimitParams): number | undefined {
  const measurementLimit = getMeasurementDigitLimit(params.field);
  if (measurementLimit != null) {
    return measurementLimit;
  }

  const birthdayLimit = getBirthdayFieldLimit(params);
  if (birthdayLimit != null) {
    return birthdayLimit;
  }

  const kids48Limit = getKids48FieldLimit(params);
  if (kids48Limit != null) {
    return kids48Limit;
  }

  const typeLimit = getFieldMaxLength(params.field.type);
  if (params.field.type === 'date' || params.field.type === 'time') {
    return typeLimit;
  }

  const viewportWidth = params.viewportWidth ?? FIELD_LIMIT_REFERENCE_VIEWPORT.width;
  const viewportHeight = params.viewportHeight ?? FIELD_LIMIT_REFERENCE_VIEWPORT.height;
  const layoutLimit = computeLayoutCharacterLimit(
    params.field,
    params.lineGuideId,
    params.sourcePageNumber,
    viewportWidth,
    viewportHeight,
    params.fontId,
  );

  if (params.lineGuideId === 'kids_48' && params.field.type === 'text') {
    const limits = [params.field.maxLength, typeLimit].filter(
      (limit): limit is number => limit != null,
    );
    if (limits.length === 0) return layoutLimit;
    return Math.min(...limits);
  }

  const limits = [params.field.maxLength, typeLimit, layoutLimit].filter(
    (limit): limit is number => limit != null,
  );
  if (limits.length === 0) return undefined;
  return Math.min(...limits);
}

export function clampFieldInput(
  field: AlbumPageField,
  text: string,
  limit?: number
): string {
  const measurementLimit = getMeasurementDigitLimit(field);
  if (measurementLimit != null) {
    const effectiveLimit = limit ?? measurementLimit;
    return sanitizeMeasurementInput(text, Math.min(measurementLimit, effectiveLimit));
  }

  const sanitized = sanitizeFieldInput(field.type, text);
  if (limit == null) return sanitized;
  return sanitized.slice(0, limit);
}

export function countFieldCharacters(value: string): number {
  return value.length;
}
