/**
 * Page 52 «Анкета родов» (pregnancy_60) — manual slots from
 * in albums/беременность 180х240/…52….pdf (PDF vector extraction).
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
 * Indices match buildBirthQuestionnaire60Fields:
 * 0–7 top lines, 8 peach grid (unused), 9–10 weight/height, 11–12 spare,
 * 13 weekday, 14 time, 15 Ер/Кс, 16–19 mid-grid guides,
 * 20 condition, 21 discharge, 22 days, 23–25 guests (field start 23 ×3).
 */
const PAGE_52_SLOTS = [
  LINE(0.4511, 0.2126, 0.4453, 0.0418, 1),
  LINE(0.3827, 0.2554, 0.1033, 0.0428, 2),
  LINE(0.7044, 0.2554, 0.1913, 0.0428, 3),
  LINE(0.1522, 0.2999, 0.2365, 0.0434, 4),
  LINE(0.5444, 0.3006, 0.3522, 0.0434, 5),
  LINE(0.6783, 0.3405, 0.2175, 0.0412, 6),
  LINE(0.2167, 0.3806, 0.6799, 0.041, 7),
  LINE(0.6636, 0.4162, 0.2327, 0.035, 8),
  FILL(0.1077, 0.4095, 0.4275, 0.1576, 9, false),
  FILL(0.181, 0.4559, 0.1343, 0.025, 10),
  FILL(0.3936, 0.457, 0.1215, 0.025, 11),
  FILL(0.1824, 0.4204, 0.0333, 0.025, 12, false),
  FILL(0.3725, 0.4204, 0.0333, 0.025, 13, false),
  FILL(0.2932, 0.4951, 0.222, 0.025, 14),
  FILL(0.2088, 0.5338, 0.3064, 0.025, 15),
  FILL(0.6229, 0.5323, 0.2606, 0.025, 16, false),
  LINE(0.2227, 0.5524, 0.2864, 0.0186, 17, false),
  LINE(0.6368, 0.551, 0.2407, 0.0186, 18, false),
  LINE(0.2227, 0.5755, 0.2864, 0.0167, 19, false),
  LINE(0.6368, 0.574, 0.2407, 0.0167, 20, false),
  // Bottom form lines — strokeY = top + height from PDF (not band top y).
  LINE(0.3336, 0.669, 0.5587, 0.0478, 22),
  LINE(0.4703, 0.7042, 0.4219, 0.0415, 23),
  LINE(0.5476, 0.7465, 0.3428, 0.0423, 24),
  LINE(0.4145, 0.7901, 0.4805, 0.0428, 25),
  LINE(0.1048, 0.832, 0.7902, 0.0423, 25, false),
  LINE(0.1048, 0.8744, 0.7902, 0.0423, 25, false),
];

function slotGuideY(slot) {
  if (slot.lineStrokeAtBottom) return slot.y + slot.height;
  return slot.textAnchorTop ? slot.y + slot.height / 2 : slot.y;
}

function applyPregnancy60Page52LineSlotOverrides(slotsByPage, guidesByPage) {
  return {
    slots: { ...slotsByPage, 52: PAGE_52_SLOTS },
    guides: { ...guidesByPage, 52: PAGE_52_SLOTS.map(slotGuideY) },
  };
}

module.exports = {
  applyPregnancy60Page52LineSlotOverrides,
  PAGE_52_SLOTS,
};
