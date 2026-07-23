import type { AlbumPageField, AlbumPageSchema } from '@/types/album-page-schema';

/**
 * kids_48 p10 — порядок полей в форме (01→05 слева, 06→10 справа, затем низ)
 * → индексы line-slots по макету (сверху вниз у каждой стороны).
 */
export const KIDS_48_TEETH_FIELD_SLOT_INDEX: readonly number[] = [
  8, 6, 4, 2, 1,
  3, 5, 7, 9, 0,
  19, 16, 14, 12, 10,
  11, 13, 15, 17, 18,
];

export const KIDS_48_TEETH_BRUSHING_SLOT_INDEX = 20;
export const KIDS_48_TEETH_COUNT_SLOT_INDEX = 21;

export function isKids48TeethDateField(field: AlbumPageField): boolean {
  return (
    field.type === 'date' &&
    (field.fieldId.includes('_upper_') || field.fieldId.includes('_lower_'))
  );
}

export function resolveKids48TeethTemplateLineStart(
  field: AlbumPageField,
  schema: Pick<AlbumPageSchema, 'sourcePageNumber' | 'pageType' | 'fields'>,
  lineGuideId: string,
): number {
  const fallback = field.templateLineStart ?? 0;
  if (lineGuideId !== 'kids_48' || schema.sourcePageNumber !== 10 || schema.pageType !== 'teeth') {
    return fallback;
  }

  if (field.fieldId.endsWith('_first_brushing')) {
    return KIDS_48_TEETH_BRUSHING_SLOT_INDEX;
  }
  if (field.fieldId.endsWith('_teeth_count')) {
    return KIDS_48_TEETH_COUNT_SLOT_INDEX;
  }

  if (!isKids48TeethDateField(field)) {
    return fallback;
  }

  const teethFields = (schema.fields ?? []).filter(isKids48TeethDateField);
  const teethIndex = teethFields.findIndex((item) => item.fieldId === field.fieldId);
  if (teethIndex < 0) return fallback;

  return KIDS_48_TEETH_FIELD_SLOT_INDEX[teethIndex] ?? fallback;
}
