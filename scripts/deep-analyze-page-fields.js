/* eslint-disable no-console */
/**
 * Глубокий анализ каждой страницы: подсчёт полей ввода + координаты для line-slots-overrides.json
 *
 * ONLY_ALBUM=pregnancy_60 node scripts/deep-analyze-page-fields.js
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ALBUM_SPECS = [
  {
    albumId: 'pregnancy_60',
    folder: 'Блок БЕРЕМЕННОСТЬ 60 стр',
    margins: { x: 0.1, width: 0.8 },
    options: {
      sampleXStartRatio: 0.15,
      sampleXEndRatio: 0.95,
      luminanceThreshold: 235,
      labelLuminanceThreshold: 210,
      rowCoverageThreshold: 0.06,
      sensitiveRowCoverageThreshold: 0.035,
      sensitiveLuminanceThreshold: 248,
      maxLineThicknessPx: 6,
      minLineGapPx: 22,
      minLineGapNorm: 0.02,
      minRunWidthRatio: 0.1,
      minUnderlineRunRatio: 0.1,
      maxLinesPerPage: 28,
      formStartNormY: 0.24,
      topCutPx: 80,
      bottomCutPx: 80,
      minFieldGapNorm: 0.014,
    },
  },
  {
    albumId: 'pregnancy_a5',
    folder: 'Блок БЕРЕМЕННОСТЬ A5 другой блок',
    margins: { x: 0.1, width: 0.8 },
    options: {
      sampleXStartRatio: 0.15,
      sampleXEndRatio: 0.95,
      luminanceThreshold: 235,
      labelLuminanceThreshold: 210,
      rowCoverageThreshold: 0.06,
      sensitiveRowCoverageThreshold: 0.035,
      sensitiveLuminanceThreshold: 248,
      maxLineThicknessPx: 6,
      minLineGapPx: 18,
      minLineGapNorm: 0.022,
      minRunWidthRatio: 0.1,
      minUnderlineRunRatio: 0.1,
      maxLinesPerPage: 26,
      formStartNormY: 0.2,
      topCutPx: 70,
      bottomCutPx: 70,
      minFieldGapNorm: 0.014,
    },
  },
  {
    albumId: 'kids_48',
    folder: 'Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр',
    margins: { x: 0.08, width: 0.84 },
    options: {
      sampleXStartRatio: 0.12,
      sampleXEndRatio: 0.92,
      luminanceThreshold: 230,
      labelLuminanceThreshold: 205,
      rowCoverageThreshold: 0.05,
      sensitiveRowCoverageThreshold: 0.032,
      sensitiveLuminanceThreshold: 245,
      maxLineThicknessPx: 8,
      minLineGapPx: 16,
      minLineGapNorm: 0.02,
      minRunWidthRatio: 0.1,
      minUnderlineRunRatio: 0.09,
      maxLinesPerPage: 22,
      formStartNormY: 0.18,
      topCutPx: 60,
      bottomCutPx: 60,
      minFieldGapNorm: 0.014,
    },
  },
  {
    albumId: 'holidays_birthday_60',
    folder: 'Блок ДНЕЙ РОЖДЕНИЯ 60 стр',
    margins: { x: 0.1, width: 0.8 },
    options: {
      sampleXStartRatio: 0.15,
      sampleXEndRatio: 0.95,
      luminanceThreshold: 235,
      labelLuminanceThreshold: 210,
      rowCoverageThreshold: 0.06,
      sensitiveRowCoverageThreshold: 0.035,
      sensitiveLuminanceThreshold: 248,
      maxLineThicknessPx: 6,
      minLineGapPx: 20,
      minLineGapNorm: 0.02,
      minRunWidthRatio: 0.1,
      minUnderlineRunRatio: 0.1,
      maxLinesPerPage: 26,
      formStartNormY: 0.2,
      topCutPx: 80,
      bottomCutPx: 80,
      minFieldGapNorm: 0.014,
    },
  },
];

function clamp(v, min, max) {
  if (Number.isNaN(v)) return min;
  return Math.min(Math.max(v, min), max);
}

function formatFloat(n) {
  return Number(n.toFixed(5));
}

function readPng(filePath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(new PNG())
      .on('parsed', function parsed() {
        resolve(this);
      })
      .on('error', reject);
  });
}

function getLuminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isInkPixel(data, idx, threshold) {
  if (data[idx + 3] < 10) return false;
  return getLuminance(data[idx], data[idx + 1], data[idx + 2]) < threshold;
}

function measureLineExtents(png, centerY, options) {
  const width = png.width;
  const data = png.data;
  const y0 = clamp(centerY, 0, png.height - 1);
  let left = width;
  let right = 0;
  for (let x = 0; x < width; x += 1) {
    const idx = (width * y0 + x) << 2;
    if (data[idx + 3] < 10) continue;
    if (getLuminance(data[idx], data[idx + 1], data[idx + 2]) < options.luminanceThreshold) {
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
  if (right <= left) {
    const fx = Math.floor(width * options.sampleXStartRatio);
    const fw = Math.floor(width * (options.sampleXEndRatio - options.sampleXStartRatio));
    return { left: fx, right: fx + fw };
  }
  const pad = Math.max(4, Math.floor(width * 0.01));
  return { left: clamp(left - pad, 0, width - 1), right: clamp(right + pad, 0, width - 1) };
}

function measureMaxUnderlineRunPx(png, centerY, options) {
  const width = png.width;
  const data = png.data;
  const y0 = clamp(centerY, 0, png.height - 1);
  const xStart = Math.floor(width * options.sampleXStartRatio);
  const xEnd = Math.floor(width * options.sampleXEndRatio);
  let run = 0;
  let maxRun = 0;
  for (let x = xStart; x < xEnd; x += 1) {
    const idx = (width * y0 + x) << 2;
    if (isInkPixel(data, idx, options.luminanceThreshold)) {
      run += 1;
      maxRun = Math.max(maxRun, run);
    } else run = 0;
  }
  return maxRun;
}

function getMinLineGapPx(png, options) {
  return Math.max(options.minLineGapPx ?? 10, Math.floor(png.height * (options.minLineGapNorm ?? 0.02)));
}

function mergeLineCentersY(centers, minGapPx) {
  const sorted = [...centers].sort((a, b) => a - b);
  const out = [];
  for (const y of sorted) {
    const prev = out[out.length - 1];
    if (prev === undefined || Math.abs(y - prev) >= minGapPx) out.push(y);
  }
  return out;
}

function detectHorizontalLines(png, options) {
  const width = png.width;
  const height = png.height;
  const data = png.data;
  const xStart = Math.floor(width * options.sampleXStartRatio);
  const xEnd = Math.floor(width * options.sampleXEndRatio);
  const rowScore = new Array(height).fill(0);
  for (let y = 0; y < height; y += 1) {
    let dark = 0;
    let total = 0;
    for (let x = xStart; x < xEnd; x += 1) {
      const idx = (width * y + x) << 2;
      if (data[idx + 3] < 10) continue;
      total += 1;
      if (getLuminance(data[idx], data[idx + 1], data[idx + 2]) < options.luminanceThreshold) dark += 1;
    }
    rowScore[y] = total > 0 ? dark / total : 0;
  }
  const segments = [];
  let inSeg = false;
  let segStart = 0;
  for (let y = 0; y < height; y += 1) {
    const hit = rowScore[y] >= options.rowCoverageThreshold;
    if (hit && !inSeg) {
      inSeg = true;
      segStart = y;
    } else if (!hit && inSeg) {
      inSeg = false;
      segments.push([segStart, y - 1]);
    }
  }
  if (inSeg) segments.push([segStart, height - 1]);
  const lines = [];
  for (const [start, end] of segments) {
    if (end - start + 1 > options.maxLineThicknessPx) continue;
    lines.push(Math.round((start + end) / 2));
  }
  lines.sort((a, b) => a - b);
  return mergeLineCentersY(lines, options.minLineGapPx ?? 10).filter(
    (y) => y >= options.topCutPx && y <= height - options.bottomCutPx
  );
}

function detectLongRunLines(png, options) {
  const width = png.width;
  const height = png.height;
  const data = png.data;
  const xStart = Math.floor(width * options.sampleXStartRatio);
  const xEnd = Math.floor(width * options.sampleXEndRatio);
  const band = xEnd - xStart;
  const minRunPx = Math.floor(band * (options.minRunWidthRatio ?? 0.1));
  const hits = [];
  for (let y = options.topCutPx; y <= height - options.bottomCutPx; y += 1) {
    let run = 0;
    let maxRun = 0;
    for (let x = xStart; x < xEnd; x += 1) {
      const idx = (width * y + x) << 2;
      if (isInkPixel(data, idx, options.luminanceThreshold)) {
        run += 1;
        maxRun = Math.max(maxRun, run);
      } else run = 0;
    }
    if (maxRun >= minRunPx) hits.push(y);
  }
  return hits;
}

function detectAllLineCenters(png, options) {
  const minGapPx = getMinLineGapPx(png, options);
  const primary = detectHorizontalLines(png, options);
  const sensitive = detectHorizontalLines(png, {
    ...options,
    luminanceThreshold: options.sensitiveLuminanceThreshold ?? 248,
    rowCoverageThreshold: options.sensitiveRowCoverageThreshold ?? 0.035,
  });
  const longRun = detectLongRunLines(png, options);
  return mergeLineCentersY([...primary, ...sensitive, ...longRun], minGapPx).filter(
    (y) => y >= options.topCutPx && y <= png.height - options.bottomCutPx
  );
}

function refineLineCenters(png, linesPx, options) {
  const minGapPx = getMinLineGapPx(png, options);
  let lines = mergeLineCentersY(linesPx, minGapPx);
  const minRunPx = Math.floor(
    png.width * (options.minUnderlineRunRatio ?? 0.1) * (options.sampleXEndRatio - options.sampleXStartRatio)
  );
  lines = lines.filter((y) => measureMaxUnderlineRunPx(png, y, options) >= minRunPx);
  const maxLines = options.maxLinesPerPage ?? 28;
  if (lines.length > maxLines) {
    const scored = lines
      .map((y) => ({ y, score: measureMaxUnderlineRunPx(png, y, options) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxLines)
      .map((s) => s.y)
      .sort((a, b) => a - b);
    lines = scored;
  }
  return lines;
}

/** Пики подписей слева — отдельные строки в плотном кластере (как ПДР/имя/возраст на стр. 1) */
function findLabelRowPeaksInRange(png, yStart, yEnd, options) {
  const width = png.width;
  const data = png.data;
  const threshold = options.labelLuminanceThreshold ?? 210;
  const xEnd = Math.floor(width * 0.58);
  const scores = [];

  for (let y = yStart; y <= yEnd; y += 1) {
    let count = 0;
    for (let x = Math.floor(width * 0.08); x < xEnd; x += 1) {
      const idx = (width * y + x) << 2;
      if (isInkPixel(data, idx, threshold)) count += 1;
    }
    scores.push({ y, count });
  }

  const peaks = [];
  for (let i = 1; i < scores.length - 1; i += 1) {
    const s = scores[i];
    if (s.count < 35) continue;
    if (s.count >= scores[i - 1].count && s.count >= scores[i + 1].count) peaks.push(s.y);
  }

  return mergeLineCentersY(peaks, Math.max(8, Math.floor(png.height * 0.008)));
}

