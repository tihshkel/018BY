import type { KeyboardTypeOptions } from 'react-native';

import type { AlbumPageField, FieldType } from '@/types/album-page-schema';
import {
  getMeasurementDigitLimit,
  isKids48GrowthPageMeasurementField,
} from '@/utils/albumMeasurementFields';
import { normalizeAlbumUserText } from '@/utils/normalizeAlbumUserText';

export function sanitizeDateInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

export function sanitizeTimeInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 4);

  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function sanitizeNumberInput(text: string): string {
  let result = '';
  let hasSeparator = false;

  for (const char of text) {
    if (char >= '0' && char <= '9') {
      result += char;
      continue;
    }

    if ((char === '.' || char === ',') && !hasSeparator) {
      result += char === ',' ? '.' : char;
      hasSeparator = true;
    }
  }

  return result;
}

export function sanitizeFieldInput(type: FieldType, text: string): string {
  const normalized = normalizeAlbumUserText(text);
  switch (type) {
    case 'date':
      return sanitizeDateInput(normalized);
    case 'time':
      return sanitizeTimeInput(normalized);
    case 'number':
      return sanitizeNumberInput(normalized);
    default:
      return normalized;
  }
}

export function getFieldMaxLength(type: FieldType): number | undefined {
  switch (type) {
    case 'date':
      return 10;
    case 'time':
      return 5;
    default:
      return undefined;
  }
}

export function getFieldKeyboardType(type: FieldType): KeyboardTypeOptions {
  switch (type) {
    case 'date':
    case 'time':
      return 'number-pad';
    case 'number':
      return 'decimal-pad';
    default:
      return 'default';
  }
}

export function getFieldKeyboardTypeForField(field: AlbumPageField): KeyboardTypeOptions {
  if (isKids48GrowthPageMeasurementField(field)) {
    return 'decimal-pad';
  }
  if (getMeasurementDigitLimit(field) != null) {
    return 'number-pad';
  }
  return getFieldKeyboardType(field.type);
}

/** HTML/RN inputMode: numeric режет запятую/точку — для кг/см нужен decimal. */
export function getFieldInputMode(
  field: AlbumPageField,
): 'text' | 'numeric' | 'decimal' {
  if (isKids48GrowthPageMeasurementField(field)) {
    return 'decimal';
  }
  if (getMeasurementDigitLimit(field) != null) {
    return 'numeric';
  }
  if (field.type === 'number') {
    return 'decimal';
  }
  if (field.type === 'time' || field.type === 'date') {
    return 'numeric';
  }
  return 'text';
}
