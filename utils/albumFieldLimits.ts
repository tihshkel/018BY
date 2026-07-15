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

/** «Кем я хочу стать» — две строки ответа (коричневый/фиолетовый дневник). */
export const DIARY_BROWN_CAREER_WISH_MAX_LENGTH = 54;

/** «Самое сокровенное» на стр. «Мечты» коричневого дневника. */
export const DIARY_BROWN_DREAMS_SECRET_MAX_LENGTH = 10;

/** «Будущий питомец» — запасной минимум, если слот OCR слишком узкий. */
export const DIARY_BROWN_FUTURE_PET_MIN_LENGTH = 72;

/** «Одежда и стиль» стр. 26: удобная одежда / сочетания цветов. */
export const DIARY_BROWN_STYLE_SHORT_MAX_LENGTH = 40;

/** Два полных ряда (дома, праздник, школа и т.д.). */
export const DIARY_BROWN_STYLE_TWO_LINE_MAX_LENGTH = 50;

/** «Украшения»: хвост + 2 полные строки (~6+36+36). */
export const DIARY_BROWN_STYLE_JEWELRY_MAX_LENGTH = 78;

/** @deprecated используйте DIARY_BROWN_STYLE_SHORT_MAX_LENGTH */
export const DIARY_BROWN_STYLE_ANSWER_MAX_LENGTH = DIARY_BROWN_STYLE_SHORT_MAX_LENGTH;

/** Анкета для друзей: Instagram / VK / TikTok — ники до 15 символов. */
export const PURPLE_FRIEND_SOCIAL_MAX_LENGTH = 15;

const PURPLE_FRIEND_SOCIAL_PAGES = new Set([28, 29, 30, 31, 32, 33]);

function getDiaryFieldLimit(params: FieldLimitParams): number | undefined {
  if (
    (params.lineGuideId === 'diary_interior_brown' &&
      params.sourcePageNumber === 6 &&
      params.field.fieldId === 'diary_interior_brown_p6_careerWish') ||
    (params.lineGuideId === 'diary_interior_purple' &&
      params.sourcePageNumber === 5 &&
      params.field.fieldId === 'diary_interior_purple_p5_careerWish')
  ) {
    return DIARY_BROWN_CAREER_WISH_MAX_LENGTH;
  }

  if (
    params.lineGuideId === 'diary_interior_brown' &&
    params.sourcePageNumber === 15 &&
    params.field.fieldId.endsWith('_secretMost')
  ) {
    return DIARY_BROWN_DREAMS_SECRET_MAX_LENGTH;
  }

  if (
    params.lineGuideId === 'diary_interior_brown' &&
    params.sourcePageNumber === 26 &&
    params.field.type === 'text'
  ) {
    if (
      params.field.fieldId.endsWith('_comfortableClothes') ||
      params.field.fieldId.endsWith('_favoriteColorCombos')
    ) {
      return DIARY_BROWN_STYLE_SHORT_MAX_LENGTH;
    }
    if (params.field.fieldId.endsWith('_wearsJewelry')) {
      return DIARY_BROWN_STYLE_JEWELRY_MAX_LENGTH;
    }
    return DIARY_BROWN_STYLE_TWO_LINE_MAX_LENGTH;
  }

  if (
    params.lineGuideId === 'diary_interior_purple' &&
    PURPLE_FRIEND_SOCIAL_PAGES.has(params.sourcePageNumber) &&
    (params.field.fieldId.endsWith('_instagram') ||
      params.field.fieldId.endsWith('_vk') ||
      params.field.fieldId.endsWith('_tiktok'))
  ) {
    return PURPLE_FRIEND_SOCIAL_MAX_LENGTH;
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

  // Питомцы: не давать микро-хвосту OCR сжать лимит «будущего питомца» до 2–3 символов.
  const futurePetFloor =
    params.field.fieldId.endsWith('_futurePet') &&
    ((params.lineGuideId === 'diary_interior_brown' && params.sourcePageNumber === 17) ||
      (params.lineGuideId === 'diary_interior_purple' && params.sourcePageNumber === 10))
      ? DIARY_BROWN_FUTURE_PET_MIN_LENGTH
      : undefined;

  const limits = [params.field.maxLength, typeLimit, layoutLimit, futurePetFloor].filter(
    (limit): limit is number => limit != null,
  );
  if (limits.length === 0) return undefined;
  // Floor для futurePet — через Math.max, остальное через Math.min.
  if (futurePetFloor != null) {
    const capped = [params.field.maxLength, typeLimit, layoutLimit].filter(
      (limit): limit is number => limit != null,
    );
    const base = capped.length > 0 ? Math.min(...capped) : futurePetFloor;
    return Math.max(base, futurePetFloor);
  }
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
    result = result.replace(/[\r\n\u2028\u2029]+/g, ' ').replace(/[ \t]+/g, ' ');
  }

  // Стр. 26 «Одежда и стиль»: счётчик 40–55, не резать повторно по узким хвостам OCR.
  // Без .trim() — иначе пробел в конце слова сразу пропадает при наборе.
  if (
    layout &&
    layout.lineGuideId === 'diary_interior_brown' &&
    layout.sourcePageNumber === 26 &&
    field.type === 'text'
  ) {
    return result.replace(/[\r\n\u2028\u2029]+/g, ' ').replace(/[ \t]+/g, ' ');
  }

  if (layout && field.templateLineCount >= 1 && result.length > 0) {
    // Вместимость в символах не должна зависеть от ширины окна формы
    // (fontSize фиксирован, а ширина слота в px масштабируется с viewport).
    const viewportWidth = DEFAULT_VIEWPORT.width;
    const viewportHeight = DEFAULT_VIEWPORT.height;
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
