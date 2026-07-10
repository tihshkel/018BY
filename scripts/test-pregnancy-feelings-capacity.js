#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Проверка вместимости «Мои ощущения» (3 строки: inline-tail + 2 body).
 * node scripts/test-pregnancy-feelings-capacity.js
 */
const core = require('./lib/text-capacity-core');

const LINE_SLOTS = require('../constants/line-slots.json');
const LINE_GUIDES = require('../constants/line-guides.json');
const ROOT = require('path').join(__dirname, '..');

const USER_SAMPLE =
  'ИНОГДА СТРАННО ТЯНЕТ НИЗ ЖИВОТА И ТОШНИТ Я ВИЖУ КАК ВЫРАСТАЕТ ЖИВОТИК КАЖДЫЙ ДЕНЬ';

const slots = core.normSlotsToViewportSlots(
  'pregnancy_60',
  9,
  LINE_SLOTS.pregnancy_60['9'],
  LINE_GUIDES,
);
const fieldSlots = core.resolveWeeklyFieldLineSlots(slots, 8, 3, 'pregnancy_60');
const fontTable = core.loadFontCharWidths(ROOT);
const fontId = 'AmaticSC-Bold';
const fontSize = 16;

function distribute(text, startSlotIndex, lineCount) {
  return core.distributeTextWithinFieldLines({
    text,
    startSlotIndex,
    lineCount,
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
    startSlotIndex: 8,
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
  while (!distribute(text, 8, 3).truncated && text.length < 1200) {
    text += ' СЛОВО';
  }
  return text;
}

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
  fieldSlots.map((s) => s.index).join(',') === '7,8,9',
  `weekly feelings slots ${fieldSlots.map((s) => s.index).join(',')}`,
);

const wrongStartField = core.resolveWeeklyFieldLineSlots(slots, 9, 2, 'pregnancy_60');
assert(
  wrongStartField.map((s) => s.index).join(',') === '7,9',
  `wrong startSlotIndex 9 skips body line 8: ${wrongStartField.map((s) => s.index).join(',')}`,
);

const overflowSample = buildOverflowSample(USER_SAMPLE);
assert(
  distribute(overflowSample, 8, 3).truncated,
  `extended sample overflows 3 feelings lines (len=${overflowSample.length})`,
);

const clamped = clamp(overflowSample);
assert(!distribute(clamped, 8, 3).truncated, 'clamped feelings text fits all 3 lines');
assert(clamped.length <= overflowSample.length, 'clamp does not lengthen text');

const wrongFit = distribute(overflowSample, 9, 2);
if (wrongFit.truncated) {
  assert(true, 'wrong startSlotIndex 9 truncates text that fits with start 8');
} else {
  const usedIndices = wrongFit.segments.map((s) => s.slotIndex);
  assert(
    !usedIndices.includes(8),
    'wrong config skips middle body line 8',
  );
}

if (failed) process.exit(1);
console.log('\nPregnancy feelings capacity checks passed.');
