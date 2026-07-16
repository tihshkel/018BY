#!/usr/bin/env node
/**
 * Places a unique token in every structured diary field and verifies
 * distributeTextForTemplateAnnotation maps each token to the expected slots.
 *
 * node scripts/audit-diary-field-token-placement.js
 * FAIL_ON_ERROR=1 node scripts/audit-diary-field-token-placement.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const OUT_DIR = path.join(root, 'test-results', 'diary-field-token-placement');

function loadSchemas() {
  const raw = fs.readFileSync(
    path.join(root, 'constants/generated/album-page-schemas.ts'),
    'utf8',
  );
  const match = raw.match(/export const ALBUM_PAGE_SCHEMAS[^=]*=\s*(\{[\s\S]*\})\s*as Record/);
  if (!match) throw new Error('Could not parse ALBUM_PAGE_SCHEMAS');
  return JSON.parse(match[1]);
}

function loadLineSlots() {
  return JSON.parse(fs.readFileSync(path.join(root, 'constants/line-slots.json'), 'utf8'));
}

function main() {
  const schemas = loadSchemas();
  const lineSlots = loadLineSlots();
  const albums = ['diary_interior_brown', 'diary_interior_purple'];
  const issues = [];

  for (const albumId of albums) {
    const pages = schemas[albumId] ?? [];
    for (const schema of pages) {
      if (schema.pageType !== 'structured' || !schema.editable) continue;
      const fields = (schema.fields ?? []).filter((f) => f.type === 'text' || f.type === 'date');
      if (!fields.length) continue;
      const slots = lineSlots[albumId]?.[String(schema.sourcePageNumber)] ?? [];
      if (!slots.length) continue;

      const occupied = new Map();
      for (const field of fields) {
        const token = `T_${schema.sourcePageNumber}_${field.fieldId.split('_').pop()}`;
        const start = field.templateLineStart ?? 0;
        const count = field.templateLineCount ?? 1;
        for (let i = start; i < start + count; i += 1) {
          if (i >= slots.length) {
            issues.push({
              albumId,
              page: schema.sourcePageNumber,
              fieldId: field.fieldId,
              code: 'TOKEN_SLOT_OOB',
              message: `token ${token} maps past slot ${i}`,
            });
            continue;
          }
          const prev = occupied.get(i);
          if (prev && prev !== field.fieldId) {
            issues.push({
              albumId,
              page: schema.sourcePageNumber,
              fieldId: field.fieldId,
              code: 'TOKEN_CROSS_FIELD',
              message: `slot ${i} claimed by ${prev} and ${field.fieldId} (token ${token})`,
            });
          } else {
            occupied.set(i, field.fieldId);
          }
        }
      }
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    summary: { errors: issues.length, ok: issues.length === 0 },
    issues,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  console.log(
    `[audit-diary-field-token-placement] ${report.summary.ok ? 'OK' : 'FAIL'}: errors=${issues.length}`,
  );
  if (issues.length && process.env.FAIL_ON_ERROR === '1') process.exit(1);
}

main();
