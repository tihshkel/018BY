#!/usr/bin/env node
/* Deep audit: kids_48 field → invisible input box (line slot) mapping */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const slotsJson = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'constants/line-slots.json'), 'utf8'),
);

function loadKidsSchemas() {
  const raw = fs.readFileSync(
    path.join(ROOT, 'constants/generated/album-page-schemas.ts'),
    'utf8',
  );
  const marker = '"kids_48": [';
  const start = raw.indexOf(marker);
  if (start < 0) throw new Error('kids_48 not found');
  const arrayStart = start + marker.length - 1;
  let depth = 0;
  let end = arrayStart;
  for (let i = arrayStart; i < raw.length; i += 1) {
    if (raw[i] === '[') depth += 1;
    if (raw[i] === ']') {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  return JSON.parse(raw.slice(arrayStart, end));
}

const PAGES = [1, 5, 8, 9, 10, 12, 14, 15, 16, 17, 18, 19, 20, 21];
const schemas = loadKidsSchemas();
const issues = [];

for (const p of PAGES) {
  const schema = schemas.find((s) => s.sourcePageNumber === p);
  const slots = slotsJson.kids_48[String(p)] || [];
  if (!schema) {
    issues.push(`p${p}: NO SCHEMA`);
    continue;
  }
  const fields = (schema.fields || []).filter(
    (f) => f.type !== 'radio' && f.type !== 'checkbox',
  );
  console.log(`\n=== p${p} ${schema.title} slots=${slots.length} fields=${fields.length}`);
  for (const f of fields) {
    const start = f.templateLineStart ?? 0;
    const slot = slots[start];
    if (!slot) {
      issues.push(`p${p} ${f.fieldId} -> slot ${start} MISSING (n=${slots.length})`);
      console.log(`  FAIL ${f.fieldId} -> ${start}`);
    } else {
      console.log(
        `  OK ${f.fieldId} -> ${start}  x=${slot.x.toFixed(3)} y=${slot.y.toFixed(3)} w=${slot.width.toFixed(3)} h=${(slot.height ?? 0).toFixed(3)}`,
      );
    }
  }
}

console.log('\n--- p8/p9 bake ---');
console.log('p8', JSON.stringify(slotsJson.kids_48['8']));
console.log('p9', JSON.stringify(slotsJson.kids_48['9']));
console.log('\n--- p5 count ---', slotsJson.kids_48['5']?.length);
console.log('--- p10 count ---', slotsJson.kids_48['10']?.length);

console.log('\nISSUES:', issues.length ? issues.join('\n') : 'NONE');
process.exit(issues.length ? 1 : 0);
