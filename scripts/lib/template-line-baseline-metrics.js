/**
 * Preview ↔ PDF baseline geometry for audit scripts (mirrors utils/templateLineText.ts).
 */
const core = require('./text-capacity-core');

const TEMPLATE_LINE_CAP_HEIGHT_RATIO = 0.85;
const TEMPLATE_LINE_STROKE_CLEARANCE_RATIO = 0.06;
const PREGNANCY_WEEKLY_CAP_HEIGHT_RATIO = 1.08;
const PREGNANCY_WEEKLY_EXTRA_LIFT_BAND_RATIO = 0.82;
const PREGNANCY_ALREADY_MOM_STROKE_CLEARANCE_RATIO = 0.12;
const PREGNANCY_ALREADY_MOM_PDF_BASELINE_LIFT_RATIO = 0.1;
const PREGNANCY_RULED_NOTEBOOK_CAP_HEIGHT_RATIO = 0.88;
const PREGNANCY_RULED_NOTEBOOK_LIFT_BAND_RATIO = 0.06;
const PREGNANCY_WEEKLY_GUIDE_STROKE_FONT_OFFSET = 1;
const PREGNANCY_WEEKLY_LINE_PITCH = 0.0412;
const PREGNANCY_WEEKLY_COMPACT_LINE_HEIGHT = 0.035;
const PREGNANCY_WEEKLY_INLINE_TAIL_EXTRA_LIFT_BAND_RATIO = 0.1;
const KIDS_STROKE_CLEARANCE_RATIO = 0.1;
const KIDS_MONTH_STROKE_CLEARANCE_RATIO = 0.22;
const KIDS_P1_STROKE_CLEARANCE_RATIO = 0.02;
const KIDS_P1_BASELINE_SINK_RATIO = 0.16;
const KIDS_P1_PDF_BASELINE_LIFT_RATIO = 0.3;
const KIDS_TEETH_STROKE_CLEARANCE_RATIO = 0.02;
const KIDS_TEETH_DATE_BASELINE_SINK_RATIO = 0.04;
const KIDS_TEETH_BOTTOM_BASELINE_LIFT_RATIO = 0.22;
const KIDS_TEETH_BOTTOM_PDF_BASELINE_LIFT_RATIO = 0.3;
const KIDS_TEETH_DATE_PDF_BASELINE_LIFT_RATIO = 0.3;
const KIDS_GROWTH_STROKE_CLEARANCE_RATIO = 0.08;
const KIDS_GROWTH_FIXED_LINE_FONT_SIZE = 13;
const KIDS_GROWTH_PDF_BASELINE_LIFT_RATIO = 0.12;
const KIDS_BOTTOM_DATE_STROKE_CLEARANCE_RATIO = 0.03;
const KIDS_BOTTOM_DATE_PAGES = new Set([12, 14, 15, 17, 18, 19]);

function isKidsBottomDateLineSlot(slot) {
  if (slot?.page == null || slot?.index == null) return false;
  return slot.index === 0 && KIDS_BOTTOM_DATE_PAGES.has(slot.page);
}

function isKidsP16DreamsTopDateLineSlot(slot) {
  return slot?.page === 16 && slot?.index === 0;
}

function isKidsP20BaptismDateLineSlot(slot) {
  return slot?.page === 20 && slot?.index === 0;
}

function isKidsStrokeBaselineDateLineSlot(slot) {
  return (
    isKidsBottomDateLineSlot(slot) ||
    isKidsP16DreamsTopDateLineSlot(slot) ||
    isKidsP20BaptismDateLineSlot(slot)
  );
}

function isKidsMonthPage(page) {
  return typeof page === 'number' && page >= 22 && page <= 33;
}

const PREGNANCY_TYPOGRAPHY = {
  fixedLineFontSize: 16,
  lineCenterRatio: 0.5,
  lineFontOffsetRatio: 0.8,
  blockCenterRatio: 0.58,
  blockFontOffsetRatio: 0.66,
  blockMaxFontSize: 20,
};

function isDiaryInteriorLineGuide(lineGuideId) {
  return lineGuideId === 'diary_interior_brown' || lineGuideId === 'diary_interior_purple';
}

