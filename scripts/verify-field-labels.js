#!/usr/bin/env node
/**
 * Verifies field labels in album-page-schemas match TZ specs (primary) or OCR content (fallback).
 * node scripts/verify-field-labels.js
 */
const fs = require('fs');
const path = require('path');
const {
  resolveExpectedFields,
  loadFieldLabelResources,
  normalizeLabel,
  isGenericLabel,
} = require('./resolve-expected-page-fields');

const root = path.join(__dirname, '..');

const ALBUM_IDS = [
  'pregnancy_60',
  'pregnancy_a5',
  'kids_48',
  'holidays_birthday_60',
  'diary_interior_brown',
  'diary_interior_purple',
  'family_blank',
  'holidays_blank',
  'family_blank_21x21',
];

const PAGE_COUNTS = {
  pregnancy_60: 60,
  pregnancy_a5: 48,
  kids_48: 48,
  holidays_birthday_60: 48,
  diary_interior_brown: 60,
  diary_interior_purple: 40,
  family_blank: 20,
  holidays_blank: 20,
  family_blank_21x21: 20,
};

const BLANK_ALBUMS = new Set(['family_blank', 'holidays_blank', 'family_blank_21x21']);

function loadSchemas() {
  const raw = fs.readFileSync(path.join(root, 'constants/generated/album-page-schemas.ts'), 'utf8');
  const match = raw.match(/export const ALBUM_PAGE_SCHEMAS[^=]*=\s*(\{[\s\S]*\})\s*as Record/);
  if (!match) {
    throw new Error('Could not parse ALBUM_PAGE_SCHEMAS from album-page-schemas.ts');
  }
  return JSON.parse(match[1]);
}

function loadLineSlots() {
  return JSON.parse(fs.readFileSync(path.join(root, 'constants/line-slots.json'), 'utf8'));
}

function checkMonotonicOrder(fields, issues) {
  let previous = -1;
  for (const field of fields) {
    const start = field.templateLineStart ?? 0;
    if (start < previous) {
      issues.push({
        type: 'order',
        message: `templateLineStart ${start} is before previous ${previous} for "${field.label}"`,
      });
    }
    previous = start;
  }
}

function checkSlotAlignment(fields, slots, issues, warnOnly = true) {
  if (!slots?.length || !fields.length) return;
  const labelSlots = slots
    .map((slot, index) => ({ index, y: slot.y ?? slot.normY ?? index }))
    .filter((_, index) => slots[index].inputKind !== 'block');

  for (const field of fields) {
    const start = field.templateLineStart ?? 0;
    const end = start + (field.templateLineCount ?? 1) - 1;
    if (end >= labelSlots.length) continue;
    const startY = labelSlots[start]?.y ?? start;
    const endY = labelSlots[end]?.y ?? end;
    if (endY < startY) {
      issues.push({
        type: warnOnly ? 'warn_slot' : 'slot',
        message: `Field "${field.label}" slot range Y decreases (${startY} -> ${endY})`,
      });
    }
  }
}

function getEffectiveSchemaFields(schema) {
  if (schema.customFieldDefs?.length) {
    return schema.customFieldDefs.map((def, index) => ({
      fieldId: def.id,
      label: def.defaultLabel,
      type: 'text',
      required: false,
      templateLineStart: index,
      templateLineCount: 1,
    }));
  }
  return schema.fields ?? [];
}

function verifyPage(albumId, pageNumber, schema, slots, resources) {
  const actualFields = getEffectiveSchemaFields(schema);
  const { source, fields: expectedFields } = resolveExpectedFields(
    albumId,
    pageNumber,
    slots,
    resources,
  );
  const issues = [];
  const warnings = [];

  for (const field of actualFields) {
    if (isGenericLabel(field.label)) {
      issues.push({
        type: 'generic',
        message: `Generic label "${field.label}" on p${pageNumber}`,
      });
    }
  }

  if (BLANK_ALBUMS.has(albumId)) {
    checkMonotonicOrder(actualFields, issues);
    return {
      albumId,
      page: pageNumber,
      source,
      expected: [],
      actual: actualFields.map((f) => f.label),
      issues,
      warnings,
    };
  }

  if (source === 'tz' || source === 'content') {
    if (expectedFields.length !== actualFields.length) {
      issues.push({
        type: 'count',
        message: `Expected ${expectedFields.length} fields (${source}), got ${actualFields.length}`,
      });
    }

    const compareLength = Math.min(expectedFields.length, actualFields.length);
    for (let index = 0; index < compareLength; index += 1) {
      const expectedLabel = normalizeLabel(expectedFields[index].label);
      const actualLabel = normalizeLabel(actualFields[index].label);
      if (expectedLabel !== actualLabel) {
        issues.push({
          type: 'label',
          message: `p${pageNumber} field ${index + 1}: expected "${expectedFields[index].label}", got "${actualFields[index].label}"`,
        });
      }
    }
  }

  checkMonotonicOrder(actualFields, issues);
  if (schema.pageType !== 'birthday_free_page') {
    checkSlotAlignment(actualFields, slots, warnings, true);
  }

  return {
    albumId,
    page: pageNumber,
    source,
    expected: expectedFields.map((f) => f.label),
    actual: actualFields.map((f) => f.label),
    issues,
    warnings,
  };
}

function main() {
  const schemas = loadSchemas();
  const lineSlots = loadLineSlots();
  const resources = loadFieldLabelResources(root);
  const report = [];
  const albumSummary = {};
  let failCount = 0;
  let warnCount = 0;

  for (const albumId of ALBUM_IDS) {
    const pages = schemas[albumId] ?? [];
    const albumSlots = lineSlots[albumId] ?? {};
    let albumFails = 0;
    let albumWarns = 0;

    for (let pageNumber = 1; pageNumber <= (PAGE_COUNTS[albumId] ?? pages.length); pageNumber += 1) {
      const schema = pages.find((p) => p.sourcePageNumber === pageNumber) ?? pages[pageNumber - 1];
      if (!schema) continue;
      const slots = albumSlots[String(pageNumber)] ?? [];
      const pageReport = verifyPage(albumId, pageNumber, schema, slots, resources);
      if (pageReport.issues.length > 0 || pageReport.warnings.length > 0) {
        report.push(pageReport);
      }
      albumFails += pageReport.issues.length;
      albumWarns += pageReport.warnings.length;
    }

    albumSummary[albumId] = { fails: albumFails, warns: albumWarns };
    failCount += albumFails;
    warnCount += albumWarns;

    const status = albumFails === 0 ? 'OK' : 'FAIL';
    console.log(
      `${status}: ${albumId} — ${albumFails} issue(s), ${albumWarns} warning(s)`,
    );
  }

  const reportPath = path.join(root, 'scripts/field-labels-report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), albumSummary, pages: report }, null, 2),
    'utf8',
  );
  console.log(`\nWrote ${reportPath}`);

  if (failCount > 0) {
    console.error(`\n${failCount} field label issue(s) across albums`);
    process.exit(1);
  }

  if (warnCount > 0) {
    console.log(`\n${warnCount} slot-alignment warning(s) (non-blocking)`);
  }

  console.log('\nAll field label checks passed.');
}

main();
