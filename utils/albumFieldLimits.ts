import { getTemplateTypographyProfile } from '@/constants/album-text-margins';
import { normalizeAlbumFontId } from '@/constants/album-fonts';
import type { AlbumPageField, AlbumPageSchema, PageValues } from '@/types/album-page-schema';
import {
  getMeasurementDigitLimit,
  isKids48GrowthPageMeasurementField,
  sanitizeKids48GrowthMeasurementInput,
  sanitizeMeasurementInput,
} from '@/utils/albumMeasurementFields';
import {
  getFieldMaxLength,
  sanitizeFieldInput,
} from '@/utils/albumFieldInput';
import { getDefaultPageAspectRatio } from '@/utils/exportViewport';
import { getLineSlotsForPage, resolveWeeklyFieldLineSlots } from '@/utils/textLineSlots';
import { clampTextToFieldLines } from '@/utils/templateLineText';
import { resolveMeasureTextWidth } from '@/utils/templateTextMeasure';
import { usesTemplateLineTextEditing } from '@/utils/albumImages';
import { EDITOR_PAGE_VIEWPORT_WIDTH } from '@/utils/responsive';

/**
 * Эталон лимитов = coordinate space редактора/экспорта (~390×aspect).
 * Шрифт designed-альбомов фиксирован (~16pt), поэтому считать ёмкость на 2480×2480
 * завышает лимит в ~6 раз относительно превью и PDF.
 */
export function getFieldLimitReferenceViewport(lineGuideId?: string): {
  width: number;
  height: number;
} {
  const width = EDITOR_PAGE_VIEWPORT_WIDTH;
  const aspect = getDefaultPageAspectRatio({ lineGuideId });
  return { width, height: Math.round(width * aspect) };
}

/** @deprecated Prefer getFieldLimitReferenceViewport(lineGuideId). */
export const FIELD_LIMIT_REFERENCE_VIEWPORT = getFieldLimitReferenceViewport();

/** Проза с пробелами — ближе к реальному вводу, чем сплошные ЗАГЛАВНЫЕ. */
const FIELD_LIMIT_PROBE_CYRILLIC =
  'Много отдыхать и радоваться жизни хочу купить арбуз и устроить пикник на выходных. '.repeat(20);

type FieldLimitParams = {
  field: AlbumPageField;
  lineGuideId: string;
  sourcePageNumber: number;
  viewportWidth?: number;
  viewportHeight?: number;
  fontId?: string | null;
  fontSize?: number | null;
};

function resolveLayoutFontSize(lineGuideId: string, requested?: number | null): number {
  const profile = getTemplateTypographyProfile(lineGuideId);
  const base = profile.fixedLineFontSize ?? 16;
  if (requested == null) return base;
  // Дневник: лимит символов должен следовать выбранному A+/A−.
  if (
    lineGuideId === 'diary_interior_brown' ||
    lineGuideId === 'diary_interior_purple'
  ) {
    return Math.min(Math.max(requested, 10), 28);
  }
  if (profile.fixedLineFontSize != null) {
    return Math.min(requested, profile.fixedLineFontSize);
  }
  return requested;
}

function computeLayoutCharacterLimit(
  field: AlbumPageField,
  lineGuideId: string,
  sourcePageNumber: number,
  viewportWidth: number,
  viewportHeight: number,
  fontId?: string | null,
  fontSize?: number | null,
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
  const resolvedFontSize = resolveLayoutFontSize(lineGuideId, fontSize);
  const normalizedFontId = normalizeAlbumFontId(fontId);
  const measureTextWidth = resolveMeasureTextWidth(normalizedFontId);
  const clamped = clampTextToFieldLines({
    text: FIELD_LIMIT_PROBE_CYRILLIC,
    startSlotIndex: field.templateLineStart,
    lineCount: field.templateLineCount ?? 1,
    slots,
    fontSize: resolvedFontSize,
    lineGuideId,
    fontId: normalizedFontId,
    measureTextWidth,
  });

  // Небольшой запас: пробельный ввод вмещает чуть больше, чем средний probe.
  return Math.ceil(clamped.length * 1.1);
}

type LayoutClampParams = {
  field: AlbumPageField;
  text: string;
  lineGuideId: string;
  sourcePageNumber: number;
  fontId?: string | null;
  fontSize?: number | null;
};

