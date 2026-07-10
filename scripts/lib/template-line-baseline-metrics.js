/**
 * Preview ↔ PDF baseline geometry for audit scripts (mirrors utils/templateLineText.ts).
 */
const core = require('./text-capacity-core');

const TEMPLATE_LINE_CAP_HEIGHT_RATIO = 0.85;
const TEMPLATE_LINE_STROKE_CLEARANCE_RATIO = 0.06;
const PREGNANCY_WEEKLY_CAP_HEIGHT_RATIO = 1.08;
const PREGNANCY_WEEKLY_EXTRA_LIFT_BAND_RATIO = 0.82;
const PREGNANCY_RULED_NOTEBOOK_CAP_HEIGHT_RATIO = 0.88;
const PREGNANCY_RULED_NOTEBOOK_LIFT_BAND_RATIO = 0.06;
const PREGNANCY_WEEKLY_GUIDE_STROKE_FONT_OFFSET = 0.86;
const PREGNANCY_WEEKLY_LINE_PITCH = 0.0412;
const PREGNANCY_WEEKLY_COMPACT_LINE_HEIGHT = 0.035;
const PREGNANCY_WEEKLY_INLINE_TAIL_EXTRA_LIFT_BAND_RATIO = 0.1;

const PREGNANCY_TYPOGRAPHY = {
  fixedLineFontSize: 16,
  lineCenterRatio: 0.5,
  lineFontOffsetRatio: 0.8,
  blockCenterRatio: 0.58,
  blockFontOffsetRatio: 0.66,
  blockMaxFontSize: 20,
};

function fitFontSizeToSlot(fontSize, lineHeight, inputKind = 'line', lineGuideId) {
  const profile =
    lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5'
      ? PREGNANCY_TYPOGRAPHY
      : core.getTypography(lineGuideId);

  if (inputKind === 'block') {
    return Math.min(fontSize, Math.max(13, lineHeight * 0.78), profile.blockMaxFontSize);
  }
  if (profile.fixedLineFontSize != null) {
    return Math.min(fontSize, profile.fixedLineFontSize);
  }
  return Math.min(fontSize, Math.max(8, lineHeight * 0.76), 16);
}

function getTemplateLineAscenderPadding(fontSize, inputKind = 'line') {
  return Math.ceil(fontSize * (inputKind === 'block' ? 0.34 : 0.28));
}

function isPregnancyWeeklyStructuredPage(lineGuideId, page) {
  if (lineGuideId === 'pregnancy_60') {
    return (
      (page >= 9 && page <= 17) ||
      (page >= 19 && page <= 32) ||
      (page >= 34 && page <= 47)
    );
  }
  if (lineGuideId === 'pregnancy_a5') {
    return (
      (page >= 5 && page <= 13) ||
      (page >= 15 && page <= 28) ||
      (page >= 30 && page <= 43)
    );
  }
  return false;
}

function isPregnancyRuledNotebookPage(lineGuideId, page) {
  return lineGuideId === 'pregnancy_60' && (page === 53 || page === 60);
}

function isPregnancy60WeeklyPage(page) {
  return isPregnancyWeeklyStructuredPage('pregnancy_60', page);
}

function isPregnancy60WeeklyValueSlot(lineGuideId, slot) {
  return (
    lineGuideId === 'pregnancy_60' &&
    isPregnancy60WeeklyPage(slot.page) &&
    (slot.index === 1 || slot.index === 6)
  );
}

function isBirthQuestionnairePage(lineGuideId, page) {
  return (
    (lineGuideId === 'pregnancy_a5' && page === 44) ||
    (lineGuideId === 'pregnancy_60' && page === 52)
  );
}

function isAlreadyMomPage(lineGuideId, page) {
  return lineGuideId === 'pregnancy_60' && page === 54;
}

function isPregnancyWeeklyFieldLineSlot(slot, lineGuideId) {
  return (
    isPregnancyWeeklyStructuredPage(lineGuideId, slot.page) &&
    (slot.inputKind ?? 'line') === 'line' &&
    !isPregnancy60WeeklyValueSlot(lineGuideId, slot)
  );
}

function isPregnancyWeeklyMultilineTextFieldSlot(slot, lineGuideId) {
  if (!isPregnancyWeeklyFieldLineSlot(slot, lineGuideId)) return false;
  return slot.continuationGroup === 3 || slot.continuationGroup === 5;
}

