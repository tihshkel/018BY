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
  assert((p1.fields?.length ?? 0) >= 1, 'p1 has owner field');

  for (const page of [6, 7, 8, 13, 24, 31]) {
    assert((byPage[String(page)].fields?.length ?? 0) >= 5, `brown p${page} questionnaire fields (>=5)`);
  }

  for (const page of [34, 35, 36]) {
    const fields = byPage[String(page)].fields ?? [];
    assert(fields.length >= 8, `brown p${page} weekly schedule fields (>=8)`);
  }

  const p37 = byPage['37'];
  assert((p37.fields?.length ?? 0) >= 9, 'brown p37 schedule with note fields (>=9)');
  assert(
    (p37.fields ?? []).some((f) => f.fieldId.endsWith('_weekNote')),
    'brown p37 has weekNote field',
  );
  assert(!p37.photoBlocks?.length, 'brown p37 has no stray photoBlocks');

  const p4brown = byPage['4'];
  assert((p4brown.photoBlocks?.length ?? 0) > 0, 'brown p4 has photoBlocks');
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
    assert((byPage[String(page)].fields?.length ?? 0) >= 16, `purple p${page} friend fields (>=16)`);
  }

  for (const page of [2, 3, 20, 21, 40]) {
    const schema = byPage[String(page)];
    assert(schema.pageType === 'non_editable', `purple p${page} is non_editable static`);
    assert(schema.editable === false, `purple p${page} editable=false`);
    assert((schema.fields?.length ?? 0) === 0, `purple p${page} has no fields`);
    assert(!schema.photoBlocks?.length, `purple p${page} has no photoBlocks`);
  }

  const p4 = byPage['4'];
  assert(p4.pageType === 'photo', 'purple p4 is photo page');
  assert((p4.photoBlocks?.length ?? 0) > 0, 'purple p4 has photoBlocks');
  assert((p4.fields?.length ?? 0) === 0, 'purple p4 has no text fields');

  for (const page of [5, 6, 7, 8, 10, 12, 14, 16, 18, 22]) {
    assert((byPage[String(page)].fields?.length ?? 0) >= 5, `purple p${page} questionnaire fields (>=5)`);
  }

  for (const page of [24, 25, 26]) {
    const fields = byPage[String(page)].fields ?? [];
    assert(fields.length >= 8, `purple p${page} weekly schedule fields (>=8)`);
    assert(
      fields.some((f) => f.label.includes('Понедельник') || f.label.includes('Среда') || f.label.includes('Пятница')),
      `purple p${page} has named day schedule labels`,
    );
  }

  const p27 = byPage['27'];
  assert((p27.fields?.length ?? 0) >= 5, 'purple p27 Sunday schedule fields (>=5)');
  assert(
    (p27.fields ?? []).some((f) => f.label.includes('Утренние') || f.label.includes('планы')),
    'purple p27 has named Sunday fields (not generic)',
  );

  const p40 = byPage['40'];
  assert(p40.pageType === 'non_editable', 'purple p40 is static finale');
  assert(p40.title === 'История продолжается', 'purple p40 title');

  for (const page of [34, 35, 36, 37, 38, 39]) {
    const schema = byPage[String(page)];
    assert(!schema.photoBlocks?.length, `purple p${page} has no stray photoBlocks`);
  }

  const src = fs.readFileSync(path.join(root, 'constants/album-sections.ts'), 'utf8');
  assert(src.includes('DIARY_PURPLE_A5_SECTIONS'), 'album-sections defines DIARY_PURPLE_A5_SECTIONS');
}

function getSchemasForAlbum(albumId, nextAlbumId) {
  const schemasPath = path.join(root, 'constants/generated/album-page-schemas.ts');
  const raw = fs.readFileSync(schemasPath, 'utf8');
  const pattern = new RegExp(
    `"${albumId}":\\s*(\\[[\\s\\S]*?\\])\\s*,\\s*"${nextAlbumId}"`,
  );
  const match = raw.match(pattern);
  if (!match) {
    throw new Error(`Could not parse ${albumId} schemas from album-page-schemas.ts`);
  }
  return JSON.parse(match[1]);
}

function verifyBirthday48() {
  const manifestPath = path.join(root, 'scripts/birthday-48-tz-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    assert(false, 'birthday-48-tz-manifest.json exists (run node scripts/generate-birthday-48-tz-manifest.js)');
    return;
  }
  const manifest = loadJson('scripts/birthday-48-tz-manifest.json');
  const schemas = getSchemasForAlbum('holidays_birthday_60', 'diary_interior_brown');
  const byPage = Object.fromEntries(schemas.map((s) => [String(s.sourcePageNumber), s]));

  assert(Object.keys(manifest).length === 48, 'birthday-48 manifest has 48 pages');
  assert(schemas.length === 48, 'holidays_birthday_60 schemas has 48 pages');

  for (let page = 1; page <= 48; page += 1) {
    const key = String(page);
    const tz = manifest[key];
    const schema = byPage[key];
    assert(schema.title === tz.title, `birthday p${page} title matches TZ`);
    assert(schema.pageType === tz.pageType, `birthday p${page} pageType matches TZ`);
    assert(schema.editable === tz.editable, `birthday p${page} editable matches TZ`);
    assert(schema.canDuplicate === tz.canDuplicate, `birthday p${page} canDuplicate matches TZ`);
  }

  const p1 = byPage['1'];
  assert((p1.fields ?? []).some((f) => f.fieldId.endsWith('_ownerName')), 'birthday p1 owner field');

  const p48 = byPage['48'];
  assert(p48.pageType === 'text_page', 'birthday p48 is text_page');
  assert((p48.fields ?? []).some((f) => f.fieldId.endsWith('_letter_text')), 'birthday p48 letter field');

  const p40 = byPage['40'];
  assert((p40.fields ?? []).length >= 3, 'birthday p40 travel fields (>=3)');

  require('./verify-birthday-48-asset-map.js');
}

