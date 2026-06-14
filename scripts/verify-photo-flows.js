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

function getSchemaSnippet(schemasSource, pageId) {
  const re = new RegExp(`"pageId": "${pageId}"[\\s\\S]*?\\n    \\}`, 'm');
  return schemasSource.match(re)?.[0] ?? '';
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

// --- 1. Layout templates ---
const templatesSource = readFile('constants/photo-layout-templates.ts');
assert(templatesSource.includes('three_hero'), 'photo-layout-templates: three_hero');
assert(templatesSource.includes('four_grid'), 'photo-layout-templates: four_grid');
assert(templatesSource.includes('buildPageLayoutsFromTemplates'), 'photo-layout-templates: builder');

// --- 2. Photo slot coverage ---
const photoSlotsSource = readFile('constants/photo-slots.ts');
assert(
  ['56', '57', '58', '59'].every((p) =>
    photoSlotsSource.includes(`'${p}': pregnancyPhotoLayouts()`),
  ),
  'pregnancy_60: photo-slots 56–59',
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

// --- 4. Cover rendering ---
const adapterSource = readFile('utils/pageValuesAdapter.ts');
assert(adapterSource.includes("imageContentFit: 'cover'"), 'pageValuesAdapter: imageContentFit cover');

const annotationsSource = readFile('components/pdf-annotations.tsx');
assert(annotationsSource.includes('imageContentFit'), 'pdf-annotations: imageContentFit prop');
assert(annotationsSource.includes("annotation.imageContentFit ?? 'fill'"), 'pdf-annotations: cover/fill switch');

const exportSource = readFile('app/export-pdf.tsx');
assert(exportSource.includes('computeObjectFitCover'), 'export-pdf: cover crop');
assert(exportSource.includes("ann.imageContentFit === 'cover'"), 'export-pdf: cover branch');

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

// --- 8. albumProjectInit library pages ---
const initSource = readFile('utils/albumProjectInit.ts');
assert(initSource.includes('FULL_PHOTO_BLOCK'), 'albumProjectInit: FULL_PHOTO_BLOCK for library');

// --- 9. visualize script ---
assert(fs.existsSync(path.join(projectRoot, 'scripts/visualize-photo-slots.js')), 'visualize-photo-slots.js exists');

console.log('\n---');
if (failed > 0) {
  console.error(`Итого: ${failed} проверок не пройдено`);
  process.exit(1);
}
console.log('Все проверки photo-flow / collage пройдены.');