function fitFontSizeToSlot(fontSize, lineHeight, inputKind = 'line', lineGuideId) {
  const profile =
    lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5'
      ? PREGNANCY_TYPOGRAPHY
      : core.getTypography(lineGuideId);

  if (isDiaryInteriorLineGuide(lineGuideId) && profile.fixedLineFontSize != null) {
    const locked = profile.fixedLineFontSize;
    if (Number.isFinite(fontSize) && fontSize !== locked) {
      return Math.min(Math.max(fontSize, 10), 28);
    }
    return locked;
  }
  if (lineGuideId === 'holidays_birthday_60' && Number.isFinite(fontSize)) {
    return Math.min(Math.max(fontSize, 10), 28);
  }
  if (inputKind === 'block') {
    return Math.min(fontSize, Math.max(13, lineHeight * 0.78), profile.blockMaxFontSize ?? 20);
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
  const feelingsGroup = lineGuideId === 'pregnancy_a5' ? 6 : 5;
  return slot.continuationGroup === 3 || slot.continuationGroup === feelingsGroup;
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
  if (lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5') {
    return (slot.inputKind ?? 'line') === 'line';
  }
  if (isBirthQuestionnairePage(lineGuideId, slot.page)) return true;
  if (isAlreadyMomPage(lineGuideId, slot.page)) {
    return (slot.inputKind ?? 'line') === 'line';
  }
  return false;
}

function usesPregnancyWeeklyGuideStrokeBaseline(slot, lineGuideId) {
  if (typeof slot.strokeY !== 'number') return false;
  if (!isPregnancyWeeklyStructuredPage(lineGuideId, slot.page)) return false;
  const feelingsGroup = lineGuideId === 'pregnancy_a5' ? 6 : 5;
  return slot.continuationGroup === 3 || slot.continuationGroup === feelingsGroup;
}

function resolvePregnancyWeeklyStrokeTextMetrics(slot, lineGuideId, fontId, fontTable) {
  const rnRatio = getRnAscentRatioAt16(fontId, fontTable);
  if (usesPregnancyWeeklyGuideStrokeBaseline(slot, lineGuideId)) {
    return {
      capRatio: rnRatio ?? PREGNANCY_WEEKLY_GUIDE_STROKE_FONT_OFFSET,
      lift: 0,
    };
  }
  if (rnRatio != null) {
    return { capRatio: rnRatio, lift: 0 };
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

function getPregnancyWeeklyLineTextTop(slot, fittedSize, lineGuideId, fontId, fontTable) {
  const strokeY = getPregnancyWeeklyLineStrokeY(slot);
  const { capRatio, lift } = resolvePregnancyWeeklyStrokeTextMetrics(
    slot,
    lineGuideId,
    fontId,
    fontTable,
  );
  return strokeY - fittedSize * capRatio - lift;
}

function getPregnancyRuledNotebookLineTextTop(slot, fittedSize) {
  const strokeY = getPregnancyWeeklyLineStrokeY(slot);
  const lift = slot.lineHeight * PREGNANCY_RULED_NOTEBOOK_LIFT_BAND_RATIO;
  return strokeY - fittedSize * PREGNANCY_RULED_NOTEBOOK_CAP_HEIGHT_RATIO - lift;
}

function getAlreadyMomLineTextTop(slot, fittedSize, lineGuideId, fontId, fontTable) {
  const strokeY =
    typeof slot.strokeY === 'number' ? slot.strokeY : slot.y + slot.lineHeight;
  const offset = resolveStrokeBaselinePreviewFontOffset(
    fontId,
    slot,
    lineGuideId,
    fontTable,
  );
  const lift = slot.lineHeight * PREGNANCY_WEEKLY_EXTRA_LIFT_BAND_RATIO;
  const clearance = fittedSize * PREGNANCY_ALREADY_MOM_STROKE_CLEARANCE_RATIO;
  return strokeY - fittedSize * offset - lift - clearance;
}

function getBirthQuestionnaireLineTextTop(slot, fittedSize, fontId, lineGuideId, fontTable) {
  const strokeY =
    typeof slot.strokeY === 'number' ? slot.strokeY : slot.y + slot.lineHeight;
  const offset = resolveStrokeBaselinePreviewFontOffset(
    fontId,
    slot,
    lineGuideId,
    fontTable,
  );
  return strokeY - fittedSize * offset;
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
    const inputKind = slot.inputKind ?? 'block';
    const fittedSize = fitFontSizeToSlot(fontSize, slot.lineHeight, inputKind, lineGuideId);
    return slot.y + slot.lineHeight * 0.56 - fittedSize * 0.72;
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
    return getPregnancyWeeklyLineTextTop(
      slot,
      fittedSize,
      lineGuideId,
      fontId,
      fontTable,
    );
  }

  if (isAlreadyMomPage(lineGuideId, slot.page) && inputKind === 'line') {
    return getAlreadyMomLineTextTop(slot, fittedSize, lineGuideId, fontId, fontTable);
  }

  if (
    isBirthQuestionnairePage(lineGuideId, slot.page) &&
    inputKind === 'line' &&
    slot.lineStrokeAtBottom
  ) {
    return getBirthQuestionnaireLineTextTop(
      slot,
      fittedSize,
      fontId,
      lineGuideId,
      fontTable,
    );
  }

  if (usesStrokeBaselineLayout(slot, lineGuideId)) {
    const lineY = slot.y + slot.lineHeight;
    const preferredSize =
      lineGuideId === 'kids_48' && slot.page === 11
        ? Math.min(fontSize, KIDS_GROWTH_FIXED_LINE_FONT_SIZE)
        : fontSize;
    const lineFitted = fitFontSizeToSlot(
      preferredSize,
      slot.lineHeight,
      inputKind,
      lineGuideId,
    );
    const offset = resolveStrokeBaselinePreviewFontOffset(
      fontId,
      slot,
      lineGuideId,
      fontTable,
    );
    const clearanceRatio =
      lineGuideId === 'kids_48'
        ? slot.page === 10
          ? KIDS_TEETH_STROKE_CLEARANCE_RATIO
          : slot.page === 11
            ? KIDS_GROWTH_STROKE_CLEARANCE_RATIO
            : isKidsStrokeBaselineDateLineSlot(slot)
              ? KIDS_BOTTOM_DATE_STROKE_CLEARANCE_RATIO
              : isKidsMonthPage(slot.page) && (slot.index == null || slot.index >= 1)
                ? KIDS_MONTH_STROKE_CLEARANCE_RATIO
                : slot.page === 1
                  ? KIDS_P1_STROKE_CLEARANCE_RATIO
                  : KIDS_STROKE_CLEARANCE_RATIO
        : 0;
    const clearance = lineFitted * clearanceRatio;
    const amaticSink =
      lineGuideId === 'kids_48' &&
      slot.page === 1 &&
      (slot.index == null || slot.index >= 1)
        ? lineFitted * KIDS_P1_BASELINE_SINK_RATIO
        : lineGuideId === 'kids_48' &&
            slot.page === 10 &&
            (slot.index === 20 || slot.index === 21)
          ? -lineFitted * KIDS_TEETH_BOTTOM_BASELINE_LIFT_RATIO
          : lineGuideId === 'kids_48' && slot.page === 10
            ? lineFitted * KIDS_TEETH_DATE_BASELINE_SINK_RATIO
            : 0;
    return lineY - lineFitted * offset - clearance + amaticSink;
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

const DIARY_AMATIC_VISUAL_SINK_RATIO = 0.08;

function applyDiaryAmaticVisualSink(fontOffsetRatio) {
  return Math.max(0.68, fontOffsetRatio - DIARY_AMATIC_VISUAL_SINK_RATIO);
}

function resolveStrokeBaselinePreviewFontOffset(fontId, slot, lineGuideId, fontTable) {
  const ascent = getRnAscentRatioAt16(fontId, fontTable);
  // pregnancy_60 «Постановка на учёт»: Amatic floats above printed underlines.
  if (lineGuideId === 'pregnancy_60' && slot?.page === 4 && ascent != null) {
    return applyDiaryAmaticVisualSink(Math.min(ascent, 0.96));
  }
  return ascent ?? getStrokeBaselineFontOffset(slot, lineGuideId);
}

function usesPregnancyAlbumRnLineHeightAscent(slot, lineGuideId, allSlots) {
  if (lineGuideId !== 'pregnancy_60' && lineGuideId !== 'pregnancy_a5') return false;
  if ((slot.inputKind ?? 'line') !== 'line') return false;
  if (isPregnancyRuledNotebookPage(lineGuideId, slot.page)) return false;
  if (shouldClipPregnancyWeeklyFieldRow(slot, lineGuideId, allSlots)) return false;
  // p4 preview uses diary Amatic sink — PDF ascent must match that offset.
  if (lineGuideId === 'pregnancy_60' && slot.page === 4) return false;
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
    const { capRatio, lift } = resolvePregnancyWeeklyStrokeTextMetrics(
      slot,
      lineGuideId,
      fontId,
      fontTable,
    );
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
    return resolveStrokeBaselinePreviewFontOffset(fontId, slot, lineGuideId, fontTable);
  }

  if (
    isBirthQuestionnairePage(lineGuideId, slot.page) &&
    inputKind === 'line' &&
    slot.lineStrokeAtBottom
  ) {
    return resolveStrokeBaselinePreviewFontOffset(fontId, slot, lineGuideId, fontTable);
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
  let baseline = previewTextTop + fittedSize * ascentRatio;
  if (isAlreadyMomPage(lineGuideId, slot.page) && inputKind === 'line') {
    baseline -= fittedSize * PREGNANCY_ALREADY_MOM_PDF_BASELINE_LIFT_RATIO;
  }
  if (
    lineGuideId === 'kids_48' &&
    slot.page === 1 &&
    inputKind === 'line' &&
    (slot.index == null || slot.index >= 1)
  ) {
    baseline -= fittedSize * KIDS_P1_PDF_BASELINE_LIFT_RATIO;
  }
  if (
    lineGuideId === 'kids_48' &&
    slot.page === 10 &&
    inputKind === 'line' &&
    (slot.index === 20 || slot.index === 21)
  ) {
    baseline -= fittedSize * KIDS_TEETH_BOTTOM_PDF_BASELINE_LIFT_RATIO;
  }
  if (
    lineGuideId === 'kids_48' &&
    slot.page === 10 &&
    inputKind === 'line' &&
    typeof slot.index === 'number' &&
    slot.index >= 0 &&
    slot.index <= 19
  ) {
    baseline -= fittedSize * KIDS_TEETH_DATE_PDF_BASELINE_LIFT_RATIO;
  }
  if (lineGuideId === 'kids_48' && slot.page === 11 && inputKind === 'line') {
    baseline -= fittedSize * KIDS_GROWTH_PDF_BASELINE_LIFT_RATIO;
  }
  return baseline;
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
