#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Visual baseline overlay for kids_48 text on clean block-PDF preview PNGs.
 * node scripts/audit-kids-48-text-visual-baseline.js
 * FAIL_ON_DRIFT=1 node scripts/audit-kids-48-text-visual-baseline.js
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const PAGE_MM = 210;
const VW = 2480;
const TARGET_PAGES = [1, 3, 10, 22];
const DRIFT_MM = Number(process.env.DRIFT_MM ?? 0.8);
const FAIL_ON_DRIFT = process.env.FAIL_ON_DRIFT === '1';

const PREVIEW_ROOT = path.join(
  'assets',
  'pdfs',
  'Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр',
  'preview_variants',
);
const OUT_DIR = path.join('assets', 'debug', 'kids-48-text-visual-baseline');

const lineSlots = require('../constants/line-slots.json');
const lineGuides = require('../constants/line-guides.json');

const BAND = 0.028;
const FONT_SIZE = 16;
const FONT_OFFSET = 1;

function isKidsMonthPage(page) {
  return page >= 22 && page <= 33;
}

function refineKids48GrowthWeightSlot(page, norm) {
  if (page !== 11 || norm.height <= BAND) return norm;
  const strokeY = norm.y;
  return {
    ...norm,
    y: strokeY - BAND,
    height: BAND,
    inputKind: 'line',
    lineStrokeAtBottom: true,
    textAnchorTop: true,
  };
}

function refineNorm(page, norm, slotIndex) {
  let refined = refineKids48GrowthWeightSlot(page, norm);
  const isBlock = refined.inputKind === 'block';
  const height = refined.height ?? 0.028;

  if (page === 10 && slotIndex <= 19) {
    refined = {
      ...refined,
      inputKind: 'line',
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    };
  }
  if (page === 10 && (slotIndex === 20 || slotIndex === 21)) {
    refined = {
      ...refined,
      height: BAND,
      inputKind: 'line',
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    };
  }

  if (
    !isBlock &&
    !refined.hasLabel &&
    height <= 0.085 &&
    !refined.lineStrokeAtBottom &&
    page !== 10 &&
    !isKidsMonthPage(page)
  ) {
    const strokeY = refined.y;
    refined = {
      ...refined,
      y: strokeY - BAND,
      height: BAND,
      inputKind: 'line',
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    };
  }
  return refined;
}

function resolveKids48LineStrokeY(slot) {
  if (slot.lineStrokeAtBottom) {
    if (slot.page === 11 || (isKidsMonthPage(slot.page) && slot.index >= 1)) {
      return slot.y + slot.lineHeight;
    }
    if (slot.textAnchorTop) {
      return slot.y + slot.lineHeight;
    }
  }
  return slot.y + slot.lineHeight * 0.5;
}

function mapPageSlots(page, norms) {
  return norms.map((norm, index) => {
    const layoutNorm = refineNorm(page, norm, index);
    const anchorTop =
      layoutNorm.textAnchorTop === true ||
      layoutNorm.lineStrokeAtBottom === true ||
      (isKidsMonthPage(page) && index >= 1);
    let topNormY;
    if (isKidsMonthPage(page) && index >= 1) {
      topNormY = layoutNorm.y - layoutNorm.height;
    } else if (layoutNorm.teethDate) {
      topNormY = layoutNorm.y;
    } else if (anchorTop) {
      topNormY = layoutNorm.y;
    } else {
      topNormY = layoutNorm.y - layoutNorm.height / 2;
    }
    const lineStrokeAtBottom =
      layoutNorm.lineStrokeAtBottom === true ||
      (isKidsMonthPage(page) && index >= 1) ||
      page === 11;
    return {
      index,
      page,
      y: topNormY * VW,
      lineHeight: layoutNorm.height * VW,
      inputKind: layoutNorm.inputKind ?? 'line',
      textAnchorTop: anchorTop,
      lineStrokeAtBottom,
    };
  });
}

function getStrokeY(slot) {
  if (slot.inputKind === 'block' && slot.textAnchorTop) return null;
  return resolveKids48LineStrokeY(slot);
}

function getTextTop(slot) {
  const strokeY = getStrokeY(slot);
  if (strokeY == null) return null;
  const lineFitted = FONT_SIZE;
  return strokeY - lineFitted * FONT_OFFSET;
}

function drawHLine(png, yPx, color, alpha = 220) {
  const y = Math.round(yPx);
  if (y < 0 || y >= png.height) return;
  for (let x = 0; x < png.width; x += 1) {
    const idx = (png.width * y + x) << 2;
    png.data[idx] = color[0];
    png.data[idx + 1] = color[1];
    png.data[idx + 2] = color[2];
    png.data[idx + 3] = alpha;
  }
}