function expandDenseClusters(png, linesPx, options) {
  const height = png.height;
  const clusterGap = Math.floor(height * 0.028);
  const out = [];

  for (let i = 0; i < linesPx.length; i += 1) {
    const y = linesPx[i];
    const prev = out[out.length - 1];
    const next = linesPx[i + 1];

    if (prev !== undefined && y - prev < clusterGap) {
      const rangeStart = Math.max(options.topCutPx, prev - Math.floor(height * 0.01));
      const rangeEnd = Math.min(height - options.bottomCutPx, (next ?? y) + Math.floor(height * 0.015));
      const peaks = findLabelRowPeaksInRange(png, rangeStart, rangeEnd, options);
      if (peaks.length >= 2) {
        if (out[out.length - 1] === prev) {
          out.pop();
        }
        for (const py of peaks) {
          if (!out.length || Math.abs(py - out[out.length - 1]) >= Math.floor(height * 0.01)) {
            out.push(py);
          }
        }
        continue;
      }
    }

    if (!out.length || Math.abs(y - out[out.length - 1]) >= Math.floor(height * (options.minFieldGapNorm ?? 0.014))) {
      out.push(y);
    }
  }

  return out.sort((a, b) => a - b);
}

function findInkRunsOnRow(png, centerY, options, inkThreshold) {
  const width = png.width;
  const data = png.data;
  const y0 = clamp(centerY, 0, png.height - 1);
  const xStart = Math.floor(width * options.sampleXStartRatio);
  const xEnd = Math.floor(width * options.sampleXEndRatio);
  const threshold = inkThreshold ?? options.luminanceThreshold;
  const runs = [];
  let inRun = false;
  let runStart = xStart;
  for (let x = xStart; x < xEnd; x += 1) {
    const idx = (width * y0 + x) << 2;
    const dark = isInkPixel(data, idx, threshold);
    if (dark && !inRun) {
      inRun = true;
      runStart = x;
    } else if (!dark && inRun) {
      runs.push([runStart, x - 1]);
      inRun = false;
    }
  }
  if (inRun) runs.push([runStart, xEnd - 1]);
  return runs;
}

