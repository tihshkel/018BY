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
  exportTemplateSource.includes('resolveTemplateLineViewportBaseline') &&
    exportTemplateSource.includes('allSlots: slots'),
  'exportTemplateText passes slots to viewport baseline resolver',
);
assert(
  exportTemplateSource.includes('resolveMeasureTextWidth') &&
    exportTemplateSource.includes('baseFontSize'),
  'export distribute uses font-table metrics (preview parity)',
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

assert(
  exportTemplateSource.includes('resolveMeasureTextWidth'),
  'export uses font-table fallback when PDF font missing',
);

const exportPdfSource = read('app/export-pdf.tsx');
assert(
  exportPdfSource.includes('pageSourceSize.width') &&
    exportPdfSource.includes('Canonical source size'),
  'export-pdf prefers pageSourceSize over embedded JPEG dims',
);

assert(
  templateSource.includes('getBirthQuestionnaireLineTextTop') &&
    templateSource.includes('isBirthQuestionnairePage(lineGuideId, slot.page)'),
  'birth questionnaire uses weekly-style baseline',
);

const readOnlySource = read('components/read-only-page-annotations.tsx');
assert(
  readOnlySource.includes('resolveMeasureTextWidth') &&
    readOnlySource.includes('measureTextWidth'),
  'read-only preview uses font-table text measure',
);
assert(
  readOnlySource.includes('resolvePregnancyWeeklyFieldRowLayout') &&
    readOnlySource.includes('shouldClipPregnancyWeeklyFieldRow') &&
    readOnlySource.includes('getTemplateBlockTextInsets') &&
    readOnlySource.includes('lineSlots ?? undefined'),
  'read-only preview uses weekly clipWeeklyRow path with allSlots',
);
assert(
  templateSource.includes('resolvePregnancyWeeklyFieldRowLayout') &&
    templateSource.includes('resolveTemplateTextRenderBox(slot, insets)') &&
    !templateSource.includes('viewLeft: slot.x,\n    viewWidth: bodyWidth'),
  'weekly render fallback uses template insets, not raw slot.x',
);

const slots = require('../constants/line-slots.json').pregnancy_60['9'];
assert(slots[3] && slots[8], 'page 9 has plans slot 3 and feelings slot 8');
assert(
  slots[7].hasLabel === true && slots[8].hasLabel === false,
  'feelings label on slot 7, text starts slot 8',
);

const planLine3 = slots[5];
assert(planLine3 && planLine3.lineStrokeAtBottom, 'page 9 plan line 3 uses stroke baseline');
const planLine3Stroke = planLine3.y + planLine3.height;
assert(
  Math.abs(planLine3Stroke - 0.45375) < 0.002,
  'page 9 plan line 3 stroke aligns with LINE_GUIDES index 5',
);

const schemasRaw = read('constants/generated/album-page-schemas.ts');
const p52Block = schemasRaw.match(/"pageId": "pregnancy_60_p52"[\s\S]*?"pageId": "pregnancy_60_p53"/);
assert(p52Block, 'pregnancy_60 p52 schema exists');
assert(
  !p52Block[0].includes('"photoBlocks"'),
  'pregnancy_60 p52 has no photoBlocks',
);
assert(
  p52Block[0].includes('"fieldId": "pregnancy_60_p52_condition"') &&
    p52Block[0].includes('"templateLineStart": 20'),
  'pregnancy_60 p52 condition maps to slot 20',
);

const p52Slots = require('../constants/line-slots.json').pregnancy_60['52'];
assert(p52Slots[20]?.inputKind === 'line', 'pregnancy_60 p52 slot 20 is condition line');
assert(
  Math.abs(p52Slots[20].y + p52Slots[20].height - 0.6193) < 0.003,
  'pregnancy_60 p52 condition line stroke at 0.6193',
);
assert(
  p52Slots[0]?.textAnchorTop === true && p52Slots[0]?.lineStrokeAtBottom === true,
  'pregnancy_60 p52 line slots use textAnchorTop + lineStrokeAtBottom',
);
assert(
  Math.abs(p52Slots[0].y + p52Slots[0].height - 0.1762) < 0.003,
  'pregnancy_60 p52 age line stroke at 0.1762',
);
assert(p52Slots[15]?.hasLabel === false, 'pregnancy_60 p52 delivery block has external label');
assert(
  p52Slots[9]?.inputKind === 'block' && p52Slots[13]?.inputKind === 'block',
  'pregnancy_60 p52 white blocks at slots 9 and 13',
);

const p52Fills = require('../constants/generated/pdf-circle-slots.json').pregnancy_60['52'];
assert(
  Array.isArray(p52Fills?.optionFills) && p52Fills.optionFills.length === 8,
  'pregnancy_60 p52 has 8 checkbox option fills',
);
assert(
  p52Fills.optionFills.some(
    (fill) => fill.id === 'gender_boy' && fill.fieldId === 'pregnancy_60_p52_baby_gender',
  ),
  'pregnancy_60 p52 gender boy fill registered',
);
assert(
  p52Fills.optionFills[0].width >= 0.033 && p52Fills.optionFills[0].height >= 0.025,
  'pregnancy_60 p52 checkbox fills cover printed boxes',
);
const p50Fills = require('../constants/generated/pdf-circle-slots.json').pregnancy_60['50'];
assert(
  Array.isArray(p50Fills?.optionFills) && p50Fills.optionFills.length === 36,
  'pregnancy_60 p50 shopping list has 36 checkbox option fills',
);
assert(
  p50Fills.optionFills[0]?.fieldId === 'pregnancy_60_p50_purchased_1' &&
    p50Fills.optionFills[0]?.option === 'Да',
  'pregnancy_60 p50 first shopping checkbox maps to purchased_1',
);

assert(
  !templateSource.includes('PDF_BLOCK_STROKE_CLEARANCE_RATIO'),
  'p52 block fields: PDF baseline derives from getTemplateLineTextTop, not strokeY clearance',
);
assert(
  templateSource.includes('getTemplateLinePreviewAbsoluteTextTop') &&
    templateSource.includes('resolveTemplateLinePdfAscentRatio') &&
    templateSource.includes('return TEMPLATE_LINE_CAP_HEIGHT_RATIO'),
  'block and default line fields use preview top + ascent ratio for PDF baseline',
);

const p54Slots = require('../constants/line-slots.json').pregnancy_60['54'];
assert(Array.isArray(p54Slots) && p54Slots.length === 9, 'pregnancy_60 p54 has 9 line slots');
assert(
  p54Slots[0]?.lineStrokeAtBottom === true && p54Slots[5]?.hasLabel === true,
  'p54 name and wishes slots use stroke baseline',
);
assert(
  templateSource.includes('resolveAlreadyMomLineStrokeY') &&
    templateSource.includes('resolveTemplateLineViewportBaseline') &&
    templateSource.includes('PREGNANCY_ALREADY_MOM_STROKE_CLEARANCE_RATIO') &&
    templateSource.includes('PREGNANCY_ALREADY_MOM_PDF_BASELINE_LIFT_RATIO') &&
    templateSource.includes('PREGNANCY_WEEKLY_EXTRA_LIFT_BAND_RATIO') &&
    templateSource.includes('getAlreadyMomLineTextTop') &&
    !exportTemplateSource.includes('heightAtSize') &&
    exportTemplateSource.includes('fontId'),
  'p54 already-mom: EXTRA_LIFT preview + PDF-only baseline lift',
);
assert(
  marginsSource.includes('PREGNANCY_ALREADY_MOM_STROKE_CLEARANCE_RATIO') &&
    marginsSource.includes('PREGNANCY_ALREADY_MOM_PDF_BASELINE_LIFT_RATIO'),
  'already-mom stroke clearance + PDF baseline lift constants are defined',
);
assert(
  readOnlySource.includes('resolveTemplateLineRowLayout'),
  'read-only preview uses shared resolveTemplateLineRowLayout',
);
const pdfAnnotationsSource = read('components/pdf-annotations.tsx');
assert(
  pdfAnnotationsSource.includes('resolveTemplateLineRowLayout'),
  'pdf-annotations uses shared resolveTemplateLineRowLayout',
);
assert(
  templateSource.includes("lineGuideId === 'pregnancy_60' && slot.page === 4") &&
    templateSource.includes('applyDiaryAmaticVisualSink(Math.min(ascent, 0.96))') &&
    templateSource.includes('usesPregnancyAlbumRnLineHeightAscent'),
  'pregnancy_60 p4: Amatic sink in preview; PDF ascent matches (not raw rnRatio)',
);
assert(
  templateSource.includes('getRnAscentRatioAt16') &&
    templateSource.includes('usesPregnancyAlbumRnLineHeightAscent'),
  'baseline resolver uses calibrated RN ascent ratio',
);
assert(
  textSlotsSource.includes('isAlreadyMomGuidePage') &&
    textSlotsSource.includes('page === 54'),
  'p54 strokeY uses LINE_GUIDES in getLineSlotsForPage',
);

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log('\nAll export weekly baseline checks passed.');
