#!/usr/bin/env node
/**
 * Полный аудит kids_48 (все 48 страниц) vs iOS e24a739.
 *
 * Проверяет:
 *  1) bake LINE_SLOTS 1:1 с коммитом
 *  2) после refine: strokeY / bandTop / width (симуляция Android runtime)
 *  3) textTop (ascent=1 + clearance + sink) vs iOS-формула
 *  4) влезание полного «12.11.2007» / коротких значений без clip
 *  5) runtime-маркеры паритета
 *
 *   node scripts/audit-kids48-full-ios-parity.js
 *   node scripts/audit-kids48-full-ios-parity.js --json > test-results/kids48-parity.json
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const IOS_COMMIT = 'e24a739d1ae04ca590c52e5da4af0c7edcbf8ef0';
const VIEWPORT = 400;
const FONT_ID = 'AmaticSC-Bold';
const FULL_DATE = '12.11.2007';
const SHORT_SAMPLES = ['11:00', '183', '7', 'ВЛАД', '0'];
const EPS = 0.0005;
const BAND = 0.028;

const OUT_DIR = path.join(ROOT, 'test-results');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function gitShowJson(rel) {
  return JSON.parse(
    execSync(`git show ${IOS_COMMIT}:${rel}`, {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 80 * 1024 * 1024,
    }),
  );
}

function round(n, d = 5) {
  const p = 10 ** d;
  return Math.round(Number(n) * p) / p;
}

function slotBakeKey(s) {
  return JSON.stringify({
    x: round(s.x),
    y: round(s.y),
    w: round(s.width),
    h: round(s.height),
    k: s.inputKind || 'line',
    tat: !!s.textAnchorTop,
    lsb: !!s.lineStrokeAtBottom,
    san: !!s.strokeAtNormY,
    td: !!s.teethDate,
    cg: s.continuationGroup ?? null,
    hl: s.hasLabel !== false,
  });
}

function isMonthPage(page) {
  return page >= 22 && page <= 33;
}

function bottomDateStrokeY(page) {
  if (page === 8) return 0.8877;
  if ([12, 14, 15, 17, 18, 19].includes(page)) return 0.9135;
  return null;
}

/** Упрощённый Android refine (зеркало utils/textLineSlots kids_48). */
function refineSlot(page, index, raw) {
  const norm = { ...raw };
  const kind = norm.inputKind || 'line';

  if (page === 1 && index >= 0 && index <= 4) {
    if (index === 0) {
      const stroke = norm.y;
      return {
        ...norm,
        y: stroke - BAND,
        height: BAND,
        inputKind: 'line',
        lineStrokeAtBottom: true,
        textAnchorTop: true,
        strokeAtNormY: false,
      };
    }
    if (index === 1) {
      return {
        ...norm,
        x: 0.518,
        width: 0.26,
        y: 0.76114 - BAND,
        height: BAND,
        inputKind: 'line',
        lineStrokeAtBottom: true,
        textAnchorTop: true,
        strokeAtNormY: false,
      };
    }
    return {
      ...norm,
      y: norm.y - BAND,
      height: BAND,
      inputKind: 'line',
      lineStrokeAtBottom: true,
      textAnchorTop: true,
      strokeAtNormY: false,
    };
  }

  if (page === 5) {
    const target = 0.2;
    const cx = norm.x + norm.width / 2;
    const width = Math.max(norm.width, target);
    const x = Math.max(0, Math.min(0.98 - width, cx - width / 2));
    return {
      ...norm,
      x,
      width,
      height: BAND,
      inputKind: 'line',
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    };
  }

  if (isMonthPage(page) && index >= 1) {
    const inset = 0.008;
    return {
      ...norm,
      x: (norm.x || 0) + inset,
      width: Math.max(0.05, (norm.width || 0.5) - inset),
      y: norm.y,
      height: BAND,
      inputKind: 'line',
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    };
  }

  if (page === 11) {
    return {
      ...norm,
      y: norm.y - BAND,
      height: BAND,
      inputKind: 'line',
      lineStrokeAtBottom: true,
      textAnchorTop: true,
      strokeAtNormY: false,
    };
  }

  if (page === 20 && index === 0) {
    return {
      ...norm,
      x: 0.418,
      width: 0.232,
      y: 0.2368,
      height: BAND,
      inputKind: 'line',
      lineStrokeAtBottom: true,
      textAnchorTop: true,
      strokeAtNormY: true,
    };
  }

  const bottomStroke = bottomDateStrokeY(page);
  if (bottomStroke != null && index === 0) {
    if (page === 8) {
      return {
        ...norm,
        x: 1031 / 2481,
        width: 582 / 2481,
        y: bottomStroke - BAND,
        height: BAND,
        inputKind: 'line',
        lineStrokeAtBottom: true,
        textAnchorTop: true,
        strokeAtNormY: false,
      };
    }
    return {
      ...norm,
      x: 0.418,
      width: 0.232,
      y: bottomStroke,
      height: BAND,
      inputKind: 'line',
      lineStrokeAtBottom: true,
      textAnchorTop: true,
      strokeAtNormY: true,
    };
  }

  if (page === 16 && index === 0) {
    return {
      ...norm,
      x: 0.715,
      width: 0.27,
      y: 0.21164,
      height: BAND,
      inputKind: 'line',
      lineStrokeAtBottom: true,
      textAnchorTop: true,
      strokeAtNormY: true,
    };
  }

  if (page === 10) {
    if (index <= 19) {
      const x = norm.x;
      const width = Math.max(norm.width, Math.min(0.165, 0.98 - x));
      return {
        ...norm,
        x,
        width,
        textAnchorTop: true,
        lineStrokeAtBottom: true,
      };
    }
    if (index === 20) {
      return {
        ...norm,
        x: 0.5584,
        width: 0.1738,
        y: 0.838 - BAND,
        height: BAND,
        textAnchorTop: true,
        lineStrokeAtBottom: true,
      };
    }
    if (index === 21) {
      return {
        ...norm,
        x: 0.5248,
        width: 0.052,
        y: 0.8975 - BAND,
        height: BAND,
        textAnchorTop: true,
        lineStrokeAtBottom: true,
      };
    }
  }

  if (page === 13) {
    if (index === 0) {
      return {
        ...norm,
        x: 0.24,
        width: 0.17,
        y: 0.18585 - BAND,
        height: BAND,
        textAnchorTop: true,
        lineStrokeAtBottom: true,
      };
    }
    if (index >= 1 && index <= 7) {
      const inset = index === 3 ? 0 : 0.018;
      const x = norm.x + (index === 3 ? 0 : inset);
      let width = norm.width - (index === 3 ? 0 : inset);
      if (index === 3) {
        return { ...norm, x: 0.3258, width: 0.5357, textAnchorTop: true, lineStrokeAtBottom: true };
      }
      return {
        ...norm,
        x,
        width: Math.max(0.05, width),
        height: BAND,
        textAnchorTop: true,
        lineStrokeAtBottom: true,
      };
    }
  }

  // standard ruled
  if (
    kind !== 'block' &&
    !isMonthPage(page) &&
    ![1, 5, 8, 9, 10, 11, 13, 16, 20].includes(page) &&
    bottomStroke == null &&
    (norm.height > BAND || !norm.lineStrokeAtBottom)
  ) {
    const stroke = norm.strokeAtNormY
      ? norm.y
      : norm.textAnchorTop
        ? norm.y + norm.height
        : norm.y;
    return {
      ...norm,
      y: stroke - BAND,
      height: BAND,
      inputKind: 'line',
      lineStrokeAtBottom: true,
      textAnchorTop: true,
      strokeAtNormY: false,
    };
  }

  return norm;
}

