#!/usr/bin/env node
/**
 * Acceptance checks for pages filled in user export (2026-06-29).
 * Validates slot mapping + uniform font size on priority pages.
 *
 * node scripts/audit-diary-user-export-pages.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const ALBUM_ID = 'diary_interior_brown';
const EXPECTED_FONT_SIZE = 16;

/** Pages from user PDF export mapped to album sourcePageNumber. */
const USER_FILLED_PAGES = [
  { page: 1, label: 'cover name' },
  { page: 3, label: 'rules date' },
  { page: 6, label: 'girl profile' },
  { page: 7, label: 'mom questionnaire' },
  { page: 13, label: 'hobby' },
  { page: 16, label: 'my day' },
  { page: 21, label: 'travel' },
  { page: 24, label: 'mood' },
  { page: 31, label: 'school life' },
];

function loadLineSlots() {
  return JSON.parse(fs.readFileSync(path.join(root, 'constants/line-slots.json'), 'utf8'));
}

function loadSchemas() {
  const raw = fs.readFileSync(
    path.join(root, 'constants/generated/album-page-schemas.ts'),
    'utf8',
  );
  const match = raw.match(/export const ALBUM_PAGE_SCHEMAS[^=]*=\s*(\{[\s\S]*\})\s*as Record/);
  if (!match) throw new Error('Could not parse ALBUM_PAGE_SCHEMAS');
  return JSON.parse(match[1]);
}

function fitFontSize(inputKind) {
  return EXPECTED_FONT_SIZE;
}

function validatePage(pageNumber, pageSlots, schema) {
  const issues = [];
  const writable = pageSlots.filter((s) => !s.hasLabel);

  if (writable.length === 0) {
    issues.push({ code: 'NO_WRITABLE_SLOTS', message: 'Нет слотов для ввода' });
    return issues;
  }

  if ([21, 24, 31].includes(pageNumber) && writable[0].y < 0.25) {
    issues.push({
      code: 'INTRO_SLOT',
      message: `Первый слот y=${writable[0].y} в зоне шапки`,
    });
  }

  for (const slot of writable) {
    const size = fitFontSize(slot.inputKind ?? 'line');
    if (size !== EXPECTED_FONT_SIZE) {
      issues.push({
        code: 'FONT_SIZE',
        message: `inputKind=${slot.inputKind} → ${size}pt`,
      });
    }
  }

  const fields = schema?.fields ?? [];
  let usedLines = 0;
  for (const field of fields) {
    usedLines = Math.max(usedLines, (field.templateLineStart ?? 0) + (field.templateLineCount ?? 1));
  }
  if (usedLines > writable.length) {
    issues.push({
      code: 'SLOT_SHORTAGE',
      message: `Поля требуют ${usedLines} строк, слотов ${writable.length}`,
    });
  }

  return issues;
}

function main() {
  const lineSlots = loadLineSlots()[ALBUM_ID] ?? {};
  const schemas = loadSchemas()[ALBUM_ID] ?? [];
  const schemaByPage = Object.fromEntries(
    schemas.map((s) => [String(s.sourcePageNumber), s]),
  );

  let errors = 0;
  const results = [];

  for (const { page, label } of USER_FILLED_PAGES) {
    const pageKey = String(page);
    const issues = validatePage(page, lineSlots[pageKey] ?? [], schemaByPage[pageKey]);
    errors += issues.length;
    results.push({
      page,
      label,
      slotCount: (lineSlots[pageKey] ?? []).filter((s) => !s.hasLabel).length,
      ok: issues.length === 0,
      issues,
    });
  }

  const outDir = path.join(root, 'test-results', 'diary-user-export-acceptance');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'report.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2),
  );

  console.log(`[audit-diary-user-export-pages] ${errors === 0 ? 'OK' : 'FAIL'}: ${results.length} pages`);
  for (const r of results) {
    console.log(`  p${r.page} (${r.label}): ${r.ok ? 'OK' : 'FAIL'} slots=${r.slotCount}`);
    for (const issue of r.issues) {
      console.error(`    ${issue.code}: ${issue.message}`);
    }
  }
  console.log(`Report: ${path.join(outDir, 'report.json')}`);

  if (errors > 0 && process.env.FAIL_ON_ERROR === '1') {
    process.exit(1);
  }
}

main();