function shouldClipPregnancyWeeklyFieldRow(slot, lineGuideId, allSlots) {
  if (!isPregnancyWeeklyStructuredPage(lineGuideId, slot.page)) return false;
  if ((slot.inputKind ?? 'line') !== 'line') return false;
  if (isPregnancy60WeeklyValueSlot(lineGuideId, slot)) return false;

  if (slot.inlineLabelTail === true) return true;

  if (lineGuideId === 'pregnancy_60') {
    return (
      (slot.continuationGroup === 3 && slot.index === 2 && slot.hasLabel === true) ||
      (slot.continuationGroup === 5 && slot.index === 7 && slot.hasLabel === true)
    );
  }

  if (allSlots?.length && slot.hasLabel) {
    const bellyIndex = lineGuideId === 'pregnancy_60' ? 6 : 5;
    const bodySlot = allSlots.find(
      (s) =>
        s.continuationGroup === slot.continuationGroup &&
        !s.hasLabel &&
        (s.inputKind ?? 'line') === 'line' &&
        s.index > slot.index &&
        s.index !== 1 &&
        s.index !== bellyIndex,
    );
    if (bodySlot && slot.x > bodySlot.x + 0.015) return true;
  }

  return false;
}

function isPregnancyWeeklyTextLineSlot(lineGuideId, slot) {
  if (
    isPregnancyRuledNotebookPage(lineGuideId, slot.page) &&
    (slot.inputKind ?? 'line') === 'line'
  ) {
    return true;
  }
  if (!isPregnancyWeeklyStructuredPage(lineGuideId, slot.page)) return false;
  if (isPregnancy60WeeklyValueSlot(lineGuideId, slot)) return false;
  if ((slot.inputKind ?? 'line') !== 'line') return false;
  if (slot.inlineLabelTail) return true;
  if (slot.hasLabel) {
    const normH = slot.normHeight ?? 0;
    if (normH > PREGNANCY_WEEKLY_COMPACT_LINE_HEIGHT) return false;
  }
  return true;
}

function usesStrokeBaselineLayout(slot, lineGuideId) {
  if (isPregnancyWeeklyTextLineSlot(lineGuideId, slot)) return true;
  if (!slot.lineStrokeAtBottom) return false;
  if (lineGuideId === 'kids_48') return true;
  if (lineGuideId === 'pregnancy_a5' && slot.page === 44) return true;
  if (isBirthQuestionnairePage(lineGuideId, slot.page)) return true;
  if (isAlreadyMomPage(lineGuideId, slot.page)) {
    return (slot.inputKind ?? 'line') === 'line';
  }
  return false;
}

function usesPregnancyWeeklyGuideStrokeBaseline(slot, lineGuideId) {
  if (typeof slot.strokeY !== 'number') return false;
  if (!isPregnancyWeeklyStructuredPage(lineGuideId, slot.page)) return false;
  return slot.continuationGroup === 3 || slot.continuationGroup === 5;
}

function resolvePregnancyWeeklyStrokeTextMetrics(slot, lineGuideId) {
  if (usesPregnancyWeeklyGuideStrokeBaseline(slot, lineGuideId)) {
    return { capRatio: PREGNANCY_WEEKLY_GUIDE_STROKE_FONT_OFFSET, lift: 0 };
  }
  let lift = slot.lineHeight * PREGNANCY_WEEKLY_EXTRA_LIFT_BAND_RATIO;
  const normH = slot.normHeight ?? 0;
  if (slot.inlineLabelTail === true && normH > PREGNANCY_WEEKLY_LINE_PITCH * 1.15) {
    lift += slot.lineHeight * PREGNANCY_WEEKLY_INLINE_TAIL_EXTRA_LIFT_BAND_RATIO;
  }
  return { capRatio: PREGNANCY_WEEKLY_CAP_HEIGHT_RATIO, lift };
}

function getPregnancyWeeklyLineStrokeY(slot) {
  if (typeof slot.strokeY === 'number') return slot.strokeY;
  return slot.y + slot.lineHeight;
}

function getPregnancyWeeklyLineTextTop(slot, fittedSize, lineGuideId) {
  const strokeY = getPregnancyWeeklyLineStrokeY(slot);
  const { capRatio, lift } = resolvePregnancyWeeklyStrokeTextMetrics(slot, lineGuideId);
  return strokeY - fittedSize * capRatio - lift;
}

