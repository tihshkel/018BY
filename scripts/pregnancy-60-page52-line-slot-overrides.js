/**
 * Page 52 «Анкета родов» (pregnancy_60) — slots from PDF page 52 vector paths
 * (horizontal underlines + white fill rects), verified against page_052.png.
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

/** Band height for stroke-baseline lines (~inter-stroke pitch on p52). */
const BAND = 0.038;

/**
 * Indices match buildBirthQuestionnaire60Fields:
 * 0–7 top lines, 8 peach grid (unused), 9–10 weight/height, 11–12 spare,
 * 13 weekday, 14 time, 15 Ер/Кс, 16–19 mid-grid guides,
 * 20 condition, 21 discharge, 22 days, 23–25 guests (field start 23 ×3).
 */
const PAGE_52_SLOTS = [
  // Top ruled lines — strokeY from PDF get_drawings horizontal paths
  LINE(0.4445, 0.1762, 0.4433, BAND, 1),
  LINE(0.3776, 0.2173, 0.1087, BAND, 2),
  LINE(0.6923, 0.2173, 0.1948, BAND, 3),
  LINE(0.1521, 0.2604, 0.239, BAND, 4),
  LINE(0.5358, 0.2612, 0.3522, BAND, 5),
  LINE(0.6667, 0.3026, 0.2205, BAND, 6),
  LINE(0.2152, 0.3422, 0.6728, BAND, 7),
  LINE(0.6523, 0.3832, 0.2353, BAND, 8),
  // Peach panel (unused as text field)
  FILL(0.1162, 0.411, 0.4182, 0.1551, 9, false),
  // White input cells
  FILL(0.1879, 0.4567, 0.1313, 0.0246, 10),
  FILL(0.3959, 0.4577, 0.1189, 0.0246, 11),
  // Checkbox placeholders (geometry for reference; fills come from optionFills)
  FILL(0.1893, 0.4217, 0.0326, 0.0246, 12, false),
  FILL(0.3753, 0.4217, 0.0326, 0.0246, 13, false),
  FILL(0.2977, 0.4952, 0.2171, 0.0246, 14),
  FILL(0.2151, 0.5332, 0.2997, 0.0246, 15),
  FILL(0.6203, 0.5318, 0.255, 0.0246, 16, false),
  // Spare mid guides (not bound to schema fields)
  LINE(0.2227, 0.5524, 0.2864, 0.0186, 17, false),
  LINE(0.6368, 0.551, 0.2407, 0.0186, 18, false),
  LINE(0.2227, 0.5755, 0.2864, 0.0167, 19, false),
  LINE(0.6368, 0.574, 0.2407, 0.0167, 20, false),
  // Bottom form lines
  LINE(0.3295, 0.6193, 0.5542, BAND, 22),
  LINE(0.4633, 0.66, 0.4204, BAND, 23),
  LINE(0.5389, 0.7008, 0.343, BAND, 24),
  LINE(0.4087, 0.7433, 0.4777, BAND, 25),
  LINE(0.1134, 0.785, 0.773, BAND, 25, false),
  LINE(0.1134, 0.8266, 0.773, BAND, 25, false),
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
