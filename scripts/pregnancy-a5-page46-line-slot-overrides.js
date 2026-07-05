/**
 * Page 46 «Уже мама» (pregnancy_a5) — manual slots from block PDF page 46.
 */

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

/** 0 name, 1 hair, 2 eye, 3 zodiac, 4 year, 5–7 wishes (3 lines). */
const PAGE_46_SLOTS = [
  LINE(0.3453, 0.679, 0.5139, 0.0413, 1),
  LINE(0.2822, 0.7205, 0.2085, 0.0415, 2),
  LINE(0.6695, 0.7205, 0.2435, 0.0415, 3),
  LINE(0.328, 0.7609, 0.5853, 0.0402, 4),
  LINE(0.5981, 0.7994, 0.3146, 0.0399, 5),
  LINE(0.5549, 0.8407, 0.3584, 0.0402, 6),
  LINE(0.0883, 0.8793, 0.8249, 0.0394, 6, false),
  LINE(0.0883, 0.9187, 0.8249, 0.0394, 6, false),
];

function slotGuideY(slot) {
  if (slot.lineStrokeAtBottom) return slot.y + slot.height;
  return slot.textAnchorTop ? slot.y + slot.height / 2 : slot.y;
}

function applyPregnancyA5Page46LineSlotOverrides(slotsByPage, guidesByPage) {
  return {
    slots: { ...slotsByPage, 46: PAGE_46_SLOTS },
    guides: { ...guidesByPage, 46: PAGE_46_SLOTS.map(slotGuideY) },
  };
}

module.exports = {
  applyPregnancyA5Page46LineSlotOverrides,
  PAGE_46_SLOTS,
};
