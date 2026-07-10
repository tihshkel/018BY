#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Аудит layout p9 «6-я неделя»: PNG-калибровка, baseline, distribute на phone viewport.
 * node scripts/audit-pregnancy-weekly-page9-layout.js
 */
const core = require('./lib/text-capacity-core');
const baseline = require('./lib/template-line-baseline-metrics');

const LINE_SLOTS = require('../constants/line-slots.json');
const LINE_GUIDES = require('../constants/line-guides.json');
const ROOT = require('path').join(__dirname, '..');

const REF_W = core.REFERENCE_VIEWPORT.width;
const WINDOW_WIDTH = 358;
const PHONE_COORD_W = Math.max(WINDOW_WIDTH - 16 * 2, 280);
const PHONE_COORD_H = PHONE_COORD_W * (240 / 180);
const PHONE_VIEWPORT = { width: PHONE_COORD_W, height: PHONE_COORD_H };

const FONT_OFFSET = core.PREGNANCY_WEEKLY_GUIDE_STROKE_FONT_OFFSET;
const MIN_STROKE_GAP_NORM = 0.035;
const BASELINE_TOLERANCE_PX = 3;

const USER_PLANS =
  'ОТДЫХАТЬ КУШАТЬ И РАДОВАТЬСЯ ЖИЗНИ ХОЧУ КУПИТЬ АРБУЗ И УЕХАТЬ ВМЕСТЕ С НИМ НА ДАЧУ КУПАТЬСЯ В';
const USER_FEELINGS =
  'ИНОГДА СТРАННО ТЯНЕТ НИЗ ЖИВОТА И ТОШНИТ Я ВИЖУ КАК ВЫРАСТАЕТ ЖИВОТИК И ПОСТОЯННО ГЛАЖУ ЕГО МОЙ МАЛЫШ КАК РИСОВОЕ ЗЕРНЫШКО';
const LONG_FEELINGS = USER_FEELINGS;
const OVERFLOW_FEELINGS = `${LONG_FEELINGS} ${'А'.repeat(400)}`;

function scaleSlotsToEditorViewport(slots, viewport) {
  const scaleX = viewport.width / REF_W;
  const scaleY = viewport.height / REF_W;
  return slots.map((slot) => ({
    ...slot,
    x: slot.x * scaleX,
    width: slot.width * scaleX,
    y: slot.y * scaleY,
    lineHeight: slot.lineHeight * scaleY,
    strokeY: typeof slot.strokeY === 'number' ? slot.strokeY * scaleY : undefined,
  }));
}


const slotsRef = core.normSlotsToViewportSlots(
  'pregnancy_60',
  9,
  LINE_SLOTS.pregnancy_60['9'],
  LINE_GUIDES,
);
const slotsPhone = scaleSlotsToEditorViewport(slotsRef, PHONE_VIEWPORT);
const fontTable = core.loadFontCharWidths(ROOT);
const fontId = 'AmaticSC-Bold';
const fontSize = 16;

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('OK:', msg);
  }
}

const plansField = core.resolveWeeklyFieldLineSlots(slotsPhone, 3, 3, 'pregnancy_60');
const feelingsField = core.resolveWeeklyFieldLineSlots(slotsPhone, 8, 3, 'pregnancy_60');

assert(
  plansField.map((s) => s.index).join(',') === '2,3,4',
  `plans field slots ${plansField.map((s) => s.index).join(',')}`,
);
assert(
  core.resolveWeeklyFieldLineSlots(slotsPhone, 3, 1, 'pregnancy_60').map((s) => s.index).join(',') === '3',
  'single-line body slot 3 stays on slot 3 (not remapped to tail)',
);
assert(
  core.resolveWeeklyFieldLineSlots(slotsPhone, 2, 1, 'pregnancy_60').map((s) => s.index).join(',') === '2',
  'single-line tail slot 2 stays on slot 2',
);
assert(
  feelingsField.map((s) => s.index).join(',') === '7,8,9',
  `feelings field slots ${feelingsField.map((s) => s.index).join(',')}`,
);

const plansTailInsets = core.getPregnancyWeeklyInlineTailTextInsets(
  slotsPhone[2],
  'pregnancy_60',
  slotsPhone,
);
const feelingsTailInsets = core.getPregnancyWeeklyInlineTailTextInsets(
  slotsPhone[7],
  'pregnancy_60',
  slotsPhone,
);
assert(
  plansTailInsets.left > 50 && plansTailInsets.width > 40,
  `plans inline-tail insets (${plansTailInsets.left.toFixed(1)}px, w=${plansTailInsets.width.toFixed(1)}px)`,
);
assert(
  feelingsTailInsets.left > 50 && feelingsTailInsets.width > 40,
  `feelings inline-tail insets (${feelingsTailInsets.left.toFixed(1)}px, w=${feelingsTailInsets.width.toFixed(1)}px)`,
);

const plansTailRender = core.resolvePregnancyWeeklyFieldRowLayout(
  slotsPhone[2],
  'pregnancy_60',
  slotsPhone,
);
const feelingsTailRender = core.resolvePregnancyWeeklyFieldRowLayout(
  slotsPhone[7],
  'pregnancy_60',
  slotsPhone,
);
assert(
  plansTailRender.viewLeft < 50 && plansTailRender.viewLeft < slotsPhone[2].x - 40,
  `plans slot 2 render viewLeft=${plansTailRender.viewLeft.toFixed(1)}px uses body anchor (not OCR tail x=${slotsPhone[2].x.toFixed(1)})`,
);
assert(
  feelingsTailRender.viewLeft < 50 &&
    feelingsTailRender.viewLeft < slotsPhone[7].x - 40,
  `feelings slot 7 render viewLeft=${feelingsTailRender.viewLeft.toFixed(1)}px uses body anchor (not OCR tail x=${slotsPhone[7].x.toFixed(1)})`,
);
assert(
  plansTailRender.textLeft > 50,
  `plans slot 2 text starts after label (textLeft=${plansTailRender.textLeft.toFixed(1)}px)`,
);

