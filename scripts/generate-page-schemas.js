/* eslint-disable no-console */
/**
 * Генерация схем страниц альбомов из LINE_SLOTS, labels и audit pageType.
 * node scripts/generate-page-schemas.js
 *
 * Scope (чтобы не затирать pregnancy/kids при правках дневников):
 *   ONLY_ALBUM=diary node scripts/generate-page-schemas.js
 *   ALBUMS=diary_interior_purple,diary_interior_brown node scripts/generate-page-schemas.js
 * При фильтре остальные альбомы берутся из текущего album-page-schemas.ts.
 */
const fs = require('fs');
const path = require('path');
const { applyKids48TzManifest } = require('./kids-48-tz-builders');
const { applyDiary60TzManifest } = require('./diary-60-tz-builders');
const { applyGirlsDiaryA5TzManifest } = require('./girls-diary-a5-tz-builders');
const { applyPregnancy60PageFields } = require('./pregnancy-60-tz-builders');
const { applyPregnancyA5PageFields } = require('./pregnancy-a5-tz-builders');
const { applyBirthday48PageFields } = require('./birthday-48-tz-builders');
const { getBirthday48PageTitle } = require('./birthday-48-field-specs');
const { DESIGNED_ALBUM_PHOTO_BLOCK, PREGNANCY_PHOTO_BLOCK } = require('./photo-block-presets-data');

