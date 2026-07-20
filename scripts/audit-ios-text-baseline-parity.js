#!/usr/bin/env node
/**
 * Глубокая сверка координат текста kids_48 + pregnancy_a5 p44 (Анкета родов)
 * с iOS-коммитом e24a739d1ae04ca590c52e5da4af0c7edcbf8ef0.
 *
 * Проверяет:
 *  1) bake LINE_SLOTS vs iOS (геометрия слотов)
 *  2) mapping: textAnchorTop vs strokeAtNormY → верх полосы / штрих
 *  3) симуляция textTop (ascent + clearance + sink) vs iOS-формула
 *  4) маркеры runtime (rnAscent, lineHeight===fontSize, center dates)
 *
 *   node scripts/audit-ios-text-baseline-parity.js
 *   node scripts/audit-ios-text-baseline-parity.js --json
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const IOS_COMMIT = 'e24a739d1ae04ca590c52e5da4af0c7edcbf8ef0';
const VIEWPORT = 400;
const FONT_ID = 'AmaticSC-Bold';
const SAMPLE_DATE = '12.11.2007';
const EPS = 0.0008;

const KIDS_PAGES = [1, 8, 9, 10, 12, 14, 15, 16, 17, 18, 19, 20];
const A5_PAGE = 44;

const KIDS_P1_SINK = 0.16;
const KIDS_TEETH_SINK = 0.04;
const KIDS_TEETH_LIFT = 0.22;
const KIDS_CLEARANCE = {
  default: 0.1,
  p1: 0.02,
  teeth: 0.02,
  bottomDate: 0.03,
  growth: 0.08,
  month: 0.22,
};

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function gitShowJson(rel) {
  const raw = execSync(`git show ${IOS_COMMIT}:${rel}`, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 80 * 1024 * 1024,
  });
  return JSON.parse(raw);
}

function round(n, d = 5) {
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

function slotKey(s) {
  return {
    x: round(s.x),
    y: round(s.y),
    width: round(s.width),
    height: round(s.height),
    inputKind: s.inputKind ?? 'line',
    textAnchorTop: !!s.textAnchorTop,
    lineStrokeAtBottom: !!s.lineStrokeAtBottom,
    strokeAtNormY: !!s.strokeAtNormY,
    teethDate: !!s.teethDate,
  };
}

function slotsEqual(a, b) {
  const ka = slotKey(a);
  const kb = slotKey(b);
  return Object.keys(ka).every((k) => ka[k] === kb[k]);
}

/** iOS/Android mapping: где верх полосы относительно bake-y. */
function resolveBandTopNormY(slot) {
  const kind = slot.inputKind ?? 'line';
  if (kind === 'block') return slot.y - slot.height / 2;
  if (slot.strokeAtNormY) return slot.y - slot.height;
  if (slot.textAnchorTop) return slot.y;
  // kids ruled без флагов: bake y = штрих
  return slot.y - slot.height;
}

function resolveStrokeNormY(slot) {
  return resolveBandTopNormY(slot) + slot.height;
}

function kidsClearance(page, index) {
  if (page === 10) return KIDS_CLEARANCE.teeth;
  if (page === 11) return KIDS_CLEARANCE.growth;
  if ([8, 12, 14, 15, 17, 18, 19].includes(page) && index === 0) {
    return KIDS_CLEARANCE.bottomDate;
  }
  if (page === 9 && index === 0) return KIDS_CLEARANCE.bottomDate;
  if (page === 16 && index === 0) return KIDS_CLEARANCE.bottomDate;
  if (page === 20 && index === 0) return KIDS_CLEARANCE.bottomDate;
  if (page === 1) return KIDS_CLEARANCE.p1;
  if (page >= 22 && page <= 33 && index >= 1) return KIDS_CLEARANCE.month;
  return KIDS_CLEARANCE.default;
}

function kidsAmaticSink(page, index, fontSize) {
  if (page === 1) return fontSize * KIDS_P1_SINK;
  if (page === 10 && (index === 20 || index === 21)) {
    return -fontSize * KIDS_TEETH_LIFT;
  }
  if (page === 10) return fontSize * KIDS_TEETH_SINK;
  return 0;
}

