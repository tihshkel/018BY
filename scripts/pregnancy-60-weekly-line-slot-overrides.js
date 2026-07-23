/**
 * Weekly pregnancy pages — stroke baselines for line inputs.
 * pregnancy_60 additionally gets a third plan line; belly moves to index 6.
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
    const sourceGuides = guidesByPage[key] ?? [];
    slots[key] = insertThirdPlanLine(slots[key]);
    guides[key] = slots[key].map((slot, index) => {
      // Date OCR band hangs below the printed stroke (same baseline as «ДАТА»).
      if (index === 0) return slot.y;
      if (index < 5) return sourceGuides[index] ?? slot.y;
      if (index === 5) return slot.y + slot.height;
      return sourceGuides[index - 1] ?? slot.y;
    });
  }

  return { slots, guides };
}

const A5_WEEKLY_PAGES = [
  ...Array.from({ length: 9 }, (_, i) => i + 5),
  ...Array.from({ length: 14 }, (_, i) => i + 15),
  ...Array.from({ length: 14 }, (_, i) => i + 30),
];

function applyPregnancyA5WeeklyLineSlotOverrides(slotsByPage, guidesByPage) {
  const slots = { ...slotsByPage };
  const guides = { ...guidesByPage };

  for (const page of A5_WEEKLY_PAGES) {
    const key = String(page);
    if (!slots[key]?.length) continue;

    slots[key] = slots[key].map((slot, index) => {
      if (index === 1 || index === 5) {
        return {
          ...slot,
          inputKind: 'block',
          textAnchorTop: true,
          hasLabel: false,
        };
      }
      return {
        ...slot,
        inputKind: slot.inputKind ?? 'line',
        lineStrokeAtBottom: true,
        textAnchorTop: true,
      };
    });
    guides[key] = [...(guidesByPage[key] ?? slots[key].map((slot) => slot.y))];
    if (slots[key][0]) {
      // Date stroke sits at the top of the OCR band (label baseline), not the bottom.
      guides[key][0] = slots[key][0].y;
    }
  }

  return { slots, guides };
}

module.exports = {
  applyPregnancyA5WeeklyLineSlotOverrides,
  applyPregnancy60WeeklyLineSlotOverrides,
  isWeeklyPage,
};