function getPregnancyRuledNotebookLineTextTop(slot, fittedSize) {
  const strokeY = getPregnancyWeeklyLineStrokeY(slot);
  const lift = slot.lineHeight * PREGNANCY_RULED_NOTEBOOK_LIFT_BAND_RATIO;
  return strokeY - fittedSize * PREGNANCY_RULED_NOTEBOOK_CAP_HEIGHT_RATIO - lift;
}

function getAlreadyMomLineTextTop(slot, fittedSize) {
  const strokeY = getPregnancyWeeklyLineStrokeY(slot);
  const lift = slot.lineHeight * PREGNANCY_WEEKLY_EXTRA_LIFT_BAND_RATIO;
  return strokeY - fittedSize * PREGNANCY_WEEKLY_CAP_HEIGHT_RATIO - lift;
}

function getBirthQuestionnaireLineTextTop(slot, fittedSize, referenceFittedSize) {
  const strokeY = slot.y + slot.lineHeight;
  const ref = referenceFittedSize ?? fittedSize;
  const liftScale = ref > 0 ? fittedSize / ref : 1;
  const lift = slot.lineHeight * PREGNANCY_WEEKLY_EXTRA_LIFT_BAND_RATIO * liftScale;
  return strokeY - fittedSize * PREGNANCY_WEEKLY_CAP_HEIGHT_RATIO - lift;
}

function getStrokeBaselineFontOffset(slot, lineGuideId) {
  if (isBirthQuestionnairePage(lineGuideId, slot.page)) {
    return PREGNANCY_WEEKLY_CAP_HEIGHT_RATIO;
  }
  if (isAlreadyMomPage(lineGuideId, slot.page)) {
    return PREGNANCY_WEEKLY_CAP_HEIGHT_RATIO;
  }
  return TEMPLATE_LINE_CAP_HEIGHT_RATIO;
}

function applyTemplateLineStrokeClearance(top, fittedSize, inputKind) {
  if (inputKind !== 'line') return top;
  return top - fittedSize * TEMPLATE_LINE_STROKE_CLEARANCE_RATIO;
}

function resolveTemplateTextVerticalRatios(slot, lineGuideId) {
  const profile = PREGNANCY_TYPOGRAPHY;
  const inputKind = slot.inputKind ?? 'line';
  if (inputKind === 'line') {
    return {
      centerRatio: profile.lineCenterRatio,
      fontOffsetRatio: profile.lineFontOffsetRatio,
    };
  }
  return {
    centerRatio: profile.blockCenterRatio,
    fontOffsetRatio: profile.blockFontOffsetRatio,
  };
}

function getTemplateLineRowInsets(slot, fontSize, inputKind, lineGuideId) {
  if (isPregnancy60WeeklyValueSlot(lineGuideId, slot)) {
    return { viewportTopInset: 0, textTopInset: 0 };
  }
  if (usesStrokeBaselineLayout(slot, lineGuideId)) {
    return { viewportTopInset: 0, textTopInset: 0 };
  }
  const ascenderPadding = getTemplateLineAscenderPadding(fontSize, inputKind);
  return { viewportTopInset: ascenderPadding, textTopInset: ascenderPadding };
}

