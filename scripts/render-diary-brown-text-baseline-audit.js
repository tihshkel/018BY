#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Визуальный аудит baseline текста коричневого дневника.
 *
 * npm run audit:diary-brown-text-baseline
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const {
  loadPageTemplates,
  mapNormSlotToViewport,
  measureDrift,
  distributeWithinFieldLines,
  isPeachCell,
} = require('./lib/diary-brown-baseline-metrics');

const ROOT = path.join(__dirname, '..');
const ALBUM_ID = process.env.ALBUM_ID || 'diary_interior_brown';
const PNG_FOLDER_BY_ALBUM = {
  diary_interior_brown: path.join(
    ROOT,
    'albums/diary/cover/in album/Блок коричневый _180х240_print',
  ),
  diary_interior_purple: path.join(
    ROOT,
    'albums/diary/cover/in album/Блок фиолетовый_180х240_print',
  ),
};
const PNG_FOLDER = PNG_FOLDER_BY_ALBUM[ALBUM_ID] || PNG_FOLDER_BY_ALBUM.diary_interior_brown;
const OUT_DIR = process.env.OUT_DIR
  ? path.resolve(process.env.OUT_DIR)
  : path.join(
      ROOT,
      ALBUM_ID === 'diary_interior_purple'
        ? 'assets/debug/diary-purple-text-baseline'
        : 'assets/debug/diary-brown-text-baseline',
    );

const DRIFT_THRESHOLD = Number(process.env.DRIFT_THRESHOLD ?? '0.08');
/** Pages from user acceptance PDF export — always listed in report summary. */
const PRIORITY_ACCEPTANCE_PAGES = new Set([6, 7, 8, 13, 16, 31, 41]);
const LONG_TEXT =
  'Это длинный тестовый текст для проверки переноса слов на следующую строку макета дневника.';

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
  const manifestFile =
    ALBUM_ID === 'diary_interior_purple'
      ? 'scripts/girls-diary-a5-tz-manifest.json'
      : 'scripts/diary-60-tz-manifest.json';
  return JSON.parse(fs.readFileSync(path.join(ROOT, manifestFile), 'utf8'));
}

function loadLineSlots() {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, 'constants/line-slots.json'), 'utf8'),
  );
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
    if (row > 0) setPixel(png, x, row - 1, color);
  }
}

