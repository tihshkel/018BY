#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Stroke/baseline alignment audit for pregnancy_60 and pregnancy_a5 key pages.
 *
 * ONLY_ALBUM=pregnancy_60 node scripts/audit-pregnancy-stroke-alignment.js
 * FAIL_ON_ERROR=1 node scripts/audit-pregnancy-stroke-alignment.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FAIL_ON_ERROR = process.env.FAIL_ON_ERROR === '1';
const ALBUM_ID = process.env.ONLY_ALBUM || 'pregnancy_60';
const KEY_PAGES =
  ALBUM_ID === 'pregnancy_a5' ? [5, 6, 15, 30, 43] : [9, 10, 52, 53, 54, 55, 60];
const BASELINE_DRIFT_NORM = 0.006;
const OUT_DIR = path.join(ROOT, `assets/debug/${ALBUM_ID.replace('_', '-')}-audit`);

function loadJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function loadSchemas() {
  const raw = fs.readFileSync(
    path.join(ROOT, 'constants/generated/album-page-schemas.ts'),
    'utf8',
  );
  const match = raw.match(/export const ALBUM_PAGE_SCHEMAS[^=]*=\s*(\{[\s\S]*\})\s*as Record/);
  if (!match) throw new Error('Could not parse ALBUM_PAGE_SCHEMAS');
  return JSON.parse(match[1]);
}

function isWeeklyPage(page) {
  if (ALBUM_ID === 'pregnancy_a5') {
    return (
      (page >= 5 && page <= 13) ||
      (page >= 15 && page <= 28) ||
      (page >= 30 && page <= 43)
    );
  }
  return (
    (page >= 9 && page <= 17) ||
    (page >= 19 && page <= 32) ||
    (page >= 34 && page <= 47)
  );
}

function expectedStrokeNormY(slot, guideY) {
  const slotTop = slot.y;
  const slotBottom = slot.y + slot.height;
  const tolerance = Math.max(slot.height * 0.2, 0.004);
  if (
    Math.abs(guideY - slotTop) < tolerance ||
    Math.abs(guideY - slotBottom) < tolerance
  ) {
    return guideY;
  }
  return slotBottom;
}

function auditPage(page, slots, guides, schema) {
  const issues = [];
  if (!slots?.length) {
    if (schema?.fields?.length) {
      issues.push({ code: 'EMPTY_SLOTS', detail: 'page has fields but no line slots' });
    }
    return issues;
  }

  if (isWeeklyPage(page)) {
    slots.forEach((slot, slotIndex) => {
      if ((slot.inputKind ?? 'line') === 'block') return;
      const guideY = guides?.[slotIndex];
      if (guideY == null) return;
      const strokeY = expectedStrokeNormY(slot, guideY);
      const drift = Math.abs(guideY - strokeY);
      if (isWeeklyPage(page) && drift > BASELINE_DRIFT_NORM) {
        issues.push({
          code: 'WEEKLY_GUIDE_NOT_STROKE',
          detail: `slot ${slotIndex} guide=${guideY.toFixed(5)} stroke=${strokeY.toFixed(5)} drift=${drift.toFixed(5)}`,
        });
      }
    });
    return issues;
  }

  for (const field of schema?.fields ?? []) {
    if (field.type === 'radio') continue;
    const start = field.templateLineStart ?? 0;
    const count = field.templateLineCount ?? 1;
    for (let offset = 0; offset < count; offset += 1) {
      const slotIndex = start + offset;
      const slot = slots[slotIndex];
      if (!slot) {
        issues.push({
          code: 'MISSING_SLOT',
          detail: `${field.fieldId} line ${offset} -> slot ${slotIndex} missing`,
        });
        continue;
      }
      if ((slot.inputKind ?? 'line') === 'block') continue;

      const guideY = guides?.[slotIndex];
      if (guideY == null) continue;

      const strokeY = expectedStrokeNormY(slot, guideY);
      const drift = Math.abs(guideY - strokeY);
      if (isWeeklyPage(page) && drift > BASELINE_DRIFT_NORM) {
        issues.push({
          code: 'WEEKLY_GUIDE_NOT_STROKE',
          detail: `slot ${slotIndex} guide=${guideY.toFixed(5)} stroke=${strokeY.toFixed(5)} drift=${drift.toFixed(5)}`,
        });
      }
    }
  }

  return issues;
}

