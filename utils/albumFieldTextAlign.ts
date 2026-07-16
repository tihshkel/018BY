import type { AlbumPageField } from '@/types/album-page-schema';
import type { AnnotationTextAlign } from '@/types/annotation';
import {
  isBellyCircumferenceField,
  isWeightOrHeightField,
} from '@/utils/albumMeasurementFields';

export type FieldTextAlign = AnnotationTextAlign;

/** Короткие значения на линии макета: дата, время, число, вес/рост, однострочный текст. */
export function supportsFieldTextAlign(field: AlbumPageField): boolean {
  if (field.type === 'radio' || field.type === 'checkbox') return false;
  if ((field.templateLineCount ?? 1) > 1) return false;

  if (field.type === 'date' || field.type === 'time' || field.type === 'number') {
    return true;
  }
  if (isWeightOrHeightField(field) || isBellyCircumferenceField(field)) {
    return true;
  }
  return field.type === 'text';
}

export function resolveFieldTextAlign(
  fieldId: string,
  map: Record<string, FieldTextAlign> | undefined,
): FieldTextAlign {
  return map?.[fieldId] ?? 'left';
}
