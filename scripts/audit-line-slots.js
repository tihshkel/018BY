/* eslint-disable no-console */
/**
 * Аудит слотов построчного ввода по альбомам.
 * ONLY_ALBUM=pregnancy_60 node scripts/audit-line-slots.js
 */
const fs = require('fs');
const path = require('path');

const ALBUM_IDS = [
  'pregnancy_60',
  'pregnancy_a5',
  'kids_48',
  'holidays_birthday_60',
  'diary_interior_brown',
  'diary_interior_purple',
];

function loadSlots(projectRoot) {
  const jsonPath = path.join(projectRoot, 'constants', 'line-slots.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error('Run npm run generate:line-slots first');
  }
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

function loadOverrides(projectRoot) {
  const file = path.join(projectRoot, 'constants', 'line-slots-overrides.json');
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

function auditPageSlots(pageKey, slots, overrideUsed) {
  const issues = [];
  if (!slots?.length) {
    return { page: pageKey, slotCount: 0, issues, ok: true, empty: true };
  }

  const ys = slots.map((s) => s.y);
  for (let i = 1; i < ys.length; i += 1) {
    if (ys[i] < ys[i - 1] - 0.001) {
      issues.push({ code: 'Y_NOT_ASCENDING', detail: `y[${i}]=${ys[i]} < y[${i - 1}]=${ys[i - 1]}` });
    }
    const gap = ys[i] - ys[i - 1];
    if (gap < 0.014) {
      issues.push({ code: 'Y_TOO_CLOSE', detail: `gap ${gap.toFixed(4)} between slots ${i - 1} and ${i}` });
    }
  }

  const xs = slots.map((s) => s.x);
  const staircase =
    slots.length >= 3 &&
    xs.every((x, i) => i === 0 || Math.abs(x - xs[i - 1]) > 0.04) &&
    (xs.every((x, i) => i === 0 || x < xs[i - 1]) || xs.every((x, i) => i === 0 || x > xs[i - 1]));
  if (staircase) {
    issues.push({ code: 'X_STAIRCASE', detail: `x values: ${xs.map((x) => x.toFixed(3)).join(', ')}` });
  }

  const fullWidthNoLabel = slots.filter(
    (s) => !s.hasLabel && s.x < 0.12 && s.width > 0.75
  ).length;
  if (fullWidthNoLabel === slots.length && slots.length > 2) {
    issues.push({
      code: 'ALL_FULL_WIDTH_NO_LABEL',
      detail: 'label detection likely failed for entire page',
    });
  }

  for (const [i, s] of slots.entries()) {
    if (s.width < 0.06) {
      issues.push({ code: 'WIDTH_TOO_SMALL', detail: `slot ${i} width=${s.width}` });
    }
    if (s.height > 0.12) {
      issues.push({ code: 'HEIGHT_TOO_LARGE', detail: `slot ${i} height=${s.height}` });
    }
    if (s.x + s.width > 1.02) {
      issues.push({ code: 'OVERFLOW_RIGHT', detail: `slot ${i} x+w=${s.x + s.width}` });
    }
  }

  if (slots.length > 26) {
    issues.push({ code: 'TOO_MANY_SLOTS', detail: `count=${slots.length}` });
  }

  return {
    page: pageKey,
    slotCount: slots.length,
    overrideUsed,
    issues,
    ok: issues.length === 0,
    empty: false,
  };
}

function auditAlbum(albumId, albumSlots, overrides) {
  const pages = Object.keys(albumSlots).sort((a, b) => Number(a) - Number(b));
  const albumOverrides = overrides[albumId] ?? {};
  const pageResults = [];
  let issuePages = 0;
  let emptyPages = 0;

  for (const pageKey of pages) {
    const slots = albumSlots[pageKey];
    const overrideUsed = !!albumOverrides[pageKey];
    const result = auditPageSlots(pageKey, slots, overrideUsed);
    pageResults.push(result);
    if (result.empty) emptyPages += 1;
    else if (!result.ok) issuePages += 1;
  }

  return {
    albumId,
    pageCount: pages.length,
    emptyPages,
    issuePages,
    pages: pageResults,
  };
}

function main() {
  const projectRoot = process.cwd();
  const slots = loadSlots(projectRoot);
  const overrides = loadOverrides(projectRoot);
  const onlyAlbum = process.env.ONLY_ALBUM;

  const reports = [];
  for (const albumId of ALBUM_IDS) {
    if (onlyAlbum && onlyAlbum !== albumId) continue;
    if (!slots[albumId]) {
      console.warn('No slots for', albumId);
      continue;
    }
    const report = auditAlbum(albumId, slots[albumId], overrides);
    reports.push(report);

    const emptyList = report.pages.filter((p) => p.empty).map((p) => p.page);
    const slotCounts = report.pages.filter((p) => !p.empty).map((p) => p.slotCount);
    const maxSlots = slotCounts.length ? Math.max(...slotCounts) : 0;

    console.log(`\n=== ${albumId} ===`);
    console.log(
      `Pages: ${report.pageCount}, empty: ${report.emptyPages}, with issues: ${report.issuePages}, max slots/page: ${maxSlots}`
    );
    if (emptyList.length) {
      console.log(`  Empty (OK): ${emptyList.join(', ')}`);
    }
    const bad = report.pages.filter((p) => !p.empty && !p.ok);
    for (const p of bad.slice(0, 25)) {
      console.log(`  page ${p.page} (${p.slotCount} slots${p.overrideUsed ? ', override' : ''}):`);
      for (const iss of p.issues) {
        console.log(`    - ${iss.code}: ${iss.detail}`);
      }
    }
    if (bad.length > 25) console.log(`  ... and ${bad.length - 25} more pages`);
  }

  const outFile = path.join(projectRoot, 'scripts', 'line-slots-audit.json');
  fs.writeFileSync(
    outFile,
    JSON.stringify({ generatedAt: new Date().toISOString(), albums: reports }, null, 2),
    'utf8'
  );
  console.log(`\n✅ Wrote ${path.relative(projectRoot, outFile)}`);
}

main();
