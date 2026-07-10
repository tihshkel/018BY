#!/usr/bin/env node
/**
 * Verifies that template-line preview and PDF export use the same geometry,
 * typography helpers, and source-page mapping for designed albums.
 *
 * node scripts/verify-export-parity.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const DESIGNED_ALBUM_IDS = [
  'pregnancy_60',
  'pregnancy_a5',
  'kids_48',
  'holidays_birthday_60',
  'diary_interior_brown',
  'diary_interior_purple',
];

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
    return;
  }
  console.log(`OK: ${message}`);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function loadSchemas() {
  const raw = read('constants/generated/album-page-schemas.ts');
  const match = raw.match(/export const ALBUM_PAGE_SCHEMAS[^=]*=\s*(\{[\s\S]*\})\s*as Record/);
  if (!match) throw new Error('Could not parse ALBUM_PAGE_SCHEMAS');
  return JSON.parse(match[1]);
}

const schemas = loadSchemas();
const lineSlots = readJson('constants/line-slots.json');

const pdfAnnotationsSource = read('components/pdf-annotations.tsx');
const exportTextSource = read('utils/exportTemplateText.ts');
const exportPdfSource = read('app/export-pdf.tsx');
const textLineSource = read('utils/textLineSlots.ts');
const viewportSource = read('utils/exportViewport.ts');

assert(
  exportTextSource.includes('baseFontSize') &&
    exportTextSource.includes('getEffectiveTemplateFontSize'),
  'export uses per-segment font size like read-only preview',
);
assert(
  exportTextSource.includes('resolveTemplateLineViewportBaseline') &&
    !exportTextSource.includes('heightAtSize'),
  'pdf export uses unified viewport baseline resolver (no heightAtSize)',
);
assert(
  pdfAnnotationsSource.includes('resolveTemplateLineRowLayout') &&
    read('components/read-only-page-annotations.tsx').includes('resolveTemplateLineRowLayout'),
  'preview components share resolveTemplateLineRowLayout helper',
);
assert(
  read('utils/templateLineText.ts').includes('getRnAscentRatioAt16') &&
    read('utils/fontCharWidths.ts').includes('rnAscentRatioAt16'),
  'font calibration exposes RN ascent ratio for baseline parity',
);
assert(
  fs.existsSync(path.join(root, 'scripts/audit-export-preview-baseline-drift.js')),
  'baseline drift audit script exists for pregnancy_60',
);
assert(
  exportPdfSource.includes('buildExportPageAnnotations') &&
    exportPdfSource.includes('resolveExportPageSourceSize'),
  'pdf export rebuilds page annotations with resolved source dimensions',
);
assert(
  read('utils/exportPdfImageAnnotations.ts').includes('mapped.x + mapped.width / 2') &&
    read('utils/exportPdfImageAnnotations.ts').includes('mapped.y + mapped.height / 2'),
  'pdf circle fills use ellipse center (pdf-lib), not bbox corner',
);
assert(
  (pdfAnnotationsSource.includes('distributeTextWithinContinuationGroup') ||
    pdfAnnotationsSource.includes('distributeTextForTemplateAnnotation')) &&
    exportTextSource.includes('distributeTextForTemplateAnnotation'),
  'preview and pdf export share template text distribution',
);
assert(
  !/isTemplateLineAnnotation[\s\S]{0,280}templateLineCount[\s\S]{0,40}===\s*1/.test(
    pdfAnnotationsSource,
  ),
  'preview isTemplateLineAnnotation includes multi-line fields (templateLineCount > 1)',
);
assert(
  exportTextSource.includes('isLegacySplitSegment') &&
    exportTextSource.includes('(ann.templateLineCount ?? 1) === 1') &&
    exportTextSource.includes('distributeTextForTemplateAnnotation'),
  'multi-line export fields use distribute path, not legacy single drawText',
);
assert(
  exportTextSource.includes('getViewportToPdfScale') &&
    exportTextSource.includes('sourceWidth') &&
    exportTextSource.includes('sourceHeight'),
  'pdf export maps viewport coordinates through source image content rect',
);
assert(
  exportPdfSource.includes('ann.sourcePageNumber') &&
    exportPdfSource.includes('resolveLineGuideId'),
  'pdf export preserves sourcePageNumber when looking up slots',
);
assert(
  exportPdfSource.includes('shouldUsePageRendererForExport'),
  'PageRenderer path is limited to pages with image annotations',
);
assert(
  read('utils/exportPdfImageAnnotations.ts').includes('pushRectClip'),
  'pdf export clips rectangular cover photos',
);
assert(
  read('utils/pageValuesAdapter.ts').includes('imageSlotTransform'),
  'pageValuesAdapter passes imageSlotTransform separately from slot rect',
);
assert(
  viewportSource.includes('Math.abs(savedAspect - sourceAspect) < 0.02'),
  'export viewport rejects saved aspect ratios that drift from source page',
);
assert(
  viewportSource.includes('getDefaultPageAspectRatio') &&
    viewportSource.includes("lineGuideId === 'kids_48'"),
  'export viewport defaults kids_48 pages to square aspect',
);
assert(
  viewportSource.includes("lineGuideId === 'pregnancy_60'"),
  'export viewport defaults pregnancy_60 pages to 180×240 aspect',
);
assert(
  read('utils/exportPageDimensions.ts').includes('isPregnancy60LineGuide'),
  'pdf export uses 180×240 mm for pregnancy_60',
);
assert(
  read('utils/pageValuesAdapter.ts').includes('caption_photo_page') &&
    read('utils/pageValuesAdapter.ts').includes('fallbackLayouts'),
  'photo captions fall back below photo slots when line slots are empty',
);
assert(
  viewportSource.includes("lineGuideId === 'family_blank_21x21'"),
  'export viewport uses square aspect for family_blank_21x21',
);
assert(
  read('components/image-viewer.tsx').includes('getBlankInteriorPageAspect'),
  'image viewer uses blank interior aspect helper',
);
assert(
  read('utils/templateTextAnnotations.ts').includes('fieldTextStyles') &&
    read('utils/templateTextAnnotations.ts').includes('textAlign'),
  'blank template text annotations respect field text styles',
);
assert(
  read('utils/migrateBlankAlbumPhotos.ts').includes('migrateAlbumPhotosMap'),
  'album photo migration runs for designed and blank albums',
);
assert(
  read('hooks/use-album-project.ts').includes('migrateAlbumPhotosMap'),
  'album project load invokes photo migration',
);

for (const albumId of DESIGNED_ALBUM_IDS) {
  const albumSchemas = schemas[albumId] ?? [];
  const albumSlots = lineSlots[albumId] ?? {};
  assert(albumSchemas.length > 0, `${albumId}: schemas exist`);
  assert(Object.keys(albumSlots).length > 0, `${albumId}: line slots exist`);

  let checkedFields = 0;
  for (const schema of albumSchemas) {
    const fields = schema.fields ?? [];
    if (fields.length === 0) continue;

    const slots = albumSlots[String(schema.sourcePageNumber)] ?? [];
    const slotCount = slots.length;
    for (const field of fields) {
      if (field.type === 'radio') continue;
      if (typeof field.templateLineStart !== 'number') continue;
      const count = field.templateLineCount ?? 1;
      const end = field.templateLineStart + count - 1;
      assert(
        slotCount === 0 || end < slotCount,
        `${albumId} p${schema.sourcePageNumber}: "${field.label}" fits line slots`,
      );
      checkedFields += 1;
    }
  }

  assert(checkedFields > 0, `${albumId}: text fields checked`);
}

if (failed > 0) {
  console.error(`\n${failed} export parity check(s) failed.`);
  process.exit(1);
}

console.log('\nAll export parity checks passed.');