/** Mapping → bandTop / stroke (как Android buildLineSlots kids). */
function mapBandAndStroke(page, index, refined) {
  const kind = refined.inputKind || 'line';
  if (kind === 'block') {
    const top = refined.y - refined.height / 2;
    return { bandTop: top, stroke: top + refined.height };
  }
  const monthAnswer = isMonthPage(page) && index >= 1;
  if (monthAnswer || refined.strokeAtNormY) {
    return { bandTop: refined.y - refined.height, stroke: refined.y };
  }
  if (refined.textAnchorTop) {
    return { bandTop: refined.y, stroke: refined.y + refined.height };
  }
  return { bandTop: refined.y - refined.height, stroke: refined.y };
}

function clearance(page, index) {
  if (page === 10) return 0.02;
  if (page === 11) return 0.08;
  if ([8, 9, 12, 14, 15, 16, 17, 18, 19, 20].includes(page) && index === 0) {
    return 0.03;
  }
  if (page === 1) return 0.02;
  if (isMonthPage(page) && index >= 1) return 0.22;
  return 0.1;
}

function amaticSink(page, index, fontSize) {
  if (page === 1) return fontSize * 0.16;
  if (page === 10 && (index === 20 || index === 21)) return -fontSize * 0.22;
  if (page === 10) return fontSize * 0.04;
  return 0;
}

function textTopPx(page, index, strokeNorm, fontSize, ascent) {
  const strokeY = strokeNorm * VIEWPORT;
  return (
    strokeY -
    fontSize * (ascent + clearance(page, index)) +
    amaticSink(page, index, fontSize)
  );
}

