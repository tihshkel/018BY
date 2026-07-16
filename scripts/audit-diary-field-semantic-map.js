#!/usr/bin/env node
/**
 * Semantic audit: field labels and slot order must match the 09.06.26 diary PDF layout.
 *
 * node scripts/audit-diary-field-semantic-map.js
 * ALBUM_ID=diary_interior_purple node scripts/audit-diary-field-semantic-map.js
 * FAIL_ON_ERROR=1 node scripts/audit-diary-field-semantic-map.js
 */
const fs = require('fs');
const path = require('path');
const { EXPECTED_QUESTION_HINTS } = require('./diary-semantic-field-map');

const root = path.join(__dirname, '..');
const ALBUM_IDS = process.env.ALBUM_ID
  ? [process.env.ALBUM_ID]
  : ['diary_interior_brown', 'diary_interior_purple'];
const OUT_DIR = process.env.OUT_DIR
  ? path.resolve(process.env.OUT_DIR)
  : path.join(root, 'test-results', 'diary-field-semantic-map');

/** Expected first-field keyword per manifest template (printed PDF row). */
const TEMPLATE_FIRST_FIELD_HINTS = {
  FriendQuestionnaireTemplate: ['имя'],
  SchoolLifeTemplate: ['нравится учиться', 'учиться'],
  HobbyTemplate: ['хобби', 'расскажи'],
  MyDayTemplate: ['дата', 'прошёл', 'день'],
  ParentProfileTemplate_Mom: ['имя'],
  ParentProfileTemplate_Dad: ['имя'],
  GirlProfileTemplate: ['имя'],
  MoodTemplate: ['смешит', 'комеди'],
  PetsTemplate: ['животн', 'питом'],
  TravelTemplate: ['путешеств'],
  StyleTemplate: ['мод', 'одежд', 'тренд'],
  FoodTemplate: ['еду', 'вкусн'],
};

const NAME_FIRST_PAGES_BY_ALBUM = {
  diary_interior_brown: new Set([6, 39, 40, 41, 42, 43, 44]),
  diary_interior_purple: new Set([5, 28, 29, 30, 31, 32, 33]),
};

function loadSchemas() {
  const raw = fs.readFileSync(
    path.join(root, 'constants/generated/album-page-schemas.ts'),
    'utf8',
  );
  const match = raw.match(/export const ALBUM_PAGE_SCHEMAS[^=]*=\s*(\{[\s\S]*\})\s*as Record/);
  if (!match) throw new Error('Could not parse ALBUM_PAGE_SCHEMAS');
  return JSON.parse(match[1]);
}

function loadLineSlots() {
  return JSON.parse(fs.readFileSync(path.join(root, 'constants/line-slots.json'), 'utf8'));
}

