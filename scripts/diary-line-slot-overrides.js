/**
 * Line-slot overrides for diary_interior_brown / diary_interior_purple.
 * OCR often picks decorative lines as input fields (e.g. page 3 rules).
 */

const LINE = (x, y, width, height, continuationGroup = 1) => ({
  x,
  y,
  width,
  height,
  hasLabel: false,
  inputKind: 'line',
  continuationGroup,
});

/** Page 3 — единственное поле: дата начала ведения дневника. */
const DIARY_RULES_PAGE_SLOTS = [
  LINE(0.12, 0.848, 0.36, 0.028, 1),
];

/** Purple A5 page 3 — дата на нижней линии макета. */
const PURPLE_DIARY_RULES_PAGE_SLOTS = [
  LINE(0.12, 0.848, 0.36, 0.028, 1),
];

const DIARY_SLOT_OVERRIDES = {
  diary_interior_brown: {
    3: DIARY_RULES_PAGE_SLOTS,
  },
  diary_interior_purple: {
    3: PURPLE_DIARY_RULES_PAGE_SLOTS,
  },
};

function applyDiaryLineSlotOverrides(slotsByPage, guidesByPage) {
  for (const [albumId, pages] of Object.entries(DIARY_SLOT_OVERRIDES)) {
    if (!slotsByPage[albumId]) continue;
    for (const [pageKey, slots] of Object.entries(pages)) {
      slotsByPage[albumId][pageKey] = slots;
      if (guidesByPage[albumId]) {
        guidesByPage[albumId][pageKey] = slots.map((slot) => slot.y);
      }
    }
  }
  return { slots: slotsByPage, guides: guidesByPage };
}

module.exports = {
  applyDiaryLineSlotOverrides,
  DIARY_RULES_PAGE_SLOTS,
};
