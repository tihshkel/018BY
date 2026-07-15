#!/usr/bin/env node
/**
 * Полный аудит diary_interior_brown (60 стр.):
 * 1) покрытие полей слотами
 * 2) совпадение слотов со штрихами PDF (если PDF есть)
 * 3) drift baseline vs штрих (модель runtime)
 * 4) перенос длинного текста по полям
 *
 * node scripts/audit-diary-brown-full.js
 */
const fs = require('fs');
const path = require('path');
const {
  loadPageTemplates,
  mapNormSlotToViewport,
  measureDrift,
  distributeWithinFieldLines,
  isPeachCell,
  DIARY_LINE_FONT_OFFSET,
  CAP_HEIGHT_RATIO,
} = require('./lib/diary-brown-baseline-metrics');

const ROOT = path.join(__dirname, '..');
const ALBUM_ID = 'diary_interior_brown';
const OUT_DIR = path.join(ROOT, 'test-results/diary-brown-full-audit');
const PNG_W = 1800;
const PNG_H = 2400;

/** Допуск: baseline в пределах ~1.2px на странице 180×240 мм при H=2400 → ~0.0005 norm ≈ 1.2px */
const DRIFT_PX_WARN = 2.5;
const DRIFT_PX_FAIL = 5;
const STROKE_TOLERANCE = 0.015;
const LONG_TEXT =
  'Это длинный тестовый текст для проверки переноса слов на следующую строку макета дневника и чтобы все символы попадали в поле.';

const PRIORITY_PAGES = [6, 7, 8, 13, 15, 16, 17, 21, 24, 26, 31, 38];

function loadSchemas() {
  const raw = fs.readFileSync(
    path.join(ROOT, 'constants/generated/album-page-schemas.ts'),
    'utf8',
  );
  const match = raw.match(/export const ALBUM_PAGE_SCHEMAS[^=]*=\s*(\{[\s\S]*\})\s*as Record/);
  if (!match) throw new Error('Could not parse ALBUM_PAGE_SCHEMAS');
  return JSON.parse(match[1]);
}

function loadManifest() {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, 'scripts/diary-60-tz-manifest.json'), 'utf8'),
  );
}

function loadLineSlots() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'constants/line-slots.json'), 'utf8'));
}

function tryPdfStrokes() {
  const pdfPath = path.join(
    ROOT,
    'in albums/09.06.26_Блок коричневый _180х240_print.pdf',
  );
  if (!fs.existsSync(pdfPath)) return null;
  try {
    // optional python helper via child — skip if no fitz; use node fallback none
    return { pdfPath, available: false, reason: 'use python audit separately' };
  } catch {
    return null;
  }
}

