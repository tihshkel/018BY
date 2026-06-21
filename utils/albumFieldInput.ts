import type { KeyboardTypeOptions } from 'react-native';

import type { FieldType } from '@/types/album-page-schema';

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
  switch (type) {
    case 'date':
      return sanitizeDateInput(text);
    case 'time':
      return sanitizeTimeInput(text);
    case 'number':
      return sanitizeNumberInput(text);
    default:
      return text;
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
