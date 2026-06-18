#!/usr/bin/env node
/**
 * Verifies every page with a «Место для фото» zone allows photo upload on the fill screen.
 * node scripts/verify-photo-fill-coverage.js
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

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

function loadSchemas() {
  const raw = fs.readFileSync(path.join(root, 'constants/generated/album-page-schemas.ts'), 'utf8');
  const match = raw.match(/export const ALBUM_PAGE_SCHEMAS[^=]*=\s*(\{[\s\S]*\})\s*as Record/);
  if (!match) throw new Error('Could not parse album-page-schemas.ts');
  return JSON.parse(match[1]);
}

const ALBUM_IDS = [
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

const PHOTO_PAGE_TYPES = new Set([
  'photo',
  'caption_photo_page',
  'event_photo',
  'free_photo_caption',
  'timeline_page',
  'free_page',
]);

function isPregnancyWeeklyPhotoPage(lineGuideId, pageNumber) {
  if (lineGuideId === 'pregnancy_60') {
    return (
      (pageNumber >= 9 && pageNumber <= 17) ||
      (pageNumber >= 19 && pageNumber <= 32) ||
      (pageNumber >= 34 && pageNumber <= 47)
    );
  }
  if (lineGuideId === 'pregnancy_a5') {
    return (
      (pageNumber >= 5 && pageNumber <= 13) ||
      (pageNumber >= 15 && pageNumber <= 28) ||
      (pageNumber >= 30 && pageNumber <= 43)
    );
  }
  return false;
}

function shouldEnrichWithPhotoBlocks(schema, pdfSlots, manualPhotoPages) {
  if (schema.pageType === 'non_editable' || schema.editable === false) return false;
  if (PHOTO_PAGE_TYPES.has(schema.pageType)) return true;
  if (schema.pageType === 'structured' || schema.pageType === 'text_page') {
    if (isPregnancyWeeklyPhotoPage(schema.lineGuideId, schema.sourcePageNumber)) {
      return true;
    }
    return (
      hasPdfPhotoSlot(pdfSlots, schema.lineGuideId, schema.sourcePageNumber) ||
      hasManualPhotoSlot(manualPhotoPages, schema.lineGuideId, schema.sourcePageNumber)
    );
  }
  return false;
}

function hasPdfPhotoSlot(pdfSlots, albumId, pageNumber) {
  return Boolean(pdfSlots[albumId]?.[String(pageNumber)]?.variants?.length);
}

function hasManualPhotoSlot(manualPhotoPages, albumId, pageNumber) {
  return (manualPhotoPages[albumId] ?? []).includes(pageNumber);
}

function simulateEnrichment(schema, pdfSlots, manualPhotoPages) {
  if ((schema.photoBlocks?.length ?? 0) > 0) return schema;
  if (!shouldEnrichWithPhotoBlocks(schema, pdfSlots, manualPhotoPages)) return schema;

  const albumId = schema.lineGuideId;
  const pageNumber = schema.sourcePageNumber;
  const hasLayouts =
    hasPdfPhotoSlot(pdfSlots, albumId, pageNumber) ||
    hasManualPhotoSlot(manualPhotoPages, albumId, pageNumber) ||
    isPregnancyWeeklyPhotoPage(albumId, pageNumber);
  if (!hasLayouts) return schema;

  return {
    ...schema,
    photoBlocks: [
      {
        blockId: albumId === 'kids_48' ? 'event_photos' : 'main_photo',
        label: 'Фото для страницы',
        variants: [{ variantId: 'one_horizontal', label: 'Фото', slots: 1, slotIndices: [0] }],
      },
    ],
  };
}

function hasPhotoBlocks(schema) {
  return (schema.photoBlocks?.length ?? 0) > 0;
}

function usesUnifiedPhotoEditor(schema) {
  if (!schema) return false;
  if (PHOTO_PAGE_TYPES.has(schema.pageType)) return true;
  return hasPhotoBlocks(schema);
}

function isPhotoOnlySchema(schema) {
  if (!schema) return false;
  if (
    schema.pageType === 'photo' ||
    schema.pageType === 'event_photo' ||
    schema.pageType === 'free_photo_caption' ||
    schema.pageType === 'caption_photo_page'
  ) {
    return (schema.fields?.length ?? 0) === 0;
  }
  return hasPhotoBlocks(schema) && (schema.fields?.length ?? 0) === 0;
}

function resolveFormPathname(schema) {
  const specialTypes = new Set([
    'family_tree',
    'teeth',
    'growth_weight',
    'month_page',
    'baptism_page',
    'godparents_page',
  ]);
  if (specialTypes.has(schema.pageType)) return '/album-page-form';
  if (isPhotoOnlySchema(schema)) return '/album-page-photos';
  return '/album-page-form';
}

function canAddPhotosOnFillScreen(enrichedSchema) {
  if (!enrichedSchema.editable) return false;
  if (!hasPhotoBlocks(enrichedSchema)) return false;

  const pathname = resolveFormPathname(enrichedSchema);
  if (pathname === '/album-page-photos') return true;
  if (pathname === '/album-page-form' && usesUnifiedPhotoEditor(enrichedSchema)) return true;
  if (pathname === '/album-page-form' && hasPhotoBlocks(enrichedSchema)) return true;
  return false;
}

const schemas = loadSchemas();
const pdfSlots = loadJson('constants/generated/pdf-photo-slots.json');

const photoSlotsSource = fs.readFileSync(path.join(root, 'constants/photo-slots.ts'), 'utf8');
const manualPhotoPages = {};
for (const albumId of ALBUM_IDS) {
  const re = new RegExp(`${albumId}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`, 'm');
  const block = photoSlotsSource.match(re)?.[1] ?? '';
  manualPhotoPages[albumId] = [...block.matchAll(/'(\d+)':/g)].map((m) => Number(m[1]));
}

const coverage = {};
const gaps = [];

for (const albumId of ALBUM_IDS) {
  const pages = schemas[albumId] ?? [];
  let photoZoneCount = 0;
  let fillReadyCount = 0;

  for (const schema of pages) {
    const enriched = simulateEnrichment(schema, pdfSlots, manualPhotoPages);
    const hasZone =
      hasPhotoBlocks(schema) ||
      hasPdfPhotoSlot(pdfSlots, albumId, schema.sourcePageNumber) ||
      hasManualPhotoSlot(manualPhotoPages, albumId, schema.sourcePageNumber) ||
      (schema.editable &&
        isPregnancyWeeklyPhotoPage(albumId, schema.sourcePageNumber)) ||
      (schema.editable && PHOTO_PAGE_TYPES.has(schema.pageType));

    if (!hasZone || !schema.editable) continue;
    photoZoneCount += 1;

    const enrichedWithBlocks = enriched;
    if (canAddPhotosOnFillScreen(enrichedWithBlocks)) {
      fillReadyCount += 1;
    } else {
      gaps.push({
        albumId,
        page: schema.sourcePageNumber,
        pageType: schema.pageType,
        hasSchemaBlocks: hasPhotoBlocks(schema),
        hasPdf: hasPdfPhotoSlot(pdfSlots, albumId, schema.sourcePageNumber),
        hasManual: hasManualPhotoSlot(manualPhotoPages, albumId, schema.sourcePageNumber),
      });
    }
  }

  coverage[albumId] = { photoZoneCount, fillReadyCount };
  assert(
    fillReadyCount === photoZoneCount,
    `${albumId}: ${fillReadyCount}/${photoZoneCount} photo-zone pages allow fill-screen upload`,
  );
}

const reportPath = path.join(root, 'scripts/photo-fill-coverage-report.json');
fs.writeFileSync(
  reportPath,
  JSON.stringify({ coverage, gaps, generatedAt: new Date().toISOString() }, null, 2),
  'utf8',
);
console.log(`Wrote ${path.relative(root, reportPath)}`);

if (gaps.length > 0) {
  console.error('\nPages with photo zone but no fill-screen upload path:');
  gaps.slice(0, 20).forEach((gap) => console.error(JSON.stringify(gap)));
}

if (failed > 0) {
  console.error(`\n${failed} photo fill coverage check(s) failed`);
  process.exit(1);
}

console.log('\nAll photo fill coverage checks passed.');
