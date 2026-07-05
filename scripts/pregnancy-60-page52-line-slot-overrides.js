/**
 * Page 52 «Анкета родов» (pregnancy_60) — manual slots from
 * in albums/беременность 180х240/…52….pdf (same grid as pregnancy_a5 p44).
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
 * Indices match buildBirthQuestionnaire60Fields (same as A5 p44):
 * 0 age, 1 weight_before, 2 weight_gain, 3 PDR, 4 birth date, 5 term,
 * 6 hospital, 7 admission, 8 weight, 9 height, 10 weekday, 11 time, 12 Ер/Кс,
 * 13 condition, 14 discharge, 15 days, 16–18 guests.
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
  FILL(0.1949, 0.4559, 0.1143, 0.0357, 11),
  FILL(0.4075, 0.457, 0.1016, 0.0357, 12),
  FILL(0.3071, 0.4951, 0.202, 0.0377, 13),
  LINE(0.3071, 0.5387, 0.202, 0.0186, 14),
  FILL(0.1523, 0.5672, 0.3461, 0.0312, 15, true),
  LINE(0.3336, 0.6691, 0.5587, 0.0478, 16),
  LINE(0.4703, 0.7042, 0.4219, 0.0415, 17),
  LINE(0.5476, 0.7465, 0.3428, 0.0423, 18),
  LINE(0.4145, 0.7902, 0.4805, 0.0428, 19),
  LINE(0.1048, 0.832, 0.7902, 0.0423, 19, false),
  LINE(0.1048, 0.8743, 0.7902, 0.0423, 19, false),
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
