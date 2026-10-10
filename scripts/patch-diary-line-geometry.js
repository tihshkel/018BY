/* eslint-disable no-console */
/**
 * Diary-only: snap brown MyDay date slots onto the printed stroke and unify
 * continuationGroup from schema field ranges. Does not touch pregnancy/kids.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BROWN_MYDAY_DATE_PLACEHOLDER_Y = 0.1654;
const BROWN_MYDAY_DATE_STROKE_Y = 0.1419;
const DIARY_IDS = ['diary_interior_brown', 'diary_interior_purple'];

function parseSchemas() {
  const raw = fs.readFileSync(
    path.join(ROOT, 'constants/generated/album-page-schemas.ts'),
    'utf8',
  );
  const match = raw.match(
    /export const ALBUM_PAGE_SCHEMAS[^=]*=\s*(\{[\s\S]*\})\s*as Record/,
  );
  if (!match) {
    throw new Error('Could not parse ALBUM_PAGE_SCHEMAS');
  }
  return JSON.parse(match[1]);
}

function unifyPageSlots(slots, schema) {
  if (!Array.isArray(slots) || !schema?.fields?.length) return slots;
  const next = slots.map((slot) => ({ ...slot }));
  for (const field of schema.fields) {
    const start = field.templateLineStart ?? 0;
    const count = field.templateLineCount ?? 1;
    const groupId = start + 1;
    for (let offset = 0; offset < count; offset += 1) {
      const index = start + offset;
      if (index >= 0 && index < next.length) {
        next[index] = { ...next[index], continuationGroup: groupId };
      }
    }
  }
  return next;
}

function snapBrownMyDayDate(albumId, slots) {
  if (albumId !== 'diary_interior_brown' || !slots?.length) return slots;
  const first = slots[0];
  if ((first.inputKind ?? 'line') !== 'line') return slots;
  if (Math.abs(first.y - BROWN_MYDAY_DATE_PLACEHOLDER_Y) > 0.003) return slots;
  return [{ ...first, y: BROWN_MYDAY_DATE_STROKE_Y }, ...slots.slice(1)];
}

function patchAlbum(lineSlots, lineGuides, schemas, albumId) {
  const pages = lineSlots[albumId] ?? {};
  const schemaPages = schemas[albumId] ?? [];
  let dateSnaps = 0;
  for (const [pageKey, slots] of Object.entries(pages)) {
    const pageNumber = Number(pageKey);
    const schema = schemaPages.find((entry) => entry.sourcePageNumber === pageNumber);
    let next = snapBrownMyDayDate(albumId, slots);
    if (next !== slots && next[0]?.y === BROWN_MYDAY_DATE_STROKE_Y) dateSnaps += 1;
    next = unifyPageSlots(next, schema);
    pages[pageKey] = next;
    if (lineGuides[albumId]) {
      lineGuides[albumId][pageKey] = next.map((slot) => slot.y);
    }
  }
  console.log(`[${albumId}] date snaps: ${dateSnaps}`);
}

function main() {
  const schemas = parseSchemas();
  const lineSlots = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'constants/line-slots.json'), 'utf8'),
  );
  const lineGuides = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'constants/line-guides.json'), 'utf8'),
  );
  const overridePath = path.join(ROOT, 'scripts/diary-brown-slot-overrides-data.json');
  const overrides = JSON.parse(fs.readFileSync(overridePath, 'utf8'));

  const pregnancy60Before = JSON.stringify(lineSlots.pregnancy_60);
  const kidsBefore = JSON.stringify(lineSlots.kids_48);

  for (const albumId of DIARY_IDS) {
    patchAlbum(lineSlots, lineGuides, schemas, albumId);
  }

  const brownSchema = schemas.diary_interior_brown ?? [];
  for (const [pageKey, slots] of Object.entries(overrides)) {
    const pageNumber = Number(pageKey);
    const schema = brownSchema.find((entry) => entry.sourcePageNumber === pageNumber);
    let next = snapBrownMyDayDate('diary_interior_brown', slots);
    next = unifyPageSlots(next, schema);
    overrides[pageKey] = next;
  }

  if (JSON.stringify(lineSlots.pregnancy_60) !== pregnancy60Before) {
    throw new Error('Refusing to write: pregnancy_60 slots changed');
  }
  if (JSON.stringify(lineSlots.kids_48) !== kidsBefore) {
    throw new Error('Refusing to write: kids_48 slots changed');
  }

  fs.writeFileSync(
    path.join(ROOT, 'constants/line-slots.json'),
    `${JSON.stringify(lineSlots, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(ROOT, 'constants/line-guides.json'),
    `${JSON.stringify(lineGuides, null, 2)}\n`,
  );
  fs.writeFileSync(overridePath, `${JSON.stringify(overrides, null, 2)}\n`);

  const slotsTsPath = path.join(ROOT, 'constants/line-slots.ts');
  const slotsHeader = fs
    .readFileSync(slotsTsPath, 'utf8')
    .split('export const LINE_SLOTS =')[0];
  fs.writeFileSync(
    slotsTsPath,
    `${slotsHeader}export const LINE_SLOTS = ${JSON.stringify(lineSlots, null, 2)} as const;\n`,
  );

  const guidesTsPath = path.join(ROOT, 'constants/line-guides.ts');
  const guidesHeader = fs
    .readFileSync(guidesTsPath, 'utf8')
    .split('export const LINE_GUIDES =')[0];
  fs.writeFileSync(
    guidesTsPath,
    `${guidesHeader}export const LINE_GUIDES = ${JSON.stringify(lineGuides, null, 2)} as const;\n`,
  );

  console.log('Patched diary line geometry only.');
}

main();
