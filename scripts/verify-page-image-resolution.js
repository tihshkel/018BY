#!/usr/bin/env node
/**
 * Проверка привязки фона к sourcePageNumber, а не imageIndex.
 * node scripts/verify-page-image-resolution.js
 */

function parseAlbumPageNumberFromUri(uri) {
  if (!uri) return null;
  const match = decodeURIComponent(uri).match(/page_(\d+)\.png/i);
  if (!match?.[1]) return null;
  const page = Number.parseInt(match[1], 10);
  return Number.isFinite(page) && page > 0 ? page : null;
}

function resolveInstancePageImageUri(images, instance) {
  if (instance.addedByUser) {
    return images[instance.imageIndex] ?? undefined;
  }

  const sourceIndex = instance.sourcePageNumber - 1;
  if (sourceIndex >= 0 && sourceIndex < images.length) {
    const bySource = images[sourceIndex];
    if (bySource) return bySource;
  }

  return images[instance.imageIndex] ?? undefined;
}

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const images = Array.from(
  { length: 12 },
  (_, i) => `file:///cache/page_${String(i + 1).padStart(3, '0')}.png`,
);

const sixthWeek = {
  sourcePageNumber: 9,
  imageIndex: 10,
  addedByUser: false,
};

assert(
  resolveInstancePageImageUri(images, sixthWeek) === images[8],
  'template page uses sourcePageNumber (page 9 → images[8])',
);

const addedPage = {
  sourcePageNumber: 9,
  imageIndex: 10,
  addedByUser: true,
};

assert(
  resolveInstancePageImageUri(images, addedPage) === images[10],
  'user-added page uses imageIndex',
);

assert(parseAlbumPageNumberFromUri(images[7]) === 8, 'parse page number from URI');

console.log('\nAll page image resolution checks passed.');