const ALBUM_IDS = [
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

function resolveAlbumFilter() {
  const only = process.env.ONLY_ALBUM || process.env.ALBUMS;
  if (!only) return null;
  const expanded = new Set();
  for (const p of only.split(',').map((s) => s.trim()).filter(Boolean)) {
    if (p === 'diary') {
      expanded.add('diary_interior_brown');
      expanded.add('diary_interior_purple');
    } else {
      expanded.add(p);
    }
  }
  return expanded;
}

function matchesAlbumFilter(albumId, filter) {
  if (!filter) return true;
  return filter.has(albumId);
}

function loadExistingSchemas(projectRoot) {
  const schemasPath = path.join(projectRoot, 'constants', 'generated', 'album-page-schemas.ts');
  if (!fs.existsSync(schemasPath)) return {};
  const raw = fs.readFileSync(schemasPath, 'utf8');
  const match = raw.match(
    /export const ALBUM_PAGE_SCHEMAS[^=]*=\s*(\{[\s\S]*\})\s*as Record/
  );
  if (!match) {
    console.warn('Could not parse existing album-page-schemas.ts for merge');
    return {};
  }
  try {
    // eslint-disable-next-line no-new-func
    return Function(`"use strict"; return (${match[1]});`)();
  } catch (e) {
    console.warn('Failed to eval existing schemas for merge:', e.message);
    return {};
  }
}
const PAGE_COUNTS = {
  pregnancy_60: 60,
  pregnancy_a5: 48,
  kids_48: 48,
  holidays_birthday_60: 48,
  diary_interior_brown: 60,
  diary_interior_purple: 40,
  family_blank: 20,
  holidays_blank: 20,
  family_blank_21x21: 20,
};

/** Albums whose page schemas come from TZ builders — skip OCR album-page-content fallback. */
const TZ_BUILDER_ALBUMS = new Set([
  'kids_48',
  'diary_interior_brown',
  'diary_interior_purple',
  'pregnancy_60',
  'pregnancy_a5',
  'holidays_birthday_60',
]);

const PREGNANCY_INTRO_LABELS = {
  1: 'Новость',
  2: 'Обо мне',
  3: 'О папе',
  4: 'На учёте',
  5: 'Триместры',
  6: 'Первое УЗИ',
  7: 'Имена',
};

const PREGNANCY_60_SPECIAL = {
  8: '1 триместр',
  18: '2 триместр',
  33: '3 триместр',
  48: 'Сумка маме',
  49: 'Сумки малышу',
  50: 'Покупки',
  51: 'Список дел',
  52: 'Анкета родов',
  53: 'История родов',
  54: 'Первая фото',
  55: 'Памятные моменты',
  56: 'Для фото',
  57: 'Для фото',
  58: 'Для фото',
  59: 'Для фото',
  60: 'Письмо',
};

const KIDS_48_LABELS = {
  1: 'Титул',
  2: 'О малыше',
  3: 'Родители',
  4: 'Родственники',
  5: 'Первая фото',
};


const DIARY_BROWN_LABELS = {
  1: 'Обо мне',
  6: 'Анкета',
  7: 'Мама',
  8: 'Папа',
  9: 'Бабушка',
  10: 'Дедушка',
  13: 'Пожелания',
  15: 'Мечты',
  45: 'Мечты',
  60: 'Пожелания',
};

const DIARY_PURPLE_LABELS = {
  1: 'Обо мне',
  4: 'Анкета',
  6: 'Мама',
  7: 'Папа',
  8: 'Бабушка',
  9: 'Дедушка',
  28: 'Пожелания',
  29: 'Мечты',
  40: 'Пожелания',
};

function getPregnancy60PageLabel(pageNumber) {
  if (PREGNANCY_INTRO_LABELS[pageNumber]) return PREGNANCY_INTRO_LABELS[pageNumber];
  if (PREGNANCY_60_SPECIAL[pageNumber]) return PREGNANCY_60_SPECIAL[pageNumber];
  if (pageNumber >= 9 && pageNumber <= 17) return `${pageNumber - 3} неделя`;
  if (pageNumber >= 19 && pageNumber <= 32) return `${pageNumber - 4} неделя`;
  if (pageNumber >= 34 && pageNumber <= 47) return `${pageNumber - 5} неделя`;
  return `Страница ${pageNumber}`;
}

function getPregnancyA5PageLabel(pageNumber) {
  if (PREGNANCY_INTRO_LABELS[pageNumber]) return PREGNANCY_INTRO_LABELS[pageNumber];
  if (pageNumber >= 8 && pageNumber <= 39) return `${pageNumber} неделя`;
  if (pageNumber >= 40 && pageNumber <= 46) return `${pageNumber - 1} неделя`;
  if (pageNumber === 47) return 'Памятные моменты';
  if (pageNumber === 48) return 'Памятные моменты';
  return `Страница ${pageNumber}`;
}

function getLabelFromMap(pageNumber, map, emptyLabel = 'Для фото') {
  return map[pageNumber] ?? emptyLabel;
}

function getPageTitle(lineGuideId, pageNumber) {
  switch (lineGuideId) {
    case 'pregnancy_60':
      return getPregnancy60PageLabel(pageNumber);
    case 'pregnancy_a5':
      return getPregnancyA5PageLabel(pageNumber);
    case 'kids_48':
      return getLabelFromMap(pageNumber, KIDS_48_LABELS, `Страница ${pageNumber}`);
    case 'holidays_birthday_60':
      return getBirthday48PageTitle(pageNumber);
    case 'diary_interior_brown':
      return getLabelFromMap(pageNumber, DIARY_BROWN_LABELS);
    case 'diary_interior_purple':
      return getLabelFromMap(pageNumber, DIARY_PURPLE_LABELS);
    case 'family_blank':
    case 'family_blank_21x21':
    case 'holidays_blank':
      return `Страница ${pageNumber}`;
    default:
      return `Страница ${pageNumber}`;
  }
}

function loadLineSlots(projectRoot) {
  const jsonPath = path.join(projectRoot, 'constants', 'line-slots.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error('Run npm run generate:line-slots first');
  }
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

function loadAuditReports(projectRoot) {
  const reports = {};
  for (const file of ['purple-line-slots-gap-report.json', 'brown-line-slots-gap-report.json']) {
    const filePath = path.join(projectRoot, 'scripts', file);
    if (!fs.existsSync(filePath)) continue;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const albumId = data.albumId;
    if (albumId) reports[albumId] = data.pages ?? {};
  }
  return reports;
}

function loadOverrides(projectRoot) {
  const file = path.join(projectRoot, 'constants', 'album-page-schema-overrides.json');
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadPageContent(projectRoot) {
  const file = path.join(projectRoot, 'constants', 'album-page-content.json');
  if (!fs.existsSync(file)) {
    console.warn('Missing album-page-content.json — run npm run extract:album-page-content');
    return {};
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadKidsTzManifest(projectRoot) {
  const file = path.join(projectRoot, 'constants', 'kids-48-tz-manifest.json');
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadDiary60TzManifest(projectRoot) {
  const file = path.join(projectRoot, 'scripts', 'diary-60-tz-manifest.json');
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadGirlsDiaryA5TzManifest(projectRoot) {
  const file = path.join(projectRoot, 'scripts', 'girls-diary-a5-tz-manifest.json');
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function buildFieldsFromContent(lineGuideId, pageNumber, contentFields) {
  return contentFields.map((field, index) => ({
    fieldId: field.fieldId ?? `${lineGuideId}_p${pageNumber}_g${index + 1}`,
    label: field.label,
    type: field.type ?? inferFieldType(field.label),
    required: false,
    placeholder: field.placeholder,
    templateLineStart: field.templateLineStart,
    templateLineCount: field.templateLineCount,
  }));
}

function inferFieldType(label) {
  const lower = label.toLowerCase();
  if (lower.includes('дата') || lower.includes('пдр')) return 'date';
  if (lower.includes('время')) return 'time';
  if (lower.includes('вес') || lower.includes('рост')) return 'number';
  return 'text';
}

function buildFieldsFromSlots(lineGuideId, pageNumber, slots) {
  const fields = [];
  const seenGroups = new Set();

  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i];
    if (slot.inputKind === 'block') continue;
    if (!slot.hasLabel && slot.continuationGroup === 0) continue;

    const groupId = slot.continuationGroup;
    if (seenGroups.has(groupId)) continue;
    seenGroups.add(groupId);

    let startIndex = i;
    let lineCount = 1;
    for (let j = i + 1; j < slots.length; j += 1) {
      if (slots[j].continuationGroup === groupId && slots[j].inputKind !== 'block') {
        lineCount += 1;
      } else if (slots[j].continuationGroup !== groupId) {
        break;
      }
    }

    const label = `Поле ${fields.length + 1}`;
    fields.push({
      fieldId: `${lineGuideId}_p${pageNumber}_slot${startIndex}`,
      label,
      type: inferFieldType(label),
      required: false,
      templateLineStart: startIndex,
      templateLineCount: lineCount,
    });
  }

  return fields;
}

function findPhotoBlockSlots(slots) {
  return slots
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => slot.inputKind === 'block');
}

function buildPhotoBlocks(slots, blockId = 'main_photo') {
  const photoSlots = findPhotoBlockSlots(slots);
  if (photoSlots.length === 0) return undefined;

  const indices = photoSlots.map(({ index }) => index);
  const variants = [];

  if (photoSlots.length >= 1) {
    variants.push({
      variantId: 'one_horizontal',
      label: 'Одно горизонтальное фото',
      slots: 1,
      slotIndices: [indices[0]],
    });
  }
  if (photoSlots.length >= 2) {
    variants.push({
      variantId: 'two_vertical',
      label: 'Два вертикальных фото',
      slots: 2,
      slotIndices: indices.slice(0, 2),
    });
  }
  if (photoSlots.length >= 4) {
    variants.push({
      variantId: 'four_photos',
      label: '4 фото',
      slots: 4,
      slotIndices: indices.slice(0, 4),
    });
  }

  if (variants.length === 0) return undefined;

  return [
    {
      blockId,
      label: 'Фото для страницы',
      variants,
    },
  ];
}

function inferPageType(lineGuideId, pageNumber, slots, title, auditPageType) {
  if (
    lineGuideId === 'family_blank' ||
    lineGuideId === 'family_blank_21x21' ||
    lineGuideId === 'holidays_blank'
  ) {
    return 'free';
  }

  const lowerTitle = title.toLowerCase();
  const photoBlockSlots = findPhotoBlockSlots(slots);
  const labelSlots = slots.filter((s) => s.hasLabel && s.inputKind !== 'block');

  if (auditPageType === 'cover' || auditPageType === 'decor') {
    return slots.length === 0 ? 'non_editable' : lowerTitle.includes('фото') ? 'photo' : 'non_editable';
  }

  if (lowerTitle.includes('для фото') || lowerTitle.includes('первая фото')) {
    return 'photo';
  }

  if (slots.length === 0) {
    return 'non_editable';
  }

  if (photoBlockSlots.length > 0 && labelSlots.length > 0) {
    return 'structured';
  }

  if (photoBlockSlots.length > 0 && labelSlots.length === 0) {
    return 'photo';
  }

  if (labelSlots.length > 0) {
    return 'structured';
  }

  return 'non_editable';
}

function mergeOverride(base, override) {
  if (!override) return base;
  const { replaceFields, replacePhotoBlocks, ...rest } = override;
  const fields = replaceFields
    ? (override.fields ?? [])
    : (override.fields !== undefined ? override.fields : base.fields);
  const photoBlocks = replacePhotoBlocks
    ? override.photoBlocks
    : (override.photoBlocks !== undefined ? override.photoBlocks : base.photoBlocks);
  return {
    ...base,
    ...rest,
    fields,
    photoBlocks,
  };
}

/** After TZ overrides, re-sync editable/pageType when fields were injected post-infer. */
function finalizePageSchema(schema) {
  const hasFields = (schema.fields?.length ?? 0) > 0;
  const hasCustomFields = (schema.customFieldDefs?.length ?? 0) > 0;

  if (schema.pageType === 'non_editable' && (hasFields || hasCustomFields)) {
    schema.pageType = 'structured';
  }

  if (schema.pageType === 'photo' && !schema.photoBlocks?.length) {
    schema.photoBlocks = [DESIGNED_ALBUM_PHOTO_BLOCK];
  }

  if (schema.pageType === 'non_editable') {
    schema.editable = false;
  } else {
    schema.editable = true;
  }

  return schema;
}

function buildPageSchema(lineGuideId, pageNumber, slots, auditPageType, override, pageContent) {
  const listTitle = getPageTitle(lineGuideId, pageNumber);
  const heading = pageContent?.heading;
  const usesTzBuilder = TZ_BUILDER_ALBUMS.has(lineGuideId);
  const title = override?.title ?? (usesTzBuilder ? listTitle : (heading ?? listTitle));
  let pageType = override?.pageType ?? inferPageType(lineGuideId, pageNumber, slots, title, auditPageType);

  const pageId = `${lineGuideId}_p${pageNumber}`;
  let fields = override?.fields;
  let photoBlocks = override?.photoBlocks;

  if (!fields && pageContent?.fields?.length && !usesTzBuilder) {
    fields = buildFieldsFromContent(lineGuideId, pageNumber, pageContent.fields);
  }

  if (fields?.length && pageType === 'non_editable' && !override?.pageType) {
    pageType = 'structured';
  }

  if (!fields && (pageType === 'structured' || pageType === 'free') && !usesTzBuilder) {
    fields = buildFieldsFromSlots(lineGuideId, pageNumber, slots);
    if (fields.length === 0 && pageType === 'structured') {
      pageType = slots.length === 0 ? 'non_editable' : 'photo';
    }
  }

  if (!photoBlocks && (pageType === 'structured' || pageType === 'photo')) {
    photoBlocks = buildPhotoBlocks(slots);
    if (pageType === 'photo' && !photoBlocks) {
      photoBlocks = [DESIGNED_ALBUM_PHOTO_BLOCK];
    }
  }

  const editable = pageType !== 'non_editable';
  const canDuplicate = override?.canDuplicate ?? pageType === 'photo';

  return mergeOverride(
    {
      pageId,
      title,
      pageType,
      order: pageNumber,
      editable,
      lineGuideId,
      sourcePageNumber: pageNumber,
      fields: fields?.length ? fields : undefined,
      photoBlocks,
      canDuplicate,
      canAddAfter: true,
      templateLibraryId: pageType === 'free' ? 'SinglePhotoTemplate' : undefined,
    },
    override
  );
}

function generateSchemas(projectRoot, albumFilter = null) {
  const lineSlots = loadLineSlots(projectRoot);
  const auditReports = loadAuditReports(projectRoot);
  const overrides = loadOverrides(projectRoot);
  const pageContent = loadPageContent(projectRoot);
  const kidsTzManifest = loadKidsTzManifest(projectRoot);
  const diary60TzManifest = loadDiary60TzManifest(projectRoot);
  const girlsDiaryA5TzManifest = loadGirlsDiaryA5TzManifest(projectRoot);
  const result = {};

  for (const lineGuideId of ALBUM_IDS) {
    if (!matchesAlbumFilter(lineGuideId, albumFilter)) continue;

    const albumSlots = lineSlots[lineGuideId] ?? {};
    const pageCount = PAGE_COUNTS[lineGuideId] ?? Object.keys(albumSlots).length;
    const albumOverrides = overrides[lineGuideId] ?? {};
    const albumContent = pageContent[lineGuideId] ?? {};
    const auditPages = auditReports[lineGuideId] ?? {};
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const pageKey = String(pageNumber);
      const slots = albumSlots[pageKey] ?? [];
      const auditPageType = auditPages[pageKey]?.pageType;
      const pageOverride = albumOverrides[pageKey];
      const content = albumContent[pageKey];
      let schema = buildPageSchema(lineGuideId, pageNumber, slots, auditPageType, pageOverride, content);

      if (lineGuideId === 'kids_48' && kidsTzManifest[pageKey]) {
        const tzApplied = applyKids48TzManifest(
          pageNumber,
          slots,
          kidsTzManifest[pageKey],
          lineGuideId
        );
        if (tzApplied) {
          schema = mergeOverride(schema, tzApplied);
        }
      }

      if (lineGuideId === 'diary_interior_brown' && diary60TzManifest[pageKey]) {
        const tzApplied = applyDiary60TzManifest(
          pageNumber,
          slots,
          diary60TzManifest[pageKey],
          lineGuideId
        );
        if (tzApplied) {
          schema = mergeOverride(schema, tzApplied);
        }
      }

      if (lineGuideId === 'diary_interior_purple' && girlsDiaryA5TzManifest[pageKey]) {
        const tzApplied = applyGirlsDiaryA5TzManifest(
          pageNumber,
          slots,
          girlsDiaryA5TzManifest[pageKey],
          lineGuideId
        );
        if (tzApplied) {
          schema = mergeOverride(schema, tzApplied);
        }
      }

      if (lineGuideId === 'pregnancy_60') {
        const pregnancyFields = applyPregnancy60PageFields(pageNumber, lineGuideId, slots);
        if (pregnancyFields) {
          schema = mergeOverride(schema, pregnancyFields);
        }
      }

      if (lineGuideId === 'pregnancy_a5') {
        const pregnancyFields = applyPregnancyA5PageFields(pageNumber, lineGuideId, slots);
        if (pregnancyFields) {
          schema = mergeOverride(schema, pregnancyFields);
        }
      }

      if (lineGuideId === 'holidays_birthday_60') {
        const birthdayFields = applyBirthday48PageFields(pageNumber, lineGuideId, slots);
        if (birthdayFields) {
          schema = mergeOverride(schema, birthdayFields);
        }
      }

      pages.push(finalizePageSchema(schema));
    }

    result[lineGuideId] = pages;
    console.log(`[${lineGuideId}] generated ${pages.length} page schemas`);
  }

  return result;
}

function writeOutput(projectRoot, schemas) {
  const outDir = path.join(projectRoot, 'constants', 'generated');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'album-page-schemas.ts');
  const content = `// Auto-generated by scripts/generate-page-schemas.js
// Do not edit manually.

import type { AlbumPageSchema } from '@/types/album-page-schema';

export const ALBUM_PAGE_SCHEMAS: Record<string, AlbumPageSchema[]> = ${JSON.stringify(schemas, null, 2)} as Record<string, AlbumPageSchema[]>;

export function getAlbumPageSchemas(lineGuideId: string): AlbumPageSchema[] {
  return ALBUM_PAGE_SCHEMAS[lineGuideId] ?? [];
}

export function getAlbumPageSchemaByPageId(pageId: string): AlbumPageSchema | undefined {
  for (const pages of Object.values(ALBUM_PAGE_SCHEMAS)) {
    const found = pages.find((p) => p.pageId === pageId);
    if (found) return found;
  }
  return undefined;
}

export function getAlbumPageSchema(
  lineGuideId: string,
  sourcePageNumber: number
): AlbumPageSchema | undefined {
  return getAlbumPageSchemas(lineGuideId).find((p) => p.sourcePageNumber === sourcePageNumber);
}
`;

  fs.writeFileSync(outPath, content, 'utf8');
  console.log('Wrote', outPath);
}

function main() {
  const projectRoot = path.join(__dirname, '..');
  const albumFilter = resolveAlbumFilter();
  const generated = generateSchemas(projectRoot, albumFilter);
  let schemas = generated;
  if (albumFilter) {
    const existing = loadExistingSchemas(projectRoot);
    schemas = { ...existing, ...generated };
    console.log(
      `ONLY_ALBUM/ALBUMS filter active — regenerated: ${[...albumFilter].join(', ')}; kept others from existing schemas`
    );
  }
  writeOutput(projectRoot, schemas);
}

main();
