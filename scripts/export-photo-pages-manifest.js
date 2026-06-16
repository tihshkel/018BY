#!/usr/bin/env node
/**
 * Lists album pages that have photoBlocks in generated schemas.
 * node scripts/export-photo-pages-manifest.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const raw = fs.readFileSync(
  path.join(root, 'constants/generated/album-page-schemas.ts'),
  'utf8'
);

const ALBUM_ORDER = [
  'pregnancy_60',
  'pregnancy_a5',
  'kids_48',
  'holidays_birthday_60',
  'diary_interior_brown',
  'diary_interior_purple',
  'family_blank',
  'holidays_blank',
];

function extractPhotoPages(albumId, nextAlbumId) {
  const start = raw.indexOf(`"${albumId}": [`);
  if (start < 0) return [];
  const end =
    nextAlbumId && raw.indexOf(`"${nextAlbumId}":`, start) > start
      ? raw.indexOf(`"${nextAlbumId}":`, start)
      : raw.length;
  const chunk = raw.slice(start, end);
  const blocks = chunk.split(/\n    \{\n      "pageId": /).slice(1);
  const pages = [];
  for (const block of blocks) {
    const src = block.match(/"sourcePageNumber": (\d+)/)?.[1];
    if (!src || !block.includes('"photoBlocks"')) continue;
    pages.push(Number(src));
  }
  return pages.sort((a, b) => a - b);
}

const result = {};
for (let i = 0; i < ALBUM_ORDER.length; i += 1) {
  const albumId = ALBUM_ORDER[i];
  const next = ALBUM_ORDER[i + 1];
  result[albumId] = extractPhotoPages(albumId, next);
}

const outPath = path.join(root, 'constants/photo-pages-by-album.json');
fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outPath}`);
for (const [id, pages] of Object.entries(result)) {
  if (pages.length) console.log(`  ${id}: ${pages.length} photo pages`);
}
