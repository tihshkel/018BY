import type { AlbumPageField } from '@/types/album-page-schema';

const MONTHLY_GROWTH_FIELD_RE = /_month_\d{2}_(height|weight)$/;
const KIDS_48_GROWTH_PAGE_FIELD_RE = /^kids_48_p11_month_\d{2}_(height|weight)$/;
const WEIGHT_HEIGHT_FIELD_ID_RE =
  /(?:^|_)(weight(?:_before|_gain)?|height|birthHeight|baby_height)(?:_|$)/;

function matchesWeightHeightFieldId(fieldId: string): boolean {
  if (MONTHLY_GROWTH_FIELD_RE.test(fieldId)) return true;
  if (fieldId.endsWith('_baby_weight')) return true;
  if (fieldId.endsWith('birthWeight') || fieldId.includes('_birthWeight')) return true;
  return WEIGHT_HEIGHT_FIELD_ID_RE.test(fieldId);
}

function matchesWeightHeightLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  // Word-ish match: «рост» / «вес» (вес, веса, весу…) but not «веселый», «весна».
  if (/(^|[^а-яёa-z])рост([^а-яёa-z]|$)/i.test(normalized)) return true;
  if (/(^|[^а-яёa-z])вес(а|у|ом|е)?([^а-яёa-z]|$)/i.test(normalized)) return true;
  return false;
}

/** Обхват животика на недельных страницах — до 4 цифр. */
export function isBellyCircumferenceField(field: AlbumPageField): boolean {
  return field.fieldId.endsWith('_belly');
}

/**
 * Вес младенца в граммах — до 4 цифр.
 * Ожидаемый/родовой вес (`*_baby_weight`), birthday birthWeight, kids p1.
 */
export function isBabyGramsWeightField(field: AlbumPageField): boolean {
  const { fieldId } = field;
  if (fieldId.endsWith('_baby_weight')) return true;
  if (fieldId.endsWith('birthWeight') || fieldId.includes('_birthWeight')) return true;
  if (fieldId === 'kids_48_p1_weight') return true;
  return false;
}

/** @deprecated Используйте isBabyGramsWeightField */
export function isPostBirthWeightField(field: AlbumPageField): boolean {
  return isBabyGramsWeightField(field);
}

export function isWeightOrHeightField(field: AlbumPageField): boolean {
  if (matchesWeightHeightFieldId(field.fieldId)) return true;
  return matchesWeightHeightLabel(field.label);
}

/**
 * kids_48 p11 «Рост и вес до года» — кг/см с десятичной запятой (например 3,50).
 * Не путать с граммами на p1.
 */
export function isKids48GrowthPageMeasurementField(field: AlbumPageField): boolean {
  return KIDS_48_GROWTH_PAGE_FIELD_RE.test(field.fieldId);
}

/** Фиксированный лимит цифр для полей роста/веса; undefined — обычные правила. */
export function getMeasurementDigitLimit(field: AlbumPageField): number | undefined {
  if (isBellyCircumferenceField(field)) return 4;
  if (!isWeightOrHeightField(field)) return undefined;
  if (isKids48GrowthPageMeasurementField(field)) return undefined;
  if (isBabyGramsWeightField(field)) return 4;
  return 3;
}

export function sanitizeMeasurementInput(text: string, digitLimit: number): string {
  return text.replace(/\D/g, '').slice(0, digitLimit);
}

/**
 * Рост/вес до года: цифры + одна запятая (точка → запятая).
 * Вес: до 2 знаков до и после (12,50). Рост: до 3 до запятой и 1 после (52,5).
 */
export function sanitizeKids48GrowthMeasurementInput(
  field: AlbumPageField,
  text: string,
): string {
  const isWeight = field.fieldId.endsWith('_weight');
  const maxBefore = isWeight ? 2 : 3;
  const maxAfter = isWeight ? 2 : 1;

  let result = '';
  let hasComma = false;
  let before = 0;
  let after = 0;

  for (const char of text) {
    if (char >= '0' && char <= '9') {
      if (!hasComma) {
        if (before >= maxBefore) continue;
        before += 1;
        result += char;
      } else {
        if (after >= maxAfter) continue;
        after += 1;
        result += char;
      }
      continue;
    }
    if ((char === ',' || char === '.') && !hasComma && before > 0) {
      hasComma = true;
      result += ',';
    }
  }

  return result;
}