const slots10 = scaleSlotsToEditorViewport(
  core.normSlotsToViewportSlots(
    'pregnancy_60',
    10,
    LINE_SLOTS.pregnancy_60['10'],
    LINE_GUIDES,
  ),
  PHONE_VIEWPORT,
);
const p10PlansTail = core.getPregnancyWeeklyInlineTailTextInsets(
  slots10[2],
  'pregnancy_60',
  slots10,
);
assert(
  Math.abs(plansTailInsets.left - p10PlansTail.left) < 30,
  `p9 plans tail textLeft ≈ p10 (${plansTailInsets.left.toFixed(1)} vs ${p10PlansTail.left.toFixed(1)})`,
);

function auditBaselineGap(slot, label, slots) {
  const previewTop = baseline.getTemplateLinePreviewAbsoluteTextTop(
    slot,
    fontSize,
    'pregnancy_60',
    slots,
  );
  const fittedSize = fontSize;
  const ascentRatio = baseline.resolveTemplateLinePdfAscentRatio(
    slot,
    fittedSize,
    'pregnancy_60',
    fontId,
    fontTable,
    slots,
  );
  const baselineY = previewTop + fittedSize * ascentRatio;
  const gap = Math.abs((slot.strokeY ?? 0) - baselineY);
  assert(
    gap < BASELINE_TOLERANCE_PX,
    `${label} baseline gap ${gap.toFixed(2)}px < ${BASELINE_TOLERANCE_PX}px`,
  );
}

for (const slot of [...plansField, ...feelingsField]) {
  auditBaselineGap(slot, `slot ${slot.index}`, slotsPhone);
}

function auditDistribute(text, startSlotIndex, label, slots) {
  const dist = core.distributeTextWithinFieldLines({
    text,
    startSlotIndex,
    lineCount: 3,
    slots,
    fontSize,
    lineGuideId: 'pregnancy_60',
    fontId,
    fontTable,
  });
  assert(
    dist.segments.every((s) => s.content.length >= 0),
    `${label} distribute returns segments`,
  );
  return dist;
}

const userPlans = auditDistribute(USER_PLANS, 3, 'phone user plans', slotsPhone);
assert(
  userPlans.segments[0].content.length > 0 &&
    userPlans.segments[1].content.length > 0 &&
    userPlans.segments[2].content.length > 0,
  'phone user plans splits across all 3 lines',
);
assert(
  userPlans.segments[0].content.trim().length > 3,
  `phone user plans line 1 not empty (${JSON.stringify(userPlans.segments[0].content.trim().slice(0, 20))}…)`,
);

const slot4 = slotsPhone[4];
const refinedGuides = core.refinePregnancyWeeklyCollapsedGuideStrokes(
  'pregnancy_60',
  9,
  LINE_SLOTS.pregnancy_60['9'],
  LINE_GUIDES.pregnancy_60['9'],
);
const guide4StrokeY = refinedGuides[4] * PHONE_VIEWPORT.height;
assert(
  Math.abs((slot4.strokeY ?? 0) - guide4StrokeY) < 8,
  `plans slot 4 strokeY (${slot4.strokeY?.toFixed(1)}) ≈ guide[4] (${guide4StrokeY.toFixed(1)})`,
);
assert(
  !plansField.some((s) => s.index === 5),
  'plans field excludes phantom slot 5',
);

const rawFeelingsDist = core.distributeTextWithinFieldLines({
  text: OVERFLOW_FEELINGS,
  startSlotIndex: 8,
  lineCount: 3,
  slots: slotsPhone,
  fontSize,
  lineGuideId: 'pregnancy_60',
  fontId,
  fontTable,
});
assert(rawFeelingsDist.truncated, 'long feelings overflows without clamp');

const feelingsPhone = auditDistribute(
  USER_FEELINGS.replace(/ МОЙ МАЛЫШ.*/, ''),
  8,
  'phone user feelings',
  slotsPhone,
);
assert(
  feelingsPhone.segments[0].content.length > 0 &&
    feelingsPhone.segments[1].content.length > 0,
  'phone feelings uses lines 1 and 2',
);

const clampedFeelings = core.clampTextToFieldLines({
  text: OVERFLOW_FEELINGS,
  startSlotIndex: 8,
  lineCount: 3,
  slots: slotsPhone,
  fontSize,
  lineGuideId: 'pregnancy_60',
  fontId,
  fontTable,
});
const feelingsDist = auditDistribute(clampedFeelings, 8, 'clamped feelings', slotsPhone);
assert(
  !feelingsDist.truncated,
  'clamped feelings fits within 3 lines',
);
assert(
  feelingsDist.segments.filter((s) => s.content.trim().length > 0).length <= 3,
  'clamped feelings uses at most 3 non-empty segments',
);

assert(
  refinedGuides[8] - refinedGuides[7] >= MIN_STROKE_GAP_NORM,
  `refined guide gap 7→8 = ${(refinedGuides[8] - refinedGuides[7]).toFixed(4)}`,
);

console.log(`\nPhone viewport: ${PHONE_COORD_W}×${PHONE_COORD_H.toFixed(1)}px`);

if (failed) process.exit(1);
console.log('\nPregnancy weekly p9 layout audit passed.');
