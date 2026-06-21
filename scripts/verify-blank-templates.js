/* eslint-disable no-console */
/**
 * Validates blank photo page template manifest (10 templates × 2 formats).
 * node scripts/verify-blank-templates.js
 */
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../constants/photo-page-template-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const EXPECTED_IDS = [
  'SinglePhotoTemplate',
  'PhotoStoryTemplate',
  'TwoVerticalPhotosTemplate',
  'TwoHorizontalPhotosTemplate',
  'ThreePhotosTemplate',
  'FourPhotosTemplate',
  'CaptionGalleryTemplate',
  'TimelineTemplate',
  'TextPageTemplate',
  'FreePageTemplate',
];

const FORMATS = ['18x24', '21x21'];
const SAFE = { min: 0.06, max: 0.94 };
const SAFE_TOLERANCE = 0.02;

let errors = 0;

function fail(message) {
  console.error(`FAIL: ${message}`);
  errors += 1;
}

function inSafeZone(frame) {
  return (
    frame.x >= SAFE.min - SAFE_TOLERANCE &&
    frame.y >= SAFE.min - SAFE_TOLERANCE &&
    frame.x + frame.w <= SAFE.max + SAFE_TOLERANCE &&
    frame.y + frame.h <= SAFE.max + SAFE_TOLERANCE
  );
}

function countPhotos(layout) {
  if (layout.pageType === 'free_page') return layout.limits?.maxPhotos ?? 4;
  const direct = layout.photoSlots?.length ?? 0;
  const events = layout.events?.length ?? 0;
  return Math.max(direct, events);
}

for (const id of EXPECTED_IDS) {
  if (!manifest.meta[id]) fail(`Missing meta for ${id}`);
  if (!manifest.templates[id]) fail(`Missing templates for ${id}`);

  for (const format of FORMATS) {
    const layout = manifest.templates[id]?.[format];
    if (!layout) {
      fail(`${id} missing format ${format}`);
      continue;
    }

    const photos = countPhotos(layout);
    if (photos > 4 && layout.pageType !== 'free_page') {
      fail(`${id}/${format}: more than 4 photo slots (${photos})`);
    }

    for (const slot of layout.photoSlots ?? []) {
      if (!inSafeZone(slot)) fail(`${id}/${format}: photo ${slot.id} outside safe zone`);
    }

    for (const block of layout.textBlocks ?? []) {
      if (!inSafeZone(block)) fail(`${id}/${format}: text ${block.id} outside safe zone`);
    }

    for (const event of layout.events ?? []) {
      if (!inSafeZone(event.photo)) fail(`${id}/${format}: event photo ${event.id} outside safe zone`);
      if (!inSafeZone(event.date)) fail(`${id}/${format}: event date ${event.id} outside safe zone`);
      if (!inSafeZone(event.description)) {
        fail(`${id}/${format}: event description ${event.id} outside safe zone`);
      }
    }

    if (layout.freeCanvas && !inSafeZone(layout.freeCanvas)) {
      fail(`${id}/${format}: freeCanvas outside safe zone`);
    }

    if (!layout.minFilledRule) {
      fail(`${id}/${format}: missing minFilledRule`);
    }
  }
}

const legacyMapPath = path.join(__dirname, '../utils/photoPageTemplateManifest.ts');
const legacySource = fs.readFileSync(legacyMapPath, 'utf8');
if (!legacySource.includes('LEGACY_TEMPLATE_ID_MAP')) {
  fail('LEGACY_TEMPLATE_ID_MAP not found in photoPageTemplateManifest.ts');
}

if (errors === 0) {
  console.log(`OK: ${EXPECTED_IDS.length} templates × ${FORMATS.length} formats verified`);
  process.exit(0);
}

console.error(`\n${errors} verification error(s)`);
process.exit(1);