/** Обрезает ввод по реальной вместимости line-slots (с учётом шрифта и weekly inline-tail). */
export function clampFieldInputToLineLayout(params: LayoutClampParams): string {
  const { field, text, lineGuideId, sourcePageNumber, fontId, fontSize } = params;
  if (field.type !== 'text' || !usesTemplateLineTextEditing(lineGuideId)) {
    return sanitizeFieldInput(field.type, text);
  }

  const sanitized = sanitizeFieldInput(field.type, text);
  if (!sanitized) return sanitized;

  const referenceViewport = getFieldLimitReferenceViewport(lineGuideId);
  const slots = getLineSlotsForPage({
    lineGuideId,
    page: sourcePageNumber,
    viewportWidth: referenceViewport.width,
    viewportHeight: referenceViewport.height,
  });
  if (slots.length === 0) return sanitized;

  const resolvedFontSize = resolveLayoutFontSize(lineGuideId, fontSize);
  const normalizedFontId = normalizeAlbumFontId(fontId);
  const lineCount = field.templateLineCount ?? 1;

  return clampTextToFieldLines({
    text: sanitized,
    startSlotIndex: field.templateLineStart,
    lineCount,
    slots,
    fontSize: resolvedFontSize,
    lineGuideId,
    fontId: normalizedFontId,
    measureTextWidth: resolveMeasureTextWidth(normalizedFontId),
  });
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
  if (isKids48GrowthPageMeasurementField(params.field)) {
    // «12,50» / «52,5»
    return 5;
  }

  const measurementLimit = getMeasurementDigitLimit(params.field);
  if (measurementLimit != null) {
    return measurementLimit;
  }

  const birthdayLimit = getBirthdayFieldLimit(params);
  if (birthdayLimit != null) {
    return birthdayLimit;
  }

  const typeLimit = getFieldMaxLength(params.field.type);
  if (params.field.type === 'date' || params.field.type === 'time') {
    return typeLimit;
  }

  const referenceViewport = getFieldLimitReferenceViewport(params.lineGuideId);
  const viewportWidth = params.viewportWidth ?? referenceViewport.width;
  const viewportHeight = params.viewportHeight ?? referenceViewport.height;
  const layoutLimit = computeLayoutCharacterLimit(
    params.field,
    params.lineGuideId,
    params.sourcePageNumber,
    viewportWidth,
    viewportHeight,
    params.fontId,
    params.fontSize,
  );

  if (params.lineGuideId === 'kids_48' && params.field.type === 'text') {
    // p5 семейное дерево: всегда учитываем узкую полосу у круга.
    const limits = [
      params.field.maxLength,
      typeLimit,
      ...(params.sourcePageNumber === 5 ? [layoutLimit] : []),
    ].filter((limit): limit is number => limit != null);
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
  limit?: number,
  layoutClamp?: Omit<LayoutClampParams, 'field' | 'text'>,
): string {
  if (isKids48GrowthPageMeasurementField(field)) {
    return sanitizeKids48GrowthMeasurementInput(field, text);
  }

  const measurementLimit = getMeasurementDigitLimit(field);
  if (measurementLimit != null) {
    const effectiveLimit = limit ?? measurementLimit;
    return sanitizeMeasurementInput(text, Math.min(measurementLimit, effectiveLimit));
  }

  if (layoutClamp && field.type === 'text') {
    return clampFieldInputToLineLayout({
      field,
      text,
      ...layoutClamp,
    });
  }

  const sanitized = sanitizeFieldInput(field.type, text);
  if (limit == null) return sanitized;
  return sanitized.slice(0, limit);
}

export function countFieldCharacters(value: string): number {
  return value.length;
}

/** Пересчитывает многострочные поля при смене шрифта (превью / форма). */
export function clampPageFieldValuesForLayoutFont(params: {
  schema: AlbumPageSchema;
  values: PageValues;
  lineGuideId: string;
  fontId?: string | null;
}): PageValues {
  const { schema, values, lineGuideId } = params;
  if (!usesTemplateLineTextEditing(lineGuideId)) {
    return values;
  }

  const normalizedFontId = normalizeAlbumFontId(params.fontId ?? values.textFontFamily);
  let changed = false;
  const nextFields = { ...values.fields };

  for (const field of schema.fields ?? []) {
    if (field.type !== 'text') continue;

    const raw = nextFields[field.fieldId] ?? '';
    if (!raw) continue;

    const clamped = clampFieldInput(field, raw, undefined, {
      lineGuideId,
      sourcePageNumber: schema.sourcePageNumber,
      fontId: normalizedFontId,
      fontSize: values.fieldTextStyles?.[field.fieldId]?.fontSize,
    });

    if (clamped !== raw) {
      nextFields[field.fieldId] = clamped;
      changed = true;
    }
  }

  if (!changed) return values;
  return { ...values, fields: nextFields };
}
