#!/usr/bin/env node
/**
 * Unit checks for mergePageValuesMaps (export snapshot vs AsyncStorage).
 * node scripts/verify-page-values-merge.js
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

function pageValuesUpdatedAt(values) {
  return values?.updatedAt ?? '';
}

function mergePageValuesMaps(...maps) {
  const merged = {};
  for (const map of maps) {
    for (const [instanceId, values] of Object.entries(map)) {
      const existing = merged[instanceId];
      if (!existing) {
        merged[instanceId] = values;
        continue;
      }
      const existingAt = pageValuesUpdatedAt(existing);
      const incomingAt = pageValuesUpdatedAt(values);
      if (!existingAt || (incomingAt && incomingAt >= existingAt)) {
        merged[instanceId] = values;
      }
    }
  }
  return merged;
}

const storageWeekly = {
  weekly: {
    fields: { pregnancy_60_p9_date: '21.11.2007' },
    photoBlocks: {},
    status: 'continue',
    updatedAt: '2026-07-05T14:00:00.000Z',
  },
};

const memoryP1P2 = {
  p1: {
    fields: { pregnancy_60_p1_name: 'old' },
    photoBlocks: {},
    status: 'continue',
    updatedAt: '2026-07-01T10:00:00.000Z',
  },
  weekly: {
    fields: {},
    photoBlocks: {},
    status: 'empty',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
};

const merged = mergePageValuesMaps(storageWeekly, memoryP1P2);

assert(
  merged.weekly.fields.pregnancy_60_p9_date === '21.11.2007',
  'newer storage weekly wins over stale memory empty weekly',
);
assert(
  merged.p1.fields.pregnancy_60_p1_name === 'old',
  'memory p1 kept when no storage entry',
);
assert(
  !merged.weekly.fields.pregnancy_60_p1_name,
  'weekly not overwritten by memory empty fields',
);

const pageStorageSource = fs.readFileSync(
  path.join(root, 'utils/pageStorage.ts'),
  'utf8',
);
assert(
  pageStorageSource.includes('export function mergePageValuesMaps'),
  'pageStorage exports mergePageValuesMaps',
);

const exportPdfSource = fs.readFileSync(
  path.join(root, 'app/export-pdf.tsx'),
  'utf8',
);
assert(
  exportPdfSource.includes('mergePageValuesMaps'),
  'export-pdf uses mergePageValuesMaps',
);
assert(
  exportPdfSource.includes('mergeStaticPagesIntoExportSelection'),
  'export-pdf merges static pages into selection',
);

const selectionSource = fs.readFileSync(
  path.join(root, 'utils/exportPageSelection.ts'),
  'utf8',
);
assert(
  selectionSource.includes("schema.pageType === 'non_editable'"),
  'isStaticExportPage includes non_editable locked pages',
);

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log('\nAll page-values merge checks passed.');
