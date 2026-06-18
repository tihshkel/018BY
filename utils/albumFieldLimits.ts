import { getTemplateTypographyProfile } from '@/constants/album-text-margins';
import type { AlbumPageField } from '@/types/album-page-schema';
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
      return 220;
    }
    if (params.field.fieldId.endsWith('_favorite_travel_memory_line2')) {
      return 180;
    }
  }

  if (params.sourcePageNumber === 48 && params.field.fieldId.endsWith('_letter_text')) {
    return 1600;
  }

  return undefined;
}

export function getFieldCharacterLimit(params: FieldLimitParams): number | undefined {
  const birthdayLimit = getBirthdayFieldLimit(params);
  if (birthdayLimit != null) {
    return birthdayLimit;
  }

  const viewportWidth = params.viewportWidth ?? DEFAULT_VIEWPORT.width;
  const viewportHeight = params.viewportHeight ?? DEFAULT_VIEWPORT.height;
  const typeLimit = getFieldMaxLength(params.field.type);
  const layoutLimit = computeLayoutCharacterLimit(
    params.field,
    params.lineGuideId,
    params.sourcePageNumber,
    viewportWidth,
    viewportHeight
  );

  if (layoutLimit == null) return typeLimit;
  if (typeLimit == null) return layoutLimit;
  return Math.min(typeLimit, layoutLimit);
}

export function clampFieldInput(
  field: AlbumPageField,
  text: string,
  limit?: number
): string {
  const sanitized = sanitizeFieldInput(field.type, text);
  if (limit == null) return sanitized;
  return sanitized.slice(0, limit);
}

export function countFieldCharacters(value: string): number {
  return value.length;
}
