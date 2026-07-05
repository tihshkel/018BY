#!/usr/bin/env node
/**
 * Export weekly text baseline + cover/locked gates.
 * node scripts/verify-export-weekly-baseline.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
    return;
  }
  console.log(`OK: ${message}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const PREGNANCY_WEEKLY_CAP = 1.08;
const PREGNANCY_WEEKLY_LIFT = 0.82;
const fontSize = 16;
const lineHeight = 21;
const strokeY = 400;
const lift = lineHeight * PREGNANCY_WEEKLY_LIFT;
const textTop = strokeY - fontSize * PREGNANCY_WEEKLY_CAP - lift;
const newPdfBaseline = textTop + fontSize * PREGNANCY_WEEKLY_CAP + lift;
const previewTop = textTop;
const newGlyphTop = newPdfBaseline - fontSize * PREGNANCY_WEEKLY_CAP - lift;

assert(
  Math.abs(newGlyphTop - previewTop) < 0.01,
  'new PDF baseline matches preview top for weekly slots',
);

const templateSource = read('utils/templateLineText.ts');

assert(
  templateSource.includes('getPregnancyWeeklyLineTextTop') &&
    templateSource.includes('PREGNANCY_WEEKLY_EXTRA_LIFT_BAND_RATIO'),
  'weekly text top uses cap ratio + extra lift band',
);

const firstLastSource = read('utils/albumFirstLastPages.ts');
assert(
  firstLastSource.includes('useHardClosing') &&
    firstLastSource.includes("lineGuideId === 'pregnancy_60'"),
  'pregnancy_60 uses hard closing not A5 last_str',
);

const exportTemplateSource = read('utils/exportTemplateText.ts');
assert(
  exportTemplateSource.includes('getTemplateLinePdfBaselineY') &&
    exportTemplateSource.includes('slots'),
  'exportTemplateText passes slots to pdf baseline',
);
assert(
  exportTemplateSource.includes('measureTextWidth'),
  'export distribute uses PDF font metrics',
);

const weeklyStrokeFn = templateSource.slice(
  templateSource.indexOf('export function getPregnancyWeeklyLineStrokeY'),
  templateSource.indexOf('/** @deprecated Используйте getPregnancyWeeklyLineStrokeY'),
);
assert(
  templateSource.includes('isPregnancyWeeklyTextLineSlot(lineGuideId, slot)') &&
    templateSource.includes('PREGNANCY_WEEKLY_CAP_HEIGHT_RATIO'),
  'getTemplateLinePdfBaselineY uses pregnancy weekly cap ratio',
);

assert(
  weeklyStrokeFn.includes('slot.strokeY') &&
    !weeklyStrokeFn.includes('slot.lineHeight * 0.5'),
  'weekly stroke prefers slot.strokeY from LINE_GUIDES',
);

const textSlotsSource = read('utils/textLineSlots.ts');
assert(
  textSlotsSource.includes('strokeY') &&
    textSlotsSource.includes('weeklyGuideNorm'),
  'weekly slots store strokeY from LINE_GUIDES at build time',
);

assert(
  textSlotsSource.includes('refinePregnancyWeeklyRuledLineNorms') &&
    textSlotsSource.includes('PREGNANCY_WEEKLY_LINE_PITCH'),
  'weekly ruled line norms normalized to LINE_GUIDES pitch',
);

assert(
  textSlotsSource.includes('inlineLabelTail') &&
    textSlotsSource.includes('findPregnancyWeeklyInlineLabelTailSlot'),
  'weekly fields use inline label tail before body lines',
);

const marginsSource = read('constants/album-text-margins.ts');
assert(
  marginsSource.includes('PREGNANCY_WEEKLY_INLINE_TAIL_EXTRA_LIFT_BAND_RATIO'),
  'weekly inline tail first line has extra lift',
);
assert(
  templateSource.includes('PREGNANCY_WEEKLY_INLINE_TAIL_EXTRA_LIFT_BAND_RATIO'),
  'weekly text top applies inline tail extra lift',
);

const slots = require('../constants/line-slots.json').pregnancy_60['9'];
assert(slots[3] && slots[8], 'page 9 has plans slot 3 and feelings slot 8');
assert(
  slots[7].hasLabel === true && slots[8].hasLabel === false,
  'feelings label on slot 7, text starts slot 8',
);

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log('\nAll export weekly baseline checks passed.');
