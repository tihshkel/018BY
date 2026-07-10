#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Baseline drift audit: preview top vs PDF export glyph top for pregnancy_60.
 *
 * node scripts/audit-export-preview-baseline-drift.js
 * FAIL_ON_ERROR=1 node scripts/audit-export-preview-baseline-drift.js
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const core = require('./lib/text-capacity-core');
const baseline = require('./lib/template-line-baseline-metrics');

const ROOT = path.join(__dirname, '..');
const ALBUM_ID = process.env.ONLY_ALBUM || 'pregnancy_60';
const FONT_ID = 'AmaticSC-Bold';
const FONT_SIZE = 16;
const DRIFT_THRESHOLD_PX = Number(process.env.DRIFT_THRESHOLD ?? '1.5');
const FAIL_ON_ERROR = process.env.FAIL_ON_ERROR === '1';
const OUT_DIR = path.join(ROOT, 'assets/debug/export-preview-drift');
const SLOT_PNG_DIR = path.join(ROOT, `assets/debug/line-slots/${ALBUM_ID}`);

const WINDOW_WIDTH = 358;
const PHONE_COORD_W = Math.max(WINDOW_WIDTH - 16 * 2, 280);
const PHONE_COORD_H = PHONE_COORD_W * (240 / 180);
const PHONE_VIEWPORT = { width: PHONE_COORD_W, height: PHONE_COORD_H };

const LINE_SLOTS = require('../constants/line-slots.json');
const LINE_GUIDES = require('../constants/line-guides.json');

function loadSchemas() {
  const raw = fs.readFileSync(
    path.join(ROOT, 'constants/generated/album-page-schemas.ts'),
    'utf8',
  );
  const match = raw.match(/export const ALBUM_PAGE_SCHEMAS[^=]*=\s*(\{[\s\S]*\})\s*as Record/);
  if (!match) throw new Error('Could not parse ALBUM_PAGE_SCHEMAS');
  return JSON.parse(match[1]);
}

function setPixel(png, x, y, color) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  png.data[idx] = color[0];
  png.data[idx + 1] = color[1];
  png.data[idx + 2] = color[2];
  png.data[idx + 3] = color[3];
}

function drawHLine(png, y, x0, x1, color) {
  const row = Math.round(y);
  const left = Math.max(0, Math.round(Math.min(x0, x1)));
  const right = Math.min(png.width - 1, Math.round(Math.max(x0, x1)));
  for (let x = left; x <= right; x += 1) {
    setPixel(png, x, row, color);
  }
}

async function loadPng(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(new PNG())
      .on('parsed', function parsed() {
        resolve(this);
      })
      .on('error', reject);
  });
}

async function savePng(png, outPath) {
  await new Promise((resolve, reject) => {
    png
      .pack()
      .pipe(fs.createWriteStream(outPath))
      .on('finish', resolve)
      .on('error', reject);
  });
}

function buildPageSlots(page) {
  const norms = LINE_SLOTS[ALBUM_ID]?.[String(page)];
  if (!norms?.length) return [];
  const refSlots = core.normSlotsToViewportSlots(ALBUM_ID, page, norms, LINE_GUIDES);
  return baseline.scaleSlotsToPhoneViewport(refSlots, PHONE_VIEWPORT);
}