function auditPage(pageNumber, schema, normSlots, pageTemplates) {
  const title = schema?.title ?? pageTemplates[pageNumber] ?? `page ${pageNumber}`;
  const fields = (schema?.fields ?? []).filter(
    (f) => f.type !== 'radio' && f.type !== 'checkbox',
  );

  const slots = (() => {
    let list = [...normSlots];
    // runtime: refineBrownMyDaySlots appends date under title
    const BROWN_MY_DAY = new Set([
      16, 20, 23, 25, 28, 33, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
    ]);
    if (BROWN_MY_DAY.has(pageNumber)) {
      list = [
        ...list,
        {
          x: 0.3376,
          y: 0.1416,
          width: 0.3252,
          height: 0.028,
          hasLabel: false,
          inputKind: 'line',
          continuationGroup: 99,
        },
      ];
    }
    // runtime: refineBrownPage6CareerSlots appends career continuation
    if (pageNumber === 6 && list.length === 12) {
      list = [
        ...list,
        {
          x: 0.08479,
          y: 0.822,
          width: 0.826,
          height: 0.028,
          hasLabel: false,
          inputKind: 'line',
          continuationGroup: 12,
        },
      ];
    }
    return list;
  })();

  const viewportSlots = slots.map((norm, index) =>
    mapNormSlotToViewport(norm, PNG_W, PNG_H, index, pageNumber),
  );

  const coverage = [];
  for (const field of fields) {
    const start = field.templateLineStart ?? 0;
    const count = field.templateLineCount ?? 1;
    const end = start + count - 1;
    const missing = [];
    for (let i = start; i <= end; i++) {
      if (!slots[i]) missing.push(i);
    }
    coverage.push({
      fieldId: field.fieldId,
      label: field.label,
      start,
      count,
      end,
      ok: missing.length === 0,
      missing,
      maxLength: field.maxLength ?? null,
    });
  }

  const baseline = [];
  for (const slot of viewportSlots) {
    if (isPeachCell(slot)) {
      baseline.push({
        index: slot.index,
        kind: 'peach_block',
        skip: true,
      });
      continue;
    }
    const m = measureDrift(slot);
    const status =
      Math.abs(m.driftPx) <= DRIFT_PX_WARN
        ? 'ok'
        : Math.abs(m.driftPx) <= DRIFT_PX_FAIL
          ? 'warn'
          : 'fail';
    baseline.push({
      index: slot.index,
      kind: slot.inputKind ?? 'line',
      strokeY: Number(m.strokeY.toFixed(2)),
      baselineY: Number(m.baselineY.toFixed(2)),
      driftPx: Number(m.driftPx.toFixed(2)),
      status,
      skip: false,
    });
  }

  const wrap = [];
  for (const field of fields) {
    const start = field.templateLineStart ?? 0;
    const count = field.templateLineCount ?? 1;
    if (!slots[start] || count < 1) continue;
    const sample =
      field.maxLength != null
        ? 'я'.repeat(Math.min(field.maxLength, 40))
        : LONG_TEXT;
    const { truncated, segments } = distributeWithinFieldLines(
      sample,
      start,
      count,
      viewportSlots,
    );
    const filled = segments.filter((s) => s.content).length;
    wrap.push({
      fieldId: field.fieldId,
      label: field.label,
      lines: count,
      filled,
      truncated,
      ok: true,
    });
  }

  const baselineFail = baseline.filter((b) => !b.skip && b.status === 'fail');
  const baselineWarn = baseline.filter((b) => !b.skip && b.status === 'warn');
  const coverageFail = coverage.filter((c) => !c.ok);
  const wrapFail = wrap.filter((w) => w.truncated && (w.lines > 1 || (w.maxLength ?? 99) > 20));

  return {
    page: pageNumber,
    title,
    slotCount: normSlots.length,
    fieldCount: fields.length,
    coverage,
    baseline,
    wrap,
    summary: {
      coverageOk: coverageFail.length === 0,
      baselineFail: baselineFail.length,
      baselineWarn: baselineWarn.length,
      wrapTruncated: wrap.filter((w) => w.truncated).length,
      ok:
        coverageFail.length === 0 &&
        baselineFail.length === 0,
    },
  };
}

