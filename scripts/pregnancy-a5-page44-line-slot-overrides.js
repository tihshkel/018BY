/**
 * Page 44 «Анкета родов» — manual block slots from in albums/беременность A5/44.pdf.
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
  FILL(0.3133, 0.4963, 0.11, 0.028, 11),
  FILL(0.43, 0.4963, 0.106, 0.028, 12),
  FILL(0.2211, 0.5402, 0.3154, 0.028, 13),
  LINE(0.22, 0.562, 0.32, 0.026, 14),
  FILL(0.566, 0.5397, 0.29, 0.028, 15, true),
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
