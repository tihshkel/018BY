import type { AlbumPageField } from '@/types/album-page-schema';

/** Дата прорезывания у конкретного зуба (не «первая чистка» и не счётчик). */
export function isKids48TeethToothDateField(
  field: Pick<AlbumPageField, 'fieldId' | 'type'>,
  lineGuideId: string,
  sourcePageNumber: number,
): boolean {
  return (
    lineGuideId === 'kids_48' &&
    sourcePageNumber === 10 &&
    field.type === 'date' &&
    (field.fieldId.includes('_upper_') || field.fieldId.includes('_lower_'))
  );
}

/** Слоты 0–19 на p10 — линии дат у зубов на схеме челюстей. */
export function isKids48TeethToothDateSlot(
  lineGuideId: string,
  page: number,
  slotIndex: number,
): boolean {
  return lineGuideId === 'kids_48' && page === 10 && slotIndex >= 0 && slotIndex <= 19;
}
