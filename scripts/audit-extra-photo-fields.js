#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Audit: pages that would show photo UI (schema photoBlocks or enrich)
 * vs canon photo-pages-by-album.json and vs iOS commit behavior.
 *
 * node scripts/audit-extra-photo-fields.js
 * node scripts/audit-extra-photo-fields.js --fail
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const IOS_REF = 'e24a739d1ae04ca590c52e5da4af0c7edcbf8ef0';
const fail = process.argv.includes('--fail');

const canon = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'constants/photo-pages-by-album.json'), 'utf8'),
);
const schemasSrc = fs.readFileSync(
  path.join(ROOT, 'constants/generated/album-page-schemas.ts'),
  'utf8',
);

const ALBUMS = {
  pregnancy_60: 60,
  pregnancy_a5: 48,
  kids_48: 48,
  holidays_birthday_60: 48,
  diary_interior_brown: 60,
  diary_interior_purple: 40,
};

const PHOTO_PAGE_TYPES = new Set([
  'photo',
  'free',
  'caption_photo_page',
  'event_photo',
  'free_photo_caption',
  'timeline_page',
  'free_page',
  'birthday_free_page',
]);

function extractAlbumSchemas(albumId) {
  const startMarker = `"${albumId}": [`;
  const start = schemasSrc.indexOf(startMarker);
  if (start < 0) return [];
  const arrayStart = start + startMarker.length - 1;
  let depth = 0;
  let end = arrayStart;
  for (let i = arrayStart; i < schemasSrc.length; i += 1) {
    if (schemasSrc[i] === '[') depth += 1;
    if (schemasSrc[i] === ']') {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  try {
    return JSON.parse(schemasSrc.slice(arrayStart, end));
  } catch {
    return [];
  }
}

function schemaShowsPhotoUi(schema) {
  if (schema.editable === false || schema.pageType === 'non_editable') return false;
  if (Array.isArray(schema.photoBlocks)) return schema.photoBlocks.length > 0;
  // Absent photoBlocks: enrich only if pageType is photo-like or canon structured page
  if (PHOTO_PAGE_TYPES.has(schema.pageType)) return true;
  if (schema.pageType === 'structured' || schema.pageType === 'text_page') {
    const pages = canon[schema.lineGuideId];
    if (!pages) return false;
    return pages.includes(schema.sourcePageNumber);
  }
  return false;
}

const resolveDiff = execSync(
  `git diff ${IOS_REF} -- utils/resolvePhotoPageLayouts.ts`,
  { cwd: ROOT, encoding: 'utf8' },
);
const hasSynthetic =
  /syntheticPrimary|eventSafe/.test(resolveDiff) &&
  resolveDiff.includes('+') &&
  /getSparsePhotoAlbumConfig/.test(resolveDiff);

console.log('=== resolvePhotoPageLayouts vs iOS ===');
if (hasSynthetic) {
  console.log('FAIL: Android still has synthetic eventSafe photo fallback (not on iOS)');
} else if (!resolveDiff.trim()) {
  console.log('OK: identical to iOS');
} else {
  console.log('INFO: differs from iOS (non-synthetic):');
  console.log(resolveDiff.slice(0, 800));
}

console.log('\n=== Extra photo UI vs photo-pages-by-album.json ===');
let extraTotal = 0;
let missingTotal = 0;
const spotlight = [];

for (const [album, count] of Object.entries(ALBUMS)) {
  const want = new Set(canon[album] || []);
  const schemas = extractAlbumSchemas(album);
  const byPage = new Map();
  for (const schema of schemas) {
    byPage.set(schema.sourcePageNumber, schema);
  }
  const extra = [];
  const missing = [];
  for (let p = 1; p <= count; p += 1) {
    const schema = byPage.get(p);
    if (!schema) continue;
    const shows = schemaShowsPhotoUi(schema);
    if (shows && !want.has(p)) extra.push(`${p}:${schema.title}`);
    if (!shows && want.has(p) && Array.isArray(schema.photoBlocks) && schema.photoBlocks.length === 0) {
      // locked empty — ok
    } else if (!shows && want.has(p) && schema.photoBlocks === undefined && !PHOTO_PAGE_TYPES.has(schema.pageType)) {
      // structured in canon with absent — enrich allowed by our gate; counts as shows via gate
    }
    if (!shows && want.has(p)) {
      // Canon expects photo; schema must have blocks or photo pageType or enrichable structured
      const ok =
        (Array.isArray(schema.photoBlocks) && schema.photoBlocks.length > 0) ||
        PHOTO_PAGE_TYPES.has(schema.pageType) ||
        ((schema.pageType === 'structured' || schema.pageType === 'text_page') &&
          want.has(p));
      if (!ok) missing.push(`${p}:${schema.title}`);
    }
  }
  // Recompute missing properly: canon page should show photo UI
  const missing2 = [];
  for (const p of want) {
    const schema = byPage.get(p);
    if (!schema) {
      missing2.push(`${p}:no-schema`);
      continue;
    }
    if (!schemaShowsPhotoUi(schema)) missing2.push(`${p}:${schema.title}`);
  }
  const extra2 = [];
  for (const schema of schemas) {
    const p = schema.sourcePageNumber;
    if (schemaShowsPhotoUi(schema) && !want.has(p)) {
      extra2.push(`${p}:${schema.title}`);
    }
  }

  console.log(`\n${album}`);
  console.log(`  EXTRA: ${extra2.length ? extra2.join(' | ') : 'none'}`);
  console.log(`  MISSING: ${missing2.length ? missing2.join(' | ') : 'none'}`);
  extraTotal += extra2.length;
  missingTotal += missing2.length;

  for (const p of [1, 5, 6]) {
    const schema = byPage.get(p);
    if (!schema) continue;
    if (
      /дневник принадлежит|анкета|Лучший|Кем я/i.test(schema.title) ||
      album.startsWith('diary')
    ) {
      spotlight.push({
        album,
        p,
        title: schema.title,
        shows: schemaShowsPhotoUi(schema),
        canon: want.has(p),
        pb: Array.isArray(schema.photoBlocks)
          ? schema.photoBlocks.length
            ? 'nonempty'
            : 'empty'
          : 'absent',
      });
    }
  }
}

console.log('\n=== Spotlight diary-like pages ===');
for (const row of spotlight) {
  const bad = row.shows && !row.canon;
  console.log(
    `${bad ? 'BAD' : 'ok '} ${row.album} p${row.p} pb=${row.pb} shows=${row.shows} canon=${row.canon} — ${row.title}`,
  );
}

const badSpotlight = spotlight.filter((r) => r.shows && !r.canon);
console.log(`\nSummary: extra=${extraTotal} missing=${missingTotal} synthetic=${hasSynthetic} badSpotlight=${badSpotlight.length}`);

if (fail && (hasSynthetic || extraTotal > 0 || badSpotlight.length > 0)) {
  process.exit(1);
}