async function auditPdfDimensions(pdfPath) {
  if (ALBUM_ID !== 'pregnancy_60') {
    return { skipped: true, reason: 'PDF dimension audit is only configured for pregnancy_60' };
  }
  if (!pdfPath || !fs.existsSync(pdfPath)) {
    return { skipped: true, reason: 'PDF not provided' };
  }
  const { PDFDocument } = require('pdf-lib');
  const bytes = fs.readFileSync(pdfPath);
  const pdf = await PDFDocument.load(bytes);
  const page = pdf.getPage(0);
  const { width, height } = page.getSize();
  const widthMm = (width / 72) * 25.4;
  const heightMm = (height / 72) * 25.4;
  const expectedWidthMm = 180;
  const expectedHeightMm = 240;
  const ok =
    Math.abs(widthMm - expectedWidthMm) < 2 || Math.abs(heightMm - expectedHeightMm) < 2;
  return {
    pageCount: pdf.getPageCount(),
    widthMm: Number(widthMm.toFixed(1)),
    heightMm: Number(heightMm.toFixed(1)),
    ok,
    note: ok
      ? 'matches 180×240 mm (or scaled)'
      : 'expected hard-cover pregnancy_60 export ~180×240 mm, got A5-like size',
  };
}

async function main() {
  const lineSlots = loadJson('constants/line-slots.json');
  const lineGuides = loadJson('constants/line-guides.json');
  const schemas = loadSchemas();
  const albumSchemas = schemas[ALBUM_ID] ?? {};

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const report = {
    albumId: ALBUM_ID,
    generatedAt: new Date().toISOString(),
    pages: {},
    pdf: null,
    issueCount: 0,
  };

  for (const page of KEY_PAGES) {
    const key = String(page);
    const slots = lineSlots[ALBUM_ID]?.[key] ?? [];
    const guides = lineGuides[ALBUM_ID]?.[key] ?? [];
    const schema = Array.isArray(albumSchemas)
      ? albumSchemas.find((item) => item.sourcePageNumber === page)
      : albumSchemas[key];
    const issues = auditPage(page, slots, guides, schema);
    report.pages[page] = {
      slotCount: slots.length,
      guideCount: guides.length,
      fieldCount: schema?.fields?.length ?? 0,
      issues,
    };
    report.issueCount += issues.length;
    if (issues.length) {
      console.warn(`[p${page}] ${issues.length} issue(s)`);
      for (const issue of issues) {
        console.warn(`  - ${issue.code}: ${issue.detail}`);
      }
    } else {
      console.log(`[p${page}] OK (${slots.length} slots)`);
    }
  }

  const pdfPath =
    process.env.PREGNANCY_AUDIT_PDF ||
    path.join(process.env.HOME || '', 'Downloads', 'Фотоальбом_08032026_2026-07-04_20-01.pdf');
  report.pdf = await auditPdfDimensions(pdfPath);
  if (report.pdf.skipped) {
    console.log(`PDF audit skipped: ${report.pdf.reason}`);
  } else {
    console.log(
      `PDF: ${report.pdf.pageCount} pages, ${report.pdf.widthMm}×${report.pdf.heightMm} mm — ${report.pdf.note}`,
    );
  }

  fs.writeFileSync(
    path.join(OUT_DIR, 'stroke-alignment-report.json'),
    JSON.stringify(report, null, 2),
  );

  if (FAIL_ON_ERROR && report.issueCount > 0) {
    console.error(`FAILED: ${report.issueCount} stroke alignment issue(s)`);
    process.exit(1);
  }

  console.log(`Wrote ${path.relative(ROOT, OUT_DIR)}/stroke-alignment-report.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
