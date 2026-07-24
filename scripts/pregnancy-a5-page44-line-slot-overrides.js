/**
 * Page 44 «Анкета родов» — manual block slots from page_044.png white fills.
 * Replaces OCR line detection (wrong geometry for white-fill form).
 */

/** PDF underline: stroke at bottom of band; stored y = top of band. */
const LINE = (x, strokeY, width, height, continuationGroup, hasLabel = true) => ({
  x,
  y: strokeY - height,
  width,
  height,
  hasLabel,
  inputKind: 'line',
  lineStrokeAtBottom: true,
  textAnchorTop: true,
  continuationGroup,
});

/** PDF white fill: top-left + size → center y. */
const FILL = (x, top, width, height, continuationGroup, hasLabel = false) => ({
  x,
  y: top + height / 2,
  width,
  height,
  hasLabel,
  inputKind: 'block',
  continuationGroup,
});

/**
 * Indices match buildBirthQuestionnaireA5Fields:
 * 0 age, 1 weight_before, 2 weight_gain, 3 PDR, 4 birth date, 5 term,
 * 6 hospital, 7 admission, 8 weight, 9 height, 10 weekday, 11 time, 12 Ер/Кс,
 * 13 condition, 14 discharge, 15 days, 16–18 guests.
 *
 * Beige panel rows (page_044.png):
 *   Вес/Рост ≈ y0.455 | День недели ≈ y0.497 | Время + Ер/Кс ≈ y0.541
 */
const PAGE_44_SLOTS = [
  LINE(0.531, 0.1308, 0.336, 0.04, 1),
  LINE(0.437, 0.1777, 0.105, 0.028, 2),
  LINE(0.829, 0.1777, 0.119, 0.028, 3),
  LINE(0.206, 0.2269, 0.245, 0.042, 4),
  LINE(0.663, 0.2277, 0.284, 0.042, 5),
  LINE(0.782, 0.2749, 0.166, 0.046, 6),
  LINE(0.238, 0.3201, 0.709, 0.046, 7),
  LINE(0.776, 0.3668, 0.171, 0.05, 8),
  // White input cells in beige panel (measured from page_044.png)
  FILL(0.1826, 0.4549, 0.1147, 0.0265, 11),
  FILL(0.4337, 0.4537, 0.0974, 0.0265, 12),
  FILL(0.3185, 0.4968, 0.2127, 0.0265, 13),
  FILL(0.2266, 0.5407, 0.3046, 0.0265, 14),
  FILL(0.655, 0.5395, 0.22, 0.028, 15),
  LINE(0.376, 0.636, 0.571, 0.046, 16),
  LINE(0.541, 0.6825, 0.407, 0.046, 17),
  LINE(0.604, 0.729, 0.342, 0.047, 18),
  LINE(0.485, 0.7774, 0.462, 0.048, 19),
  LINE(0.113, 0.8249, 0.834, 0.048, 19, false),
  LINE(0.113, 0.8724, 0.834, 0.048, 19, false),
];

function slotGuideY(slot) {
  return slot.textAnchorTop ? slot.y + slot.height / 2 : slot.y;
}

function applyPregnancyA5Page44LineSlotOverrides(slotsByPage, guidesByPage) {
  return {
    slots: { ...slotsByPage, 44: PAGE_44_SLOTS },
    guides: { ...guidesByPage, 44: PAGE_44_SLOTS.map(slotGuideY) },
  };
}

module.exports = {
  applyPregnancyA5Page44LineSlotOverrides,
  PAGE_44_SLOTS,
};
