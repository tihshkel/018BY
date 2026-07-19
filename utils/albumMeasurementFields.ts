import type { AlbumPageField } from '@/types/album-page-schema';

const MONTHLY_GROWTH_FIELD_RE = /_month_\d{2}_(height|weight)$/;
const WEIGHT_HEIGHT_FIELD_ID_RE =
  /(?:^|_)(weight(?:_before|_gain)?|height|birthHeight|baby_height)(?:_|$)/;

const POST_BIRTH_WEIGHT_LABEL = 'Вес';

function matchesWeightHeightFieldId(fieldId: string): boolean {
  if (MONTHLY_GROWTH_FIELD_RE.test(fieldId)) return true;
  if (fieldId.endsWith('_baby_weight')) return true;
  return WEIGHT_HEIGHT_FIELD_ID_RE.test(fieldId);
}

function matchesWeightHeightLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  if (normalized.includes('рост')) return true;
  if (normalized.includes('вес')) return true;
  return false;
}

/** Обхват животика на недельных страницах — до 4 цифр. */
export function isBellyCircumferenceField(field: AlbumPageField): boolean {
  return field.fieldId.endsWith('_belly');
}

/** Вес малыша в анкете родов (граммы) — до 4 цифр. */
export function isPostBirthWeightField(field: AlbumPageField): boolean {
  return field.fieldId.endsWith('_baby_weight') && field.label.trim() === POST_BIRTH_WEIGHT_LABEL;
}

export function isWeightOrHeightField(field: AlbumPageField): boolean {
  if (matchesWeightHeightFieldId(field.fieldId)) return true;
  return matchesWeightHeightLabel(field.label);
}

/** Поле веса (не рост) — допускаем 4 цифры и одну запятую (36,4 / 4444). */
export function isWeightMeasurementField(field: AlbumPageField): boolean {
  if (isBellyCircumferenceField(field)) return false;
  if (isPostBirthWeightField(field)) return true;
  const id = field.fieldId.toLowerCase();
  if (id.includes('height') || id.includes('рост')) return false;
  if (id.includes('weight') || id.includes('вес') || id.endsWith('_weight')) return true;
  return field.label.trim().toLowerCase().includes('вес');
}

/** Фиксированный лимит цифр для полей роста/веса; undefined — обычные правила. */
export function getMeasurementDigitLimit(field: AlbumPageField): number | undefined {
  if (isBellyCircumferenceField(field)) return 4;
  if (!isWeightOrHeightField(field)) return undefined;
  if (isPostBirthWeightField(field)) return 4;
  if (isWeightMeasurementField(field)) return 4;
  return 3;
}

/**
 * Вес: до 4 цифр и одна `,`/`.` (36,4 или 4444).
 * Рост/обхват: только цифры.
 */
export function sanitizeMeasurementInput(
  text: string,
  digitLimit: number,
  allowDecimal = false,
): string {
  if (!allowDecimal) {
    return text.replace(/\D/g, '').slice(0, digitLimit);
  }
  let digits = 0;
  let sawSep = false;
  let out = '';
  for (const ch of text.replace(/\./g, ',')) {
    if (ch >= '0' && ch <= '9') {
      if (digits >= digitLimit) continue;
      out += ch;
      digits += 1;
      continue;
    }
    if (ch === ',' && !sawSep && digits > 0) {
      out += ',';
      sawSep = true;
    }
  }
  return out;
}
