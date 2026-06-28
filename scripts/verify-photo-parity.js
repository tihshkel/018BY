#!/usr/bin/env node
/**
 * Verifies representative photo pages for all designed albums.
 * This protects the PageValues -> annotations -> preview/export pipeline from
 * drifting away from the generated schemas and photo-page manifest.
 *
 * node scripts/verify-photo-parity.js
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

const REPRESENTATIVE_PAGES = {
  pregnancy_60: [54, 56, 60],
  pregnancy_a5: [48],
  kids_48: [1, 5, 7, 10],
  holidays_birthday_60: [2, 40, 41],
  diary_interior_brown: [4, 9, 31],
  diary_interior_purple: [3, 4, 22],
};

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
const photoPages = readJson('constants/photo-pages-by-album.json');
const pdfSlots = readJson('constants/generated/pdf-photo-slots.json');
const pdfCircleSlots = readJson('constants/generated/pdf-circle-slots.json');
const lineSlots = readJson('constants/line-slots.json');
const photoSlotsSource = read('constants/photo-slots.ts');
const adapterSource = read('utils/pageValuesAdapter.ts');
const exportImagesSource = read('utils/exportPdfImageAnnotations.ts');
const annotationsSource = read('components/pdf-annotations.tsx');

assert(adapterSource.includes("imageContentFit: 'cover'"), 'pageValuesAdapter exports photos with cover fit');
assert(adapterSource.includes('photoSlotTransforms'), 'pageValuesAdapter applies per-slot photo transforms');
assert(adapterSource.includes('photoGroupTransform'), 'pageValuesAdapter applies group photo transforms');
assert(exportImagesSource.includes('computeObjectFitCover'), 'pdf export uses object-fit cover math');
assert(exportImagesSource.includes("clipShape === 'circle'"), 'pdf export handles circle clips');
assert(annotationsSource.includes('annotation.imageContentFit'), 'preview renderer respects imageContentFit');
assert(annotationsSource.includes('clipShape'), 'preview renderer respects clipShape');

for (const albumId of DESIGNED_ALBUM_IDS) {
  const albumSchemas = schemas[albumId] ?? [];
  const byPage = Object.fromEntries(albumSchemas.map((schema) => [schema.sourcePageNumber, schema]));
  const manifestPages = photoPages[albumId] ?? [];

  assert(albumSchemas.length > 0, `${albumId}: schemas exist`);
  assert(Array.isArray(manifestPages), `${albumId}: photo-pages manifest exists`);

  for (const page of REPRESENTATIVE_PAGES[albumId]) {
    const schema = byPage[page];
    assert(!!schema, `${albumId} p${page}: schema exists`);
    if (!schema) continue;

    const hasPhotos = (schema.photoBlocks?.length ?? 0) > 0;
    assert(
      manifestPages.includes(page) === hasPhotos,
      `${albumId} p${page}: manifest matches schema photoBlocks`,
    );

    if (hasPhotos) {
      const hasPdfDetectedSlots = Boolean(pdfSlots[albumId]?.[String(page)]?.variants?.length);
      const hasKidsPdfResolution =
        albumId === 'kids_48' &&
        Boolean(pdfSlots[albumId]?.[String(page)]?.variants?.length);
      const hasManualSlots =
        (photoSlotsSource.includes(`${albumId}:`) && photoSlotsSource.includes(`'${page}':`)) ||
        hasKidsPdfResolution;
      const hasLineSlotBackedBlocks = schema.photoBlocks.every((block) =>
        block.variants.every((variant) =>
          variant.slotIndices.every((index) => Boolean(lineSlots[albumId]?.[String(page)]?.[index])),
        ),
      );
      const hasCircleSlots = Boolean(
        pdfCircleSlots[albumId]?.[String(page)]?.variants?.length,
      );
      const usesDefaultPhotoLayouts =
        schema.pageType === 'caption_photo_page' &&
        photoSlotsSource.includes('DEFAULT_PHOTO_PAGE_LAYOUTS');
      assert(
        hasPdfDetectedSlots ||
          hasManualSlots ||
          hasLineSlotBackedBlocks ||
          hasCircleSlots ||
          usesDefaultPhotoLayouts,
        `${albumId} p${page}: photo layout source exists`,
      );
      assert(
        schema.photoBlocks.every((block) =>
          block.variants.every((variant) => variant.slots === variant.slotIndices.length),
        ),
        `${albumId} p${page}: photoBlock variant slot counts are consistent`,
      );
    }
  }
}

if (failed > 0) {
  console.error(`\n${failed} photo parity check(s) failed.`);
  process.exit(1);
}

console.log('\nAll photo parity checks passed.');