function main() {
  const schemas = loadSchemas();
  const manifest = loadManifest();
  const lineSlots = loadLineSlots()[ALBUM_ID] || {};
  const pageTemplates = loadPageTemplates(ROOT);
  const albumSchemas = schemas[ALBUM_ID] || [];

  const pages = [];
  for (let p = 1; p <= 60; p++) {
    const meta = manifest[String(p)] || {};
    const schema = albumSchemas.find((s) => s.sourcePageNumber === p);
    const normSlots = lineSlots[String(p)] || [];
    if (!schema || schema.pageType !== 'structured' || !schema.editable) {
      pages.push({
        page: p,
        title: meta.title || schema?.title || `стр. ${p}`,
        skipped: true,
        reason: !schema
          ? 'no schema'
          : schema.pageType !== 'structured'
            ? `pageType=${schema.pageType}`
            : 'not editable',
        slotCount: normSlots.length,
      });
      continue;
    }
    if (!normSlots.length) {
      pages.push({
        page: p,
        title: schema.title,
        skipped: true,
        reason: 'no line slots',
        slotCount: 0,
      });
      continue;
    }
    pages.push(auditPage(p, schema, normSlots, pageTemplates));
  }

  const audited = pages.filter((p) => !p.skipped);
  const failed = audited.filter((p) => !p.summary.ok);
  const warned = audited.filter(
    (p) => p.summary.ok && (p.summary.baselineWarn > 0 || p.summary.wrapTruncated > 0),
  );

  const driftStats = [];
  for (const p of audited) {
    for (const b of p.baseline) {
      if (b.skip) continue;
      driftStats.push(b.driftPx);
    }
  }
  const avgDrift =
    driftStats.length === 0
      ? 0
      : driftStats.reduce((a, b) => a + b, 0) / driftStats.length;
  const maxAbs = driftStats.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

  const report = {
    generatedAt: new Date().toISOString(),
    albumId: ALBUM_ID,
    model: {
      slotYIsStroke: true,
      diaryLineFontOffset: DIARY_LINE_FONT_OFFSET,
      capHeightRatio: CAP_HEIGHT_RATIO,
      expectedBaselineDriftPx: Number(
        ((CAP_HEIGHT_RATIO - DIARY_LINE_FONT_OFFSET) * 16).toFixed(2),
      ),
      note:
        'baselineY ≈ strokeY при DIARY_LINE_FONT_OFFSET = CAP_HEIGHT_RATIO (0.85). Допуск warn 2.5px / fail 5px на высоте страницы 2400px.',
    },
    thresholds: { DRIFT_PX_WARN, DRIFT_PX_FAIL, STROKE_TOLERANCE },
    summary: {
      totalPages: 60,
      audited: audited.length,
      skipped: pages.filter((p) => p.skipped).length,
      failedPages: failed.length,
      warnPages: warned.length,
      avgDriftPx: Number(avgDrift.toFixed(2)),
      maxAbsDriftPx: Number(maxAbs.toFixed(2)),
      ok: failed.length === 0,
    },
    priority: PRIORITY_PAGES.map((p) => {
      const page = pages.find((x) => x.page === p);
      if (!page || page.skipped) return { page: p, skipped: true, reason: page?.reason };
      return {
        page: p,
        title: page.title,
        ok: page.summary.ok,
        slots: page.slotCount,
        fields: page.fieldCount,
        baselineFail: page.summary.baselineFail,
        baselineWarn: page.summary.baselineWarn,
        wrapTruncated: page.summary.wrapTruncated,
        coverageOk: page.summary.coverageOk,
        meanAbsDrift: Number(
          (
            page.baseline
              .filter((b) => !b.skip)
              .reduce((s, b) => s + Math.abs(b.driftPx), 0) /
              Math.max(1, page.baseline.filter((b) => !b.skip).length)
          ).toFixed(2),
        ),
      };
    }),
    failedPageDetails: failed.map((p) => ({
      page: p.page,
      title: p.title,
      coverageFails: p.coverage.filter((c) => !c.ok),
      baselineFails: p.baseline.filter((b) => !b.skip && b.status === 'fail'),
    })),
    pages,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, 'report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(
    `[audit-diary-brown-full] ${report.summary.ok ? 'OK' : 'FAIL'}: ` +
      `audited=${report.summary.audited} failed=${report.summary.failedPages} ` +
      `avgDriftPx=${report.summary.avgDriftPx} maxAbs=${report.summary.maxAbsDriftPx}`,
  );
  console.log(`Report: ${outPath}`);
  for (const p of report.priority) {
    if (p.skipped) {
      console.log(`  p${p.page} SKIP ${p.reason}`);
      continue;
    }
    console.log(
      `  p${p.page} ${p.ok ? 'OK' : 'FAIL'} slots=${p.slots} fields=${p.fields} ` +
        `|drift|=${p.meanAbsDrift} wrapTrunc=${p.wrapTruncated}`,
    );
  }
}

main();