function getTemplateLineTextTop(slot, fontSize, lineGuideId, allSlots, fontId, fontTable) {
  if (isPregnancy60WeeklyValueSlot(lineGuideId, slot)) {
    if (slot.index === 6) {
      const inputKind = slot.inputKind ?? 'block';
      const fittedSize = fitFontSizeToSlot(fontSize, slot.lineHeight, inputKind, lineGuideId);
      return slot.y + slot.lineHeight * 0.38 - fittedSize * 0.7;
    }
    return slot.y;
  }

  const inputKind = slot.inputKind ?? 'line';
  const fittedSize = fitFontSizeToSlot(fontSize, slot.lineHeight, inputKind, lineGuideId);
  let top;

  if (
    isPregnancyRuledNotebookPage(lineGuideId, slot.page) &&
    inputKind === 'line'
  ) {
    return getPregnancyRuledNotebookLineTextTop(slot, fittedSize);
  }

  if (
    isPregnancyWeeklyStructuredPage(lineGuideId, slot.page) &&
    inputKind === 'line' &&
    !isPregnancy60WeeklyValueSlot(lineGuideId, slot)
  ) {
    return getPregnancyWeeklyLineTextTop(slot, fittedSize, lineGuideId);
  }

  if (isAlreadyMomPage(lineGuideId, slot.page) && inputKind === 'line') {
    return getAlreadyMomLineTextTop(slot, fittedSize);
  }

  if (
    isBirthQuestionnairePage(lineGuideId, slot.page) &&
    inputKind === 'line' &&
    slot.lineStrokeAtBottom
  ) {
    const referenceFitted = fitFontSizeToSlot(16, slot.lineHeight, inputKind, lineGuideId);
    return getBirthQuestionnaireLineTextTop(slot, fittedSize, referenceFitted);
  }

  if (usesStrokeBaselineLayout(slot, lineGuideId)) {
    const lineY = slot.y + slot.lineHeight;
    const lineFitted = fitFontSizeToSlot(fontSize, slot.lineHeight, inputKind, lineGuideId);
    return (
      lineY -
      lineFitted * resolveStrokeBaselinePreviewFontOffset(fontId, slot, lineGuideId, fontTable)
    );
  }

  const { centerRatio, fontOffsetRatio } = resolveTemplateTextVerticalRatios(slot, lineGuideId);
  if (inputKind === 'block') {
    top = slot.y + slot.lineHeight * centerRatio - fittedSize * fontOffsetRatio;
  } else {
    const lineY = slot.y + slot.lineHeight * centerRatio;
    top = lineY - fittedSize * fontOffsetRatio;
  }

  const isBirthQuestionnaireStrokeBaseline =
    isBirthQuestionnairePage(lineGuideId, slot.page) &&
    inputKind === 'line' &&
    slot.lineStrokeAtBottom;

  if (isBirthQuestionnaireStrokeBaseline || usesStrokeBaselineLayout(slot, lineGuideId)) {
    return top;
  }

  return applyTemplateLineStrokeClearance(top, fittedSize, inputKind);
}

function getRnAscentRatioAt16(fontId, fontTable) {
  const entry = fontTable?.fonts?.[fontId];
  if (typeof entry?.rnAscentRatioAt16 === 'number' && entry.rnAscentRatioAt16 > 0) {
    return entry.rnAscentRatioAt16;
  }
  return null;
}

function resolveStrokeBaselinePreviewFontOffset(fontId, slot, lineGuideId, fontTable) {
  return getRnAscentRatioAt16(fontId, fontTable) ?? getStrokeBaselineFontOffset(slot, lineGuideId);
}

function usesPregnancyAlbumRnLineHeightAscent(slot, lineGuideId, allSlots) {
  if (lineGuideId !== 'pregnancy_60' && lineGuideId !== 'pregnancy_a5') return false;
  if ((slot.inputKind ?? 'line') !== 'line') return false;
  if (isPregnancyRuledNotebookPage(lineGuideId, slot.page)) return false;
  if (shouldClipPregnancyWeeklyFieldRow(slot, lineGuideId, allSlots)) return false;
  return true;
}

function getTemplateLinePreviewAbsoluteTextTop(
  slot,
  fontSize,
  lineGuideId,
  allSlots,
  fontId,
  fontTable,
) {
  const inputKind = slot.inputKind ?? 'line';
  const fittedSize = fitFontSizeToSlot(fontSize, slot.lineHeight, inputKind, lineGuideId);

  const { viewportTopInset, textTopInset } = getTemplateLineRowInsets(
    slot,
    fittedSize,
    inputKind,
    lineGuideId,
  );

  return (
    getTemplateLineTextTop(slot, fontSize, lineGuideId, allSlots, fontId, fontTable) -
    viewportTopInset +
    textTopInset
  );
}