async function loadPng(filePath) {
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

async function auditPage(pageNumber, fields, normSlots, pageTemplates) {
  const fileName = `page_${String(pageNumber).padStart(3, '0')}.png`;
  const filePath = path.join(PNG_FOLDER, fileName);
  if (!fs.existsSync(filePath)) {
    return { skipped: true, reason: 'PNG missing' };
  }

  const png = await loadPng(filePath);
  const slots = normSlots.map((norm, index) =>
    mapNormSlotToViewport(norm, png.width, png.height, index, pageNumber),
  );

  const slotMetrics = [];
  for (const slot of slots) {
    if (isPeachCell(slot)) continue;
    const { strokeY, baselineY, driftRatio } = measureDrift(slot, pageTemplates);
    slotMetrics.push({ index: slot.index, strokeY, baselineY, driftRatio });
    drawHLine(png, strokeY, slot.x, slot.x + slot.width, [0, 200, 80, 255]);
    drawHLine(png, baselineY, slot.x, slot.x + slot.width, [220, 40, 40, 255]);
  }

  const wrapIssues = [];
  for (const field of fields) {
    const start = field.templateLineStart ?? 0;
    const count = field.templateLineCount ?? 1;
    if (count <= 1) continue;
    const { segments, truncated } = distributeWithinFieldLines(
      LONG_TEXT,
      start,
      count,
      slots,
    );
    if (truncated) {
      wrapIssues.push(`field ${field.fieldId}: truncated on ${count} lines`);
    }
    for (const segment of segments) {
      if (!segment.content.trim()) continue;
      if (!slots[segment.slotIndex]) {
        wrapIssues.push(`field ${field.fieldId}: missing slot ${segment.slotIndex}`);
      }
    }
  }

  const drifts = slotMetrics.map((m) => m.driftRatio).sort((a, b) => a - b);
  const medianDrift =
    drifts.length === 0
      ? 0
      : drifts.length % 2 === 1
        ? drifts[(drifts.length - 1) / 2]
        : (drifts[drifts.length / 2 - 1] + drifts[drifts.length / 2]) / 2;

  const outPath = path.join(OUT_DIR, `page_${String(pageNumber).padStart(3, '0')}.png`);
  await savePng(png, outPath);

  return {
    skipped: false,
    page: pageNumber,
    slotCount: slots.length,
    medianDrift,
    maxDrift: drifts.length ? drifts[drifts.length - 1] : 0,
    needsFix: medianDrift > DRIFT_THRESHOLD,
    wrapIssues,
    outPath,
  };
}

async function main() {
  const schemas = loadSchemas();
  const manifest = loadManifest();
  const lineSlots = loadLineSlots();
  const pageTemplates = loadPageTemplates(ROOT);
  const albumSchemas = schemas[ALBUM_ID] ?? [];
  const schemaByPage = Object.fromEntries(
    albumSchemas.map((schema) => [String(schema.sourcePageNumber), schema]),
  );
  const albumSlots = lineSlots[ALBUM_ID] ?? {};

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const pages = [];
  let skipped = 0;

  for (const [pageKey, meta] of Object.entries(manifest)) {
    if (!meta.editable || meta.pageType !== 'structured') continue;
    const pageNumber = Number(pageKey);
    const schema = schemaByPage[pageKey];
    const result = await auditPage(
      pageNumber,
      schema?.fields ?? [],
      albumSlots[pageKey] ?? [],
      pageTemplates,
    );
    if (result.skipped) {
      skipped += 1;
      continue;
    }
    pages.push(result);
  }

  const needsFixPages = pages.filter((p) => p.needsFix);
  const wrapFailures = pages.filter((p) => p.wrapIssues.length > 0);

  const report = {
    albumId: ALBUM_ID,
    generatedAt: new Date().toISOString(),
    driftThreshold: DRIFT_THRESHOLD,
    summary: {
      structuredPages: pages.length,
      skipped,
      pagesNeedingDriftFix: needsFixPages.length,
      pagesWithWrapIssues: wrapFailures.length,
      ok: needsFixPages.length === 0 && wrapFailures.length === 0,
    },
    needsFixPages: needsFixPages.map((p) => ({
      page: p.page,
      medianDrift: p.medianDrift,
      maxDrift: p.maxDrift,
      priority: PRIORITY_ACCEPTANCE_PAGES.has(p.page),
    })),
    priorityPages: pages
      .filter((p) => PRIORITY_ACCEPTANCE_PAGES.has(p.page))
      .map((p) => ({
        page: p.page,
        medianDrift: p.medianDrift,
        maxDrift: p.maxDrift,
        needsFix: p.needsFix,
        wrapIssues: p.wrapIssues,
      })),
    wrapFailures,
    pages,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  console.log(
    `[audit:diary-text-baseline:${ALBUM_ID}] ${report.summary.ok ? 'OK' : 'FAIL'}: ` +
      `${pages.length} pages, drift-fix=${needsFixPages.length}, wrap-issues=${wrapFailures.length}`,
  );
  console.log(`Report: ${path.join(OUT_DIR, 'report.json')}`);

  if (needsFixPages.length > 0) {
    for (const p of needsFixPages.slice(0, 20)) {
      console.warn(
        `  p${p.page} medianDrift=${p.medianDrift.toFixed(4)} maxDrift=${p.maxDrift.toFixed(4)}`,
      );
    }
  }

  if (process.env.FAIL_ON_DRIFT === '1' && !report.summary.ok) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
