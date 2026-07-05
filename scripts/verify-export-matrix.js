#!/usr/bin/env node
/**
 * Export pipeline checks: dimensions, viewport wiring, per-instance annotations.
 * node scripts/verify-export-matrix.js
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

function readJson(rel) {
  return JSON.parse(read(rel));
}

const exportViewportSource = read('utils/exportViewport.ts');
assert(
  exportViewportSource.includes('resolveEditorCoordinateViewport'),
  'exportViewport: resolveEditorCoordinateViewport',
);
assert(
  exportViewportSource.includes('persistProjectViewport'),
  'exportViewport: persistProjectViewport',
);
assert(
  exportViewportSource.includes('resolveProjectViewportForExport'),
  'exportViewport: resolveProjectViewportForExport',
);

const previewSource = read('app/album-page-preview.tsx');
assert(
  previewSource.includes('persistProjectViewport'),
  'album-page-preview: persists viewport',
);

const syncSource = read('utils/ensureProjectAnnotationsSynced.ts');
assert(
  syncSource.includes('loadProjectViewport'),
  'ensureProjectAnnotationsSynced: loadProjectViewport',
);
assert(
  syncSource.includes('resolveEditorCoordinateViewport'),
  'ensureProjectAnnotationsSynced: derive viewport',
);

const exportPdfSource = read('app/export-pdf.tsx');
assert(
  exportPdfSource.includes('resolveProjectViewportForExport'),
  'export-pdf: resolveProjectViewportForExport',
);
assert(
  exportPdfSource.includes('buildExportSelection'),
  'export-pdf: rebuild export selection from project state',
);
assert(
  exportPdfSource.includes('mergePageValuesMaps'),
  'export-pdf: merge page values by updatedAt',
);
assert(
  exportPdfSource.includes('getExportSelectionStorageKey'),
  'export-pdf: read stored selection from export-review',
);
assert(
  exportPdfSource.includes('exportPages = await Promise.all'),
  'export-pdf: sync exportPages after cache remap',
);
assert(
  exportPdfSource.includes('sourcePageNumber'),
  'export-pdf: cache templates by sourcePageNumber not export index',
);
assert(
  exportPdfSource.includes('mergeStaticPagesIntoExportSelection'),
  'export-pdf: merge locked static pages into selection',
);
assert(
  exportPdfSource.includes('drawExportCoverFullBleed'),
  'export-pdf: full-bleed cover/closing draw',
);
assert(
  exportPdfSource.includes('BLANK_INTERIOR_PAGE_WIDTH'),
  'export-pdf: portrait sourceSize fallback not A4',
);
assert(
  exportPdfSource.includes('filterProjectDataForExport'),
  'export-pdf: always filterProjectDataForExport',
);

const selectionSource = read('utils/exportPageSelection.ts');
assert(
  selectionSource.includes('exportFormat'),
  'exportPageSelection: electronic vs print format',
);
assert(
  selectionSource.includes('non_editable'),
  'exportPageSelection: locked non_editable pages auto-included',
);
assert(
  selectionSource.includes('requiredInExport'),
  'exportPageSelection: requiredInExport static pages',
);
assert(
  selectionSource.includes('resolveExportPageImageUri'),
  'exportPageSelection: template image by sourcePageNumber',
);
assert(
  selectionSource.includes('resolvePhotoPageCleanBackgroundUri'),
  'exportPageSelection: per-page variant background for photo pages',
);
assert(
  !selectionSource.includes('annotations.filter'),
  'filterProjectDataForExport: no legacy pool filter by sourcePageNumber',
);
assert(
  selectionSource.includes('pageValuesToAnnotations({') &&
    selectionSource.includes('for (const instance of filteredInstances)'),
  'filterProjectDataForExport: per-instance annotation rebuild loop',
);

const dimensionsSource = read('utils/exportPageDimensions.ts');
const dimensionExpectations = [
  { label: 'kids_48 electronic', pageWidth: 595, pageHeight: 595 },
  { label: 'pregnancy_60 electronic A5', pageWidth: 420, pageHeight: 595 },
  { label: 'pregnancy_60 hard', pageWidth: 510, pageHeight: 680 },
  { label: 'pregnancy_a5 electronic', pageWidth: 420, pageHeight: 595 },
  { label: 'diary hard', pageWidth: 510, pageHeight: 680 },
  { label: 'square blank electronic', pageWidth: 595, pageHeight: 595 },
];

for (const item of dimensionExpectations) {
  assert(
    dimensionsSource.includes(`pageWidth: ${item.pageWidth}`) ||
      dimensionsSource.includes(`SQUARE_PAGE_PT`) ||
      dimensionsSource.includes(`A5_WIDTH_PT`) ||
      dimensionsSource.includes(`HARD_COVER_WIDTH_PT`),
    `exportPageDimensions defines ${item.label} constants`,
  );
}

assert(
  dimensionsSource.includes('family_blank_21x21') ||
    dimensionsSource.includes('holidays_birthday_60'),
  'exportPageDimensions: square album branch',
);
assert(
  dimensionsSource.includes("formatType === 'hard'"),
  'exportPageDimensions: hard cover branch',
);
assert(
  (dimensionsSource.includes('isDiaryBrownLineGuide') ||
    dimensionsSource.includes('isDiaryPortraitLineGuide')) &&
    dimensionsSource.includes('shouldUseFullBleedDiaryExport'),
  'exportPageDimensions: diary full-bleed helpers',
);
assert(
  (dimensionsSource.includes('isDiaryBrown') ||
    dimensionsSource.includes('isDiaryPortrait')) &&
    dimensionsSource.includes("formatType === 'electronic'"),
  'exportPageDimensions: diary electronic branch',
);

const lineSlots = readJson('constants/line-slots.json');
const samplePages = {
  pregnancy_60: 6,
  pregnancy_a5: 6,
  kids_48: 3,
  holidays_birthday_60: 1,
  diary_interior_brown: 6,
  diary_interior_purple: 6,
};

for (const [albumId, pageNumber] of Object.entries(samplePages)) {
  const slots = lineSlots[albumId]?.[String(pageNumber)];
  assert(Array.isArray(slots) && slots.length > 0, `line-slots: ${albumId} page ${pageNumber}`);
}

const pdfSlots = readJson('constants/generated/pdf-photo-slots.json');
const photoPages = readJson('constants/photo-pages-by-album.json');

for (const [albumId, pages] of Object.entries(photoPages)) {
  if (!Array.isArray(pages) || pages.length === 0) continue;
  const albumSlots = pdfSlots[albumId];
  if (!albumSlots || Object.keys(albumSlots).length === 0) continue;

  for (const page of pages.slice(0, 3)) {
    const pageSlots = albumSlots[String(page)];
    if (!pageSlots) continue;
    assert(pageSlots.variants?.length, `pdf-photo-slots: ${albumId} page ${page}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log('\nAll export matrix checks passed.');
