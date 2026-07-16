/**
 * pregnancy_60 page 60 «Письмо малышу в будущее».
 * Design has 18 ruled lines; OCR often yields 17. Pad to 18 and keep one continuation group.
 */

const TARGET_LETTER_LINES = 18;
const FALLBACK_PITCH = 0.03942;

function applyPregnancy60Page60LetterLineSlotOverrides(slotsByPage, guidesByPage) {
  const key = '60';
  const prevSlots = slotsByPage[key] ?? slotsByPage[60];
  const prevGuides = guidesByPage[key] ?? guidesByPage[60];
  if (!Array.isArray(prevSlots) || prevSlots.length < 10) {
    return { slots: slotsByPage, guides: guidesByPage };
  }

  const slots = prevSlots.map((slot) => ({ ...slot }));
  const guides = (prevGuides ?? []).slice();
  while (guides.length < slots.length) {
    const last = slots[guides.length];
    guides.push(Number(last?.y) + Number(last?.height || 0));
  }

  const pitch =
    guides.length >= 2 && Number.isFinite(guides[1] - guides[0])
      ? guides[1] - guides[0]
      : FALLBACK_PITCH;

  const template = slots[slots.length - 1];
  const group = template.continuationGroup ?? 1;

  while (slots.length < TARGET_LETTER_LINES) {
    const strokeY = guides[guides.length - 1] + pitch;
    slots.push({
      x: template.x,
      y: +strokeY.toFixed(5),
      width: template.width,
      height: +pitch.toFixed(5),
      hasLabel: false,
      continuationGroup: group,
      inputKind: 'line',
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    });
    guides.push(+strokeY.toFixed(5));
  }

  for (let i = 0; i < slots.length; i += 1) {
    slots[i] = {
      ...slots[i],
      continuationGroup: group,
      inputKind: 'line',
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    };
  }

  return {
    slots: { ...slotsByPage, [key]: slots.slice(0, TARGET_LETTER_LINES) },
    guides: {
      ...guidesByPage,
      [key]: guides.slice(0, TARGET_LETTER_LINES).map((y) => +Number(y).toFixed(5)),
    },
  };
}

module.exports = {
  applyPregnancy60Page60LetterLineSlotOverrides,
  TARGET_LETTER_LINES,
};