function findLabelRunsNearLine(png, centerY, options) {
  const labelThreshold = options.labelLuminanceThreshold ?? 210;
  const offsets = [-18, -14, -11, -8, -5];
  const merged = new Map();
  for (const off of offsets) {
    const y = clamp(centerY + off, 0, png.height - 1);
    for (const run of findInkRunsOnRow(png, y, options, labelThreshold)) {
      merged.set(`${run[0]}-${run[1]}`, run);
    }
  }
  return Array.from(merged.values()).sort((a, b) => a[0] - b[0]);
}

function detectTrailingLabelStart(png, centerY, options) {
  const width = png.width;
  const data = png.data;
  const threshold = options.labelLuminanceThreshold ?? 210;
  const y0 = clamp(centerY, 0, png.height - 1);
  const xScanStart = Math.floor(width * 0.62);
  let minX = width;
  for (let x = xScanStart; x < Math.floor(width * 0.92); x += 1) {
    let hits = 0;
    for (let dy = -10; dy <= 4; dy += 1) {
      const y = clamp(y0 + dy, 0, png.height - 1);
      const idx = (width * y + x) << 2;
      if (isInkPixel(data, idx, threshold)) hits += 1;
    }
    if (hits >= 2) minX = Math.min(minX, x);
  }
  return minX < width * 0.9 ? minX : null;
}