function simulateKidsTextTop(slot, page, index, fontSize, ascent) {
  const strokeY = resolveStrokeNormY(slot) * VIEWPORT;
  const clearance = kidsClearance(page, index);
  const sink = kidsAmaticSink(page, index, fontSize);
  return strokeY - fontSize * (ascent + clearance) + sink;
}

function simulateA5LineTextTop(slot, fontSize, ascent) {
  const strokeY = (slot.y + slot.height) * VIEWPORT; // textAnchorTop bake
  return strokeY - fontSize * ascent;
}

function estimateDateWidth(fontTable, fontSize) {
  const entry = fontTable?.fonts?.[FONT_ID];
  if (!entry) return null;
  const scale = fontSize / (entry.fontSize || 16);
  let w = 0;
  for (const ch of SAMPLE_DATE) {
    w += (entry.chars?.[ch] ?? entry.avgCharWidthAt16) * scale;
  }
  return w;
}

function readSource(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function checkRuntimeMarkers() {
  const textLineSlots = readSource('utils/textLineSlots.ts');
  const templateLineText = readSource('utils/templateLineText.ts');
  const margins = readSource('constants/album-text-margins.ts');
  const hasFontWidths = fs.existsSync(
    path.join(ROOT, 'constants/generated/font-char-widths.json'),
  );
  const hasFontHelper = fs.existsSync(path.join(ROOT, 'utils/fontCharWidths.ts'));

  return [
    {
      id: 'strokeAtNormY-mapping',
      ok: /kids48StrokeAtNormY|strokeAtNormY === true/.test(textLineSlots),
      detail: 'mapping учитывает strokeAtNormY (y = штрих)',
    },
    {
      id: 'rnAscent-helper',
      ok: hasFontWidths && hasFontHelper,
      detail: 'font-char-widths.json + getRnAscentRatioAt16',
    },
    {
      id: 'kids-ascent-from-table',
      ok: /getRnAscentRatioAt16/.test(templateLineText),
      detail: 'kids/A5 baseline берёт rnAscent из таблицы',
    },
    {
      id: 'kids-lineHeight-eq-fontSize',
      ok: /kids_48.*usesStrokeBaseline[\s\S]{0,120}Math\.ceil\(resolvedFontSize\)/.test(
        templateLineText,
      ),
      detail: 'kids stroke: lineHeight === fontSize (без leading 1.18)',
    },
    {
      id: 'kids-p1-sink',
      ok: /KIDS_P1_BASELINE_SINK_RATIO\s*=\s*0\.16/.test(margins),
      detail: 'p1 Amatic sink = 0.16 как iOS',
    },
    {
      id: 'teeth-count-slot-21',
      ok: /slotIndex === 21/.test(textLineSlots),
      detail: 'счётчик зубов — слот 21 (не 22)',
    },
    {
      id: 'bottom-date-center',
      ok: /getKids48BottomDateLineStrokeY[\s\S]{0,200}return 'center'/.test(
        templateLineText,
      ),
      detail: 'нижняя ДАТА — textAlign center',
    },
    {
      id: 'teeth-width-widen',
      ok: /KIDS48_TEETH_TOOTH_DATE_SLOT_WIDTH\s*=\s*0\.165/.test(margins),
      detail: 'даты зубов шире 0.12 (Android clip)',
    },
  ];
}

function diffPageSlots(curAlbum, iosAlbum, page) {
  const cur = (curAlbum?.[String(page)] ?? []).map(slotKey);
  const ios = (iosAlbum?.[String(page)] ?? []).map(slotKey);
  const diffs = [];
  const n = Math.max(cur.length, ios.length);
  for (let i = 0; i < n; i += 1) {
    if (!cur[i] || !ios[i] || !slotsEqual(cur[i], ios[i])) {
      diffs.push({ index: i, current: cur[i] ?? null, ios: ios[i] ?? null });
    }
  }
  return { countCur: cur.length, countIos: ios.length, diffs };
}

function main() {
  const asJson = process.argv.includes('--json');
  const curSlots = readJson('constants/line-slots.json');
  const iosSlots = gitShowJson('constants/line-slots.json');
  let fontTable = null;
  try {
    fontTable = readJson('constants/generated/font-char-widths.json');
  } catch {
    fontTable = null;
  }
  const rnAscent = fontTable?.fonts?.[FONT_ID]?.rnAscentRatioAt16 ?? null;

  const report = {
    commit: IOS_COMMIT,
    viewport: VIEWPORT,
    fontId: FONT_ID,
    rnAscentRatioAt16: rnAscent,
    bake: { kids_48: {}, pregnancy_a5_p44: null },
    mapping: [],
    textTop: [],
    teethFit: null,
    runtimeMarkers: checkRuntimeMarkers(),
    summary: { bakeDiffs: 0, mappingRisks: 0, textTopRisks: 0, markerFails: 0 },
  };

  // --- bake diff kids ---
  for (const page of KIDS_PAGES) {
    const d = diffPageSlots(curSlots.kids_48, iosSlots.kids_48, page);
    report.bake.kids_48[page] = d;
    report.summary.bakeDiffs += d.diffs.length;
  }
  report.bake.pregnancy_a5_p44 = diffPageSlots(
    curSlots.pregnancy_a5,
    iosSlots.pregnancy_a5,
    A5_PAGE,
  );
  report.summary.bakeDiffs += report.bake.pregnancy_a5_p44.diffs.length;

  // --- mapping risks: strokeAtNormY + textAnchorTop ---
  for (const page of KIDS_PAGES) {
    const slots = curSlots.kids_48?.[String(page)] ?? [];
    slots.forEach((slot, index) => {
      const bandTop = resolveBandTopNormY(slot);
      const stroke = resolveStrokeNormY(slot);
      const wrongIfIgnoreStrokeFlag =
        slot.strokeAtNormY &&
        slot.textAnchorTop &&
        Math.abs(slot.y - bandTop) > EPS; // y is stroke, not band top
      if (wrongIfIgnoreStrokeFlag) {
        report.mapping.push({
          album: 'kids_48',
          page,
          index,
          risk: 'strokeAtNormY+textAnchorTop',
          bakeY: slot.y,
          bandTopIfMappedAsAnchorTop: slot.y,
          correctBandTop: bandTop,
          correctStroke: stroke,
          deltaNormIfBug: round(slot.height),
          deltaPxIfBug: round(slot.height * VIEWPORT, 2),
        });
        report.summary.mappingRisks += 1;
      }
      // Simulate textTop vs iOS (ascent=1)
      const fontSize = page === 10 ? 11 : 16;
      const androidTop = simulateKidsTextTop(slot, page, index, fontSize, rnAscent ?? 1);
      const iosTop = simulateKidsTextTop(slot, page, index, fontSize, 1);
      const delta = round(androidTop - iosTop, 3);
      if (Math.abs(delta) > 0.5) {
        report.textTop.push({
          album: 'kids_48',
          page,
          index,
          fontSize,
          androidTop,
          iosTop,
          deltaPx: delta,
        });
        report.summary.textTopRisks += 1;
      }
    });
  }

  // --- A5 p44 LINE textTop ---
  const a5 = curSlots.pregnancy_a5?.[String(A5_PAGE)] ?? [];
  a5.forEach((slot, index) => {
    if ((slot.inputKind ?? 'line') !== 'line') return;
    const fontSize = 16;
    const androidAscent = rnAscent ?? 1.08;
    const iosAscent = 1; // Amatic table on iOS
    const androidTop = simulateA5LineTextTop(slot, fontSize, androidAscent);
    const iosTop = simulateA5LineTextTop(slot, fontSize, iosAscent);
    const delta = round(androidTop - iosTop, 3);
    report.textTop.push({
      album: 'pregnancy_a5',
      page: A5_PAGE,
      index,
      fontSize,
      androidAscent,
      iosAscent,
      androidTop,
      iosTop,
      deltaPx: delta,
      note: 'Анкета родов LINE',
    });
    if (Math.abs(delta) > 0.5) report.summary.textTopRisks += 1;
  });

  // --- teeth date fit ---
  const toothW = estimateDateWidth(fontTable, 11);
  const slot012 = 0.12 * VIEWPORT;
  const slot165 = 0.165 * VIEWPORT;
  report.teethFit = {
    sample: SAMPLE_DATE,
    measuredWidthAt11: toothW != null ? round(toothW, 2) : null,
    slotWidth0_12: round(slot012, 2),
    slotWidth0_165: round(slot165, 2),
    fits0_12: toothW != null ? toothW <= slot012 : null,
    fits0_165: toothW != null ? toothW <= slot165 : null,
  };

  report.summary.markerFails = report.runtimeMarkers.filter((m) => !m.ok).length;

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`\n=== iOS text baseline parity audit (${IOS_COMMIT.slice(0, 7)}) ===\n`);
  console.log(`rnAscent(${FONT_ID}) = ${rnAscent}`);
  console.log(
    `Bake diffs: ${report.summary.bakeDiffs} | Mapping risks: ${report.summary.mappingRisks} | textTop risks: ${report.summary.textTopRisks} | marker fails: ${report.summary.markerFails}`,
  );

  console.log('\n-- Runtime markers --');
  for (const m of report.runtimeMarkers) {
    console.log(`${m.ok ? 'OK' : 'FAIL'}  ${m.id}: ${m.detail}`);
  }

  console.log('\n-- Bake slot diffs (kids critical + A5 p44) --');
  if (report.summary.bakeDiffs === 0) {
    console.log('OK  LINE_SLOTS 1:1 с iOS на проверяемых страницах');
  } else {
    for (const [page, d] of Object.entries(report.bake.kids_48)) {
      if (d.diffs.length) {
        console.log(`DIFF kids_48 p${page}: ${d.diffs.length} slots`);
        d.diffs.slice(0, 3).forEach((x) => console.log('   ', x));
      }
    }
    if (report.bake.pregnancy_a5_p44.diffs.length) {
      console.log(`DIFF pregnancy_a5 p44: ${report.bake.pregnancy_a5_p44.diffs.length} slots`);
    }
  }

  console.log('\n-- strokeAtNormY mapping (bake y=штрих; без фикса штрих +height ниже печати) --');
  if (!report.mapping.length) {
    console.log('OK  нет слотов strokeAtNormY');
  } else {
    const mappingOk = report.runtimeMarkers.find((m) => m.id === 'strokeAtNormY-mapping')?.ok;
    console.log(
      `${mappingOk ? 'OK' : 'FAIL'} ${report.mapping.length} слотов с strokeAtNormY (нужен y−height; bug был +${report.mapping[0].deltaPxIfBug}px). Mapping в коде: ${mappingOk ? 'есть' : 'НЕТ'}`,
    );
    report.mapping.slice(0, 8).forEach((r) => {
      console.log(
        `  kids_48 p${r.page}#${r.index}: bakeY=${r.bakeY} stroke=${r.correctStroke}`,
      );
    });
  }

  console.log('\n-- textTop Android vs iOS (ascent) --');
  const risky = report.textTop.filter((t) => Math.abs(t.deltaPx) > 0.5);
  if (!risky.length) {
    console.log('OK  textTop совпадает с iOS-формулой (Δ < 0.5px)');
  } else {
    risky.slice(0, 12).forEach((t) => {
      console.log(
        `  ${t.album} p${t.page}#${t.index}: Δ=${t.deltaPx}px (android ${t.androidTop} vs ios ${t.iosTop})`,
      );
    });
  }

  console.log('\n-- Зубные даты: влезание «12.11.2007» --');
  console.log(JSON.stringify(report.teethFit, null, 2));

  const failed =
    report.summary.bakeDiffs > 0 ||
    report.summary.markerFails > 0 ||
    (report.mapping.length > 0 &&
      !report.runtimeMarkers.find((m) => m.id === 'strokeAtNormY-mapping')?.ok);

  console.log(failed ? '\nRESULT: FAIL — есть блокеры' : '\nRESULT: PASS — runtime готов к паритету iOS');
  process.exit(failed ? 1 : 0);
}

main();
