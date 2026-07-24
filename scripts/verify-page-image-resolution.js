#!/usr/bin/env node
/**
 * Проверка привязки фона к sourcePageNumber (page_NNN в URI), не к display-index.
 * node scripts/verify-page-image-resolution.js
 */

function parseAlbumPageNumberFromUri(uri) {
  if (!uri) return null;
  const match = decodeURIComponent(uri).match(/page_(\d+)\.png/i);
  if (!match?.[1]) return null;
  const page = Number.parseInt(match[1], 10);
  return Number.isFinite(page) && page > 0 ? page : null;
}

function findImageUriBySourcePageNumber(images, sourcePageNumber) {
  if (!sourcePageNumber || sourcePageNumber < 1) return undefined;
  return images.find((uri) => parseAlbumPageNumberFromUri(uri) === sourcePageNumber);
}

function resolveInstancePageImageUri(images, instance) {
  if (instance.addedByUser) {
    return images[instance.imageIndex] ?? undefined;
  }

  const byPageNumber = findImageUriBySourcePageNumber(
    images,
    instance.sourcePageNumber,
  );
  if (byPageNumber) return byPageNumber;

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

// Post-insert: splice user page before index 3 → display-order ≠ source index
const afterInsert = [...images];
afterInsert.splice(3, 0, 'file:///cache/page_047.png');
const trimesterPage = {
  sourcePageNumber: 4,
  imageIndex: 4,
  addedByUser: false,
};
assert(
  resolveInstancePageImageUri(afterInsert, trimesterPage) === images[3],
  'after insert before p4, template p4 still resolves to page_004 (not inserted URI)',
);
assert(
  resolveInstancePageImageUri(afterInsert, trimesterPage) !== afterInsert[3],
  'after insert, images[source-1] must NOT be used (would be page_047)',
);

const inserted = {
  sourcePageNumber: 47,
  imageIndex: 3,
  addedByUser: true,
};
assert(
  resolveInstancePageImageUri(afterInsert, inserted) === afterInsert[3],
  'user-added page still uses imageIndex after insert',
);

console.log('\nAll page image resolution checks passed.');
