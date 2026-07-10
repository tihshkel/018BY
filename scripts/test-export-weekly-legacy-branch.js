#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Регрессия: weekly multi-line поля не должны попадать в legacy export-ветку.
 * node scripts/test-export-weekly-legacy-branch.js
 */
const { applyPregnancy60WeeklyLineSlotOverrides } = require('./pregnancy-60-weekly-line-slot-overrides');
const core = require('./lib/text-capacity-core');

const LINE_SLOTS = require('../constants/line-slots.json');
const LINE_GUIDES = require('../constants/line-guides.json');
const ROOT = require('path').join(__dirname, '..');

const SAMPLE =
  'ОТДЫХАТЬ КУШАТЬ И РАДОВАТЬСЯ ЖИЗНИ ХОЧУ КУПИТЬ АРБУЗ И УСТРОИТЬ ПИКНИК';

function getContinuationGroupHead(slots, slotIndex) {
  const tapped = slots[slotIndex];
  if (!tapped) return slotIndex;
  const groupSlots = slots
    .filter((s) => s.continuationGroup === tapped.continuationGroup)
    .sort((a, b) => a.index - b.index);
  return groupSlots[0]?.index ?? slotIndex;
}

function wouldUseLegacyBranch(templateLineStart, templateLineCount, slots) {
  const startSlotIndex = getContinuationGroupHead(slots, templateLineStart);
  return (
    (templateLineCount ?? 1) === 1 && startSlotIndex !== templateLineStart
  );
}

function distribute(slots, start, count, fontTable) {
  return core.distributeTextWithinFieldLines({
    text: SAMPLE,
    startSlotIndex: start,
    lineCount: count,
    slots,
    fontSize: 16,
    lineGuideId: 'pregnancy_60',
    fontId: 'AmaticSC-Bold',
    fontTable,
  });
}

const { slots: refined } = applyPregnancy60WeeklyLineSlotOverrides(
  LINE_SLOTS.pregnancy_60,
  LINE_GUIDES.pregnancy_60,
);
const slots = core.normSlotsToViewportSlots('pregnancy_60', 9, refined['9']);
const fontTable = core.loadFontCharWidths(ROOT);

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('OK:', msg);
  }
}

const plansStart = 3;
const plansCount = 3;
const feelingsStart = 9;
const feelingsCount = 3;

assert(
  !wouldUseLegacyBranch(plansStart, plansCount, slots),
  'plans (start=3, count=3) must not use legacy export branch',
);
assert(
  !wouldUseLegacyBranch(feelingsStart, feelingsCount, slots),
  'feelings (start=9, count=3) must not use legacy export branch',
);

assert(
  wouldUseLegacyBranch(4, 1, slots),
  'true legacy split: single-line non-head slot still detected',
);

const plans = distribute(slots, plansStart, plansCount, fontTable);
const feelings = distribute(slots, feelingsStart, feelingsCount, fontTable);

assert(plans.segments.length === 3, `plans has 3 segments (${plans.segments.length})`);
assert(feelings.segments.length === 3, `feelings has 3 segments (${feelings.segments.length})`);
assert(
  plans.segments.map((s) => s.slotIndex).join(',') === '2,3,4',
  `plans segments on slots ${plans.segments.map((s) => s.slotIndex).join(',')}`,
);
assert(
  feelings.segments.map((s) => s.slotIndex).join(',') === '8,9,10',
  `feelings segments on slots ${feelings.segments.map((s) => s.slotIndex).join(',')}`,
);
const plansJoined = plans.segments.map((s) => s.content).join('');
const feelingsJoined = feelings.segments.map((s) => s.content).join('');
assert(plansJoined.length > 0, 'plans distributes non-empty text');
assert(feelingsJoined.length > 0, 'feelings distributes non-empty text');

if (failed) process.exit(1);
console.log('\nExport weekly legacy branch checks passed.');
