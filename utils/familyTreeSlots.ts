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

const KIDS_FAMILY_TREE_PAGE = 5;

/** Чуть больше диаметра — перекрыть персиковое кольцо на PNG/PDF (линия мамы). */
const FAMILY_TREE_MOTHER_VIEWPORT_DIAMETER_BLEED = 1.1;

/** Линия папы — диаметр чуть больше PDF-слота, чтобы закрыть жёлтое кольцо. */
const FAMILY_TREE_FATHER_VIEWPORT_DIAMETER_SCALE = 1.05;

const FAMILY_TREE_CHILD_VIEWPORT_DIAMETER_SCALE = 0.98;

/** Форма выбора фото — те же пропорции, что в превью. */
const FAMILY_TREE_FATHER_PICKER_DIAMETER_SCALE = 0.9;

const FAMILY_TREE_CHILD_PICKER_DIAMETER_SCALE = 0.96;

const FAMILY_TREE_FATHER_VIEWPORT_DIAMETER_SCALE_BY_SLOT: Readonly<Record<string, number>> = {
  father_great_grandmother: 1.06,
  father_great_grandfather: 1.04,
  father_grandmother: 1.07,
  father_grandfather: 1.04,
  extra_03: 1.07,
  extra_04: 1.04,
  extra_05: 1.06,
};

function resolveFamilyTreeViewportDiameter(slot: NormalizedPhotoSlot): number {
  const base = Math.max(slot.width, slot.height);
  if (slot.branch === 'father') {
    const scale =
      (slot.slotId && FAMILY_TREE_FATHER_VIEWPORT_DIAMETER_SCALE_BY_SLOT[slot.slotId]) ??
      FAMILY_TREE_FATHER_VIEWPORT_DIAMETER_SCALE;
    return base * scale;
  }
  if (slot.branch === 'child') {
    return base * FAMILY_TREE_CHILD_VIEWPORT_DIAMETER_SCALE;
  }
  return base * FAMILY_TREE_MOTHER_VIEWPORT_DIAMETER_BLEED;
}

/** Диаметр слота в схеме дерева (норм. 0–1 относительно кадра). */
export function getFamilyTreePickerSlotDiameterNorm(slot: NormalizedPhotoSlot): number {
  const base = Math.max(slot.width, slot.height);
  if (slot.branch === 'father') {
    return base * FAMILY_TREE_FATHER_PICKER_DIAMETER_SCALE;
  }
  if (slot.branch === 'child') {
    return base * FAMILY_TREE_CHILD_PICKER_DIAMETER_SCALE;
  }
  return base;
}

/**
 * Покруговая калибровка X (норм. 0–1): жёлтое кольцо макета смещено относительно PDF-слота.
 */
const FAMILY_TREE_VIEWPORT_X_OFFSET: Readonly<Record<string, number>> = {
  child: 0,
  extra_06: 0.006,
  mother_great_grandmother: 0,
  mother_great_grandfather: 0,
  mother_grandmother: 0,
  mother_grandfather: 0,
  extra_01: 0,
  extra_02: 0,
  father_great_grandmother: -0.003,
  extra_05: -0.002,
  father_grandmother: 0.014,
  extra_03: 0.016,
  extra_04: 0.012,
  father_grandfather: 0.028,
  father_great_grandfather: 0.04,
};

/** Покруговой сдвиг Y под жёлтое кольцо макета. */
const FAMILY_TREE_VIEWPORT_Y_OFFSET: Readonly<Record<string, number>> = {
  child: 0,
  extra_06: 0.003,
  mother_great_grandmother: 0,
  mother_great_grandfather: 0,
  mother_grandmother: 0,
  mother_grandfather: 0,
  extra_01: 0,
  extra_02: 0,
  father_great_grandmother: 0.002,
  father_great_grandfather: 0.003,
  father_grandmother: 0.005,
  father_grandfather: 0.006,
  extra_03: 0.006,
  extra_04: 0.004,
  extra_05: 0.003,
};

function resolveFamilyTreeViewportXOffset(slot: NormalizedPhotoSlot): number {
  if (slot.slotId && slot.slotId in FAMILY_TREE_VIEWPORT_X_OFFSET) {
    return FAMILY_TREE_VIEWPORT_X_OFFSET[slot.slotId]!;
  }
  if (slot.branch === 'father') {
    if (slot.x >= 0.82) return 0.036;
    if (slot.x >= 0.75) return 0.018;
    if (slot.x >= 0.64) return 0.006;
    return 0;
  }
  return 0;
}

function resolveFamilyTreeViewportYOffset(slot: NormalizedPhotoSlot): number {
  if (slot.slotId && slot.slotId in FAMILY_TREE_VIEWPORT_Y_OFFSET) {
    return FAMILY_TREE_VIEWPORT_Y_OFFSET[slot.slotId]!;
  }
  if (slot.branch === 'father') return 0.004;
  return 0;
}

/** Схема выбора фото — сдвиг и размер как в превью (без bleed мамы). */
export function refineFamilyTreeSlotForPicker(
  lineGuideId: string,
  page: number,
  slot: NormalizedPhotoSlot,
): NormalizedPhotoSlot {
  if (lineGuideId !== 'kids_48' || page !== KIDS_FAMILY_TREE_PAGE || slot.shape !== 'circle') {
    return slot;
  }
  const diameter = getFamilyTreePickerSlotDiameterNorm(slot);
  return {
    ...slot,
    x: slot.x + resolveFamilyTreeViewportXOffset(slot),
    y: slot.y + resolveFamilyTreeViewportYOffset(slot),
    width: diameter,
    height: diameter,
  };
}

/** Калибровка только для превью/экспорта. */
export function refineFamilyTreeSlotForViewport(
  lineGuideId: string,
  page: number,
  slot: NormalizedPhotoSlot,
): NormalizedPhotoSlot {
  if (lineGuideId !== 'kids_48' || page !== KIDS_FAMILY_TREE_PAGE || slot.shape !== 'circle') {
    return slot;
  }

  const viewportX = slot.x + resolveFamilyTreeViewportXOffset(slot);
  const viewportY = slot.y + resolveFamilyTreeViewportYOffset(slot);
  const viewportDiameter = resolveFamilyTreeViewportDiameter(slot);

  return {
    ...slot,
    x: viewportX,
    y: viewportY,
    width: viewportDiameter,
    height: viewportDiameter,
  };
}
