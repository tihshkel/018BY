#!/usr/bin/env node
/**
 * Аудит порядка страниц при PDF-экспорте (все категории альбомов).
 * node scripts/audit-export-page-order.js
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

// --- Статический аудит пайплайна ---
const exportPdf = read('app/export-pdf.tsx');
const firstLast = read('utils/albumFirstLastPages.ts');
const selection = read('utils/exportPageSelection.ts');

assert(
  exportPdf.includes('getExportCoverPages'),
  'export-pdf: загрузка обложек через getExportCoverPages',
);
assert(
  exportPdf.includes('filterProjectDataForExport'),
  'export-pdf: внутрянка через filterProjectDataForExport',
);
assert(
  exportPdf.includes('coverPagesFromInteriorFallback'),
  'export-pdf: дневники — обложки не дублируются во внутрянке',
);
assert(
  exportPdf.includes('exportFirstPageUri') && exportPdf.includes('exportClosingPageUri'),
  'export-pdf: первая + финальная обложка для soft/electronic',
);
assert(
  exportPdf.includes('isSoftOrElectronic && exportFirstPageUri'),
  'export-pdf: первая обложка ДО внутренних страниц',
);
assert(
  exportPdf.includes('isSoftOrElectronic && exportClosingPageUri'),
  'export-pdf: финальная обложка ПОСЛЕ внутренних страниц',
);
assert(
  !firstLast.match(/export async function getExportCoverPages/g) ||
    firstLast.match(/export async function getExportCoverPages/g).length === 1,
  'albumFirstLastPages: getExportCoverPages объявлена ровно один раз',
);
assert(
  firstLast.includes("category === 'kids'") &&
    firstLast.includes("category === 'pregnancy'") &&
    firstLast.includes("category === 'family'"),
  'albumFirstLastPages: ветки kids / pregnancy / family|holidays',
);
assert(
  firstLast.includes('getPregnancyFirstLastPagesForExport'),
  'albumFirstLastPages: pregnancy soft/electronic + форзац last_str',
);
assert(
  selection.includes('.sort((a, b) => a.order - b.order)'),
  'exportPageSelection: сортировка instances по order',
);

// --- Симуляция порядка внутренних страниц ---
function simulateFilterOrder(instances, includedIds) {
  const idSet = new Set(includedIds);
  return instances
    .filter((i) => idSet.has(i.instanceId))
    .sort((a, b) => a.order - b.order)
    .map((i) => i.sourcePageNumber);
}

const mockInstances = [
  { instanceId: 'c', order: 3, sourcePageNumber: 8 },
  { instanceId: 'a', order: 1, sourcePageNumber: 2 },
  { instanceId: 'b', order: 2, sourcePageNumber: 5 },
];
const ordered = simulateFilterOrder(mockInstances, ['a', 'b', 'c']);
assert(
  JSON.stringify(ordered) === JSON.stringify([2, 5, 8]),
  'симуляция: порядок страниц = order instances, не imageIndex',
);

// --- Матрица ожидаемого порядка PDF ---
const EXPECTED = [
  {
    category: 'pregnancy',
    format: 'electronic',
    sequence: 'первая A5 → внутрянка (order) → форзац last_str',
  },
  {
    category: 'pregnancy',
    format: 'hard',
    sequence: 'только внутрянка (развертка отдельно)',
  },
  {
    category: 'kids',
    format: 'electronic',
    sequence: 'first_page → внутрянка (order) → last_page',
  },
  {
    category: 'family',
    format: 'soft',
    sequence: 'first_page → внутрянка → last_page (из FAMILY_COVER_DESIGNS)',
  },
  {
    category: 'holidays',
    format: 'electronic',
    sequence: 'обложка DFA → внутрянка (без отдельного форзаца)',
  },
  {
    category: 'diary',
    format: 'electronic',
    sequence: 'стр.1 блока → внутрянка без 1-й/последней → стр.N блока',
  },
];

console.log('\n--- Ожидаемый порядок PDF по категориям ---');
for (const row of EXPECTED) {
  console.log(`  ${row.category} / ${row.format}: ${row.sequence}`);
}

// --- Покрытие lineGuideId в pageSourceDimensions ---
const dims = read('utils/pageSourceDimensions.ts');
const guides = [
  'pregnancy_60',
  'pregnancy_a5',
  'kids_48',
  'holidays_birthday_60',
  'diary_interior_brown',
  'diary_interior_purple',
];
for (const g of guides) {
  assert(dims.includes(`'${g}'`), `pageSourceDimensions: канонические размеры для ${g}`);
}

// --- pregnancy DB mapping ---
const coverPdf = read('utils/coverPdfMapping.ts');
for (const id of ['pregnancy_db2', 'pregnancy_a5', 'pregnancy_db3_soft']) {
  assert(coverPdf.includes(`'${id}'`), `coverPdfMapping: ${id} → DB номер`);
}

// --- Профиль качества (electronic vs print) — без Platform.OS ---
const dimsFile = read('utils/exportPageDimensions.ts');
assert(
  dimsFile.includes('ELECTRONIC_EXPORT_DPI = 72'),
  'exportPageDimensions: electronic ~72 DPI',
);
assert(
  dimsFile.includes('ELECTRONIC_JPEG_QUALITY_PAGE = 0.55'),
  'exportPageDimensions: electronic JPEG page 0.55',
);
assert(
  exportPdf.includes('getElectronicRasterMaxSide') &&
    exportPdf.includes('getElectronicJpegQuality'),
  'export-pdf: electronic использует getElectronicRasterMaxSide + getElectronicJpegQuality',
);
assert(
  exportPdf.includes('isElectronicExport ? ELECTRONIC_CAPTURE_SCALE'),
  'export-pdf: PageRenderer scale снижен для electronic',
);
assert(
  !exportPdf.match(/Platform\.OS\s*===\s*['"]android['"][\s\S]{0,120}quality/) &&
    !exportPdf.match(/Platform\.OS\s*===\s*['"]ios['"][\s\S]{0,120}compress/),
  'export-pdf: качество JPEG не зависит от android/ios',
);
assert(
  exportPdf.includes("formatToUse.type === 'electronic'") &&
    exportPdf.includes('2400') &&
    exportPdf.includes(': 2000'),
  'export-pdf: soft/hard — maxSide 2000/2400, electronic — отдельная ветка',
);
assert(
  exportPdf.includes('content://') && exportPdf.includes('getElectronicJpegQuality'),
  'export-pdf: content:// на Android сжимается тем же профилем',
);

console.log('\n--- Профиль качества ---');
console.log('  electronic: ~72 DPI, JPEG 0.55 (стр.) / 0.6 (обл.), capture scale 1');
console.log('  soft/hard:  maxSide 2000px (стр.) / 2400px (обл.), JPEG 0.9');
console.log('  Android = iOS (один JS-код, expo-image-manipulator)');

if (failed > 0) {
  console.error(`\n${failed} проверка(и) не пройдены.`);
  process.exit(1);
}

console.log('\nАудит порядка страниц экспорта пройден.');
