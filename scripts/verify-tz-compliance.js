#!/usr/bin/env node
/**
 * Verifies TZ manifest compliance for diary_interior_brown (60 pages) and related albums.
 * node scripts/verify-tz-compliance.js
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

function getBrownSchemas() {
  const schemasPath = path.join(root, 'constants/generated/album-page-schemas.ts');
  const raw = fs.readFileSync(schemasPath, 'utf8');
  const match = raw.match(/"diary_interior_brown":\s*(\[[\s\S]*?\])\s*,\s*"diary_interior_purple"/);
  if (!match) {
    throw new Error('Could not parse diary_interior_brown schemas from album-page-schemas.ts');
  }
  return JSON.parse(match[1]);
}

function verifyBrown60() {
  const manifest = loadJson('scripts/diary-60-tz-manifest.json');
  const schemas = getBrownSchemas();
  const byPage = Object.fromEntries(
    schemas.map((s) => [String(s.sourcePageNumber), s])
  );

  assert(Object.keys(manifest).length === 60, 'diary-60 manifest has 60 pages');
  assert(schemas.length === 60, 'diary_interior_brown schemas has 60 pages');

  for (let page = 1; page <= 60; page += 1) {
    const key = String(page);
    const tz = manifest[key];
    const schema = byPage[key];
    assert(!!tz, `manifest page ${page} exists`);
    assert(!!schema, `schema page ${page} exists`);
    assert(schema.title === tz.title, `p${page} title matches TZ (${schema.title})`);
    assert(schema.pageType === tz.pageType, `p${page} pageType matches TZ`);
    assert(schema.editable === tz.editable, `p${page} editable matches TZ`);
    assert(schema.canDuplicate === tz.canDuplicate, `p${page} canDuplicate matches TZ`);
  }

  for (const page of [57, 58, 59]) {
    const schema = byPage[String(page)];
    assert(
      (schema.photoBlocks?.length ?? 0) > 0,
      `p${page} has photoBlocks (FreePhotoNotes)`
    );
    assert(schema.pageType === 'caption_photo_page', `p${page} is caption_photo_page`);
    assert(schema.canDuplicate === true, `p${page} canDuplicate`);
  }

  const p60 = byPage['60'];
  assert(p60.pageType === 'non_editable', 'p60 is non_editable (StaticFinal)');
  assert(p60.editable === false, 'p60 editable=false');

  for (const page of [39, 40, 41, 42, 43, 44]) {
    const schema = byPage[String(page)];
    assert(schema.canDuplicate === true, `p${page} friend questionnaire canDuplicate`);
    assert((schema.fields?.length ?? 0) >= 16, `p${page} friend fields (>=16)`);
  }

  const p38 = byPage['38'];
  assert(p38.title === 'Еда', 'p38 title is Еда');
  assert((p38.fields?.length ?? 0) === 6, 'p38 has 6 food fields');

  const p1 = byPage['1'];
  assert(p1.title === 'Этот дневник принадлежит', 'p1 DiaryOwner title');
}

function verifyAlbumSections() {
  const src = fs.readFileSync(path.join(root, 'constants/album-sections.ts'), 'utf8');
  assert(src.includes('DIARY_BROWN_60_SECTIONS'), 'album-sections defines DIARY_BROWN_60_SECTIONS');
  assert(src.includes('pageRange: [57, 60]'), 'finale section covers pages 57-60');
}

function verifyPurpleA5() {
  const manifest = loadJson('scripts/girls-diary-a5-tz-manifest.json');
  const schemasPath = path.join(root, 'constants/generated/album-page-schemas.ts');
  const raw = fs.readFileSync(schemasPath, 'utf8');
  const match = raw.match(/"diary_interior_purple":\s*(\[[\s\S]*?\])\s*,\s*"family_blank"/);
  if (!match) {
    assert(false, 'Could not parse diary_interior_purple schemas');
    return;
  }
  const schemas = JSON.parse(match[1]);
  const byPage = Object.fromEntries(
    schemas.map((s) => [String(s.sourcePageNumber), s])
  );

  assert(Object.keys(manifest).length === 40, 'girls-diary-a5 manifest has 40 pages');
  assert(schemas.length === 40, 'diary_interior_purple schemas has 40 pages');

  for (let page = 1; page <= 40; page += 1) {
    const key = String(page);
    const tz = manifest[key];
    const schema = byPage[key];
    assert(schema.title === tz.title, `purple p${page} title matches TZ`);
    assert(schema.pageType === tz.pageType, `purple p${page} pageType matches TZ`);
    assert(schema.editable === tz.editable, `purple p${page} editable matches TZ`);
  }

  for (const page of [28, 29, 30, 31, 32, 33]) {
    assert(byPage[String(page)].canDuplicate === true, `purple p${page} friend canDuplicate`);
  }

  const p40 = byPage['40'];
  assert(p40.pageType === 'non_editable', 'purple p40 is static finale');
  assert(p40.title === 'История продолжается', 'purple p40 title');

  const src = fs.readFileSync(path.join(root, 'constants/album-sections.ts'), 'utf8');
  assert(src.includes('DIARY_PURPLE_A5_SECTIONS'), 'album-sections defines DIARY_PURPLE_A5_SECTIONS');
}

verifyBrown60();
verifyPurpleA5();
verifyAlbumSections();

if (failed > 0) {
  console.error(`\n${failed} verification error(s)`);
  process.exit(1);
}

console.log('\nAll TZ compliance checks passed.');