function verifyKids48() {
  const manifest = loadJson('constants/kids-48-tz-manifest.json');
  const schemas = getSchemasForAlbum('kids_48', 'holidays_birthday_60');
  const byPage = Object.fromEntries(schemas.map((s) => [String(s.sourcePageNumber), s]));

  assert(Object.keys(manifest).length === 48, 'kids-48 manifest has 48 pages');
  assert(schemas.length === 48, 'kids_48 schemas has 48 pages');

  for (let page = 1; page <= 48; page += 1) {
    const key = String(page);
    const tz = manifest[key];
    const schema = byPage[key];
    assert(schema.title === tz.title, `kids p${page} title matches TZ`);
    assert(schema.pageType === tz.pageType, `kids p${page} pageType matches TZ`);
  }

  const p10 = byPage['10'];
  assert(p10.pageType === 'teeth', 'kids p10 is teeth page');
  assert((p10.fields ?? []).length >= 20, 'kids p10 has tooth fields (>=20)');
  assert(
    !(p10.fields ?? []).some((f) => /upper|lower|molar|canine/i.test(f.label)),
    'kids p10 tooth labels are Russian (not English ids)',
  );

  const p3 = byPage['3'];
  const mother = (p3.fields ?? []).find((f) => f.fieldId.endsWith('_mother_guess'));
  const father = (p3.fields ?? []).find((f) => f.fieldId.endsWith('_father_guess'));
  assert(mother && father, 'kids p3 has gender radio fields');
  assert(mother.templateLineStart !== father.templateLineStart, 'kids p3 radio fields do not overlap lines');
}

function verifyPregnancy60() {
  const schemas = getSchemasForAlbum('pregnancy_60', 'pregnancy_a5');
  const byPage = Object.fromEntries(schemas.map((s) => [String(s.sourcePageNumber), s]));

  assert(schemas.length === 60, 'pregnancy_60 schemas has 60 pages');

  const p60 = byPage['60'];
  assert(p60.title === 'Письмо малышу', 'pregnancy p60 title');
  assert(p60.pageType === 'text_page', 'pregnancy p60 is text_page');
  assert(p60.editable === true, 'pregnancy p60 editable');
  assert((p60.fields ?? []).some((f) => f.fieldId.endsWith('_letter_text')), 'pregnancy p60 letter field');

  for (const page of [50, 51, 53]) {
    const schema = byPage[String(page)];
    assert(schema.editable === true, `pregnancy p${page} editable`);
    assert(schema.pageType === 'structured', `pregnancy p${page} is structured`);
  }

  for (const page of [5, 8, 18, 33]) {
    const schema = byPage[String(page)];
    assert(schema.pageType === 'non_editable', `pregnancy p${page} is non_editable static`);
    assert(schema.editable === false, `pregnancy p${page} editable=false`);
  }

  const p9 = byPage['9'];
  assert(p9.title === '6-я неделя', 'pregnancy p9 week title');
}

function verifyPregnancyA5() {
  const schemas = getSchemasForAlbum('pregnancy_a5', 'kids_48');
  const byPage = Object.fromEntries(schemas.map((s) => [String(s.sourcePageNumber), s]));

  assert(schemas.length === 48, 'pregnancy_a5 schemas has 48 pages');

  for (const page of [2, 4, 14, 29, 47]) {
    const schema = byPage[String(page)];
    assert(schema.pageType === 'non_editable', `pregnancy A5 p${page} is non_editable static`);
    assert(schema.editable === false, `pregnancy A5 p${page} editable=false`);
  }

  assert(byPage['29'].title === '3 триместр', 'pregnancy A5 p29 is 3rd trimester static');
  assert(byPage['5'].title === '6-я неделя', 'pregnancy A5 p5 week 6');
  assert(byPage['20'].title === '20-я неделя', 'pregnancy A5 p20 week 20');
  assert(byPage['43'].title === '42-я неделя', 'pregnancy A5 p43 week 42');

  const pdfSlots = loadJson('constants/generated/pdf-photo-slots.json');
  assert(
    Object.keys(pdfSlots.pregnancy_a5 ?? {}).length > 0,
    'pdf-photo-slots: pregnancy_a5 has entries',
  );
}

verifyBrown60();
verifyPurpleA5();
verifyAlbumSections();
verifyBirthday48();
verifyKids48();
verifyPregnancy60();
verifyPregnancyA5();

if (failed > 0) {
  console.error(`\n${failed} verification error(s)`);
  process.exit(1);
}

console.log('\nAll TZ compliance checks passed.');
