#!/usr/bin/env node
/**
 * Проверка photo-flow и collage layouts.
 * node scripts/verify-photo-flows.js
 */
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
    return;
  }
  console.log(`OK: ${message}`);
}

function readFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function loadJson(relativePath) {
  return JSON.parse(readFile(relativePath));
}

function getSchemaSnippet(schemasSource, pageId) {
  const re = new RegExp(`"pageId": "${pageId}"[\\s\\S]*?\\n    \\}`, 'm');
  return schemasSource.match(re)?.[0] ?? '';
}

function extractAlbumSchemas(raw, albumId) {
  const startMarker = `"${albumId}": [`;
  const start = raw.indexOf(startMarker);
  if (start < 0) return [];

  const arrayStart = start + startMarker.length - 1;
  let depth = 0;
  let end = arrayStart;
  for (let i = arrayStart; i < raw.length; i += 1) {
    const char = raw[i];
    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  try {
    return JSON.parse(raw.slice(arrayStart, end));
  } catch {
    return [];
  }
}

function getPhotoVariantAspect(variantId) {
  if (variantId === 'three_hero') return [4, 3];
  if (variantId === 'four_grid') return [1, 1];
  if (variantId.includes('vertical') || variantId === 'two_photos' || variantId === 'four_vertical') {
    return [3, 4];
  }
  if (variantId.includes('horizontal') || variantId === 'one_large') return [4, 3];
  return undefined;
}

const ALBUM_ORDER = [
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

// --- 1. Layout templates ---
const templatesSource = readFile('constants/photo-layout-templates.ts');
assert(templatesSource.includes('three_hero'), 'photo-layout-templates: three_hero');
assert(templatesSource.includes('four_grid'), 'photo-layout-templates: four_grid');
assert(templatesSource.includes('buildPageLayoutsFromTemplates'), 'photo-layout-templates: builder');

// --- 2. Photo slot coverage ---
const photoSlotsSource = readFile('constants/photo-slots.ts');
assert(
  photoSlotsSource.includes('const PREGNANCY_60_MEMORY_PAGES = [56, 57, 58, 59]') &&
    photoSlotsSource.includes('function pregnancyMemoryPhotoLayouts') &&
    photoSlotsSource.includes('PREGNANCY_MEMORY_PHOTO_SAFE') &&
    photoSlotsSource.includes('FULL_PHOTO_TEMPLATES'),
  'pregnancy_60: photo-slots 56–59 with calibrated variants',
);
assert(photoSlotsSource.includes('three_hero'), 'photo-slots: three_hero template');
assert(photoSlotsSource.includes('four_grid'), 'photo-slots: four_grid template');
assert(photoSlotsSource.includes('family_blank'), 'photo-slots: family_blank');
assert(photoSlotsSource.includes('EVENT_PHOTO_TEMPLATES'), 'photo-slots: event templates incl. three_hero');

// --- 3. Schema variants ---
const schemasSource = readFile('constants/generated/album-page-schemas.ts');
const pregnancy56 = getSchemaSnippet(schemasSource, 'pregnancy_60_p56');
assert(pregnancy56.includes('"three_hero"'), 'schema pregnancy p56: three_hero');
assert(pregnancy56.includes('"four_grid"'), 'schema pregnancy p56: four_grid');
assert(pregnancy56.includes('"captionEnabled": true'), 'schema pregnancy p56: captionEnabled');

const kidsP6 = getSchemaSnippet(schemasSource, 'kids_48_p6');
assert(kidsP6.includes('"three_hero"'), 'schema kids p6: three_hero');
assert(kidsP6.includes('"captionEnabled": false'), 'schema kids p6: no caption');

const kidsP1 = getSchemaSnippet(schemasSource, 'kids_48_p1');
assert(kidsP1.includes('"photoBlocks"'), 'schema kids p1: photoBlocks');
assert(!kidsP1.includes('"three_hero"'), 'schema kids p1: no three_hero (small zone)');

const diaryPurpleP4 = getSchemaSnippet(schemasSource, 'diary_interior_purple_p4');
assert(diaryPurpleP4.includes('"pageType": "photo"'), 'schema diary purple p4: photo page');
assert(diaryPurpleP4.includes('"photoBlocks"'), 'schema diary purple p4: photoBlocks');

const diaryBrownP2 = getSchemaSnippet(schemasSource, 'diary_interior_brown_p2');
assert(diaryBrownP2.includes('"photoBlocks": []'), 'schema diary brown p2: explicit empty photoBlocks');

// --- 4. Cover rendering ---
const adapterSource = readFile('utils/pageValuesAdapter.ts');
assert(adapterSource.includes("imageContentFit: 'cover'"), 'pageValuesAdapter: imageContentFit cover');
assert(
  adapterSource.includes('resolvePhotoCaptionViewportLayouts'),
  'pageValuesAdapter: photo caption layouts below photo zone',
);
assert(
  adapterSource.includes('resolvePrimaryPhotoCaptionLayout'),
  'pageValuesAdapter: primary photo caption layout',
);
assert(
  readFile('utils/photoZoneLayout.ts').includes('resolvePhotoZoneViewportRects'),
  'photoZoneLayout: photo zone rects for captions',
);
assert(
  !adapterSource.includes('variant.slots > 1 ? values.photoGroupTransform'),
  'pageValuesAdapter: group transform applies to single-slot blocks',
);

const annotationsSource = readFile('components/pdf-annotations.tsx');
assert(annotationsSource.includes('imageContentFit'), 'pdf-annotations: imageContentFit prop');
assert(
  annotationsSource.includes("annotation.imageContentFit ?? 'fill'"),
  'pdf-annotations: cover/fill switch',
);

const exportImageSource = readFile('utils/exportPdfImageAnnotations.ts');
assert(exportImageSource.includes('computeObjectFitCover'), 'export-pdf: cover crop');
assert(exportImageSource.includes("ann.imageContentFit === 'cover'"), 'export-pdf: cover branch');

// --- 5. Presets ---
const presetsSource = readFile('constants/photo-block-presets.ts');
assert(presetsSource.includes('FULL_PHOTO_BLOCK'), 'photo-block-presets: FULL_PHOTO_BLOCK');
assert(presetsSource.includes('three_hero'), 'photo-block-presets: three_hero');

// --- 6. Picker UX ---
const pickerSource = readFile('components/album/photo-block-picker.tsx');
assert(pickerSource.includes('ScrollView'), 'PhotoBlockPicker: horizontal scroll');
assert(pickerSource.includes('LayoutPreviewIcon'), 'PhotoBlockPicker: layout preview icons');
assert(pickerSource.includes('+ Добавить фото'), 'PhotoBlockPicker: add button');

// --- 7. Per-slot aspect ---
const aspectSource = readFile('utils/photoVariantAspect.ts');
assert(aspectSource.includes('getSlotAspectRatio'), 'photoVariantAspect: getSlotAspectRatio');
assert(
  JSON.stringify(getPhotoVariantAspect('four_grid')) === JSON.stringify([1, 1]),
  'aspect 1:1 for four_grid',
);

// --- 8. Photo editor hook ---
const photoEditorSource = readFile('hooks/use-album-page-photo-editor.ts');
assert(photoEditorSource.includes('photoGroupTransform'), 'useAlbumPagePhotoEditor: group transform support');
assert(photoEditorSource.includes('photoBlocks'), 'useAlbumPagePhotoEditor: photoBlocks state');

// --- 9. PDF-detected photo slots ---
const pdfSlotsPath = path.join(projectRoot, 'constants/generated/pdf-photo-slots.json');
assert(fs.existsSync(pdfSlotsPath), 'pdf-photo-slots.json exists');
const pdfSlots = JSON.parse(fs.readFileSync(pdfSlotsPath, 'utf8'));
assert(pdfSlots.pregnancy_60?.['1']?.variants?.[0]?.slots?.[0], 'pdf-photo-slots: pregnancy_60 page 1');
assert(
  pdfSlots.pregnancy_60['1'].variants[0].slots[0].height > 0.2,
  'pdf-photo-slots: pregnancy page 1 slot height plausible',
);
assert(
  Object.keys(pdfSlots.diary_interior_brown ?? {}).length >= 1,
  'pdf-photo-slots: diary_interior_brown has entries',
);
assert(
  Object.keys(pdfSlots.diary_interior_purple ?? {}).length >= 1,
  'pdf-photo-slots: diary_interior_purple has entries',
);

assert(
  readFile('utils/schemaPhotoBlocks.ts').includes('resolvePhotoPageLayoutsOrUndefined'),
  'schemaPhotoBlocks uses PDF slot resolution',
);
assert(
  readFile('utils/schemaPhotoBlocks.ts').includes('shouldEnrichWithPhotoBlocks'),
  'schemaPhotoBlocks: enrichment denylist for text-only pages',
);

// --- 10. Preview photo overlay gate ---
const previewSource = readFile('app/album-page-preview.tsx');
assert(
  previewSource.includes('AlbumPreviewPhotoBlockEditor'),
  'album-page-preview: single-slot block editor for safe-zone scale',
);
assert(
  readFile('components/album/album-preview-photo-block-editor.tsx').includes(
    'PhotoSlotCropPreview',
  ),
  'AlbumPreviewPhotoBlockEditor: read-only crop preview inside block',
);
assert(
  readFile('components/album/photo-slot-crop-preview.tsx').includes('pointerEvents="none"'),
  'PhotoSlotCropPreview: no slot gestures in preview',
);
assert(
  readFile('app/album-page-preview.tsx').includes('AlbumPreviewPhotoBlockEditor'),
  'album-page-preview: block editor scales photo zone on page (single + collage)',
);
assert(
  !readFile('app/album-page-preview.tsx').includes('AlbumPreviewPhotoGestureOverlay'),
  'album-page-preview: no per-slot crop overlay for multi-photo collage',
);
assert(
  readFile('utils/pageValuesAdapter.ts').includes('resolvePhotoBlockSlotRects'),
  'pageValuesAdapter: collage uses block layout + group transform',
);
assert(
  !readFile('utils/pageValuesAdapter.ts').includes('isGridCollage'),
  'pageValuesAdapter: no separate per-slot collage export path',
);
assert(
  readFile('components/read-only-page-annotations.tsx').includes('setPageSourceSize'),
  'ReadOnlyPageAnnotations: caches image size for aspect-aware crop',
);
assert(
  readFile('utils/templateLineText.ts').includes('getKids48P8DateLineTextTop'),
  'templateLineText: kids p8 date baseline',
);
assert(
  readFile('utils/templateLineText.ts').includes('getKids48P9DateLineTextTop'),
  'templateLineText: kids p9 date baseline',
);
assert(
  readFile('constants/kids-48-event-date-slots.ts').includes('KIDS_48_P8_EVENT_DATE_LINE'),
  'kids-48-event-date-slots: p8 coordinates',
);
assert(
  !readFile('hooks/use-album-page-photo-editor.ts').includes(
    'photoSlotTransformKey(primaryBlock.blockId, 0)',
  ),
  'photo editor: preview group transform does not overwrite slot crop',
);
assert(
  readFile('utils/photoSlotTransform.ts').includes('clampPhotoBlockTransform'),
  'photoSlotTransform: bounds-aware clamp',
);
assert(
  readFile('utils/photoBlockSafeZone.ts').includes('resolvePhotoBlockSafeZoneViewportRect'),
  'photoBlockSafeZone: viewport safe rect',
);
assert(
  readFile('utils/photoBlockSafeZone.ts').includes('photoOnlyPage'),
  'photoBlockSafeZone: photo-only full page margin',
);
assert(
  readFile('constants/photo-print-margins.ts').includes('PHOTO_ONLY_PAGE_MARGIN_MM'),
  'photo-print-margins: 2cm photo-only margin',
);

// --- 11. photo-pages-by-album.json sync ---
const photoPagesManifest = loadJson('constants/photo-pages-by-album.json');
for (const albumId of ALBUM_ORDER) {
  assert(Array.isArray(photoPagesManifest[albumId]), `photo-pages manifest: ${albumId} exists`);
}

assert(
  (photoPagesManifest.holidays_birthday_60?.length ?? 0) > 0,
  'photo-pages manifest: holidays_birthday_60 not empty',
);
assert(
  !photoPagesManifest.diary_interior_brown?.includes(2),
  'photo-pages manifest: diary brown excludes static p2',
);
assert(
  !photoPagesManifest.diary_interior_brown?.includes(29),
  'photo-pages manifest: diary brown excludes static p29',
);

for (const albumId of ALBUM_ORDER) {
  const schemas = extractAlbumSchemas(schemasSource, albumId);
  const expectedPages = schemas
    .filter((schema) => Array.isArray(schema.photoBlocks) && schema.photoBlocks.length > 0)
    .map((schema) => schema.sourcePageNumber)
    .sort((a, b) => a - b);
  const manifestPages = [...(photoPagesManifest[albumId] ?? [])].sort((a, b) => a - b);
  assert(
    JSON.stringify(manifestPages) === JSON.stringify(expectedPages),
    `photo-pages manifest sync: ${albumId} (${manifestPages.length} pages)`,
  );
}

// --- 12. visualize script ---
assert(
  fs.existsSync(path.join(projectRoot, 'scripts/visualize-photo-slots.js')),
  'visualize-photo-slots.js exists',
);

// --- 13. kids_48 calibration ---
assert(
  pdfSlots.kids_48?.['1']?.variants?.[0]?.slots?.[0]?.height > 0.2,
  'kids_48 pdf page 1 slot height plausible',
);
assert(
  readFile('utils/resolvePhotoPageLayouts.ts').includes('resolveKidsPhotoPageLayouts'),
  'resolvePhotoPageLayouts: kids PDF-first photo resolution',
);
assert(
  readFile('utils/sparseTextPhotoSafeZone.ts').includes('expandDesignedAlbumCollageVariants'),
  'sparseTextPhotoSafeZone: expands event variants inside sparse safe zones',
);
assert(
  readFile('constants/sparse-photo-album-config.ts').includes('SPARSE_PHOTO_ALBUM_CONFIG'),
  'sparse-photo-album-config: cross-album sparse photo configs',
);
assert(
  photoSlotsSource.includes('kids_48: {}') || photoSlotsSource.includes('kids_48: {\n  }'),
  'kids_48 photo-slots: no blanket event spread',
);
assert(
  readFile('utils/resolvePhotoPageLayouts.ts').includes('manualLayoutsArePlausible'),
  'resolvePhotoPageLayouts: guards implausible manual multi-variant slots',
);
assert(
  readFile('utils/variantPreview.ts').includes("four_vertical: 'four_grid'"),
  'variantPreview: kids four_vertical alias',
);
assert(
  readFile('utils/exportViewport.ts').includes('getDefaultPageAspectRatio'),
  'exportViewport: square default aspect helper',
);
assert(
  readFile('utils/albumImages.ts').includes('blankPageArray(48, true)'),
  'albumImages: kids_48 square blank fallback',
);

const kidsSchemas = extractAlbumSchemas(schemasSource, 'kids_48');
for (const schema of kidsSchemas) {
  if (!Array.isArray(schema.photoBlocks) || schema.photoBlocks.length === 0) continue;
  for (const block of schema.photoBlocks) {
    for (const variant of block.variants) {
      if (variant.variantId === 'four_vertical') {
        assert(
          photoSlotsSource.includes('four_vertical'),
          `kids_48 p${schema.sourcePageNumber}: four_vertical template available`,
        );
      }
    }
  }
}

console.log('\n---');
if (failed > 0) {
  console.error(`Итого: ${failed} проверок не пройдено`);
  process.exit(1);
}
console.log('Все проверки photo-flow / collage пройдены.');