function measureWidth(fontTable, text, fontSize) {
  const entry = fontTable?.fonts?.[FONT_ID];
  if (!entry) return null;
  const scale = fontSize / (entry.fontSize || 16);
  let w = 0;
  for (const ch of text) {
    w += (entry.chars?.[ch] ?? entry.avgCharWidthAt16) * scale;
  }
  return w;
}

function preferredFontSize(page, index) {
  if (page === 10) return 11;
  if (page === 11) return 13;
  return 16;
}

function checkMarkers() {
  const textLineSlots = fs.readFileSync(path.join(ROOT, 'utils/textLineSlots.ts'), 'utf8');
  const template = fs.readFileSync(path.join(ROOT, 'utils/templateLineText.ts'), 'utf8');
  const margins = fs.readFileSync(path.join(ROOT, 'constants/album-text-margins.ts'), 'utf8');
  return [
    {
      id: 'strokeAtNormY',
      ok: /kids48StrokeAtNormY|strokeAtNormY === true/.test(textLineSlots),
    },
    {
      id: 'month-answer-mapping',
      ok: /isKidsMonthAnswerLine/.test(textLineSlots),
    },
    {
      id: 'growth-p11-refine',
      ok: /refineKids48GrowthWeightSlot/.test(textLineSlots),
    },
    {
      id: 'standard-ruled-refine',
      ok: /refineKids48StandardRuledLineSlot/.test(textLineSlots),
    },
    {
      id: 'rnAscent',
      ok:
        fs.existsSync(path.join(ROOT, 'constants/generated/font-char-widths.json')) &&
        /getRnAscentRatioAt16/.test(template),
    },
    {
      id: 'kids-lh-eq-fs',
      ok: /kids_48.*usesStrokeBaseline[\s\S]{0,160}Math\.ceil\(resolvedFontSize\)/.test(
        template,
      ),
    },
    {
      id: 'teeth-slot-21',
      ok: /slotIndex === 21/.test(textLineSlots),
    },
    {
      id: 'p1-sink-0.16',
      ok: /KIDS_P1_BASELINE_SINK_RATIO\s*=\s*0\.16/.test(margins),
    },
    {
      id: 'teeth-width-0.165',
      ok: /KIDS48_TEETH_TOOTH_DATE_SLOT_WIDTH\s*=\s*0\.165/.test(margins),
    },
    {
      id: 'date-center',
      ok: /getKids48BottomDateLineStrokeY[\s\S]{0,220}return 'center'/.test(template),
    },
  ];
}

