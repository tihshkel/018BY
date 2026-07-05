/**
 * Page 54 «Уже мама» (pregnancy_60) — manual slots from block PDF page 54.
 * Indices match buildAlreadyMomFields (pregnancy_60).
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

/**
 * 0 name, 1 hair, 2 eye, 3 zodiac, 4 year (date), 5–8 wishes.
 */
const PAGE_54_SLOTS = [
  LINE(0.2608, 0.6767, 0.5421, 0.0408, 1),
  LINE(0.2601, 0.7176, 0.2313, 0.0409, 2),
  LINE(0.6273, 0.7176, 0.2566, 0.0409, 3),
  LINE(0.2982, 0.7575, 0.586, 0.0397, 4),
  LINE(0.5347, 0.7955, 0.349, 0.0394, 5),
  LINE(0.4947, 0.8363, 0.3895, 0.0397, 6),
  LINE(0.1173, 0.8744, 0.7669, 0.0389, 6, false),
  LINE(0.1173, 0.9133, 0.7669, 0.0389, 6, false),
  LINE(0.1173, 0.9522, 0.7669, 0.0389, 6, false),
];

function slotGuideY(slot) {
  if (slot.lineStrokeAtBottom) return slot.y + slot.height;
  return slot.textAnchorTop ? slot.y + slot.height / 2 : slot.y;
}

function applyPregnancy60Page54LineSlotOverrides(slotsByPage, guidesByPage) {
  return {
    slots: { ...slotsByPage, 54: PAGE_54_SLOTS },
    guides: { ...guidesByPage, 54: PAGE_54_SLOTS.map(slotGuideY) },
  };
}

module.exports = {
  applyPregnancy60Page54LineSlotOverrides,
  PAGE_54_SLOTS,
};
