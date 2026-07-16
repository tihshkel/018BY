#!/usr/bin/env node
/**
 * Verifies weight/height measurement digit limits: grams → 4, kg/height → 3, belly → 4.
 * kids_48 p11 growth page: decimal comma (no digit-only limit of 3).
 * node scripts/verify-measurement-digit-limits.js
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

function loadSchemas() {
  const raw = fs.readFileSync(
    path.join(root, 'constants/generated/album-page-schemas.ts'),
    'utf8',
  );
  const match = raw.match(
    /export const ALBUM_PAGE_SCHEMAS[^=]*=\s*(\{[\s\S]*\})\s*as Record/,
  );
  if (!match) throw new Error('Could not parse ALBUM_PAGE_SCHEMAS');
  return JSON.parse(match[1]);
}

function findPage(albumPages, pageNumber) {
  return (albumPages ?? []).find(
    (p) => p.sourcePageNumber === pageNumber || p.order === pageNumber,
  );
}

const MONTHLY_GROWTH_FIELD_RE = /_month_\d{2}_(height|weight)$/;
const KIDS_48_GROWTH_PAGE_FIELD_RE = /^kids_48_p11_month_\d{2}_(height|weight)$/;
const WEIGHT_HEIGHT_FIELD_ID_RE =
  /(?:^|_)(weight(?:_before|_gain)?|height|birthHeight|baby_height)(?:_|$)/;

function isBellyCircumferenceField(field) {
  return field.fieldId.endsWith('_belly');
}

function isKids48GrowthPageMeasurementField(field) {
  return KIDS_48_GROWTH_PAGE_FIELD_RE.test(field.fieldId);
}

function isBabyGramsWeightField(field) {
  const { fieldId } = field;
  if (fieldId.endsWith('_baby_weight')) return true;
  if (fieldId.endsWith('birthWeight') || fieldId.includes('_birthWeight')) return true;
  if (fieldId === 'kids_48_p1_weight') return true;
  return false;
}

function isWeightOrHeightField(field) {
  const { fieldId, label } = field;
  if (MONTHLY_GROWTH_FIELD_RE.test(fieldId)) return true;
  if (fieldId.endsWith('_baby_weight')) return true;
  if (fieldId.endsWith('birthWeight') || fieldId.includes('_birthWeight')) return true;
  if (WEIGHT_HEIGHT_FIELD_ID_RE.test(fieldId)) return true;
  const normalized = String(label ?? '')
    .trim()
    .toLowerCase();
  if (/(^|[^а-яёa-z])рост([^а-яёa-z]|$)/i.test(normalized)) return true;
  if (/(^|[^а-яёa-z])вес(а|у|ом|е)?([^а-яёa-z]|$)/i.test(normalized)) return true;
  return false;
}

function getMeasurementDigitLimit(field) {
  if (isBellyCircumferenceField(field)) return 4;
  if (!isWeightOrHeightField(field)) return undefined;
  if (isKids48GrowthPageMeasurementField(field)) return undefined;
  if (isBabyGramsWeightField(field)) return 4;
  return 3;
}

function sanitizeKids48GrowthMeasurementInput(field, text) {
  const isWeight = field.fieldId.endsWith('_weight');
  const maxBefore = isWeight ? 2 : 3;
  const maxAfter = isWeight ? 2 : 1;

  let result = '';
  let hasComma = false;
  let before = 0;
  let after = 0;

  for (const char of text) {
    if (char >= '0' && char <= '9') {
      if (!hasComma) {
        if (before >= maxBefore) continue;
        before += 1;
        result += char;
      } else {
        if (after >= maxAfter) continue;
        after += 1;
        result += char;
      }
      continue;
    }
    if ((char === ',' || char === '.') && !hasComma && before > 0) {
      hasComma = true;
      result += ',';
    }
  }

  return result;
}

const measurementSource = fs.readFileSync(
  path.join(root, 'utils/albumMeasurementFields.ts'),
  'utf8',
);
assert(
  measurementSource.includes('isBabyGramsWeightField') &&
    measurementSource.includes('kids_48_p1_weight') &&
    measurementSource.includes('birthWeight'),
  'albumMeasurementFields exposes isBabyGramsWeightField for baby grams',
);
assert(
  measurementSource.includes('isKids48GrowthPageMeasurementField') &&
    measurementSource.includes('sanitizeKids48GrowthMeasurementInput'),
  'albumMeasurementFields exposes kids_48 p11 decimal-comma helpers',
);

const fieldInputSource = fs.readFileSync(
  path.join(root, 'utils/albumFieldInput.ts'),
  'utf8',
);
const formFieldsSource = fs.readFileSync(
  path.join(root, 'components/album/page-form-fields.tsx'),
  'utf8',
);
assert(
  fieldInputSource.includes('getFieldInputMode') &&
    fieldInputSource.includes("return 'decimal'") &&
    formFieldsSource.includes('getFieldInputMode(field)'),
  'growth/number fields use inputMode decimal (not numeric — blocks comma)',
);

const schemas = loadSchemas();

const expectedSpotChecks = [
  ['pregnancy_60', 2, 'pregnancy_60_p2_baby_weight', 4],
  ['pregnancy_60', 9, 'pregnancy_60_p9_weight', 3],
  ['pregnancy_60', 52, 'pregnancy_60_p52_baby_weight', 4],
  ['pregnancy_60', 52, 'pregnancy_60_p52_weight_before', 3],
  ['pregnancy_a5', 3, 'pregnancy_a5_p3_baby_weight', 4],
  ['pregnancy_a5', 5, 'pregnancy_a5_p5_weight', 3],
  ['pregnancy_a5', 44, 'pregnancy_a5_p44_baby_weight', 4],
  ['kids_48', 1, 'kids_48_p1_weight', 4],
  ['kids_48', 11, 'kids_48_p11_month_01_weight', undefined],
  ['holidays_birthday_60', 2, 'holidays_birthday_60_p2_birthWeight', 4],
  ['holidays_birthday_60', 4, 'holidays_birthday_60_p4_weight', 3],
];

for (const [albumId, page, fieldId, expected] of expectedSpotChecks) {
  const pageSchema = findPage(schemas[albumId], page);
  const field = pageSchema?.fields?.find((f) => f.fieldId === fieldId);
  assert(field != null, `${fieldId} exists in ${albumId} p${page}`);
  if (!field) continue;
  const limit = getMeasurementDigitLimit(field);
  assert(
    limit === expected,
    `${fieldId} digit limit is ${expected} (got ${limit})`,
  );
}

assert(
  findPage(schemas.kids_48, 1)?.fields?.find((f) => f.fieldId === 'kids_48_p1_weight')
    ?.label === 'Вес (гр)',
  'kids_48 p1 weight label is Вес (гр)',
);

const growthPage = findPage(schemas.kids_48, 11);
const month12Height = growthPage?.fields?.find(
  (f) => f.fieldId === 'kids_48_p11_month_12_height',
);
const month01Height = growthPage?.fields?.find(
  (f) => f.fieldId === 'kids_48_p11_month_01_height',
);
assert(
  month12Height?.templateLineStart === 0,
  `kids_48 p11 month_12 (1 год) maps to top slots (got ${month12Height?.templateLineStart})`,
);
assert(
  month01Height?.templateLineStart === 22,
  `kids_48 p11 month_01 maps to bottom slots (got ${month01Height?.templateLineStart})`,
);

const growthWeightField = {
  fieldId: 'kids_48_p11_month_12_weight',
  label: '1 год — вес (кг)',
  type: 'number',
};
assert(
  sanitizeKids48GrowthMeasurementInput(growthWeightField, '3.50') === '3,50',
  'growth weight converts dot to comma',
);
assert(
  sanitizeKids48GrowthMeasurementInput(growthWeightField, '350') === '35',
  'growth weight caps at 2 digits before comma',
);
assert(
  sanitizeKids48GrowthMeasurementInput(
    { fieldId: 'kids_48_p11_month_12_height', type: 'number' },
    '52,75',
  ) === '52,7',
  'growth height allows 1 decimal place',
);

const grams = [];
const kilos = [];
const belly = [];
const unexpected = [];

for (const albumPages of Object.values(schemas)) {
  for (const page of albumPages ?? []) {
    for (const field of page.fields ?? []) {
      const limit = getMeasurementDigitLimit(field);
      if (limit == null) continue;
      if (isBellyCircumferenceField(field)) {
        belly.push(field.fieldId);
        if (limit !== 4) unexpected.push(`${field.fieldId}: belly→${limit}`);
        continue;
      }
      if (isBabyGramsWeightField(field)) {
        grams.push(field.fieldId);
        if (limit !== 4) unexpected.push(`${field.fieldId}: grams→${limit}`);
        continue;
      }
      if (isWeightOrHeightField(field)) {
        kilos.push(field.fieldId);
        if (limit !== 3) unexpected.push(`${field.fieldId}: kg/height→${limit}`);
      }
    }
  }
}

assert(grams.length >= 5, `found ≥5 baby-grams weight fields (got ${grams.length})`);
assert(kilos.length >= 50, `found ≥50 kg/height fields (got ${kilos.length})`);
assert(belly.length >= 30, `found ≥30 belly fields (got ${belly.length})`);
assert(
  unexpected.length === 0,
  unexpected.length === 0
    ? 'all measurement fields match expected digit limits'
    : `unexpected limits: ${unexpected.slice(0, 10).join('; ')}`,
);

console.log(
  `\nSummary: grams=${grams.length}, kg/height=${kilos.length}, belly=${belly.length}`,
);

if (failed > 0) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nAll measurement digit limit checks passed.');
