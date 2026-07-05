/**
 * Weekly pages pregnancy_60 — insert third plan line slot; belly moves to index 6.
 */

const WEEKLY_PAGES = [
  ...Array.from({ length: 9 }, (_, i) => i + 9),
  ...Array.from({ length: 14 }, (_, i) => i + 19),
  ...Array.from({ length: 14 }, (_, i) => i + 34),
];

function isWeeklyPage(page) {
  return WEEKLY_PAGES.includes(page);
}

function insertThirdPlanLine(slots) {
  if (!slots || slots.length < 9) return slots;

  const planLine2 = slots[4];
  const planLine3StrokeY = 0.45375;
  const planLine3Y = planLine3StrokeY - planLine2.height;
  const thirdPlanLine = {
    x: slots[3].x,
    y: planLine3Y,
    width: slots[3].width,
    height: planLine2.height,
    hasLabel: false,
    continuationGroup: slots[3].continuationGroup,
    inputKind: 'line',
    lineStrokeAtBottom: true,
    textAnchorTop: true,
  };

  const withThird = [...slots.slice(0, 5), thirdPlanLine, ...slots.slice(5)];

  return withThird.map((slot, index) => {
    if (index === 1 || index === 6) {
      return {
        ...slot,
        inputKind: 'block',
        textAnchorTop: true,
        hasLabel: false,
      };
    }
    if ((slot.inputKind ?? 'line') === 'line') {
      return {
        ...slot,
        lineStrokeAtBottom: true,
        textAnchorTop: true,
      };
    }
    return slot;
  });
}

function applyPregnancy60WeeklyLineSlotOverrides(slotsByPage, guidesByPage) {
  const slots = { ...slotsByPage };
  const guides = { ...guidesByPage };

  for (const page of WEEKLY_PAGES) {
    const key = String(page);
    if (!slots[key]?.length) continue;
    slots[key] = insertThirdPlanLine(slots[key]);
    guides[key] = slots[key].map((slot) =>
      slot.lineStrokeAtBottom ? slot.y + slot.height : slot.y + slot.height / 2,
    );
  }

  return { slots, guides };
}

module.exports = {
  applyPregnancy60WeeklyLineSlotOverrides,
  isWeeklyPage,
};
