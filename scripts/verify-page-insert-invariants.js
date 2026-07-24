#!/usr/bin/env node
/**
 * Invariants after «+ Добавить страницу»:
 * - TOC groups by display order (not sourcePageNumber)
 * - non_editable pages stay locked by schema identity
 * - template backgrounds resolve by page_NNN after splice
 *
 * node scripts/verify-page-insert-invariants.js
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

function loadAlbumSchemas(albumId) {
  const schemasPath = path.join(root, 'constants/generated/album-page-schemas.ts');
  const raw = fs.readFileSync(schemasPath, 'utf8');
  const startToken = `"${albumId}": [`;
  const start = raw.indexOf(startToken);
  if (start < 0) {
    throw new Error(`Could not find schemas for ${albumId}`);
  }
  let i = start + startToken.length - 1; // at '['
  let depth = 0;
  for (; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        const json = raw.slice(start + startToken.length - 1, i + 1);
        return JSON.parse(json);
      }
    }
  }
  throw new Error(`Could not parse schemas for ${albumId}`);
}

function pageUri(n) {
  return `file:///cache/page_${String(n).padStart(3, '0')}.png`;
}

function parseAlbumPageNumberFromUri(uri) {
  if (!uri) return null;
  const match = decodeURIComponent(uri).match(/page_(\d+)\.png/i);
  if (!match?.[1]) return null;
  const page = Number.parseInt(match[1], 10);
  return Number.isFinite(page) && page > 0 ? page : null;
}

function findImageUriBySourcePageNumber(images, sourcePageNumber) {
  return images.find((uri) => parseAlbumPageNumberFromUri(uri) === sourcePageNumber);
}

function resolveInstancePageImageUri(images, instance) {
  if (instance.addedByUser) {
    return images[instance.imageIndex] ?? undefined;
  }
  return (
    findImageUriBySourcePageNumber(images, instance.sourcePageNumber) ??
    images[instance.imageIndex]
  );
}

function reindexPageInstances(instances, images) {
  return instances.slice(0, images.length).map((instance, index) => ({
    ...instance,
    order: index + 1,
    imageIndex: index,
  }));
}

function insertPageAtIndex({ instances, images, insertAfterIndex, newImageUri, sourcePageNumber }) {
  const newInstance = {
    instanceId: `page_user_${sourcePageNumber}`,
    schemaPageId: `lib_p${sourcePageNumber}`,
    sourcePageNumber,
    order: insertAfterIndex + 2,
    addedByUser: true,
    imageIndex: insertAfterIndex + 1,
  };
  const newImages = [...images];
  newImages.splice(insertAfterIndex + 1, 0, newImageUri);
  const newInstances = [...instances];
  newInstances.splice(insertAfterIndex + 1, 0, newInstance);
  return {
    instances: reindexPageInstances(newInstances, newImages),
    images: newImages,
  };
}

function getAlbumSections(lineGuideId, pageCount) {
  const named = {
    kids_48: [
      { sectionId: 'beginning', title: 'Начало', pageRange: [1, 21] },
      { sectionId: 'first_year', title: 'Первый год', pageRange: [22, 33] },
      { sectionId: 'seasons', title: 'Сезоны', pageRange: [34, 41] },
      { sectionId: 'memories', title: 'Память', pageRange: [42, 48] },
    ],
    diary_interior_brown: [
      { sectionId: 'intro', pageRange: [1, 5] },
      { sectionId: 'family', pageRange: [6, 12] },
      { sectionId: 'interests', pageRange: [13, 19] },
      { sectionId: 'days', pageRange: [20, 28] },
      { sectionId: 'secret', pageRange: [29, 30] },
      { sectionId: 'school', pageRange: [31, 38] },
      { sectionId: 'friends', pageRange: [39, 44] },
      { sectionId: 'my_days', pageRange: [45, 56] },
      { sectionId: 'finale', pageRange: [57, 60] },
    ],
    diary_interior_purple: [
      { sectionId: 'intro', pageRange: [1, 4] },
      { sectionId: 'about', pageRange: [5, 7] },
      { sectionId: 'interests', pageRange: [8, 19] },
      { sectionId: 'secret', pageRange: [20, 21] },
      { sectionId: 'school', pageRange: [22, 27] },
      { sectionId: 'friends', pageRange: [28, 33] },
      { sectionId: 'diary', pageRange: [34, 39] },
      { sectionId: 'finale', pageRange: [40, 40] },
    ],
    holidays_birthday_60: [
      { sectionId: 'intro', pageRange: [1, 3] },
      { sectionId: 'a1', pageRange: [4, 15] },
      { sectionId: 'a2', pageRange: [16, 27] },
      { sectionId: 'a3', pageRange: [28, 39] },
      { sectionId: 'travel', pageRange: [40, 47] },
      { sectionId: 'letter', pageRange: [48, 48] },
    ],
  };
  if (named[lineGuideId]) return named[lineGuideId].map((s, i) => ({ ...s, order: i + 1, title: s.title || s.sectionId }));

  const total = pageCount;
  const chunkSize = total <= 24 ? total : 15;
  const sections = [];
  let order = 1;
  for (let start = 1; start <= total; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, total);
    sections.push({
      sectionId: `section_${start}`,
      title: `Страницы ${start}–${end}`,
      pageRange: [start, end],
      order: order++,
    });
  }
  return sections;
}

function resolveAlbumSectionsForInstances(lineGuideId, instanceCount, basePageCount) {
  const sections = getAlbumSections(lineGuideId, basePageCount);
  if (!sections.length || instanceCount <= 0) return sections;
  const last = sections[sections.length - 1];
  if (instanceCount <= last.pageRange[1]) return sections;
  const start = last.pageRange[0];
  return [
    ...sections.slice(0, -1),
    {
      ...last,
      pageRange: [start, instanceCount],
      title: /^Страницы\s+\d+/.test(last.title)
        ? `Страницы ${start}–${instanceCount}`
        : last.title,
    },
  ];
}

function getInstancesInSectionByOrder(instances, section) {
  const [start, end] = section.pageRange;
  return instances
    .filter((i) => i.order >= start && i.order <= end)
    .sort((a, b) => a.order - b.order);
}

function isLockedSchema(schema) {
  return Boolean(schema && (schema.pageType === 'non_editable' || schema.editable === false));
}

function buildProject(schemas) {
  const images = schemas.map((s) => pageUri(s.sourcePageNumber));
  const instances = schemas.map((s, index) => ({
    instanceId: `page_${s.sourcePageNumber}`,
    schemaPageId: s.pageId,
    sourcePageNumber: s.sourcePageNumber,
    order: index + 1,
    imageIndex: index,
    addedByUser: false,
  }));
  return { images, instances, schemas };
}

function schemaForInstance(schemas, instance) {
  return (
    schemas.find((s) => s.pageId === instance.schemaPageId) ??
    schemas.find((s) => s.sourcePageNumber === instance.sourcePageNumber)
  );
}

const LOCKED_PAGES = {
  pregnancy_60: [5, 8, 18, 33, 48, 49],
  pregnancy_a5: [2, 4, 14, 29],
  kids_48: [2],
  diary_interior_brown: [2, 29, 30, 60],
  diary_interior_purple: [2, 20, 21, 40],
};

const TOC_ALBUMS = [
  'pregnancy_60',
  'pregnancy_a5',
  'kids_48',
  'diary_interior_brown',
  'diary_interior_purple',
  'holidays_birthday_60',
];

function verifyTocAfterInsert(albumId) {
  const schemas = loadAlbumSchemas(albumId);
  const base = buildProject(schemas);
  const tailSource = schemas[schemas.length - 1].sourcePageNumber;
  const insertSource = Math.min(tailSource, schemas.length);
  const result = insertPageAtIndex({
    instances: base.instances,
    images: base.images,
    insertAfterIndex: 2,
    newImageUri: pageUri(insertSource),
    sourcePageNumber: insertSource,
  });

  const inserted = result.instances.find((i) => i.order === 4 && i.addedByUser);
  assert(Boolean(inserted), `${albumId}: inserted page has order 4`);

  const sections = resolveAlbumSectionsForInstances(
    albumId,
    result.instances.length,
    schemas.length,
  );
  const sectionForOrder4 = sections.find(
    (s) => 4 >= s.pageRange[0] && 4 <= s.pageRange[1],
  );
  assert(Boolean(sectionForOrder4), `${albumId}: has section covering display order 4`);
  const inOrderSection = getInstancesInSectionByOrder(
    result.instances,
    sectionForOrder4,
  );
  assert(
    inOrderSection.some((i) => i.order === 4 && i.addedByUser),
    `${albumId}: order-4 page is in section by display order (not by sourcePageNumber)`,
  );

  // Old wrong grouping by source: high sourcePageNumber → last chunk while order=4
  const lastSection = sections[sections.length - 1];
  const inLastByOrder = getInstancesInSectionByOrder(result.instances, lastSection);
  const userAt4InLast = inLastByOrder.some((i) => i.addedByUser && i.order === 4);
  assert(
    !userAt4InLast || lastSection.pageRange[0] <= 4,
    `${albumId}: order-4 user page must not sit in high source-only section`,
  );
}

function verifyLockedAfterInserts(albumId, lockedSources) {
  const schemas = loadAlbumSchemas(albumId);
  const positions = [
    { name: 'after-p1', insertAfterIndex: 0 },
    { name: 'mid', insertAfterIndex: Math.min(6, schemas.length - 2) },
    { name: 'end', insertAfterIndex: schemas.length - 1 },
  ];

  for (const pos of positions) {
    const base = buildProject(schemas);
    const insertSource = schemas[schemas.length - 2]?.sourcePageNumber ?? schemas.length;
    const result = insertPageAtIndex({
      instances: base.instances,
      images: base.images,
      insertAfterIndex: pos.insertAfterIndex,
      newImageUri: pageUri(insertSource),
      sourcePageNumber: insertSource,
    });

    for (const sourcePage of lockedSources) {
      const instance = result.instances.find(
        (i) => !i.addedByUser && i.sourcePageNumber === sourcePage,
      );
      assert(Boolean(instance), `${albumId}/${pos.name}: locked source ${sourcePage} still present`);
      const schema = schemaForInstance(schemas, instance);
      assert(
        isLockedSchema(schema),
        `${albumId}/${pos.name}: source ${sourcePage} stays non_editable (got ${schema?.pageType})`,
      );
      const uri = resolveInstancePageImageUri(result.images, instance);
      assert(
        parseAlbumPageNumberFromUri(uri) === sourcePage,
        `${albumId}/${pos.name}: source ${sourcePage} background is page_${String(sourcePage).padStart(3, '0')}`,
      );
    }

    const editableNeighbor = result.instances.find((i) => {
      if (i.addedByUser) return false;
      const schema = schemaForInstance(schemas, i);
      return schema && !isLockedSchema(schema);
    });
    if (editableNeighbor) {
      const schema = schemaForInstance(schemas, editableNeighbor);
      assert(
        !isLockedSchema(schema),
        `${albumId}/${pos.name}: editable neighbor source ${editableNeighbor.sourcePageNumber} not locked`,
      );
    }
  }
}

console.log('=== TOC order grouping ===');
for (const albumId of TOC_ALBUMS) {
  verifyTocAfterInsert(albumId);
}

console.log('\n=== non_editable identity + backgrounds ===');
for (const [albumId, locked] of Object.entries(LOCKED_PAGES)) {
  verifyLockedAfterInserts(albumId, locked);
}

if (failed > 0) {
  console.error(`\n${failed} verification error(s)`);
  process.exit(1);
}
console.log('\nAll page-insert invariants passed.');
