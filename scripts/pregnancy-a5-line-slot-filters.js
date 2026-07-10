/**
 * Remove line-slots that are photo frame strokes (wide rules inside the placeholder).
 * Does not remove text fields near the photo band edges.
 */

const fs = require('fs');
const path = require('path');

const PHOTO_SLOTS_PATH = path.join(__dirname, '..', 'constants/generated/pdf-photo-slots.json');

const PHOTO_INSET_MM = 2;
const PAGE_MM = 210;
const MIN_FRAME_WIDTH_NORM = 0.75;

function isPregnancyA5WeeklyPage(pageNo) {
  const page = Number(pageNo);
  return (
    (page >= 5 && page <= 13) ||
    (page >= 15 && page <= 28) ||
    (page >= 30 && page <= 43)
  );
}

function loadPhotoSlots() {
  if (!fs.existsSync(PHOTO_SLOTS_PATH)) return {};
  return JSON.parse(fs.readFileSync(PHOTO_SLOTS_PATH, 'utf8')).pregnancy_a5 ?? {};
}

function centerSlotToRect(slot) {
  return {
    top: slot.y - slot.height / 2,
    bottom: slot.y + slot.height / 2,
    left: slot.x,
    right: slot.x + slot.width,
  };
}

function photoRectForPage(photoSlots, pageKey) {
  const entry = photoSlots[pageKey];
  const primary = entry?.variants?.[0]?.slots?.[0];
  if (!primary) return null;

  const inset = PHOTO_INSET_MM / PAGE_MM;
  const rect = centerSlotToRect(primary);
  return {
    top: rect.top + inset,
    bottom: rect.bottom - inset,
    left: rect.left + inset,
    right: rect.right - inset,
  };
}

/** Photo frame stroke: wide rule in the upper/middle part of the placeholder. */
function isPhotoFrameLineSlot(lineSlot, photoRect) {
  if (!photoRect) return false;
  if (lineSlot.width < MIN_FRAME_WIDTH_NORM) return false;

  const centerY = lineSlot.y;
  if (centerY < photoRect.top - 0.015) return false;
  if (centerY > photoRect.bottom - 0.04) return false;
  if (centerY > 0.72) return false;

  return true;
}

/**
 * Стр. 32 — единственная weekly-страница с коротким декоративным штрихом возле
 * подписи «Мой малыш как…». Это не поле ввода: его ошибочное попадание в slots
 * делало из него третью строку «Мои ощущения» и уводило текст при PDF-экспорте.
 */
function isPregnancyA5DecorativeBottomStroke(pageKey, lineSlot) {
  return (
    Number(pageKey) === 32 &&
    lineSlot.y > 0.9 &&
    lineSlot.width < 0.1 &&
    lineSlot.x > 0.25 &&
    lineSlot.x < 0.4
  );
}

function filterPregnancyA5LineSlots(albumSlots, albumGuides, photoSlots = loadPhotoSlots()) {
  const slots = { ...albumSlots };
  const guides = { ...albumGuides };

  for (const pageKey of Object.keys(slots)) {
    if (!isPregnancyA5WeeklyPage(pageKey)) continue;

    const photoRect = photoRectForPage(photoSlots, pageKey);
    if (!photoRect) continue;

    const pageSlots = slots[pageKey] ?? [];
    const filtered = pageSlots.filter(
      (slot) =>
        !isPhotoFrameLineSlot(slot, photoRect) &&
        !isPregnancyA5DecorativeBottomStroke(pageKey, slot),
    );
    if (filtered.length === pageSlots.length) continue;

    slots[pageKey] = filtered;
    guides[pageKey] = filtered.map((slot) => slot.y);
  }

  return { slots, guides };
}

module.exports = {
  filterPregnancyA5LineSlots,
  isPregnancyA5DecorativeBottomStroke,
  isPregnancyA5WeeklyPage,
};
