#!/usr/bin/env node
/**
 * Semantic audit: field labels and slot order must match the 09.06.26 diary PDF layout.
 *
 * node scripts/audit-diary-field-semantic-map.js
 * FAIL_ON_ERROR=1 node scripts/audit-diary-field-semantic-map.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const ALBUM_ID = 'diary_interior_brown';
const OUT_DIR = process.env.OUT_DIR
  ? path.resolve(process.env.OUT_DIR)
  : path.join(root, 'test-results', 'diary-field-semantic-map');

/** Expected first-field keyword per manifest template (printed PDF row). */
const TEMPLATE_FIRST_FIELD_HINTS = {
  FriendQuestionnaireTemplate: ['имя'],
  SchoolLifeTemplate: ['нравится учиться', 'учиться'],
  HobbyTemplate: ['хобби', 'расскажи'],
  MyDayTemplate: ['дата'],
  ParentProfileTemplate_Mom: ['имя'],
  ParentProfileTemplate_Dad: ['имя'],
  GirlProfileTemplate: ['имя'],
};

/** Pages that must have a name field mapped to the topmost answer slot. */
const NAME_FIRST_PAGES = new Set([6, 41, 42, 43, 44]);

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

function loadManifest() {
  return JSON.parse(
    fs.readFileSync(path.join(root, 'scripts/diary-60-tz-manifest.json'), 'utf8'),
  );
}

function normalizeLabel(label) {
  return (label ?? '').toLowerCase().replace(/\s+/g, ' ');
}

function validateSemantic(pageNumber, schema, pageSlots, template) {
  const issues = [];
  const fields = schema?.fields ?? [];

  if (fields.length === 0 || pageSlots.length === 0) {
    return issues;
  }

  let usedLines = 0;
  for (const field of fields) {
    const start = field.templateLineStart ?? 0;
    const count = field.templateLineCount ?? 1;
    usedLines = Math.max(usedLines, start + count);
  }

  if (usedLines > pageSlots.length) {
    issues.push({
      severity: 'error',
      code: 'FIELD_LINES_EXCEED_SLOTS',
      message: `Поля занимают ${usedLines} строк, слотов ${pageSlots.length}`,
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

  if (NAME_FIRST_PAGES.has(pageNumber) && fields[0]?.fieldId) {
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

  if (template === 'FriendQuestionnaireTemplate') {
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

  const INTRO_ZONE_TEMPLATES = new Set([
    'SchoolLifeTemplate',
    'MoodTemplate',
    'TravelTemplate',
  ]);
  if (INTRO_ZONE_TEMPLATES.has(template) && pageSlots.length > 0) {
    const firstSlot = pageSlots.find((s) => !s.hasLabel) ?? pageSlots[0];
    if (firstSlot && firstSlot.y < 0.25) {
      issues.push({
        severity: 'error',
        code: 'FIRST_SLOT_IN_INTRO_ZONE',
        message: `Первый слот y=${firstSlot.y} в зоне шапки/intro (ожидалось y > 0.25)`,
      });
    }
  }

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

  return issues;
}

function main() {
  const schemas = loadSchemas();
  const lineSlots = loadLineSlots();
  const manifest = loadManifest();
  const albumSchemaList = schemas[ALBUM_ID] ?? [];
  const schemaByPage = Object.fromEntries(
    albumSchemaList.map((schema) => [String(schema.sourcePageNumber), schema]),
  );
  const albumSlots = lineSlots[ALBUM_ID] ?? {};

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const pages = [];
  let errorCount = 0;

  for (const [pageKey, meta] of Object.entries(manifest)) {
    if (!meta.editable || meta.pageType !== 'structured') continue;

    const pageNumber = Number(pageKey);
    const schema = schemaByPage[pageKey];
    const pageSlots = albumSlots[pageKey] ?? [];
    const issues = validateSemantic(pageNumber, schema, pageSlots, meta.template);

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

  const report = {
    albumId: ALBUM_ID,
    generatedAt: new Date().toISOString(),
    summary: {
      structuredPages: pages.length,
      errors: errorCount,
      ok: errorCount === 0,
    },
    pages: pages.filter((p) => p.issues.length > 0),
  };

  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  console.log(
    `[audit-diary-field-semantic-map] ${report.summary.ok ? 'OK' : 'FAIL'}: ` +
      `errors=${errorCount} across ${pages.length} structured pages`,
  );
  console.log(`Report: ${path.join(OUT_DIR, 'report.json')}`);

  if (errorCount > 0) {
    for (const page of report.pages) {
      for (const issue of page.issues) {
        if (issue.severity === 'error') {
          console.error(`  p${page.page} ${issue.code}: ${issue.message}`);
        }
      }
    }
    if (process.env.FAIL_ON_ERROR === '1') {
      process.exit(1);
    }
  }
}

main();