function main() {
  const asJson = process.argv.includes('--json');
  const cur = readJson('constants/line-slots.json').kids_48;
  const ios = gitShowJson('constants/line-slots.json').kids_48;
  const fontTable = readJson('constants/generated/font-char-widths.json');
  const ascent = fontTable?.fonts?.[FONT_ID]?.rnAscentRatioAt16 ?? 1;

  const report = {
    commit: IOS_COMMIT,
    viewport: VIEWPORT,
    ascent,
    markers: checkMarkers(),
    bake: { pagesChecked: 0, slotDiffs: 0, pagesWithDiffs: [] },
    pages: [],
    clipRisks: [],
    summary: {
      pagesOk: 0,
      pagesWarn: 0,
      clipRisks: 0,
      markerFails: 0,
    },
  };

  for (let page = 1; page <= 48; page += 1) {
    const curSlots = cur[String(page)] || [];
    const iosSlots = ios[String(page)] || [];
    report.bake.pagesChecked += 1;

    const bakeDiffs = [];
    const n = Math.max(curSlots.length, iosSlots.length);
    for (let i = 0; i < n; i += 1) {
      if (!curSlots[i] || !iosSlots[i] || slotBakeKey(curSlots[i]) !== slotBakeKey(iosSlots[i])) {
        bakeDiffs.push(i);
      }
    }
    if (bakeDiffs.length) {
      report.bake.slotDiffs += bakeDiffs.length;
      report.bake.pagesWithDiffs.push({ page, indices: bakeDiffs });
    }

    const pageReport = {
      page,
      slotCount: curSlots.length,
      bakeDiffs: bakeDiffs.length,
      slots: [],
      clip: [],
    };

    curSlots.forEach((raw, index) => {
      const refined = refineSlot(page, index, raw);
      const { bandTop, stroke } = mapBandAndStroke(page, index, refined);
      const fontSize = preferredFontSize(page, index);
      const top = textTopPx(page, index, stroke, fontSize, ascent);
      const iosTop = textTopPx(page, index, stroke, fontSize, 1);
      const slotPxW = refined.width * VIEWPORT;
      const samples = [];
      // Полная дата — только на слотах, где она реально пишется / достаточно широких.
      const dateLike =
        (page === 10 && index <= 20) ||
        ([1, 8, 9, 12, 13, 14, 15, 16, 17, 18, 19, 20].includes(page) && index === 0) ||
        (page === 1 && index === 1) ||
        refined.width >= 0.2;
      if (dateLike) samples.push(FULL_DATE);
      if (page === 10 && index === 21) samples.push('0', '12');
      else samples.push(...SHORT_SAMPLES.filter((t) => t !== FULL_DATE));

      const fits = samples.map((text) => {
        const w = measureWidth(fontTable, text, fontSize);
        return {
          text,
          width: w != null ? round(w, 2) : null,
          slotWidth: round(slotPxW, 2),
          fits: w == null ? null : w <= slotPxW + 0.5,
        };
      });

      const clipFails = fits.filter((f) => f.fits === false);
      if (clipFails.length) {
        pageReport.clip.push({ index, fails: clipFails });
        report.clipRisks.push({ page, index, fails: clipFails, slotWidth: slotPxW });
      }

      pageReport.slots.push({
        index,
        x: round(refined.x),
        width: round(refined.width),
        bandTop: round(bandTop),
        stroke: round(stroke),
        textTop: round(top, 2),
        textTopDeltaVsIosAscent1: round(top - iosTop, 3),
        fontSize,
        strokeAtNormY: !!refined.strokeAtNormY,
        textAnchorTop: !!refined.textAnchorTop,
      });
    });

    const warn =
      bakeDiffs.length > 0 ||
      pageReport.clip.length > 0 ||
      pageReport.slots.some((s) => Math.abs(s.textTopDeltaVsIosAscent1) > 0.5);
    if (warn) report.summary.pagesWarn += 1;
    else report.summary.pagesOk += 1;
    report.pages.push(pageReport);
  }

  report.summary.clipRisks = report.clipRisks.length;
  report.summary.markerFails = report.markers.filter((m) => !m.ok).length;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, 'kids48-full-ios-parity.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`\n=== kids_48 FULL iOS parity (${IOS_COMMIT.slice(0, 7)}) ===\n`);
    console.log(`ascent(${FONT_ID})=${ascent}  viewport=${VIEWPORT}`);
    console.log(
      `Bake: ${report.bake.slotDiffs} diffs / ${report.bake.pagesChecked} pages`,
    );
    console.log(
      `Pages OK: ${report.summary.pagesOk}  WARN: ${report.summary.pagesWarn}  clipRisks: ${report.summary.clipRisks}  markerFails: ${report.summary.markerFails}`,
    );
    console.log('\n-- Markers --');
    report.markers.forEach((m) => console.log(`${m.ok ? 'OK' : 'FAIL'}  ${m.id}`));

    if (report.bake.pagesWithDiffs.length) {
      console.log('\n-- Bake diffs --');
      report.bake.pagesWithDiffs.forEach((p) =>
        console.log(`  p${p.page}: slots ${p.indices.join(',')}`),
      );
    } else {
      console.log('\nOK  bake LINE_SLOTS 1:1 на всех 48 страницах');
    }

    if (report.clipRisks.length) {
      console.log('\n-- Clip risks (текст шире слота → ellipsize clip) --');
      report.clipRisks.slice(0, 20).forEach((r) => {
        console.log(
          `  p${r.page}#${r.index} slotW=${round(r.slotWidth, 1)}px fails=${r.fails
            .map((f) => `${f.text}(${f.width})`)
            .join(', ')}`,
        );
      });
    } else {
      console.log('\nOK  контрольные строки влезают в слоты (без принудительного clip)');
    }

    // Per-page stroke sanity for date-like pages
    console.log('\n-- Key pages stroke/textTop --');
    for (const page of [1, 8, 9, 10, 11, 12, 13, 16, 20, 22, 35]) {
      const pr = report.pages.find((p) => p.page === page);
      if (!pr || !pr.slots.length) {
        console.log(`  p${page}: empty`);
        continue;
      }
      const s0 = pr.slots[0];
      console.log(
        `  p${page}: n=${pr.slotCount} stroke0=${s0.stroke} textTop0=${s0.textTop} w0=${s0.width} clip=${pr.clip.length}`,
      );
    }

    console.log(`\nJSON: ${outPath}`);
    const failed =
      report.bake.slotDiffs > 0 ||
      report.summary.markerFails > 0 ||
      report.clipRisks.length > 0;
    console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: PASS — kids_48 готов к паритету iOS на всех страницах');
    process.exit(failed ? 1 : 0);
  }
}

main();