function auditPage(page, schema, fontTable) {
  const slots = buildPageSlots(page);
  const fields = schema?.fields ?? [];
  const slotResults = [];
  let maxDrift = 0;

  for (const field of fields) {
    if (field.type === 'radio') continue;
    if (typeof field.templateLineStart !== 'number') continue;

    const lineCount = field.templateLineCount ?? 1;
    for (let offset = 0; offset < lineCount; offset += 1) {
      const slotIndex = field.templateLineStart + offset;
      const slot = slots[slotIndex];
      if (!slot) continue;
      if ((slot.inputKind ?? 'line') === 'block') continue;

      const metrics = baseline.measureBaselineDrift(
        slot,
        FONT_SIZE,
        ALBUM_ID,
        slots,
        FONT_ID,
        fontTable,
      );
      const absDrift = Math.abs(metrics.driftPx);
      maxDrift = Math.max(maxDrift, absDrift);

      slotResults.push({
        fieldId: field.fieldId,
        slotIndex,
        continuationGroup: slot.continuationGroup,
        clipWeeklyRow: baseline.shouldClipPregnancyWeeklyFieldRow(slot, ALBUM_ID, slots),
        ...metrics,
        driftPx: Number(metrics.driftPx.toFixed(3)),
        previewTop: Number(metrics.previewTop.toFixed(3)),
        pdfBaseline: Number(metrics.pdfBaseline.toFixed(3)),
        pdfGlyphTop: Number(metrics.pdfGlyphTop.toFixed(3)),
        strokeY: Number(metrics.strokeY.toFixed(3)),
        pass: absDrift <= DRIFT_THRESHOLD_PX,
      });
    }
  }

  const failing = slotResults.filter((row) => !row.pass);
  return {
    page,
    slotCount: slots.length,
    checkedSlots: slotResults.length,
    maxDriftPx: Number(maxDrift.toFixed(3)),
    pass: failing.length === 0,
    failingSlots: failing,
    slots: slotResults,
  };
}

async function writeOverlay(page, pageReport) {
  const srcName = `page_${String(page).padStart(3, '0')}.png`;
  const srcPath = path.join(SLOT_PNG_DIR, srcName);
  const png = await loadPng(srcPath);
  if (!png) return null;

  const scale = png.width / PHONE_VIEWPORT.width;
  for (const row of pageReport.failingSlots) {
    const slot = buildPageSlots(page)[row.slotIndex];
    if (!slot) continue;
    const previewY = row.previewTop * scale;
    const pdfY = row.pdfGlyphTop * scale;
    const strokeY = row.strokeY * scale;
    drawHLine(png, previewY, slot.x * scale, (slot.x + slot.width) * scale, [0, 200, 0, 255]);
    drawHLine(png, pdfY, slot.x * scale, (slot.x + slot.width) * scale, [255, 40, 40, 255]);
    drawHLine(png, strokeY, slot.x * scale, (slot.x + slot.width) * scale, [40, 120, 255, 200]);
  }

  const outPath = path.join(OUT_DIR, `${ALBUM_ID}_p${String(page).padStart(2, '0')}_overlay.png`);
  await savePng(png, outPath);
  return path.relative(ROOT, outPath);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const schemas = loadSchemas()[ALBUM_ID] ?? [];
  const fontTable = core.loadFontCharWidths(ROOT);

  const pages = schemas
    .map((schema) => schema.sourcePageNumber)
    .filter((page) => typeof page === 'number')
    .sort((a, b) => a - b);

  const pageReports = [];
  for (const page of pages) {
    const schema = schemas.find((s) => s.sourcePageNumber === page);
    const report = auditPage(page, schema, fontTable);
    if (!report.pass && report.failingSlots.length > 0) {
      report.overlay = await writeOverlay(page, report);
    }
    pageReports.push(report);
    const status = report.pass ? 'OK' : 'FAIL';
    console.log(
      `${status} p${page}: checked=${report.checkedSlots} maxDrift=${report.maxDriftPx}px`,
    );
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    albumId: ALBUM_ID,
    viewport: PHONE_VIEWPORT,
    fontId: FONT_ID,
    fontSize: FONT_SIZE,
    driftThresholdPx: DRIFT_THRESHOLD_PX,
    totalPages: pageReports.length,
    passedPages: pageReports.filter((p) => p.pass).length,
    failedPages: pageReports.filter((p) => !p.pass).map((p) => p.page),
    pages: pageReports.map(({ slots, ...rest }) => rest),
    slotDetails: pageReports.reduce((acc, report) => {
      if (report.slots?.length) acc[String(report.page)] = report.slots;
      return acc;
    }, {}),
  };

  const outJson = path.join(OUT_DIR, `${ALBUM_ID}.json`);
  fs.writeFileSync(outJson, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(`\nWrote ${path.relative(ROOT, outJson)}`);

  if (summary.failedPages.length > 0) {
    console.error(`\nPages over ${DRIFT_THRESHOLD_PX}px drift: ${summary.failedPages.join(', ')}`);
    if (FAIL_ON_ERROR) process.exit(1);
  } else {
    console.log('\nAll pages within baseline drift threshold.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
