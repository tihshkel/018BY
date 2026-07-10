import type { AlbumPageField } from '@/types/album-page-schema';
import { formatAlbumDateDayMonth } from '@/utils/albumDateFormat';

/** «Дата поступления в дородовое отделение» — слот 7 на анкете родов. */
export const PREGNANCY_BIRTH_QUESTIONNAIRE_ADMISSION_SLOT_INDEX = 7;

export function isPregnancyBirthQuestionnaireAdmissionDateField(
  field: Pick<AlbumPageField, 'fieldId' | 'type'>,
  lineGuideId: string,
  sourcePageNumber: number,
): boolean {
  return (
    field.type === 'date' &&
    field.fieldId.endsWith('_admission_date') &&
    lineGuideId === 'pregnancy_a5' &&
    sourcePageNumber === 44
  );
}

export function isPregnancyBirthQuestionnaireAdmissionDateSlot(
  lineGuideId: string,
  page: number,
  slotIndex: number,
): boolean {
  if (slotIndex !== PREGNANCY_BIRTH_QUESTIONNAIRE_ADMISSION_SLOT_INDEX) return false;
  return lineGuideId === 'pregnancy_a5' && page === 44;
}

/** На макете только день и месяц (21.05), год хранится в значении поля. */
export function formatPregnancyBirthQuestionnaireAdmissionDate(value: string): string {
  return formatAlbumDateDayMonth(value);
}

export function formatTemplateLineSlotDisplayText(
  text: string,
  lineGuideId: string | undefined,
  page: number | undefined,
  slotIndex: number | undefined,
): string {
  if (!text || !lineGuideId || page == null || slotIndex == null) return text;
  if (isPregnancyBirthQuestionnaireAdmissionDateSlot(lineGuideId, page, slotIndex)) {
    return formatPregnancyBirthQuestionnaireAdmissionDate(text);
  }
  return text;
}
