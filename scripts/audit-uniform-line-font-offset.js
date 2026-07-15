#!/usr/bin/env node
/**
 * Аудит единого отступа снизу текста до штриха:
 * DIARY_UNIFORM_LINE_FONT_OFFSET = 0.85
 *
 * Целевые альбомы:
 *   pregnancy_60, pregnancy_a5  — Ожидание чуда (60 / 48)
 *   kids_48                     — Первые годы малыша
 *   diary_interior_brown        — Мои истории (60)
 *   diary_interior_purple       — Мои истории (40)
 *
 * node scripts/audit-uniform-line-font-offset.js
 * node scripts/audit-uniform-line-font-offset.js --fix  (только проверка, без правок)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TARGET = 0.85;
const TARGET_ALBUMS = [
  'pregnancy_60',
  'pregnancy_a5',
  'kids_48',
  'diary_interior_brown',
  'diary_interior_purple',
];

const OUT_DIR = path.join(ROOT, 'test-results/uniform-line-font-offset');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function extractNumberAfter(src, pattern) {
  const m = src.match(pattern);
  if (!m) return null;
  return Number(m[1]);
}

function auditConstants() {
  const src = read('constants/album-text-margins.ts');
  const findings = [];

  const uniform = extractNumberAfter(
    src,
    /export const DIARY_UNIFORM_LINE_FONT_OFFSET\s*=\s*([0-9.]+)/,
  );
  findings.push({
    album: '*',
    source: 'DIARY_UNIFORM_LINE_FONT_OFFSET',
    value: uniform,
    ok: uniform === TARGET,
  });

  const aliases = [
    'DIARY_LINE_FONT_OFFSET',
    'KIDS_MONTH_LINE_FONT_OFFSET',
    'KIDS48_P8_DATE_LINE_FONT_OFFSET',
    'PREGNANCY_WEEKLY_CAP_HEIGHT_RATIO',
    'PURPLE_MY_DAY_DATE_FONT_OFFSET',
  ];
  for (const name of aliases) {
    const re = new RegExp(
      `export const ${name}\\s*=\\s*(DIARY_UNIFORM_LINE_FONT_OFFSET|([0-9.]+))`,
    );
    const m = src.match(re);
    const value =
      m && m[1] === 'DIARY_UNIFORM_LINE_FONT_OFFSET'
        ? TARGET
        : m
          ? Number(m[2])
          : null;
    findings.push({
      album: '*',
      source: name,
      value,
      ok: value === TARGET,
    });
  }

  for (const album of TARGET_ALBUMS) {
    const blockRe = new RegExp(
      `${album}:\\s*\\{[\\s\\S]*?lineFontOffsetRatio:\\s*(DIARY_UNIFORM_LINE_FONT_OFFSET|([0-9.]+))`,
    );
    const m = src.match(blockRe);
    const value =
      m && m[1] === 'DIARY_UNIFORM_LINE_FONT_OFFSET'
        ? TARGET
        : m
          ? Number(m[2])
          : null;
    findings.push({
      album,
      source: `ALBUM_TYPOGRAPHY.${album}.lineFontOffsetRatio`,
      value,
      ok: value === TARGET,
    });
  }

  return findings;
}

function auditRuntimeOverrides() {
  const src = read('utils/templateLineText.ts');
  const findings = [];
  const lines = src.split('\n');

  // Ищем только fontOffsetRatio: <number> в контексте целевых альбомов
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/fontOffsetRatio:\s*([0-9.]+)/);
    if (!m) continue;
    const value = Number(m[1]);
    if (value === TARGET) continue;

    // Контекст ±15 строк
    const ctx = lines.slice(Math.max(0, i - 25), i + 1).join('\n');
    if (ctx.includes('holidays_birthday_60')) {
      findings.push({
        album: 'holidays_birthday_60',
        source: `templateLineText.ts:${i + 1}`,
        value,
        ok: true,
        note: 'вне scope (ДР)',
      });
      continue;
    }

    findings.push({
      album: 'runtime',
      source: `templateLineText.ts:${i + 1}`,
      value,
      ok: false,
      snippet: line.trim(),
    });
  }

  // Stroke baseline helper must use resolveUniformStrokeFontOffset / DIARY_LINE_FONT_OFFSET
  const strokeFn = src.match(
    /function getStrokeBaselineFontOffset[\s\S]*?\n\}/,
  );
  if (strokeFn) {
    const body = strokeFn[0];
    const usesUniform =
      body.includes('resolveUniformStrokeFontOffset') ||
      (body.includes('DIARY_LINE_FONT_OFFSET') && !/return\s+0\.\d+/.test(body));
    findings.push({
      album: '*',
      source: 'getStrokeBaselineFontOffset',
      value: usesUniform ? TARGET : 'mixed',
      ok: usesUniform,
    });
  }

  const resolveFn = src.match(
    /function resolveUniformStrokeFontOffset[\s\S]*?\n\}/,
  );
  if (resolveFn) {
    const body = resolveFn[0];
    const ok =
      body.includes('DIARY_LINE_FONT_OFFSET') &&
      body.includes('TEMPLATE_LINE_STROKE_CLEARANCE_RATIO') &&
      body.includes('getAlbumFontPreviewCapHeightRatio');
    findings.push({
      album: '*',
      source: 'resolveUniformStrokeFontOffset',
      value: ok ? 'max(0.85, cap)+clearance' : 'unexpected',
      ok,
    });
  }

  // Per-template diary brown line overrides must be gone
  if (/function resolveDiaryBrownLineFontOffset/.test(src)) {
    const fn = src.match(/function resolveDiaryBrownLineFontOffset[\s\S]*?\n\}/)?.[0] ?? '';
    const hasHardcoded = /return\s+0\.\d+/.test(fn);
    findings.push({
      album: 'diary_interior_brown',
      source: 'resolveDiaryBrownLineFontOffset',
      value: hasHardcoded ? 'has hardcoded' : 'removed/uniform',
      ok: !hasHardcoded,
    });
  }

  return findings;
}

function auditMetricsLib() {
  const src = read('scripts/lib/diary-brown-baseline-metrics.js');
  const findings = [];
  const offset = extractNumberAfter(
    src,
    /const DIARY_LINE_FONT_OFFSET\s*=\s*([0-9.]+)/,
  );
  findings.push({
    album: 'diary_interior_brown',
    source: 'diary-brown-baseline-metrics.DIARY_LINE_FONT_OFFSET',
    value: offset,
    ok: offset === TARGET,
  });
  const has088 = /0\.88/.test(src) && /resolveDiaryFontOffset|getTextTop/.test(src);
  findings.push({
    album: 'diary_interior_brown',
    source: 'diary-brown-baseline-metrics no 0.88 override',
    value: has088 ? 'has 0.88' : TARGET,
    ok: !has088 || /fitted \* DIARY_LINE_FONT_OFFSET/.test(src),
  });
  return findings;
}

function main() {
  const findings = [
    ...auditConstants(),
    ...auditRuntimeOverrides(),
    ...auditMetricsLib(),
  ];

  const fails = findings.filter((f) => !f.ok);
  const report = {
    target: TARGET,
    albums: TARGET_ALBUMS,
    generatedAt: new Date().toISOString(),
    summary: {
      total: findings.length,
      ok: findings.length - fails.length,
      fail: fails.length,
    },
    findings,
    fails,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, 'report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`Target DIARY_UNIFORM_LINE_FONT_OFFSET = ${TARGET}`);
  console.log(`Albums: ${TARGET_ALBUMS.join(', ')}`);
  console.log(`OK: ${report.summary.ok} / ${report.summary.total}`);
  if (fails.length) {
    console.log('\nFAILS:');
    for (const f of fails) {
      console.log(`  ✗ [${f.album}] ${f.source} = ${f.value}${f.note ? ` (${f.note})` : ''}`);
    }
    console.log(`\nReport: ${outPath}`);
    process.exitCode = 1;
    return;
  }
  console.log('All target albums use uniform line font offset 0.85');
  console.log(`Report: ${outPath}`);
}

main();
