#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Паритет распределения текста: preview (read-only) vs export (drawTemplateText path).
 * node scripts/test-export-preview-distribute-parity.js
 */
const core = require('./lib/text-capacity-core');

const LINE_SLOTS = require('../constants/line-slots.json');
const LINE_GUIDES = require('../constants/line-guides.json');
const ROOT = require('path').join(__dirname, '..');

const SAMPLE_PLANS =
  'ОТДЫХАТЬ КУШАТЬ И РАДОВАТЬСЯ ЖИЗНИ ХОЧУ КУПИТЬ АРБУЗ И УЕХАТЬ ВМЕСТЕ С НИМ НА';
const SAMPLE_FEELINGS =
  'ИНОГДА СТРАННО ТЯНЕТ НИЗ ЖИВОТА И ТОШНИТ Я ВИЖУ КАК ВЫРАСТАЕТ ЖИВОТИК И ПОСТОЯННО ГЛАЖУ ЕГО';

function distribute(slots, start, count, text, fontId, fontTable, fontSize) {
  return core.distributeTextWithinFieldLines({
    text,
    startSlotIndex: start,
    lineCount: count,
    slots,
    fontSize,
    lineGuideId: 'pregnancy_60',
    fontId,
    fontTable,
  });
}

const norms = LINE_SLOTS.pregnancy_60['9'];
const slots = core.normSlotsToViewportSlots('pregnancy_60', 9, norms, LINE_GUIDES);
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

const plans = distribute(slots, 3, 3, SAMPLE_PLANS, fontId, fontTable, fontSize);
const feelings = distribute(slots, 8, 3, SAMPLE_FEELINGS, fontId, fontTable, fontSize);

assert(plans.segments.length === 3, `plans has 3 segments (${plans.segments.length})`);
assert(feelings.segments.length === 3, `feelings has 3 segments (${feelings.segments.length})`);
assert(!plans.truncated, 'plans sample fits without truncation');
assert(!feelings.truncated, 'feelings sample fits without truncation');
assert(
  plans.segments[0].content.length > 20,
  'plans text uses full inline-tail width on first line',
);
assert(
  feelings.segments[0].content.length > 0,
  'feelings text uses inline-tail line',
);
const feelingsTotal = feelings.segments.reduce((sum, s) => sum + s.content.length, 0);
const feelingsMaxShare =
  feelingsTotal > 0
    ? Math.max(...feelings.segments.map((s) => s.content.length)) / feelingsTotal
    : 0;
assert(
  feelingsMaxShare < 0.85 || feelings.segments.filter((s) => s.content.length > 0).length === 1,
  `feelings no line hoards >85% of text (${(feelingsMaxShare * 100).toFixed(0)}%)`,
);

console.log('plans segments:', JSON.stringify(plans.segments.map((s) => s.content)));
console.log('feelings segments:', JSON.stringify(feelings.segments.map((s) => s.content)));

if (failed) process.exit(1);
console.log('\nExport/preview distribute parity sample passed.');
