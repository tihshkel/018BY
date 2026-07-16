#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Проверка вместимости «Планы на неделю» (3 строки: inline-tail + 2 body).
 * node scripts/test-pregnancy-plans-capacity.js
 */
const {
  applyPregnancy60WeeklyLineSlotOverrides,
  applyPregnancyA5WeeklyLineSlotOverrides,
} = require('./pregnancy-60-weekly-line-slot-overrides');
const core = require('./lib/text-capacity-core');

const LINE_SLOTS = require('../constants/line-slots.json');
const LINE_GUIDES = require('../constants/line-guides.json');
const ROOT = require('path').join(__dirname, '..');

const USER_SAMPLE =
  'ОТДЫХАТЬ КУШАТЬ И РАДОВАТЬСЯ ЖИЗНИ ХОЧУ КУПИТЬ АРБУЗ И УСТРОИТЬ ПИКНИК НА ВЫХОДНЫХ';

const { slots: refinedSlots } = applyPregnancy60WeeklyLineSlotOverrides(
  LINE_SLOTS.pregnancy_60,
  LINE_GUIDES.pregnancy_60,
);
const slots = core.normSlotsToViewportSlots('pregnancy_60', 9, refinedSlots['9']);
const fieldSlots = core.resolveWeeklyFieldLineSlots(slots, 3, 3, 'pregnancy_60');
const fontTable = core.loadFontCharWidths(ROOT);
const fontId = 'AmaticSC-Bold';
const fontSize = 16;

function distribute(text) {
  return core.distributeTextWithinFieldLines({
    text,
    startSlotIndex: 3,
    lineCount: 3,
    slots,
    fontSize,
    lineGuideId: 'pregnancy_60',
    fontId,
    fontTable,
  });
}

function clamp(text) {
  return core.clampTextToFieldLines({
    text,
    startSlotIndex: 3,
    lineCount: 3,
    slots,
    fontSize,
    lineGuideId: 'pregnancy_60',
    fontId,
    fontTable,
  });
}

function buildOverflowSample(base) {
  let text = base;
  while (!distribute(text).truncated && text.length < 800) {
    text += ' СЛОВО';
  }
  return text;
}

const correctLimit = clamp(core.FIELD_LIMIT_PROBE_CYRILLIC).length;

const wrongLimit = (() => {
  let remaining = core.FIELD_LIMIT_PROBE_CYRILLIC;
  for (const idx of [2, 3, 4]) {
    const slot = slots[idx];
    if (!slot) break;
    const { rest } = core.consumeOneLine(
      remaining,
      slot,
      fontSize,
      'pregnancy_60',
      fontId,
      fontTable,
    );
    remaining = rest;
  }
  return core.FIELD_LIMIT_PROBE_CYRILLIC.length - remaining.length;
})();

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('OK:', msg);
  }
}

assert(
  fieldSlots.map((s) => s.index).join(',') === '2,3,4',
  `weekly plans slots ${fieldSlots.map((s) => s.index).join(',')}`,
);

assert(correctLimit > 0, `weekly layout limit is ${correctLimit}`);
assert(
  correctLimit >= wrongLimit,
  `weekly layout limit (${correctLimit}) should not be below old wrong-slot mapping (${wrongLimit})`,
);

const overflowSample = buildOverflowSample(USER_SAMPLE);
const overflow = distribute(overflowSample);
assert(overflow.truncated, 'extended sample overflows 3 weekly lines');

const clampedOverflow = clamp(overflowSample);
const clampedFit = distribute(clampedOverflow);
assert(!clampedFit.truncated, 'clamped text fits all 3 weekly lines');
assert(
  clampedOverflow.length < overflowSample.length,
  'clamp shortens overflowing text',
);

const { slots: refinedA5Slots } = applyPregnancyA5WeeklyLineSlotOverrides(
  LINE_SLOTS.pregnancy_a5,
  LINE_GUIDES.pregnancy_a5,
);
const a5Slots = core.normSlotsToViewportSlots('pregnancy_a5', 5, refinedA5Slots['5']);
const a5FieldSlots = core.resolveWeeklyFieldLineSlots(a5Slots, 3, 3, 'pregnancy_a5');
const distributeA5 = (text) =>
  core.distributeTextWithinFieldLines({
    text,
    startSlotIndex: 3,
    lineCount: 3,
    slots: a5Slots,
    fontSize,
    lineGuideId: 'pregnancy_a5',
    fontId,
    fontTable,
  });
const clampA5 = (text) =>
  core.clampTextToFieldLines({
    text,
    startSlotIndex: 3,
    lineCount: 3,
    slots: a5Slots,
    fontSize,
    lineGuideId: 'pregnancy_a5',
    fontId,
    fontTable,
  });
const a5OverflowSample = (() => {
  let text = USER_SAMPLE;
  while (!distributeA5(text).truncated && text.length < 800) {
    text += ' СЛОВО';
  }
  return text;
})();
const a5Clamped = clampA5(a5OverflowSample);

assert(
  a5FieldSlots.map((slot) => slot.index).join(',') === '2,3,4',
  `A5 plans use all printed slots ${a5FieldSlots.map((slot) => slot.index).join(',')}`,
);
assert(distributeA5(a5OverflowSample).truncated, 'extended sample overflows A5 plan lines');
assert(!distributeA5(a5Clamped).truncated, 'clamped A5 plans fit all printed lines');
assert(a5Clamped.length < a5OverflowSample.length, 'A5 clamp shortens only overflowing text');

const naiveSlice = overflowSample.slice(0, wrongLimit);
const naiveFit = distribute(naiveSlice);
if (naiveFit.truncated) {
  assert(true, 'naive wrong-slot limit can still overflow weekly layout');
} else {
  console.log(
    'NOTE: naive wrong-slot limit happens to fit weekly layout for this probe',
  );
}

console.log('\nfield slot widths:', fieldSlots.map((s) => Math.round(s.width)).join(', '));
console.log('weekly layout limit chars:', correctLimit);
console.log('naive slice limit chars:', wrongLimit);
console.log('overflow sample length:', overflowSample.length, '→ clamped:', clampedOverflow.length);

if (failed) process.exit(1);
console.log('\nPregnancy plans capacity checks passed.');
