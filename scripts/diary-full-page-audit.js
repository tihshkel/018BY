#!/usr/bin/env node
/**
 * Полный аудит страниц diary_interior_brown (60) и diary_interior_purple (40):
 * схемы, line-slots, соответствие полей слотам.
 *
 * node scripts/diary-full-page-audit.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const OUT_DIR = path.join(root, 'test-results', 'diary-audit');

const ALBUMS = [
  { id: 'diary_interior_brown', pages: 60 },
  { id: 'diary_interior_purple', pages: 40 },
];

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

function validatePage(albumId, pageNumber, schema, slots) {
  const issues = [];
  const pageKey = String(pageNumber);
  const pageSlots = slots?.[pageKey] ?? [];
  const fields = schema?.fields ?? [];

  if (!schema) {
    issues.push({ severity: 'error', code: 'MISSING_SCHEMA', message: 'Нет схемы страницы' });
    return issues;
  }

  if (schema.editable && fields.length === 0 && (schema.photoBlocks?.length ?? 0) === 0) {
    if (!['photo', 'free_page', 'caption_photo_page'].includes(schema.pageType)) {
      issues.push({
        severity: 'warn',
        code: 'EDITABLE_NO_INPUTS',
        message: `editable=true, но нет fields и photoBlocks (pageType=${schema.pageType})`,
      });
    }
  }

  for (const field of fields) {
    const start = field.templateLineStart ?? 0;
    const count = field.templateLineCount ?? 1;
    const end = start + count - 1;

    if (pageSlots.length === 0 && count > 0) {
      issues.push({
        severity: 'error',
        code: 'NO_LINE_SLOTS',
        fieldId: field.fieldId,
        message: `Поле «${field.label}» — нет line-slots на странице`,
      });
      continue;
    }

    if (end >= pageSlots.length) {
      issues.push({
        severity: 'error',
        code: 'FIELD_EXCEEDS_SLOTS',
        fieldId: field.fieldId,
        message: `Поле «${field.label}» slots ${start}..${end}, доступно ${pageSlots.length}`,
      });
    }
  }

  if (fields.length > 0 && pageSlots.length === 0) {
    issues.push({
      severity: 'error',
      code: 'FIELDS_BUT_NO_SLOTS',
      message: `${fields.length} полей, 0 line-slots`,
    });
  }

  const usedSlots = new Set();
  for (const field of fields) {
    const start = field.templateLineStart ?? 0;
    const count = field.templateLineCount ?? 1;
    for (let i = start; i < start + count; i += 1) {
      if (usedSlots.has(i)) {
        issues.push({
          severity: 'error',
          code: 'SLOT_OVERLAP',
          fieldId: field.fieldId,
          message: `Слот ${i} используется несколькими полями`,
        });
      }
      usedSlots.add(i);
    }

    if (count > 1) {
      const groups = new Set();
      for (let i = start; i < start + count && i < pageSlots.length; i += 1) {
        groups.add(pageSlots[i]?.continuationGroup ?? i + 1);
      }
      // Field-line distribution uses templateLineCount; mismatched groups are a soft signal.
      if (groups.size > 1) {
        issues.push({
          severity: 'warn',
          code: 'CONTINUATION_GROUP_MISMATCH',
          fieldId: field.fieldId,
          message: `Поле «${field.label}» занимает слоты с разными continuationGroup: ${[...groups].join(', ')}`,
        });
      }
    }
  }

  if (
    schema.pageType === 'structured' &&
    fields.length > 0 &&
    pageSlots.length > 0
  ) {
    const unused = [];
    for (let i = 0; i < pageSlots.length; i += 1) {
      if (!usedSlots.has(i) && !pageSlots[i]?.hasLabel) {
        unused.push(i);
      }
    }
    if (unused.length > 0) {
      const critical =
        /_(mood|pets|travel|hobby|style|food|dream)/i.test(schema.pageId ?? '') ||
        /настроение|питомц|путешеств|хобби|одежда|еда|мечт/i.test(schema.title ?? '');
      issues.push({
        severity: critical ? 'error' : 'warn',
        code: 'UNUSED_WRITABLE_SLOTS',
        message: `Неиспользуемые writable-слоты: ${unused.join(', ')}`,
      });
    }
  }

  return issues;
}

function main() {
  const schemas = loadSchemas();
  const lineSlots = loadLineSlots();
  const report = {
    generatedAt: new Date().toISOString(),
    albums: {},
    summary: { pages: 0, errors: 0, warnings: 0, ok: 0 },
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const { id, pages } of ALBUMS) {
    const albumSchemas = schemas[id] ?? [];
    const byPage = Object.fromEntries(
      albumSchemas.map((s) => [String(s.sourcePageNumber), s]),
    );
    const slots = lineSlots[id] ?? {};
    const albumReport = { pages: [], errorCount: 0, warnCount: 0 };

    for (let page = 1; page <= pages; page += 1) {
      const schema = byPage[String(page)];
      const issues = validatePage(id, page, schema, slots);
      const errors = issues.filter((i) => i.severity === 'error');
      const warnings = issues.filter((i) => i.severity === 'warn');

      albumReport.pages.push({
        page,
        pageId: schema?.pageId ?? null,
        title: schema?.title ?? null,
        pageType: schema?.pageType ?? null,
        editable: schema?.editable ?? null,
        fieldCount: schema?.fields?.length ?? 0,
        slotCount: slots[String(page)]?.length ?? 0,
        status: errors.length ? 'fail' : warnings.length ? 'warn' : 'ok',
        issues,
      });

      albumReport.errorCount += errors.length;
      albumReport.warnCount += warnings.length;
      report.summary.pages += 1;
      report.summary.errors += errors.length;
      report.summary.warnings += warnings.length;
      if (errors.length === 0 && warnings.length === 0) report.summary.ok += 1;
    }

    report.albums[id] = albumReport;
  }

  const jsonPath = path.join(OUT_DIR, 'audit-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const mdLines = [
    '# Аудит страниц личных дневников',
    '',
    `Дата: ${report.generatedAt}`,
    '',
    `| Метрика | Значение |`,
    `|---------|----------|`,
    `| Страниц проверено | ${report.summary.pages} |`,
    `| OK | ${report.summary.ok} |`,
    `| Ошибок | ${report.summary.errors} |`,
    `| Предупреждений | ${report.summary.warnings} |`,
    '',
  ];

  for (const [albumId, albumReport] of Object.entries(report.albums)) {
    mdLines.push(`## ${albumId}`, '');
    const failed = albumReport.pages.filter((p) => p.status !== 'ok');
    if (failed.length === 0) {
      mdLines.push('Все страницы прошли проверку слотов/полей.', '');
      continue;
    }
    for (const page of failed) {
      mdLines.push(`### Стр. ${page.page} — ${page.title ?? '?'} (${page.status})`);
      mdLines.push(
        `- pageType: ${page.pageType}, fields: ${page.fieldCount}, slots: ${page.slotCount}`,
      );
      for (const issue of page.issues) {
        mdLines.push(`- **${issue.code}**: ${issue.message}`);
      }
      mdLines.push('');
    }
  }

  const mdPath = path.join(OUT_DIR, 'audit-report.md');
  fs.writeFileSync(mdPath, mdLines.join('\n'));

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
  console.log(
    `Summary: ${report.summary.ok}/${report.summary.pages} OK, ${report.summary.errors} errors, ${report.summary.warnings} warnings`,
  );

  if (report.summary.errors > 0) process.exit(1);
}

main();