function loadManifest(albumId) {
  const file =
    albumId === 'diary_interior_purple'
      ? 'scripts/girls-diary-a5-tz-manifest.json'
      : 'scripts/diary-60-tz-manifest.json';
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

function normalizeLabel(label) {
  return (label ?? '').toLowerCase().replace(/\s+/g, ' ');
}

function validateSemantic(albumId, pageNumber, schema, pageSlots, template) {
  const issues = [];
  const fields = schema?.fields ?? [];

  if (fields.length === 0 || pageSlots.length === 0) {
    return issues;
  }

  let usedLines = 0;
  const usedSlots = new Set();
  for (const field of fields) {
    const start = field.templateLineStart ?? 0;
    const count = field.templateLineCount ?? 1;
    usedLines = Math.max(usedLines, start + count);
    for (let i = start; i < start + count; i += 1) {
      if (usedSlots.has(i)) {
        issues.push({
          severity: 'error',
          code: 'FIELD_SLOT_OVERLAP',
          fieldId: field.fieldId,
          message: `Слот ${i} перекрывается несколькими полями`,
        });
      }
      usedSlots.add(i);
    }
  }

  if (usedLines > pageSlots.length) {
    issues.push({
      severity: 'error',
      code: 'FIELD_LINES_EXCEED_SLOTS',
      message: `Поля занимают ${usedLines} строк, слотов ${pageSlots.length}`,
    });
  }

  const unusedWritable = [];
  for (let i = 0; i < pageSlots.length; i += 1) {
    if (!usedSlots.has(i) && !(pageSlots[i]?.hasLabel)) {
      unusedWritable.push(i);
    }
  }
  if (unusedWritable.length > 0 && ['MoodTemplate', 'TravelTemplate', 'PetsTemplate'].includes(template)) {
    issues.push({
      severity: 'error',
      code: 'UNUSED_WRITABLE_SLOTS',
      message: `Неиспользуемые writable-слоты: ${unusedWritable.join(', ')}`,
    });
  }

  const firstHints = TEMPLATE_FIRST_FIELD_HINTS[template];
  if (firstHints?.length) {
    const firstLabel = normalizeLabel(fields[0]?.label);
    const matches = firstHints.some((hint) => firstLabel.includes(hint));
    if (!matches) {
      issues.push({
        severity: 'error',
        code: 'FIRST_FIELD_LABEL_MISMATCH',
        fieldId: fields[0]?.fieldId,
        message: `Первое поле «${fields[0]?.label}» не совпадает с макетом (ожидалось: ${firstHints.join(' / ')})`,
      });
    }
  }

  const namePages = NAME_FIRST_PAGES_BY_ALBUM[albumId] ?? new Set();
  if (namePages.has(pageNumber) && fields[0]?.fieldId) {
    const nameField = fields.find((f) => normalizeLabel(f.label).includes('имя'));
    if (nameField && nameField.templateLineStart !== 0) {
      issues.push({
        severity: 'error',
        code: 'NAME_FIELD_NOT_FIRST_SLOT',
        fieldId: nameField.fieldId,
        message: `Поле «Имя» должно быть templateLineStart=0, сейчас ${nameField.templateLineStart}`,
      });
    }
  }

  if (template === 'FriendQuestionnaireTemplate' && albumId === 'diary_interior_brown') {
    const cartoonField = fields.find((f) =>
      normalizeLabel(f.label).includes('мультфильм'),
    );
    const musicianOnly = fields.find(
      (f) =>
        normalizeLabel(f.label).includes('музыкант') &&
        !normalizeLabel(f.label).includes('мультфильм'),
    );
    if (!cartoonField && musicianOnly) {
      issues.push({
        severity: 'error',
        code: 'FRIEND_CARTOON_FIELD_MISSING',
        message: 'На макете «Любимый мультфильм», в схеме только «музыкант»',
      });
    }
  }

  if (template === 'SchoolLifeTemplate') {
    const hasSchoolName = fields.some((f) => normalizeLabel(f.label).includes('название школы'));
    const hasStudyQuestion = fields.some((f) =>
      normalizeLabel(f.label).includes('нравится учиться'),
    );
    if (hasSchoolName && !hasStudyQuestion) {
      issues.push({
        severity: 'error',
        code: 'SCHOOL_FIELDS_LEGACY_SPEC',
        message: 'Школьная страница использует устаревшие поля (название школы), не макет 09.06.26',
      });
    }
  }

  if (template === 'MyDayTemplate') {
    const moodField = fields.find((f) => f.type === 'radio' && f.fieldId.endsWith('_mood'));
    if (moodField && (moodField.options?.length ?? 0) !== 9) {
      issues.push({
        severity: 'error',
        code: 'MYDAY_MOOD_OPTIONS_COUNT',
        message: `Ожидалось 9 вариантов настроения, сейчас ${moodField.options?.length ?? 0}`,
      });
    }
    if (albumId === 'diary_interior_purple') {
      const dateField = fields.find((f) => f.fieldId.endsWith('_date'));
      if (dateField) {
        issues.push({
          severity: 'error',
          code: 'PURPLE_MYDAY_HAS_DATE',
          message: 'Фиолетовый «Твой день» не содержит поля даты в макете',
        });
      }
    }
  }

  if (template === 'MoodTemplate') {
    const joined = fields.map((f) => normalizeLabel(f.label)).join(' | ');
    if (joined.includes('настроение сегодня') || joined.includes('благодарна')) {
      issues.push({
        severity: 'error',
        code: 'MOOD_LEGACY_JOURNAL_SPEC',
        message: 'Страница настроения использует journal-поля вместо вопросов макета',
      });
    }
  }

  const questionHints = EXPECTED_QUESTION_HINTS[albumId]?.[pageNumber];
  if (questionHints?.length) {
    const allLabels = fields.map((f) => normalizeLabel(f.label)).join(' ');
    for (const hint of questionHints) {
      if (!allLabels.includes(hint)) {
        issues.push({
          severity: 'error',
          code: 'EXPECTED_QUESTION_MISSING',
          message: `Нет ожидаемого фрагмента вопроса «${hint}»`,
        });
      }
    }
  }

  const INTRO_ZONE_TEMPLATES = new Set([
    'SchoolLifeTemplate',
    'MoodTemplate',
    'TravelTemplate',
  ]);
  if (INTRO_ZONE_TEMPLATES.has(template) && pageSlots.length > 0) {
    const firstSlot = pageSlots.find((s) => !s.hasLabel) ?? pageSlots[0];
    if (firstSlot && firstSlot.y < 0.22) {
      issues.push({
        severity: 'error',
        code: 'FIRST_SLOT_IN_INTRO_ZONE',
        message: `Первый слот y=${firstSlot.y} в зоне шапки/intro (ожидалось y > 0.22)`,
      });
    }
  }

  // Multi-column layouts (dreams / some friend pages) intentionally break Y-monotonic order.
  const ALLOW_NON_MONOTONIC_Y = new Set([
    'DreamsTemplate',
    'FriendQuestionnaireTemplate',
    'FriendProfileTemplate',
  ]);
  if (!ALLOW_NON_MONOTONIC_Y.has(template) && !/friend/i.test(template ?? '')) {
    const slotYs = pageSlots.map((s) => s.y);
    for (const field of fields) {
      const start = field.templateLineStart ?? 0;
      const slot = pageSlots[start];
      if (!slot) continue;
      const prevY = start > 0 ? slotYs[start - 1] : null;
      if (prevY != null && slot.y < prevY - 0.001) {
        issues.push({
          severity: 'error',
          code: 'SLOT_ORDER_INVERTED',
          fieldId: field.fieldId,
          message: `Поле «${field.label}» slot ${start} y=${slot.y} выше предыдущего y=${prevY}`,
        });
      }
    }
  }

  return issues;
}

function auditAlbum(albumId, schemas, lineSlots) {
  const manifest = loadManifest(albumId);
  const albumSchemaList = schemas[albumId] ?? [];
  const schemaByPage = Object.fromEntries(
    albumSchemaList.map((schema) => [String(schema.sourcePageNumber), schema]),
  );
  const albumSlots = lineSlots[albumId] ?? {};

  const pages = [];
  let errorCount = 0;

  for (const [pageKey, meta] of Object.entries(manifest)) {
    if (!meta.editable || meta.pageType !== 'structured') continue;

    const pageNumber = Number(pageKey);
    const schema = schemaByPage[pageKey];
    const pageSlots = albumSlots[pageKey] ?? [];
    const issues = validateSemantic(albumId, pageNumber, schema, pageSlots, meta.template);

    for (const issue of issues) {
      if (issue.severity === 'error') errorCount += 1;
    }

    pages.push({
      page: pageNumber,
      template: meta.template,
      slotCount: pageSlots.length,
      fieldCount: schema?.fields?.length ?? 0,
      issues,
    });
  }

  return {
    albumId,
    structuredPages: pages.length,
    errorCount,
    pages: pages.filter((p) => p.issues.length > 0),
  };
}

function main() {
  const schemas = loadSchemas();
  const lineSlots = loadLineSlots();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const albums = ALBUM_IDS.map((albumId) => auditAlbum(albumId, schemas, lineSlots));
  const errorCount = albums.reduce((sum, album) => sum + album.errorCount, 0);

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      albums: albums.length,
      errors: errorCount,
      ok: errorCount === 0,
    },
    albums: albums.map((album) => ({
      albumId: album.albumId,
      structuredPages: album.structuredPages,
      errors: album.errorCount,
      ok: album.errorCount === 0,
      pages: album.pages,
    })),
  };

  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  console.log(
    `[audit-diary-field-semantic-map] ${report.summary.ok ? 'OK' : 'FAIL'}: ` +
      `errors=${errorCount} across ${albums.length} albums`,
  );
  console.log(`Report: ${path.join(OUT_DIR, 'report.json')}`);

  if (errorCount > 0) {
    for (const album of report.albums) {
      for (const page of album.pages) {
        for (const issue of page.issues) {
          if (issue.severity === 'error') {
            console.error(`  ${album.albumId} p${page.page} ${issue.code}: ${issue.message}`);
          }
        }
      }
    }
    if (process.env.FAIL_ON_ERROR === '1') {
      process.exit(1);
    }
  }
}

main();
