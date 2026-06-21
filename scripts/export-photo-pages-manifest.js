#!/usr/bin/env node
/**
 * Lists album pages that have non-empty photoBlocks in generated schemas.
 * node scripts/export-photo-pages-manifest.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const schemasPath = path.join(root, 'constants/generated/album-page-schemas.ts');
const raw = fs.readFileSync(schemasPath, 'utf8');

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

function extractAlbumSchemas(albumId, nextAlbumId) {
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

  const jsonText = raw.slice(arrayStart, end);
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    console.warn(`Failed to parse schemas for ${albumId}:`, error.message);
    return [];
  }
}

function hasNonEmptyPhotoBlocks(schema) {
  return Array.isArray(schema.photoBlocks) && schema.photoBlocks.length > 0;
}

const result = {};
for (const albumId of ALBUM_ORDER) {
  const schemas = extractAlbumSchemas(albumId);
  result[albumId] = schemas
    .filter(hasNonEmptyPhotoBlocks)
    .map((schema) => schema.sourcePageNumber)
    .sort((a, b) => a - b);
}

const outPath = path.join(root, 'constants/photo-pages-by-album.json');
fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outPath}`);
for (const [id, pages] of Object.entries(result)) {
  if (pages.length) console.log(`  ${id}: ${pages.length} photo pages`);
}