function resolveWritableBand(png, centerY, options, margins) {
  const width = png.width;
  const { right: lineRight } = measureLineExtents(png, centerY, options);
  const labelRuns = findLabelRunsNearLine(png, centerY, options);
  const pad = Math.max(8, Math.floor(width * 0.014));
  const minLabelWidth = Math.floor(width * 0.03);

  let textStartPx = Math.floor(width * margins.x);
  let textEndPx = lineRight;
  let hasLabel = false;

  const labelCandidates = labelRuns.filter(([start, end]) => {
    const runWidth = (end - start + 1) / width;
    return start <= width * 0.26 && end < width * 0.65 && runWidth < 0.48 && end - start + 1 >= minLabelWidth;
  });

  if (labelCandidates.length > 0) {
    const best = labelCandidates.sort((a, b) => b[1] - b[0] - (a[1] - a[0]))[0];
    hasLabel = true;
    textStartPx = best[1] + pad;
  } else {
    const leftInk = labelRuns.find(([start]) => start < width * 0.2);
    if (leftInk && leftInk[1] - leftInk[0] + 1 >= minLabelWidth * 0.6 && leftInk[1] < width * 0.55) {
      hasLabel = true;
      textStartPx = leftInk[1] + pad;
    }
  }

  const trailing = detectTrailingLabelStart(png, centerY, options);
  if (trailing !== null) {
    textEndPx = Math.min(textEndPx, trailing - pad);
    hasLabel = true;
  }

  let wPx = textEndPx - textStartPx;
  if (wPx < width * 0.08) {
    textStartPx = Math.floor(width * margins.x);
    wPx = Math.floor(width * margins.width);
    hasLabel = false;
  }

  return {
    xPx: clamp(textStartPx, 0, width - 2),
    wPx: clamp(wPx, Math.floor(width * 0.08), width - textStartPx),
    hasLabel,
  };
}

