import type { AlbumPageField } from '@/types/album-page-schema';
import { formatAlbumDateDayMonth } from '@/utils/albumDateFormat';

/** «Дата поступления в дородовое отделение» — слот 7 на анкете родов. */
export const PREGNANCY_BIRTH_QUESTIONNAIRE_ADMISSION_SLOT_INDEX = 7;

const PREGNANCY_BIRTH_PINK_BLOCK_FIELD_SUFFIXES = [
  '_baby_weight',
  '_baby_height',
  '_weekday',
  '_birth_time',
  '_delivery_type',
] as const;

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

/** Вес / рост / день недели / время / Ер·Кс — центрировать в прямоугольнике. */
export function isPregnancyBirthQuestionnairePinkBlockField(
  field: Pick<AlbumPageField, 'fieldId' | 'templateLineStart'>,
  lineGuideId: string,
  sourcePageNumber: number,
): boolean {
  const isBirthPage =
    (lineGuideId === 'pregnancy_60' && sourcePageNumber === 52) ||
    (lineGuideId === 'pregnancy_a5' && sourcePageNumber === 44);
  if (!isBirthPage) return false;
  const start = field.templateLineStart;
  if (start != null && start >= 8 && start <= 12) return true;
  return PREGNANCY_BIRTH_PINK_BLOCK_FIELD_SUFFIXES.some((suffix) =>
    field.fieldId.endsWith(suffix),
  );
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
  // Зубные даты — полные ДД.ММ.ГГГГ (компактный шрифт на схеме челюстей).
  if (isPregnancyBirthQuestionnaireAdmissionDateSlot(lineGuideId, page, slotIndex)) {
    return formatPregnancyBirthQuestionnaireAdmissionDate(text);
  }
  return text;
}
