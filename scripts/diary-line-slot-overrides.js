/**
 * Line-slot overrides for diary_interior_brown / diary_interior_purple.
 * Brown diary: calibrated slots from PDF vectors (scripts/build-diary-brown-slot-overrides.js).
 * Slot `y` is the bottom stroke of the printed line (see getDiarySlotTopNormY).
 */

const fs = require('fs');
const path = require('path');

const LINE = (x, y, width, height, continuationGroup = 1, inputKind = 'line') => ({
  x,
  y,
  width,
  height,
  hasLabel: false,
  inputKind,
  continuationGroup,
});

/** Page 3 — дата начала (коричневый макет). */
const DIARY_RULES_PAGE_SLOTS = [LINE(0.09, 0.7644, 0.3126, 0.028, 1)];

/** Page 3 — «Правила» (фиолетовый): static, без слотов. */
const PURPLE_DIARY_RULES_PAGE_SLOTS = [];

/** Page 5 — «Твоя анкета» (фиолетовый дневник), 12 полей. */
const PURPLE_GIRL_PROFILE_PAGE_SLOTS = [
  LINE(0.236, 0.292, 0.6754, 0.028, 1, 'block'),
  LINE(0.3162, 0.3318, 0.5963, 0.028, 2),
  LINE(0.3624, 0.3726, 0.5513, 0.028, 3),
  LINE(0.4135, 0.4119, 0.4996, 0.028, 4),
  LINE(0.3893, 0.4503, 0.5237, 0.028, 5),
  LINE(0.5919, 0.4919, 0.3212, 0.028, 6),
  LINE(0.4828, 0.5302, 0.4303, 0.028, 7),
  LINE(0.4071, 0.5702, 0.506, 0.028, 8),
  LINE(0.3789, 0.611, 0.5342, 0.028, 9),
  LINE(0.3179, 0.651, 0.5951, 0.028, 10),
  LINE(0.2926, 0.6918, 0.6205, 0.028, 11),
  LINE(0.6604, 0.7309, 0.2527, 0.028, 12),
];

/** Page 26 — расписание пт/сб (фиолетовый), 10 полей. */
const PURPLE_WEEKLY_PAGE_26_SLOTS = [
  LINE(0.0865, 0.2229, 0.8318, 0.028, 1),
  LINE(0.0865, 0.2669, 0.8318, 0.028, 2),
  LINE(0.0865, 0.3108, 0.619, 0.028, 3),
  LINE(0.0865, 0.3548, 0.5706, 0.028, 4),
  LINE(0.0893, 0.3988, 0.5923, 0.028, 5),
  LINE(0.0865, 0.6709, 0.8318, 0.028, 6),
  LINE(0.0865, 0.7148, 0.8318, 0.028, 7),
  LINE(0.0865, 0.7588, 0.8318, 0.028, 8),
  LINE(0.0865, 0.8028, 0.619, 0.028, 9),
  LINE(0.0865, 0.8468, 0.5706, 0.028, 10),
];

function loadBrownSlotOverrides() {
  const dataPath = path.join(__dirname, 'diary-brown-slot-overrides-data.json');
  if (!fs.existsSync(dataPath)) {
    return { 3: DIARY_RULES_PAGE_SLOTS };
  }
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

function loadPurpleSlotOverrides() {
  const dataPath = path.join(__dirname, 'diary-purple-slot-overrides-data.json');
  if (!fs.existsSync(dataPath)) {
    return {
      3: PURPLE_DIARY_RULES_PAGE_SLOTS,
      5: PURPLE_GIRL_PROFILE_PAGE_SLOTS,
      26: PURPLE_WEEKLY_PAGE_26_SLOTS,
    };
  }
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

const BROWN_DIARY_SLOT_OVERRIDES = loadBrownSlotOverrides();
const PURPLE_DIARY_SLOT_OVERRIDES = loadPurpleSlotOverrides();

const DIARY_SLOT_OVERRIDES = {
  diary_interior_brown: BROWN_DIARY_SLOT_OVERRIDES,
  diary_interior_purple: PURPLE_DIARY_SLOT_OVERRIDES,
};

function applyDiaryLineSlotOverrides(slotsByPage, guidesByPage, albumId) {
  const pageOverrides = DIARY_SLOT_OVERRIDES[albumId];
  if (!pageOverrides || !slotsByPage) {
    return { slots: slotsByPage, guides: guidesByPage };
  }

  for (const [pageKey, slots] of Object.entries(pageOverrides)) {
    slotsByPage[pageKey] = slots;
    if (guidesByPage) {
      guidesByPage[pageKey] = slots.map((slot) => slot.y);
    }
  }

  return { slots: slotsByPage, guides: guidesByPage };
}

module.exports = {
  applyDiaryLineSlotOverrides,
  DIARY_RULES_PAGE_SLOTS,
  BROWN_DIARY_SLOT_OVERRIDES,
};
