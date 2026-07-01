#!/usr/bin/env node
/**
 * Audits all designed-album pages: variants with 3/4 photos must not appear
 * when slots are physically too small.
 *
 * node scripts/verify-photo-layout-feasibility.js
 */
const fs = require('fs');
const path = require('path');

const { resolveAlbumPhotoLayouts } = require('./album-photo-layout-resolver');
const { isPhotoVariantFeasible, maxFeasiblePhotoCount } = require('./photo-layout-feasibility');

const root = path.join(__dirname, '..');
const pdfSlots = JSON.parse(
  fs.readFileSync(path.join(root, 'constants/generated/pdf-photo-slots.json'), 'utf8'),
);
const circleSlots = JSON.parse(
  fs.readFileSync(path.join(root, 'constants/generated/pdf-circle-slots.json'), 'utf8'),
);
const schemasSource = fs.readFileSync(
  path.join(root, 'constants/generated/album-page-schemas.ts'),
  'utf8',
);

const DESIGNED_ALBUMS = [
  'pregnancy_60',
  'pregnancy_a5',
  'kids_48',
  'holidays_birthday_60',
  'diary_interior_brown',
  'diary_interior_purple',
];

function extractPageCount(albumId) {
  const re = new RegExp(`${albumId}:\\s*\\[([\\s\\S]*?)\\n\\s*\\],`, 'm');
  const match = schemasSource.match(re);
  if (!match) return 0;
  const pages = [...match[1].matchAll(/sourcePageNumber:\s*(\d+)/g)];
  return pages.length;
}

let checked = 0;
let narrowPages = 0;
const violations = [];

for (const albumId of DESIGNED_ALBUMS) {
  const pageCount = extractPageCount(albumId) || 48;
  for (let page = 1; page <= pageCount; page += 1) {
    const layouts = resolveAlbumPhotoLayouts(albumId, page, pdfSlots[albumId], circleSlots[albumId]);
    if (!layouts?.variants?.length) continue;

    checked += 1;
    const variantIds = layouts.variants.map((v) => v.variantId);
    const maxCount = maxFeasiblePhotoCount(layouts.variants);

    for (const variant of layouts.variants) {
      if (!isPhotoVariantFeasible(variant)) {
        violations.push(`${albumId} p${page}: infeasible variant ${variant.variantId} leaked`);
      }
      if (variant.slots.length >= 3 && maxCount < 3) {
        violations.push(`${albumId} p${page}: ${variant.variantId} offered but max feasible is ${maxCount}`);
      }
    }

    if (maxCount < 4 && variantIds.includes('four_grid')) {
      violations.push(`${albumId} p${page}: four_grid on tight page`);
    }
    if (maxCount < 3 && variantIds.includes('three_hero')) {
      violations.push(`${albumId} p${page}: three_hero on tight page`);
    }
    if (maxCount < 3) narrowPages += 1;
  }
}

if (violations.length) {
  console.error('Photo layout feasibility violations:');
  for (const item of violations) console.error(' -', item);
  process.exit(1);
}

console.log(`OK: ${checked} photo pages audited, ${narrowPages} pages cap below 3 photos`);