function drawRect(png, topPx, bottomPx, leftPx, rightPx, color, alpha = 90) {
  const top = Math.max(0, Math.round(topPx));
  const bottom = Math.min(png.height, Math.round(bottomPx));
  const left = Math.max(0, Math.round(leftPx));
  const right = Math.min(png.width, Math.round(rightPx));
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const idx = (png.width * y + x) << 2;
      png.data[idx] = color[0];
      png.data[idx + 1] = color[1];
      png.data[idx + 2] = color[2];
      png.data[idx + 3] = alpha;
    }
  }
}

function findPreviewPng(page) {
  const prefix = `page_${String(page).padStart(3, '0')}_`;
  const albumRoot = path.join(__dirname, '..', 'assets', 'pdfs', 'Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр');
  const variantDir = path.join(albumRoot, 'preview_variants');
  const variantMatch = fs
    .readdirSync(variantDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.png'))
    .sort()[0];
  if (variantMatch) return path.join(variantDir, variantMatch);

  const designPath = path.join(
    albumRoot,
    'design_previews',
    `page_${String(page).padStart(3, '0')}_design.png`,
  );
  if (fs.existsSync(designPath)) return designPath;

  const lineSlotPath = path.join(
    __dirname,
    '..',
    'assets',
    'debug',
    'line-slots',
    'kids_48',
    `page_${String(page).padStart(3, '0')}.png`,
  );
  if (fs.existsSync(lineSlotPath)) return lineSlotPath;

  throw new Error(`No preview PNG for page ${page}`);
}

function auditPage(page) {
  const pngPath = findPreviewPng(page);
  const buffer = fs.readFileSync(pngPath);
  const png = PNG.sync.read(buffer);
  const norms = lineSlots.kids_48[String(page)] ?? [];
  const guides = lineGuides.kids_48[String(page)] ?? [];
  const slots = mapPageSlots(page, norms);
  const issues = [];

  for (const slot of slots) {
    const guide = guides[slot.index];
    if (guide == null) continue;
    const strokeY = getStrokeY(slot);
    if (strokeY == null || slot.inputKind === 'block') continue;

    const strokeNorm = strokeY / VW;
    const driftMm = Math.abs(strokeNorm - guide) * PAGE_MM;
    const textTop = getTextTop(slot);

    drawHLine(png, strokeY, [255, 40, 40]);
    if (textTop != null) {
      drawHLine(png, textTop, [40, 120, 255]);
      drawRect(
        png,
        textTop,
        strokeY,
        slot.y,
        slot.y + slot.lineHeight * 0.3,
        [40, 120, 255],
        60,
      );
    }

    if (driftMm > DRIFT_MM) {
      issues.push({
        page,
        index: slot.index,
        driftMm: Number(driftMm.toFixed(2)),
        guide,
        strokeNorm: Number(strokeNorm.toFixed(5)),
      });
    }
  }

  return { page, png, issues, pngPath };
}

function main() {
  const projectRoot = path.join(__dirname, '..');
  const outDir = path.join(projectRoot, OUT_DIR);
  fs.mkdirSync(outDir, { recursive: true });

  const allIssues = [];
  const report = { pages: [], driftThresholdMm: DRIFT_MM };

  for (const page of TARGET_PAGES) {
    const result = auditPage(page);
    const outPath = path.join(outDir, `page_${String(page).padStart(3, '0')}_overlay.png`);
    fs.writeFileSync(outPath, PNG.sync.write(result.png));
    allIssues.push(...result.issues);
    report.pages.push({
      page,
      sourcePng: result.pngPath,
      overlayPng: path.relative(projectRoot, outPath),
      slotCount: result.issues.length,
      issues: result.issues,
    });
    console.log(
      `p${page}: ${result.issues.length} slot(s) over ${DRIFT_MM}mm → ${path.relative(projectRoot, outPath)}`,
    );
  }

  report.summary = {
    issueCount: allIssues.length,
    maxDriftMm: allIssues.length
      ? Math.max(...allIssues.map((item) => item.driftMm))
      : 0,
  };

  const reportPath = path.join(outDir, 'report.json');
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${path.relative(projectRoot, reportPath)}`);
  console.log(
    `[audit:kids-48-text-visual-baseline] ${allIssues.length ? 'FAIL' : 'OK'}: ` +
      `${allIssues.length} slot(s) over ${DRIFT_MM}mm`,
  );

  if (FAIL_ON_DRIFT && allIssues.length) process.exit(1);
}

main();