function assignContinuationGroups(slots) {
  let groupId = 0;
  let groupX = null;
  let groupW = null;
  for (const slot of slots) {
    if (slot.hasLabel) {
      groupId += 1;
      slot.continuationGroup = groupId;
      groupX = slot.x;
      groupW = slot.width;
    } else {
      slot.continuationGroup = groupId > 0 ? groupId : 1;
      if (groupX !== null) {
        slot.x = groupX;
        slot.width = groupW;
      }
    }
  }
  return slots;
}

function buildSlotsForPage(png, lineCentersPx, options, margins) {
  const height = png.height;
  const width = png.width;
  const slots = [];

  for (let i = 0; i < lineCentersPx.length; i += 1) {
    const centerY = lineCentersPx[i];
    const prev = i > 0 ? lineCentersPx[i - 1] : null;
    const next = i < lineCentersPx.length - 1 ? lineCentersPx[i + 1] : null;

    let bandPx;
    if (prev !== null && next !== null) bandPx = Math.min((next - prev) / 2, height * 0.08);
    else if (next !== null) bandPx = next - centerY;
    else if (prev !== null) bandPx = centerY - prev;
    else bandPx = height * 0.028;
    bandPx = clamp(bandPx, 10, Math.min(220, height * 0.1));

    const { xPx, wPx, hasLabel } = resolveWritableBand(png, centerY, options, margins);
    slots.push({
      x: formatFloat(clamp(xPx / width, 0, 1)),
      y: formatFloat(clamp(centerY / height, 0, 1)),
      width: formatFloat(clamp(wPx / width, 0.05, 1)),
      height: formatFloat(clamp(bandPx / height, 0.012, 0.12)),
      hasLabel,
    });
  }

  return assignContinuationGroups(slots);
}

function isDecorativeTopLine(png, centerY, options) {
  const normY = centerY / png.height;
  if (normY > 0.26) return false;
  const { left, right } = measureLineExtents(png, centerY, options);
  return (right - left) / png.width > 0.72;
}

function isPhotoPage(png, linesPx, options) {
  if (linesPx.length === 0) return true;
  const formLines = linesPx.filter((y) => y / png.height >= (options.formStartNormY ?? 0.2));
  if (formLines.length === 0) return true;
  const labeled = formLines.filter((y) => {
    const band = resolveWritableBand(png, y, options, { x: 0.1, width: 0.8 });
    return band.hasLabel;
  });
  if (formLines.length >= 12 && labeled.length < 2) return true;
  return false;
}

function analyzePage(png, spec) {
  const { options, margins } = spec;
  let linesPx = detectAllLineCenters(png, options)
    .filter((y) => !isDecorativeTopLine(png, y, options))
    .filter((y) => y / png.height >= options.formStartNormY ?? 0);

  if (isPhotoPage(png, linesPx, options)) {
    return { fieldCount: 0, slots: [], reason: 'photo_or_no_form' };
  }

  linesPx = refineLineCenters(png, linesPx, options);
  linesPx = expandDenseClusters(png, linesPx, options);
  linesPx = refineLineCenters(png, linesPx, options);

  if (linesPx.length === 0) {
    return { fieldCount: 0, slots: [], reason: 'no_lines' };
  }

  const slots = buildSlotsForPage(png, linesPx, options, margins);
  return { fieldCount: slots.length, slots, reason: 'form' };
}

