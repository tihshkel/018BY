#!/usr/bin/env node
/**
 * Font picker must not appear on checkbox-only pages (e.g. pregnancy_60 p51).
 * node scripts/test-typography-font-picker.js
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

const TYPOGRAPHY_FIELD_TYPES = new Set(['text', 'date', 'time', 'number']);

function hasTypographyEditableContent(schema) {
  if (!schema) return false;
  if (schema.fields?.some((field) => TYPOGRAPHY_FIELD_TYPES.has(field.type))) {
    return true;
  }
  if (schema.captionEnabled) return true;
  if (
    schema.pageType === 'birthday_free_page' &&
    (schema.customFieldDefs?.length ?? 0) > 0
  ) {
    return true;
  }
  if (
    schema.pageType === 'free_page' ||
    schema.pageType === 'timeline_page' ||
    schema.pageType === 'text_page'
  ) {
    return true;
  }
  return false;
}

function hasFormTextInput(schema) {
  if (!schema) return false;
  if ((schema.fields?.length ?? 0) > 0) return true;
  if (schema.captionEnabled) return true;
  if (
    schema.pageType === 'birthday_free_page' &&
    (schema.customFieldDefs?.length ?? 0) > 0
  ) {
    return true;
  }
  if (
    schema.pageType === 'free_page' ||
    schema.pageType === 'timeline_page' ||
    schema.pageType === 'text_page'
  ) {
    return true;
  }
  return false;
}

const schemasSource = fs.readFileSync(
  path.join(root, 'utils/albumPageNavigation.ts'),
  'utf8',
);
assert(
  schemasSource.includes('hasTypographyEditableContent'),
  'albumPageNavigation exports hasTypographyEditableContent',
);
assert(
  schemasSource.includes("TYPOGRAPHY_FIELD_TYPES"),
  'albumPageNavigation defines typography field types',
);

const formEditorSource = fs.readFileSync(
  path.join(root, 'components/album/album-page-form-editor.tsx'),
  'utf8',
);
assert(
  formEditorSource.includes('hasTypographyEditableContent'),
  'form editor uses hasTypographyEditableContent for font picker',
);

const previewSource = fs.readFileSync(
  path.join(root, 'app/album-page-preview.tsx'),
  'utf8',
);
assert(
  previewSource.includes('hasTypographyEditableContent'),
  'album-page-preview uses hasTypographyEditableContent for font picker',
);

const schemasModule = fs.readFileSync(
  path.join(root, 'constants/generated/album-page-schemas.ts'),
  'utf8',
);
const pregnancyMatch = schemasModule.match(
  /"pageId": "pregnancy_60_p51"[\s\S]*?"fields": \[([\s\S]*?)\],\s*"canDuplicate"/,
);
assert(pregnancyMatch, 'pregnancy_60 page 51 schema found');

const page51FieldsBlock = pregnancyMatch[1];
assert(
  page51FieldsBlock.includes('"type": "radio"'),
  'page 51 has radio fields',
);
assert(
  !page51FieldsBlock.includes('"type": "text"'),
  'page 51 has no text fields',
);

const page51Schema = {
  pageType: 'structured',
  fields: Array.from({ length: 15 }, (_, index) => ({
    fieldId: `pregnancy_60_p51_todo_${index + 1}`,
    type: 'radio',
  })),
};

assert(hasFormTextInput(page51Schema), 'page 51 still counts as form page');
assert(
  !hasTypographyEditableContent(page51Schema),
  'page 51 does not need font picker',
);

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log('\nAll typography font picker checks passed.');
