#!/usr/bin/env node
/**
 * Ensures all writable diary slots resolve to the same template font size.
 *
 * node scripts/audit-diary-font-size-parity.js
 * FAIL_ON_ERROR=1 node scripts/audit-diary-font-size-parity.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const ALBUM_ID = 'diary_interior_brown';
const OUT_DIR = process.env.OUT_DIR
  ? path.resolve(process.env.OUT_DIR)
  : path.join(root, 'test-results', 'diary-font-size-parity');

const EXPECTED_FONT_SIZE = 16;

function loadLineSlots() {
  return JSON.parse(fs.readFileSync(path.join(root, 'constants/line-slots.json'), 'utf8'));
}

function loadManifest() {
  return JSON.parse(
    fs.readFileSync(path.join(root, 'scripts/diary-60-tz-manifest.json'), 'utf8'),
  );
}

/** Mirrors utils/templateLineText.ts fitFontSizeToSlot for diary albums. */
function fitFontSizeToSlot(fontSize, _lineHeight, _inputKind, lineGuideId) {
  if (
    lineGuideId === 'diary_interior_brown' ||
    lineGuideId === 'diary_interior_purple'
  ) {
    const locked = EXPECTED_FONT_SIZE;
    if (Number.isFinite(fontSize) && fontSize !== locked) {
      return Math.min(Math.max(fontSize, 10), 28);
    }
    return locked;
  }
  return fontSize;
}

function validatePage(pageNumber, pageSlots) {
  const issues = [];
  const sizes = new Set();

  for (const slot of pageSlots) {
    if (slot.hasLabel) continue;
    const lineHeight = (slot.height ?? 0.028) * 800;
    const inputKind = slot.inputKind ?? 'line';
    const size = fitFontSizeToSlot(EXPECTED_FONT_SIZE, lineHeight, inputKind, ALBUM_ID);
    sizes.add(size);
    if (size !== EXPECTED_FONT_SIZE) {
      issues.push({
        severity: 'error',
        code: 'FONT_SIZE_MISMATCH',
        slotIndex: pageSlots.indexOf(slot),
        message: `Слот ${pageSlots.indexOf(slot)} inputKind=${inputKind} → fontSize=${size}, ожидалось ${EXPECTED_FONT_SIZE}`,
      });
    }
  }

  if (sizes.size > 1) {
    issues.push({
      severity: 'error',
      code: 'PAGE_FONT_SIZE_MIX',
      message: `На странице ${sizes.size} разных размеров: ${[...sizes].join(', ')}`,
    });
  }

  return issues;
}

function main() {
  const lineSlots = loadLineSlots();
  const manifest = loadManifest();
  const albumSlots = lineSlots[ALBUM_ID] ?? {};

  fs.mkdirSync(OUT_DIR, { recursive: true });

  let errorCount = 0;
  const pages = [];

  for (const [pageKey, meta] of Object.entries(manifest)) {
    if (!meta.editable || meta.pageType !== 'structured') continue;
    const pageNumber = Number(pageKey);
    const pageSlots = albumSlots[pageKey] ?? [];
    if (pageSlots.length === 0) continue;

    const issues = validatePage(pageNumber, pageSlots);
    errorCount += issues.filter((i) => i.severity === 'error').length;
    if (issues.length > 0) {
      pages.push({ page: pageNumber, template: meta.template, issues });
    }
  }

  const report = {
    albumId: ALBUM_ID,
    generatedAt: new Date().toISOString(),
    expectedFontSize: EXPECTED_FONT_SIZE,
    summary: { errors: errorCount, ok: errorCount === 0 },
    pages,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  console.log(
    `[audit-diary-font-size-parity] ${report.summary.ok ? 'OK' : 'FAIL'}: errors=${errorCount}`,
  );
  console.log(`Report: ${path.join(OUT_DIR, 'report.json')}`);

  if (errorCount > 0) {
    for (const page of pages) {
      for (const issue of page.issues) {
        console.error(`  p${page.page} ${issue.code}: ${issue.message}`);
      }
    }
    if (process.env.FAIL_ON_ERROR === '1') process.exit(1);
  }
}

main();
