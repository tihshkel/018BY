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
  extra_01: 'Мама',
  extra_02: 'Ещё родственник (мама)',
  extra_03: 'Папа',
  extra_04: 'Ещё родственник (папа)',
  extra_05: 'Ещё родственник (папа)',
  extra_06: 'Ещё родственник',
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

/**
 * Калибровка по жёлтым кругам design PNG (page_005_design.png, CC + raycast).
 * Старые +X на ветке папы (до +0.044) сдвигали фото вправо — слева оставался жёлтый серп.
 * diameter = detectedYellowDiameter × 1.06 (перекрывает заливку и белую обводку).
 */
type FamilyTreeViewportCalibration = {
  dx: number;
  dy: number;
  diameter: number;
};

const FAMILY_TREE_VIEWPORT_CALIBRATION: Readonly<
  Record<string, FamilyTreeViewportCalibration>
> = {
  child: { dx: -0.001, dy: 0.0002, diameter: 0.1531 },
  mother_great_grandmother: { dx: -0.001, dy: -0.0001, diameter: 0.1656 },
  mother_great_grandfather: { dx: -0.0011, dy: 0, diameter: 0.1638 },
  mother_grandmother: { dx: -0.001, dy: -0.0001, diameter: 0.1496 },
  mother_grandfather: { dx: -0.0011, dy: -0.0001, diameter: 0.1407 },
  father_great_grandmother: { dx: -0.0012, dy: 0.0001, diameter: 0.1496 },
  father_great_grandfather: { dx: -0.0013, dy: 0, diameter: 0.1638 },
  father_grandmother: { dx: -0.0011, dy: 0, diameter: 0.1496 },
  father_grandfather: { dx: -0.0012, dy: -0.0001, diameter: 0.1549 },
  extra_01: { dx: -0.001, dy: -0.0002, diameter: 0.1318 },
  extra_02: { dx: -0.001, dy: -0.0002, diameter: 0.1211 },
  extra_03: { dx: -0.0012, dy: -0.0001, diameter: 0.1478 },
  extra_04: { dx: -0.0012, dy: -0.0001, diameter: 0.1496 },
  extra_05: { dx: -0.0012, dy: -0.0002, diameter: 0.1407 },
  extra_06: { dx: -0.0011, dy: -0.0001, diameter: 0.1407 },
};

/** Fallback: слегка левее PDF-слота + умеренный bleed (без правого «уезда»). */
const FAMILY_TREE_DEFAULT_DIAMETER_BLEED = 1.04;
const FAMILY_TREE_DEFAULT_X_NUDGE = -0.0011;

/** Диаметр слота в схеме дерева (норм. 0–1 относительно кадра). */
export function getFamilyTreePickerSlotDiameterNorm(slot: NormalizedPhotoSlot): number {
  const calibrated = slot.slotId ? FAMILY_TREE_VIEWPORT_CALIBRATION[slot.slotId] : undefined;
  if (calibrated) return calibrated.diameter;
  return Math.max(slot.width, slot.height) * FAMILY_TREE_DEFAULT_DIAMETER_BLEED;
}

/** Калибровка только для превью/экспорта; picker дерева использует сырые слоты. */
export function refineFamilyTreeSlotForViewport(
  lineGuideId: string,
  page: number,
  slot: NormalizedPhotoSlot,
): NormalizedPhotoSlot {
  if (lineGuideId !== 'kids_48' || page !== KIDS_FAMILY_TREE_PAGE || slot.shape !== 'circle') {
    return slot;
  }

  const calibrated = slot.slotId ? FAMILY_TREE_VIEWPORT_CALIBRATION[slot.slotId] : undefined;
  const viewportX = slot.x + (calibrated?.dx ?? FAMILY_TREE_DEFAULT_X_NUDGE);
  const viewportY = slot.y + (calibrated?.dy ?? 0);
  const viewportDiameter =
    calibrated?.diameter ?? Math.max(slot.width, slot.height) * FAMILY_TREE_DEFAULT_DIAMETER_BLEED;

  return {
    ...slot,
    x: viewportX,
    y: viewportY,
    width: viewportDiameter,
    height: viewportDiameter,
  };
}