function resolveTemplateLinePdfAscentRatio(
  slot,
  fittedSize,
  lineGuideId,
  fontId,
  fontTable,
  allSlots,
) {
  const inputKind = slot.inputKind ?? 'line';

  if (isPregnancyRuledNotebookPage(lineGuideId, slot.page) && inputKind === 'line') {
    return PREGNANCY_RULED_NOTEBOOK_CAP_HEIGHT_RATIO;
  }

  if (
    isPregnancyWeeklyTextLineSlot(lineGuideId, slot) &&
    !isPregnancyRuledNotebookPage(lineGuideId, slot.page)
  ) {
    const { capRatio, lift } = resolvePregnancyWeeklyStrokeTextMetrics(slot, lineGuideId);
    return capRatio + (fittedSize > 0 ? lift / fittedSize : 0);
  }

  const rnRatio = getRnAscentRatioAt16(fontId, fontTable);
  if (rnRatio != null) {
    if (usesPregnancyAlbumRnLineHeightAscent(slot, lineGuideId, allSlots)) {
      return rnRatio;
    }
    if (
      isAlreadyMomPage(lineGuideId, slot.page) ||
      (isBirthQuestionnairePage(lineGuideId, slot.page) &&
        inputKind === 'line' &&
        slot.lineStrokeAtBottom)
    ) {
      return rnRatio;
    }
  }

  if (isAlreadyMomPage(lineGuideId, slot.page) && inputKind === 'line') {
    return (
      PREGNANCY_WEEKLY_CAP_HEIGHT_RATIO +
      (fittedSize > 0
        ? (slot.lineHeight * PREGNANCY_WEEKLY_EXTRA_LIFT_BAND_RATIO) / fittedSize
        : 0)
    );
  }

  if (
    isBirthQuestionnairePage(lineGuideId, slot.page) &&
    inputKind === 'line' &&
    slot.lineStrokeAtBottom
  ) {
    return (
      PREGNANCY_WEEKLY_CAP_HEIGHT_RATIO +
      (fittedSize > 0
        ? (slot.lineHeight * PREGNANCY_WEEKLY_EXTRA_LIFT_BAND_RATIO) / fittedSize
        : 0)
    );
  }

  if (usesStrokeBaselineLayout(slot, lineGuideId)) {
    return resolveStrokeBaselinePreviewFontOffset(fontId, slot, lineGuideId, fontTable);
  }

  return TEMPLATE_LINE_CAP_HEIGHT_RATIO;
}

function getTemplateLinePdfBaselineY(slot, fontSize, lineGuideId, allSlots, fontId, fontTable) {
  const inputKind = slot.inputKind ?? 'line';
  const fittedSize = fitFontSizeToSlot(fontSize, slot.lineHeight, inputKind, lineGuideId);
  const previewTextTop = getTemplateLinePreviewAbsoluteTextTop(
    slot,
    fontSize,
    lineGuideId,
    allSlots,
    fontId,
    fontTable,
  );
  const ascentRatio = resolveTemplateLinePdfAscentRatio(
    slot,
    fittedSize,
    lineGuideId,
    fontId,
    fontTable,
    allSlots,
  );
  return previewTextTop + fittedSize * ascentRatio;
}

function measureBaselineDrift(slot, fontSize, lineGuideId, allSlots, fontId, fontTable) {
  const inputKind = slot.inputKind ?? 'line';
  const fittedSize = fitFontSizeToSlot(fontSize, slot.lineHeight, inputKind, lineGuideId);
  const previewTop = getTemplateLinePreviewAbsoluteTextTop(
    slot,
    fontSize,
    lineGuideId,
    allSlots,
    fontId,
    fontTable,
  );
  const pdfBaseline = getTemplateLinePdfBaselineY(
    slot,
    fontSize,
    lineGuideId,
    allSlots,
    fontId,
    fontTable,
  );
  const ascentRatio = resolveTemplateLinePdfAscentRatio(
    slot,
    fittedSize,
    lineGuideId,
    fontId,
    fontTable,
  );
  const pdfGlyphTop = pdfBaseline - fittedSize * ascentRatio;
  const strokeY = getPregnancyWeeklyLineStrokeY(slot);
  return {
    previewTop,
    pdfBaseline,
    pdfGlyphTop,
    strokeY,
    fittedSize,
    ascentRatio,
    driftPx: pdfGlyphTop - previewTop,
  };
}

function scaleSlotsToPhoneViewport(slots, viewport) {
  const refW = core.REFERENCE_VIEWPORT.width;
  const scaleX = viewport.width / refW;
  const scaleY = viewport.height / refW;
  return slots.map((slot) => ({
    ...slot,
    x: slot.x * scaleX,
    width: slot.width * scaleX,
    y: slot.y * scaleY,
    lineHeight: slot.lineHeight * scaleY,
    strokeY: typeof slot.strokeY === 'number' ? slot.strokeY * scaleY : undefined,
  }));
}

module.exports = {
  TEMPLATE_LINE_CAP_HEIGHT_RATIO,
  PREGNANCY_WEEKLY_CAP_HEIGHT_RATIO,
  fitFontSizeToSlot,
  getTemplateLinePreviewAbsoluteTextTop,
  getTemplateLinePdfBaselineY,
  resolveTemplateLinePdfAscentRatio,
  measureBaselineDrift,
  scaleSlotsToPhoneViewport,
  shouldClipPregnancyWeeklyFieldRow,
  usesStrokeBaselineLayout,
};
