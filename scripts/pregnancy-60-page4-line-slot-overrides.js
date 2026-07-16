/**
 * pregnancy_60 page 4 «Постановка на учёт».
 *
 * PNG has 2 wellbeing underlines; OCR slot 5 is a phantom band (no stroke).
 * Keep index 5 for schema stability but detach it from the wellbeing group.
 * Stamp all line slots with stroke-baseline geometry (band top + stroke at bottom).
 *
 * Recommendations: page_004.png has 4 gray underlines under «РЕКОМЕНДАЦИИ»
 * (0.809…0.925). A 5th stroke at ~0.770 was invented by equal-pitch padding and
 * sits in the title gap — export text overlapped the orange header and left the
 * bottom underline empty. Keep exactly the 4 detected strokes.
 */

const WELLBEING_BAND = 0.038;

/** Stroke Y from page_004.png gray underlines (slot x-range ink). */
const WELLBEING_STROKES = [0.2536, 0.2939];

/** 4 recommendation underlines from page_004.png (pngjs row-ink detect). */
const RECOMMENDATIONS_BAND = 0.03855;
const RECOMMENDATIONS_STROKES = [0.80881, 0.84733, 0.88584, 0.92453];
const RECOMMENDATIONS_GROUP = 14;
const RECOMMENDATIONS_X = 0.1132;
const RECOMMENDATIONS_WIDTH = 0.77359;

function lineSlot({ x, strokeY, width, height, continuationGroup, hasLabel }) {
  return {
    x,
    y: +(strokeY - height).toFixed(5),
    width,
    height,
    hasLabel,
    inputKind: 'line',
    textAnchorTop: true,
    lineStrokeAtBottom: true,
    continuationGroup,
  };
}

function toStrokeBaselineSlot(slot, strokeY) {
  const height = Number(slot.height) > 0 ? Number(slot.height) : WELLBEING_BAND;
  const stroke = Number(strokeY);
  const yIsStroke = Math.abs(Number(slot.y) - stroke) < 0.003;
  return {
    ...slot,
    y: +(yIsStroke ? stroke - height : Number(slot.y)).toFixed(5),
    height: +height.toFixed(5),
    inputKind: slot.inputKind ?? 'line',
    textAnchorTop: true,
    lineStrokeAtBottom: true,
  };
}

function applyRecommendationsFourLines(slots, guides) {
  if (!Array.isArray(slots) || slots.length < 19) return { slots, guides };

  const source = slots[16] ?? slots[17] ?? slots[18];
  const x = Number(source?.x) > 0 ? Number(source.x) : RECOMMENDATIONS_X;
  const width = Number(source?.width) > 0 ? Number(source.width) : RECOMMENDATIONS_WIDTH;

  const recSlots = RECOMMENDATIONS_STROKES.map((strokeY, index) =>
    lineSlot({
      x,
      strokeY,
      width,
      height: RECOMMENDATIONS_BAND,
      continuationGroup: RECOMMENDATIONS_GROUP,
      hasLabel: index === 0,
    }),
  );

  const nextSlots = [...slots.slice(0, 16), ...recSlots];
  const nextGuides = [...guides.slice(0, 16), ...RECOMMENDATIONS_STROKES];

  return { slots: nextSlots, guides: nextGuides };
}

function applyPregnancy60Page4LineSlotOverrides(slotsByPage, guidesByPage) {
  const prev = slotsByPage['4'] ?? slotsByPage[4];
  if (!Array.isArray(prev) || prev.length < 6) {
    return { slots: slotsByPage, guides: guidesByPage };
  }

  const guides = (guidesByPage['4'] ?? guidesByPage[4] ?? []).slice();
  while (guides.length < prev.length) guides.push(0);

  let next = prev.map((slot, index) => {
    const strokeY =
      typeof guides[index] === 'number' && Number.isFinite(guides[index])
        ? guides[index]
        : Number(slot.y) + Number(slot.height || 0);
    return toStrokeBaselineSlot(slot, strokeY);
  });

  // Slot 3 — first wellbeing line (after «МОЁ САМОЧУВСТВИЕ»)
  next[3] = lineSlot({
    x: 0.35577,
    strokeY: WELLBEING_STROKES[0],
    width: 0.53451,
    height: WELLBEING_BAND,
    continuationGroup: 4,
    hasLabel: true,
  });

  // Slot 4 — second wellbeing line (full width)
  next[4] = lineSlot({
    x: 0.11419,
    strokeY: WELLBEING_STROKES[1],
    width: 0.77608,
    height: WELLBEING_BAND,
    continuationGroup: 4,
    hasLabel: false,
  });

  // Slot 5 — phantom; keep index, detach from wellbeing group
  next[5] = {
    ...next[4],
    continuationGroup: 99,
  };

  guides[3] = WELLBEING_STROKES[0];
  guides[4] = WELLBEING_STROKES[1];
  guides[5] = WELLBEING_STROKES[1];

  const withRec = applyRecommendationsFourLines(next, guides);
  next = withRec.slots;
  const nextGuides = withRec.guides;

  return {
    slots: { ...slotsByPage, 4: next },
    guides: { ...guidesByPage, 4: nextGuides.map((y) => +Number(y).toFixed(5)) },
  };
}

module.exports = {
  applyPregnancy60Page4LineSlotOverrides,
  WELLBEING_STROKES,
  RECOMMENDATIONS_STROKES,
};
