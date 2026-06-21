import type { NormalizedPhotoSlot } from '@/constants/photo-slots';
import { getPdfCirclePageData } from '@/utils/pdfCircleSlots';

const SLOT_LABELS: Record<string, string> = {
  child: 'Ребёнок',
  mother_great_grandmother: 'Прабабушка (мама)',
  mother_great_grandfather: 'Прадедушка (мама)',
  mother_grandmother: 'Бабушка (мама)',
  mother_grandfather: 'Дедушка (мама)',
  father_great_grandmother: 'Прабабушка (папа)',
  father_great_grandfather: 'Прадедушка (папа)',
  father_grandmother: 'Бабушка (папа)',
  father_grandfather: 'Дедушка (папа)',
};

export type FamilyTreeSlotMeta = NormalizedPhotoSlot & {
  slotIndex: number;
  label: string;
};

export function getFamilyTreeSlots(
  lineGuideId: string,
  page: number,
): FamilyTreeSlotMeta[] {
  const pageData = getPdfCirclePageData(lineGuideId, page);
  const slots = pageData?.variants?.[0]?.slots ?? pageData?.slots ?? [];

  return slots.map((slot, slotIndex) => ({
    ...slot,
    slotIndex,
    label:
      SLOT_LABELS[slot.slotId ?? ''] ??
      (slot.slotId?.startsWith('extra_') ? `Фото ${slotIndex + 1}` : `Слот ${slotIndex + 1}`),
  }));
}

export function getFamilyTreeSlotLabel(slotId?: string, slotIndex?: number): string {
  if (slotId && SLOT_LABELS[slotId]) return SLOT_LABELS[slotId];
  if (slotId?.startsWith('extra_')) return `Доп. фото ${slotIndex != null ? slotIndex + 1 : ''}`.trim();
  return slotIndex != null ? `Фото ${slotIndex + 1}` : 'Фото';
}