function loadManualOverrides(projectRoot) {
  const file = path.join(projectRoot, 'constants', 'line-slots-overrides.json');
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

async function analyzeAlbum(projectRoot, spec, manualOverrides) {
  const folderPath = path.join(projectRoot, 'assets', 'pdfs', spec.folder);
  if (!fs.existsSync(folderPath)) {
    console.warn('Skip', spec.albumId, 'no folder');
    return null;
  }

  const files = fs
    .readdirSync(folderPath)
    .filter((f) => /^page_\d+\.png$/i.test(f))
    .sort();

  const overrides = {};
  const reportPages = [];
  let totalFields = 0;
  let emptyPages = 0;

  for (const fileName of files) {
    const pageNumber = String(Number(fileName.match(/^page_(\d+)\.png$/i)[1]));
    const manual = manualOverrides[spec.albumId]?.[pageNumber];

    const png = await readPng(path.join(folderPath, fileName));
    const result = analyzePage(png, spec);

    const useManual =
      manual &&
      (process.env.PRESERVE_MANUAL === '1' ||
        (spec.albumId === 'pregnancy_60' && pageNumber === '1'));

    if (useManual) {
      overrides[pageNumber] = manual;
      reportPages.push({
        page: pageNumber,
        fieldCount: manual.length,
        detectedCount: result.fieldCount,
        source: 'manual_hand_tuned',
      });
      totalFields += manual.length;
      if (!manual.length) emptyPages += 1;
      continue;
    }

    overrides[pageNumber] = result.slots;
    reportPages.push({
      page: pageNumber,
      fieldCount: result.fieldCount,
      source: result.reason,
    });
    totalFields += result.fieldCount;
    if (result.fieldCount === 0) emptyPages += 1;
  }

  return {
    albumId: spec.albumId,
    pageCount: files.length,
    emptyPages,
    totalFields,
    overrides,
    pages: reportPages,
  };
}

async function main() {
  const projectRoot = process.cwd();
  const onlyAlbum = process.env.ONLY_ALBUM;
  const manualOverrides = loadManualOverrides(projectRoot);
  const allOverrides = {};
  const report = {
    generatedAt: new Date().toISOString(),
    albums: [],
  };

  for (const spec of ALBUM_SPECS) {
    if (onlyAlbum && onlyAlbum !== spec.albumId) continue;
    console.log(`\nAnalyzing ${spec.albumId}...`);
    const albumReport = await analyzeAlbum(projectRoot, spec, manualOverrides);
    if (!albumReport) continue;

    allOverrides[spec.albumId] = albumReport.overrides;
    report.albums.push({
      albumId: spec.albumId,
      pageCount: albumReport.pageCount,
      emptyPages: albumReport.emptyPages,
      totalFields: albumReport.totalFields,
      pagesWithFields: albumReport.pageCount - albumReport.emptyPages,
      pages: albumReport.pages,
    });

    const withFields = albumReport.pages.filter((p) => p.fieldCount > 0);
    console.log(
      `  Pages: ${albumReport.pageCount}, empty: ${albumReport.emptyPages}, total fields: ${albumReport.totalFields}`
    );
    console.log(
      '  Field counts sample:',
      withFields
        .slice(0, 8)
        .map((p) => `${p.page}:${p.fieldCount}`)
        .join(', '),
      withFields.length > 8 ? '...' : ''
    );
  }

  const existingOverrides = loadManualOverrides(projectRoot);
  const mergedOverrides = onlyAlbum ? { ...existingOverrides, ...allOverrides } : allOverrides;

  const overridesPath = path.join(projectRoot, 'constants', 'line-slots-overrides.json');
  fs.writeFileSync(overridesPath, JSON.stringify(mergedOverrides, null, 2) + '\n', 'utf8');

  const reportPath = path.join(projectRoot, 'scripts', 'deep-field-analysis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`\n✅ Wrote ${path.relative(projectRoot, overridesPath)}`);
  console.log(`✅ Wrote ${path.relative(projectRoot, reportPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
