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

/** Фиксированный лимит цифр для полей роста/веса; undefined — обычные правила. */
export function getMeasurementDigitLimit(field: AlbumPageField): number | undefined {
  if (isBellyCircumferenceField(field)) return 4;
  if (!isWeightOrHeightField(field)) return undefined;
  if (isPostBirthWeightField(field)) return 4;
  return 3;
}

export function sanitizeMeasurementInput(text: string, digitLimit: number): string {
  return text.replace(/\D/g, '').slice(0, digitLimit);
}
