/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { applyBirthday48LineSlots } = require('./birthday-48-line-slot-overrides');
const { PNG } = require('pngjs');

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
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

function detectHorizontalLines(png, options) {
  const width = png.width;
  const height = png.height;
  const data = png.data;

  const xStart = Math.floor(width * options.sampleXStartRatio);
  const xEnd = Math.floor(width * options.sampleXEndRatio);

  const rowScore = new Array(height).fill(0);

  for (let y = 0; y < height; y += 1) {
    let darkCount = 0;
    let total = 0;
    for (let x = xStart; x < xEnd; x += 1) {
      const idx = (width * y + x) << 2;
      const a = data[idx + 3];
      if (a < 10) continue;
      total += 1;
      const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
      if (lum < options.luminanceThreshold) darkCount += 1;
    }
    rowScore[y] = total > 0 ? darkCount / total : 0;
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
    const thickness = end - start + 1;
    if (thickness > options.maxLineThicknessPx) continue;
    lines.push(Math.round((start + end) / 2));
  }

  lines.sort((a, b) => a - b);
  const deduped = [];
  for (const y of lines) {
    const prev = deduped[deduped.length - 1];
    if (prev === undefined || Math.abs(y - prev) >= options.minLineGapPx) deduped.push(y);
  }

  return deduped.filter((y) => y >= options.topCutPx && y <= height - options.bottomCutPx);
}

function mergeLineCentersY(centers, minGapPx) {
  const sorted = [...centers].sort((a, b) => a - b);
  const deduped = [];
  for (const y of sorted) {
    const prev = deduped[deduped.length - 1];
    if (prev === undefined || Math.abs(y - prev) >= minGapPx) deduped.push(y);
  }
  return deduped;
}

/** Дополнительный проход: длинные горизонтальные штрихи (короткие подчёркивания справа от подписи). */
function detectLongRunLines(png, options) {
  const width = png.width;
  const height = png.height;
  const data = png.data;
  const xStart = Math.floor(width * options.sampleXStartRatio);
  const xEnd = Math.floor(width * options.sampleXEndRatio);
  const band = xEnd - xStart;
  const minRunPx = Math.floor(band * (options.minRunWidthRatio ?? 0.12));
  const threshold = options.luminanceThreshold;
  const hits = [];

  for (let y = options.topCutPx; y <= height - options.bottomCutPx; y += 1) {
    let run = 0;
    let maxRun = 0;
    for (let x = xStart; x < xEnd; x += 1) {
      const idx = (width * y + x) << 2;
      if (isInkPixel(data, idx, threshold)) {
        run += 1;
        maxRun = Math.max(maxRun, run);
      } else {
        run = 0;
      }
    }
    if (maxRun >= minRunPx) hits.push(y);
  }

  return mergeLineCentersY(hits, options.minLineGapPx);
}

function getMinLineGapPx(png, options) {
  const fromNorm = Math.floor(png.height * (options.minLineGapNorm ?? 0.02));
  return Math.max(options.minLineGapPx ?? 10, fromNorm);
}

function measureMaxUnderlineRunPx(png, centerY, options) {
  const width = png.width;
  const data = png.data;
  const y0 = clamp(centerY, 0, png.height - 1);
  const xStart = Math.floor(width * options.sampleXStartRatio);
  const xEnd = Math.floor(width * options.sampleXEndRatio);
  const threshold = options.luminanceThreshold;
  let run = 0;
  let maxRun = 0;
  for (let x = xStart; x < xEnd; x += 1) {
    const idx = (width * y0 + x) << 2;
    if (isInkPixel(data, idx, threshold)) {
      run += 1;
      maxRun = Math.max(maxRun, run);
    } else {
      run = 0;
    }
  }
  return maxRun;
}

function refineDetectedLines(png, linesPx, options) {
  const minGapPx = getMinLineGapPx(png, options);
  let lines = mergeLineCentersY(linesPx, minGapPx);

  const minRunPx = Math.floor(
    png.width * (options.minUnderlineRunRatio ?? 0.14) * (options.sampleXEndRatio - options.sampleXStartRatio)
  );
  lines = lines.filter((y) => measureMaxUnderlineRunPx(png, y, options) >= minRunPx);

  const maxLines = options.maxLinesPerPage ?? 24;
  if (lines.length > maxLines) {
    const scored = lines.map((y) => ({
      y,
      score: measureMaxUnderlineRunPx(png, y, options),
    }));
    scored.sort((a, b) => b.score - a.score);
    lines = scored
      .slice(0, maxLines)
      .map((s) => s.y)
      .sort((a, b) => a - b);
  }

  return lines;
}

function detectAllHorizontalLines(png, options) {
  const minGapPx = getMinLineGapPx(png, options);
  const primary = detectHorizontalLines(png, options);
  const sensitive = detectHorizontalLines(png, {
    ...options,
    luminanceThreshold: options.sensitiveLuminanceThreshold ?? 248,
    rowCoverageThreshold: options.sensitiveRowCoverageThreshold ?? 0.035,
  });
  const longRun = detectLongRunLines(png, { ...options, minLineGapPx: minGapPx });
  const merged = mergeLineCentersY([...primary, ...sensitive, ...longRun], minGapPx);
  return merged.filter((y) => y >= options.topCutPx && y <= png.height - options.bottomCutPx);
}

function isDecorativeTopLine(png, centerY, options) {
  const normY = centerY / png.height;
  if (normY > 0.26) return false;
  const { left, right } = measureLineExtents(png, centerY, options);
  const span = (right - left) / png.width;
  return span > 0.7;
}

function measureLineExtents(png, centerY, options) {
  const width = png.width;
  const data = png.data;
  const y0 = clamp(centerY, 0, png.height - 1);
  let left = width;
  let right = 0;

  for (let x = 0; x < width; x += 1) {
    const idx = (width * y0 + x) << 2;
    const a = data[idx + 3];
    if (a < 10) continue;
    const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
    if (lum < options.luminanceThreshold) {
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }

  if (right <= left) {
    const fallbackX = Math.floor(width * options.sampleXStartRatio);
    const fallbackW = Math.floor(width * (options.sampleXEndRatio - options.sampleXStartRatio));
    return { left: fallbackX, right: fallbackX + fallbackW };
  }

  const pad = Math.max(4, Math.floor(width * 0.01));
  return {
    left: clamp(left - pad, 0, width - 1),
    right: clamp(right + pad, 0, width - 1),
  };
}

function isInkPixel(data, idx, threshold) {
  const a = data[idx + 3];
  if (a < 10) return false;
  return getLuminance(data[idx], data[idx + 1], data[idx + 2]) < threshold;
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
    const isDark = isInkPixel(data, idx, threshold);

    if (isDark && !inRun) {
      inRun = true;
      runStart = x;
    } else if (!isDark && inRun) {
      runs.push([runStart, x - 1]);
      inRun = false;
    }
  }
  if (inRun) runs.push([runStart, xEnd - 1]);

  return runs;
}

/** Сканирует строки только ВЫШЕ линии — на самой линии подпись и штрих сливаются в один run */
function findLabelRunsNearLine(png, centerY, options) {
  const labelThreshold = options.labelLuminanceThreshold ?? 210;
  const offsets = [-18, -14, -11, -8, -5];
  const merged = new Map();

  for (const off of offsets) {
    const y = clamp(centerY + off, 0, png.height - 1);
    const runs = findInkRunsOnRow(png, y, options, labelThreshold);
    for (const [start, end] of runs) {
      const key = `${start}-${end}`;
      merged.set(key, [start, end]);
    }
  }

  return Array.from(merged.values()).sort((a, b) => a[0] - b[0]);
}

function measureLabelEndPx(png, centerY, options) {
  const width = png.width;
  const threshold = options.labelLuminanceThreshold ?? 210;
  const yTop = clamp(centerY - 20, 0, png.height - 1);
  const yBottom = clamp(centerY + 1, 0, png.height - 1);
  const xStart = Math.floor(width * 0.08);
  const xEnd = Math.floor(width * 0.62);
  let labelEnd = 0;
  let lineStart = width;

  for (let x = xStart; x < xEnd; x += 1) {
    let textHits = 0;
    let lineHits = 0;
    for (let y = yTop; y <= yBottom; y += 1) {
      const idx = (width * y + x) << 2;
      if (!isInkPixel(png.data, idx, threshold)) continue;
      if (y >= centerY - 1) lineHits += 1;
      else textHits += 1;
    }
    if (textHits >= 1 || lineHits >= 1) {
      if (lineHits >= 1 && lineStart === width) lineStart = x;
      if (textHits >= 1) labelEnd = x;
    }
  }

  if (labelEnd >= Math.floor(width * 0.12) && lineStart < width && labelEnd < lineStart + width * 0.05) {
    return 0;
  }

  return labelEnd;
}

function resolveWritableBand(png, centerY, options, defaultMargins) {
  const width = png.width;
  const { right: lineRight } = measureLineExtents(png, centerY, options);
  const labelRuns = findLabelRunsNearLine(png, centerY, options);
  const pad = Math.max(8, Math.floor(width * 0.014));
  const minLabelWidth = Math.floor(width * 0.035);
  const labelZoneMaxX = Math.floor(width * 0.55);

  let textStartPx = Math.floor(width * defaultMargins.x);
  let textEndPx = lineRight;
  let hasLabel = false;

  const labelEndPx = measureLabelEndPx(png, centerY, options);
  if (labelEndPx >= Math.floor(width * 0.12)) {
    hasLabel = true;
    textStartPx = labelEndPx + pad;
    textEndPx = lineRight;
  }

  const labelCandidates = labelRuns.filter(([start, end]) => {
    const runWidth = (end - start + 1) / width;
    return (
      start <= width * 0.24 &&
      end < width * 0.62 &&
      runWidth < 0.45 &&
      end - start + 1 >= minLabelWidth
    );
  });

  if (!hasLabel && labelCandidates.length > 0) {
    const best = labelCandidates.sort((a, b) => b[1] - b[0] - (a[1] - a[0]))[0];
    hasLabel = true;
    textStartPx = best[1] + pad;
    textEndPx = lineRight;
  } else if (!hasLabel && labelRuns.length > 0) {
    const first = labelRuns[0];
    if (first[0] < labelZoneMaxX && first[1] - first[0] + 1 >= minLabelWidth * 0.5) {
      hasLabel = true;
      textStartPx = first[1] + pad;
      textEndPx = lineRight;
    }
  }

  let wPx = textEndPx - textStartPx;
  if (wPx < width * 0.08) {
    textStartPx = Math.floor(width * defaultMargins.x);
    wPx = Math.floor(width * defaultMargins.width);
    hasLabel = false;
  }

  return {
    xPx: clamp(textStartPx, 0, width - 2),
    wPx: clamp(wPx, Math.floor(width * 0.08), width - textStartPx),
    hasLabel,
  };
}

function isContinuationSlot(prev, curr) {
  if (!prev || curr.hasLabel) return false;
  if (Math.abs(curr.y - prev.y) < 0.003) return false;

  const yGap = curr.y - prev.y;
  if (yGap <= 0 || yGap > 0.08) return false;

  if (prev.hasLabel) {
    if (curr.x > 0.52 && curr.width < 0.5) return false;
    if (curr.x > prev.x + prev.width * 0.25) return false;
    return true;
  }

  const xSimilar = Math.abs(prev.x - curr.x) < 0.06;
  return xSimilar && prev.width > 0.35 && curr.width > 0.35;
}

function assignContinuationGroups(slots) {
  let groupId = 0;

  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i];
    const prev = i > 0 ? slots[i - 1] : null;

    if (slot.hasLabel || !isContinuationSlot(prev, slot)) {
      groupId += 1;
    }
    slot.continuationGroup = groupId;
  }

  return slots;
}

function buildSlotsForPage(png, lineCentersPx, options, defaultMargins) {
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

    bandPx = clamp(bandPx, 10, Math.min(220, height * 0.12));

    const { xPx, wPx, hasLabel } = resolveWritableBand(png, centerY, options, defaultMargins);

    slots.push({
      x: formatFloat(clamp(xPx / width, 0, 1)),
      y: formatFloat(clamp(centerY / height, 0, 1)),
      width: formatFloat(clamp(wPx / width, 0.05, 1)),
      height: formatFloat(clamp(bandPx / height, 0.01, 0.2)),
      hasLabel,
    });
  }

  assignContinuationGroups(slots);

  return slots;
}

function formatFloat(n) {
  return Number(n.toFixed(5));
}

const {
  extractAllSlotsFromPdf,
  extractSlotsForPdfPage,
  loadPdfDocument,
} = require('./pdf-line-extractor');

/** Базовые PDF-параметры как у альбомов беременности (точные подписи, без геометрии). */
const PREGNANCY_PDF_BASE = {
  inferLabelFromGeometry: false,
  pdfMinSpanPt: 4,
  pdfMaxSpanRatio: 0.92,
  pdfMinNormY: 0.03,
  pdfMaxNormY: 0.96,
  pdfBottomCutPt: 55,
  pdfTopCutPt: 40,
  pdfFormStartNormY: 0.12,
  pdfTextPadPt: 3,
};

/** Для макетов с пунктирными линиями и формами — склейка + фильтрация как у беременности. */
const DASHED_FORM_PDF = {
  ...PREGNANCY_PDF_BASE,
  mergeDashedRows: true,
  minSegmentSpanPt: 1.5,
  mergeGapPt: 8,
  minUnderlineRunRatio: 0.08,
  pdfMaxSpanRatio: 0.85,
  pdfBottomCutPt: 28,
  pdfTopCutPt: 28,
  pdfFormStartNormY: 0.05,
  extractFlatCurves: true,
  formLineRefine: true,
  formMinScore: 0.2,
  formYClusterEpsilon: 0.014,
  collapseNearbyRows: true,
  minRowGapNorm: 0.018,
};

/** Исходные PDF-макеты (векторные линии точнее PNG-скана). */
const PDF_SOURCES = {
  pregnancy_60: path.join('in albums', 'Блок БЕРЕМЕННОСТЬ 60 стр.pdf'),
  pregnancy_a5: path.join('in albums', 'Блок БЕРЕМЕННОСТЬ A5 другой блок.pdf'),
  kids_48: path.join('in albums', 'Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр.pdf'),
  holidays_birthday_60: path.join('in albums', 'Блок ДНЕЙ РОЖДЕНИЯ готов.pdf'),
  diary_interior_brown: path.join('in albums', '09.06.26_Блок коричневый _180х240_print.pdf'),
  diary_interior_purple: path.join('in albums', '09.06.26_Блок фиолетовый_180х240_print.pdf'),
};

/** Поштучные PDF-макеты (предпочтительный источник для дневников). */
const PER_PAGE_PDF_FOLDERS = {
  diary_interior_brown: 'ЛД 180х240',
  diary_interior_purple: 'ЛД А5',
};

function normalizeFileName(name) {
  return name.normalize('NFC');
}

function findPerPagePdfFolder(projectRoot, folderName) {
  const inAlbums = path.join(projectRoot, 'in albums');
  if (!fs.existsSync(inAlbums)) return null;
  const target = normalizeFileName(folderName).toLowerCase();
  for (const entry of fs.readdirSync(inAlbums)) {
    if (normalizeFileName(entry).toLowerCase() === target) {
      return path.join(inAlbums, entry);
    }
  }
  return null;
}

function listPerPagePdfFiles(folderPath) {
  const pageRe = /(\d+)\s*\.pdf$/i;
  return fs
    .readdirSync(folderPath)
    .filter((fileName) => pageRe.test(normalizeFileName(fileName)))
    .map((fileName) => {
      const pageNumber = Number(normalizeFileName(fileName).match(pageRe)[1]);
      return { pageNumber, filePath: path.join(folderPath, fileName) };
    })
    .sort((a, b) => a.pageNumber - b.pageNumber);
}

function matchesOnlyAlbum(albumId) {
  const only = process.env.ONLY_ALBUM;
  if (!only) return true;
  return only.split(',').map((s) => s.trim()).includes(albumId);
}

const ALBUM_FOLDERS = [
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
      maxLineThicknessPx: 6,
      minLineGapPx: 22,
      minLineGapNorm: 0.02,
      minRunWidthRatio: 0.12,
      minUnderlineRunRatio: 0.14,
      maxLinesPerPage: 40,
      formStartNormY: 0.26,
      topCutPx: 80,
      bottomCutPx: 80,
    },
  },
  {
    albumId: 'pregnancy_a5',
    folder: 'Блок БЕРЕМЕННОСТЬ A5 другой блок',
    margins: { x: 0.1, width: 0.8 },
    pdfOnly: true,
    options: {
      ...PREGNANCY_PDF_BASE,
      inferLabelFromGeometry: false,
      extractFlatCurves: true,
      formLineRefine: true,
      formMinScore: 0.2,
      formYClusterEpsilon: 0.014,
      collapseNearbyRows: true,
      minRowGapNorm: 0.018,
      pdfFormStartNormY: 0.05,
      pdfBottomCutPt: 28,
      pdfTopCutPt: 28,
      pdfMaxSpanRatio: 0.85,
      maxLinesPerPage: 40,
      minUnderlineRunRatio: 0.05,
      sampleXStartRatio: 0.15,
      sampleXEndRatio: 0.95,
      luminanceThreshold: 235,
      labelLuminanceThreshold: 210,
      rowCoverageThreshold: 0.06,
      maxLineThicknessPx: 6,
      minLineGapPx: 18,
      minLineGapNorm: 0.022,
      formStartNormY: 0.05,
      topCutPx: 70,
      bottomCutPx: 70,
    },
  },
  {
    albumId: 'kids_48',
    folder: 'Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр',
    margins: { x: 0.08, width: 0.84 },
    pdfOnly: true,
    options: {
      ...PREGNANCY_PDF_BASE,
      inferLabelFromGeometry: false,
      extractFlatCurves: true,
      formLineRefine: true,
      formMinScore: 0.2,
      formYClusterEpsilon: 0.014,
      collapseNearbyRows: true,
      minRowGapNorm: 0.018,
      pdfFormStartNormY: 0.05,
      pdfBottomCutPt: 28,
      pdfTopCutPt: 28,
      pdfMaxSpanRatio: 0.85,
      maxLinesPerPage: 26,
      sampleXStartRatio: 0.12,
      sampleXEndRatio: 0.92,
      luminanceThreshold: 235,
      labelLuminanceThreshold: 210,
      rowCoverageThreshold: 0.06,
      maxLineThicknessPx: 6,
      minLineGapPx: 18,
      minLineGapNorm: 0.02,
      minRunWidthRatio: 0.12,
      minUnderlineRunRatio: 0.05,
      formStartNormY: 0.05,
      topCutPx: 60,
      bottomCutPx: 60,
    },
  },
  {
    albumId: 'holidays_birthday_60',
    folder: 'Блок ДНЕЙ РОЖДЕНИЯ 60 стр',
    margins: { x: 0.1, width: 0.8 },
    pdfOnly: true,
    options: {
      slotMode: 'whiteBlocks',
      maxBlocksPerPage: 12,
      blockPadPt: 8,
      whiteFillThreshold: 0.97,
      allowCreamFill: true,
      hybridLineFallback: true,
      lineFallbackOptions: {
        minSpanRatio: 0.1,
        minSpanPt: 4,
        maxSpanRatio: 0.85,
        minNormY: 0.03,
        maxNormY: 0.96,
        formStartNormY: 0.05,
        bottomCutPt: 28,
        topCutPt: 28,
        maxLinesPerPage: 10,
        mergeDashedRows: true,
        minSegmentSpanPt: 1.5,
        mergeGapPt: 8,
        extractFlatCurves: true,
        inferLabelFromGeometry: false,
        formLineRefine: true,
        formMinScore: 0.22,
      },
      sampleXStartRatio: 0.15,
      sampleXEndRatio: 0.95,
      formStartNormY: 0.05,
      topCutPx: 80,
      bottomCutPx: 80,
    },
  },
  {
    albumId: 'diary_interior_brown',
    folder: 'Блок коричневый _180х240_print',
    margins: { x: 0.12, width: 0.76 },
    pdfOnly: true,
    options: {
      ...DASHED_FORM_PDF,
      diaryBrownFormMode: true,
      diaryQuestionnairePageNumber: 6,
      brownParentQuestionnaireMinPage: 7,
      brownParentQuestionnaireMaxPage: 56,
      brownCareerAnswerFirstNormY: 0.784,
      brownCareerAnswerSecondNormY: 0.832,
      brownPage6CareerQuestionNormY: 0.773,
      brownCareerAnswerRowGap: 0.048,
      brownCareerAnswerMinNormY: 0.778,
      brownPage6CareerAnswerLineMinNormY: 0.788,
      brownPage6BestFriendMaleNormY: 0.7346,
      brownPage6BestFriendMaleLeftNorm: 0.297,
      brownWishRelaxedColumn: true,
      brownWishPageNumber: 3,
      brownWishFieldMinNormY: 0.772,
      brownWishFieldMaxNormY: 0.935,
      brownWishMaxEndNormY: 0.935,
      brownWideBlockMinNormY: 0.22,
      brownWideBlockMaxNormY: 0.935,
      brownWishContinuationLines: 4,
      brownWishTotalLines: 5,
      inferLabelFromGeometry: true,
      singleRowGroups: false,
      brownGroupRowGapMax: 0.055,
      brownGroupColumnEpsilon: 0.1,
      brownGroupMinLines: 2,
      brownSimpleMaxLines: 10,
      brownFullWidthMaxLines: 10,
      brownBoxMinLeftRatio: 0.05,
      maxLinesPerPage: 40,
      minUnderlineRunRatio: 0.08,
      mergeGapPt: 6,
      minSegmentSpanPt: 1.2,
      brownInputMinSpanRatio: 0.35,
      brownInputMinSpanFallback: 0.14,
      brownInputMinRightRatio: 0.85,
      brownInputMinRightShort: 0.45,
      brownInputMinGapRatio: 0.018,
      brownRowMergeGapNorm: 0.016,
      brownMinRowGapNorm: 0.018,
      brownFormEndNormY: 0.88,
      brownQuestionnaireStartNormY: 0.14,
      brownQuestionnaireEndNormY: 0.94,
      brownBoxMinSpanRatio: 0.18,
      brownBoxMaxSpanRatio: 0.52,
      brownBoxMaxLeftRatio: 0.28,
      brownBoxColumnSplitRatio: 0.5,
      brownCoverGapRatio: 0.055,
      brownSolidMinLeftRatio: 0.28,
      brownShortFullMinLeftRatio: 0.05,
      brownDashClusterGapRatio: 0.032,
      brownGapMaxPreRightRatio: 0.78,
      brownInferLabelMaxLeftRatio: 0.58,
      brownInferLabelMaxSpanRatio: 0.78,
      brownInlineLabelMaxLeftRatio: 0.16,
      brownInlineLabelMaxSpanRatio: 0.48,
      brownMicroRowMinTailSpan: 0.04,
      brownMicroRowMaxTailSpan: 0.32,
    },
  },
  {
    albumId: 'diary_interior_purple',
    folder: 'Блок фиолетовый_180х240_print',
    margins: { x: 0.12, width: 0.76 },
    pdfOnly: true,
    options: {
      ...DASHED_FORM_PDF,
      diaryBrownFormMode: true,
      diaryQuestionnairePageNumber: 5,
      diaryQuestionnairePageNumbers: [5, 6, 7],
      diaryCareerQuestionPageNumber: 5,
      brownWishPageNumber: 5,
      inferLabelFromGeometry: true,
      brownSingleLineGroups: false,
      brownWishRelaxedColumn: true,
      brownWishMinJoinNormY: 0.69,
      brownWishFieldMinNormY: 0.772,
      brownWishFieldMaxNormY: 0.935,
      brownWishMaxEndNormY: 0.935,
      brownWideBlockMinNormY: 0.22,
      brownWideBlockMaxNormY: 0.935,
      brownWishContinuationLines: 4,
      brownWishTotalLines: 5,
      brownParentQuestionnaireMinPage: 8,
      brownParentQuestionnaireMaxPage: 39,
      singleRowGroups: false,
      brownGroupRowGapMax: 0.055,
      brownGroupColumnEpsilon: 0.1,
      brownGroupMinLines: 2,
      brownSimpleMaxLines: 10,
      brownFullWidthMaxLines: 10,
      brownBoxMinLeftRatio: 0.05,
      maxLinesPerPage: 40,
      minUnderlineRunRatio: 0.08,
      mergeGapPt: 6,
      minSegmentSpanPt: 1.2,
      brownInputMinSpanRatio: 0.35,
      brownInputMinSpanFallback: 0.14,
      brownInputMinRightRatio: 0.85,
      brownInputMinRightShort: 0.45,
      brownInputMinGapRatio: 0.018,
      brownRowMergeGapNorm: 0.016,
      brownMinRowGapNorm: 0.018,
      brownFormEndNormY: 0.88,
      brownQuestionnaireStartNormY: 0.14,
      brownQuestionnaireEndNormY: 0.94,
      brownBoxMinSpanRatio: 0.18,
      brownBoxMaxSpanRatio: 0.52,
      brownBoxMaxLeftRatio: 0.28,
      brownBoxColumnSplitRatio: 0.5,
      brownCoverGapRatio: 0.055,
      brownCoverMinNormY: 0.48,
      brownCoverMaxNormY: 0.72,
      brownCoverMinLeftRatio: 0.14,
      brownCoverMaxLeftRatio: 0.55,
      brownCoverMinSpanRatio: 0.22,
      brownCoverMaxSpanRatio: 0.78,
      brownCoverRowGap: 0.055,
      brownInferLabelMaxLeftRatio: 0.58,
      brownInferLabelMaxSpanRatio: 0.78,
      brownInlineLabelMaxLeftRatio: 0.16,
      brownInlineLabelMaxSpanRatio: 0.48,
      brownGapMaxPreRightRatio: 0.78,
      brownSolidMinLeftRatio: 0.28,
      brownShortFullMinLeftRatio: 0.05,
      brownDashClusterGapRatio: 0.032,
      brownMicroRowMinTailSpan: 0.04,
      brownMicroRowMaxTailSpan: 0.32,
      brownCareerAnswerMinWidth: 0.35,
      brownPage6CareerQuestionNormY: 0.747,
      brownPage6CareerAnswerLineMinNormY: 0.818,
      brownCareerAnswerMinNormY: 0.828,
      brownCareerAnswerFirstNormY: 0.828,
      purpleDaySpreadTopLines: 3,
      brownDaySpreadRowGap: 0.044,
    },
  },
];

function loadOverrides(projectRoot, fileName = 'line-slots-overrides.json') {
  const file = path.join(projectRoot, 'constants', fileName);
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.warn(`Invalid ${fileName}`, e.message);
    return {};
  }
}

function pickPageSlots(pdfSlots, pngOverrideSlots, options = {}) {
  const pdf = pdfSlots ?? [];
  const png = pngOverrideSlots ?? [];

  if (options.preferPngOverrides && png.length > 0) return png;
  if (pdf.length === 0) return png;
  if (png.length === 0) return pdf;

  const avgWidth = (slots) =>
    slots.reduce((sum, slot) => sum + slot.width, 0) / slots.length;
  const pdfAvg = avgWidth(pdf);
  const pngAvg = avgWidth(png);

  if (pngAvg > 0.12 && pdfAvg < pngAvg * 0.55) return png;
  if (pdf.length > png.length * 2) return png;
  if (png.length > pdf.length * 2) return png;
  if (png.length > pdf.length && pdf.length <= 2) return png;
  return pdf;
}

async function generateForAlbumFromPdf(projectRoot, spec, overrides, pdfPath) {
  const manualOverrides = loadOverrides(projectRoot, 'line-slots-manual-overrides.json');
  const albumManualOverrides = manualOverrides[spec.albumId] ?? {};
  const albumPngOverrides = overrides[spec.albumId] ?? {};
  const pdfOptions = {
    ...spec.options,
    lineGuideId: spec.albumId,
    minSpanRatio: spec.options.minUnderlineRunRatio ?? 0.08,
    minSpanPt: spec.options.pdfMinSpanPt ?? 4,
    maxSpanRatio: spec.options.pdfMaxSpanRatio ?? 0.92,
    minNormY: spec.options.pdfMinNormY ?? 0.03,
    maxNormY: spec.options.pdfMaxNormY ?? 0.96,
    bottomCutPt: spec.options.pdfBottomCutPt ?? 55,
    topCutPt: spec.options.pdfTopCutPt ?? 40,
    textPadPt: spec.options.pdfTextPadPt ?? 3,
    formStartNormY: spec.options.pdfFormStartNormY ?? 0.12,
    formLineRefine: spec.options.formLineRefine ?? false,
    inferLabelFromGeometry: spec.options.inferLabelFromGeometry ?? false,
    extractFlatCurves: spec.options.extractFlatCurves ?? false,
    formMinScore: spec.options.formMinScore ?? 0.25,
    formYClusterEpsilon: spec.options.formYClusterEpsilon ?? 0.012,
    mergeDashedRows: spec.options.mergeDashedRows ?? false,
    minSegmentSpanPt: spec.options.minSegmentSpanPt ?? 1.5,
    mergeGapPt: spec.options.mergeGapPt,
    collapseNearbyRows: spec.options.collapseNearbyRows ?? false,
    minRowGapNorm: spec.options.minRowGapNorm ?? 0.016,
    diaryFormMode: spec.options.diaryFormMode ?? false,
    diaryBrownFormMode: spec.options.diaryBrownFormMode ?? false,
    diaryQuestionnairePageNumber: spec.options.diaryQuestionnairePageNumber,
    diaryQuestionnairePageNumbers: spec.options.diaryQuestionnairePageNumbers,
    brownParentQuestionnaireMinPage: spec.options.brownParentQuestionnaireMinPage,
    brownParentQuestionnaireMaxPage: spec.options.brownParentQuestionnaireMaxPage,
    brownWishRelaxedColumn: spec.options.brownWishRelaxedColumn,
    brownWishPageNumber: spec.options.brownWishPageNumber,
    brownWishMinJoinNormY: spec.options.brownWishMinJoinNormY,
    brownWishFieldMinNormY: spec.options.brownWishFieldMinNormY,
    brownWishFieldMaxNormY: spec.options.brownWishFieldMaxNormY,
    brownWishMaxEndNormY: spec.options.brownWishMaxEndNormY,
    brownWideBlockMinNormY: spec.options.brownWideBlockMinNormY,
    brownWideBlockMaxNormY: spec.options.brownWideBlockMaxNormY,
    brownWishContinuationLines: spec.options.brownWishContinuationLines,
    brownWishTotalLines: spec.options.brownWishTotalLines,
    brownCareerAnswerFirstNormY: spec.options.brownCareerAnswerFirstNormY,
    brownPage6CareerQuestionNormY: spec.options.brownPage6CareerQuestionNormY,
    brownCareerAnswerRowGap: spec.options.brownCareerAnswerRowGap,
    brownCareerAnswerSecondNormY: spec.options.brownCareerAnswerSecondNormY,
    brownCareerAnswerMinNormY: spec.options.brownCareerAnswerMinNormY,
    brownPage6BestFriendMaleNormY: spec.options.brownPage6BestFriendMaleNormY,
    brownPage6BestFriendMaleLeftNorm: spec.options.brownPage6BestFriendMaleLeftNorm,
    brownCareerAnswerMinWidth: spec.options.brownCareerAnswerMinWidth,
    brownQuestionnaireStartNormY: spec.options.brownQuestionnaireStartNormY,
    brownQuestionnaireEndNormY: spec.options.brownQuestionnaireEndNormY,
    brownInputMinSpanFallback: spec.options.brownInputMinSpanFallback,
    brownInputMinRightShort: spec.options.brownInputMinRightShort,
    brownInputMinGapRatio: spec.options.brownInputMinGapRatio,
    brownRowMergeGapNorm: spec.options.brownRowMergeGapNorm,
    brownCoverGapRatio: spec.options.brownCoverGapRatio,
    brownSolidMinLeftRatio: spec.options.brownSolidMinLeftRatio,
    brownShortFullMinLeftRatio: spec.options.brownShortFullMinLeftRatio,
    brownDashClusterGapRatio: spec.options.brownDashClusterGapRatio,
    singleRowGroups: spec.options.singleRowGroups ?? false,
    brownSimpleMaxLines: spec.options.brownSimpleMaxLines,
    brownFullWidthMaxLines: spec.options.brownFullWidthMaxLines,
    columnGapRatio: spec.options.columnGapRatio,
    slotMode: spec.options.slotMode,
    maxBlocksPerPage: spec.options.maxBlocksPerPage,
    blockPadPt: spec.options.blockPadPt,
    whiteFillThreshold: spec.options.whiteFillThreshold,
    allowCreamFill: spec.options.allowCreamFill,
    hybridLineFallback: spec.options.hybridLineFallback,
    lineFallbackOptions: spec.options.lineFallbackOptions,
  };

  const pdfSlots = await extractAllSlotsFromPdf(pdfPath, pdfOptions);
  const slotsByPage = {};
  const guidesByPage = {};
  const onlyPage = process.env.ONLY_PAGE;
  const pageNumbers = Object.keys(pdfSlots).filter((pageNumber) => {
    if (!onlyPage) return true;
    const pageIndex = Number(pageNumber);
    const onlyIndex = Number(onlyPage.match(/^page_(\d+)\.png$/i)?.[1] ?? onlyPage);
    return pageIndex === onlyIndex;
  });

  for (const pageNumber of pageNumbers) {
    if (Object.prototype.hasOwnProperty.call(albumManualOverrides, pageNumber)) {
      const overrideSlots = albumManualOverrides[pageNumber];
      slotsByPage[pageNumber] = overrideSlots;
      guidesByPage[pageNumber] = overrideSlots.map((s) => s.y);
      console.log(`[${spec.albumId}] page ${pageNumber}: manual ${overrideSlots.length} slots`);
      continue;
    }

    const pdfPageSlots = pdfSlots[pageNumber] ?? [];
    const usePngFallback = spec.pdfOnly !== true;
    const pngPageOverride = usePngFallback ? albumPngOverrides[pageNumber] : undefined;
    const slots = usePngFallback
      ? pickPageSlots(pdfPageSlots, pngPageOverride, {
          preferPngOverrides: spec.preferPngOverrides === true,
        })
      : pdfPageSlots;
    const source = usePngFallback
      ? pdfPageSlots.length === 0 && (pngPageOverride?.length ?? 0) > 0
        ? 'png-fallback'
        : pdfPageSlots.length > 0 &&
            (pngPageOverride?.length ?? 0) > 0 &&
            pickPageSlots(pdfPageSlots, pngPageOverride) === pngPageOverride
          ? 'png-corrected'
          : 'pdf'
      : 'pdf';

    slotsByPage[pageNumber] = slots;
    guidesByPage[pageNumber] = slots.map((s) => s.y);
    console.log(`[${spec.albumId}] page ${pageNumber}: ${source} ${slots.length} slots`);
  }

  return { slots: slotsByPage, guides: guidesByPage };
}

async function generateForAlbumFromPerPagePdfs(projectRoot, spec, overrides, folderPath) {
  const manualOverrides = loadOverrides(projectRoot, 'line-slots-manual-overrides.json');
  const albumManualOverrides = manualOverrides[spec.albumId] ?? {};
  const albumPngOverrides = overrides[spec.albumId] ?? {};
  const pdfOptions = {
    ...spec.options,
    lineGuideId: spec.albumId,
    minSpanRatio: spec.options.minUnderlineRunRatio ?? 0.08,
    minSpanPt: spec.options.pdfMinSpanPt ?? 4,
    maxSpanRatio: spec.options.pdfMaxSpanRatio ?? 0.92,
    minNormY: spec.options.pdfMinNormY ?? 0.03,
    maxNormY: spec.options.pdfMaxNormY ?? 0.96,
    bottomCutPt: spec.options.pdfBottomCutPt ?? 55,
    topCutPt: spec.options.pdfTopCutPt ?? 40,
    textPadPt: spec.options.pdfTextPadPt ?? 3,
    formStartNormY: spec.options.pdfFormStartNormY ?? 0.12,
    formLineRefine: spec.options.formLineRefine ?? false,
    inferLabelFromGeometry: spec.options.inferLabelFromGeometry ?? false,
    extractFlatCurves: spec.options.extractFlatCurves ?? false,
    formMinScore: spec.options.formMinScore ?? 0.25,
    formYClusterEpsilon: spec.options.formYClusterEpsilon ?? 0.012,
    mergeDashedRows: spec.options.mergeDashedRows ?? false,
    minSegmentSpanPt: spec.options.minSegmentSpanPt ?? 1.5,
    mergeGapPt: spec.options.mergeGapPt,
    collapseNearbyRows: spec.options.collapseNearbyRows ?? false,
    minRowGapNorm: spec.options.minRowGapNorm ?? 0.016,
    diaryFormMode: spec.options.diaryFormMode ?? false,
    diaryBrownFormMode: spec.options.diaryBrownFormMode ?? false,
    diaryQuestionnairePageNumber: spec.options.diaryQuestionnairePageNumber,
    diaryQuestionnairePageNumbers: spec.options.diaryQuestionnairePageNumbers,
    brownParentQuestionnaireMinPage: spec.options.brownParentQuestionnaireMinPage,
    brownParentQuestionnaireMaxPage: spec.options.brownParentQuestionnaireMaxPage,
    brownWishRelaxedColumn: spec.options.brownWishRelaxedColumn,
    brownWishPageNumber: spec.options.brownWishPageNumber,
    brownWishMinJoinNormY: spec.options.brownWishMinJoinNormY,
    brownWishFieldMinNormY: spec.options.brownWishFieldMinNormY,
    brownWishFieldMaxNormY: spec.options.brownWishFieldMaxNormY,
    brownWishMaxEndNormY: spec.options.brownWishMaxEndNormY,
    brownWideBlockMinNormY: spec.options.brownWideBlockMinNormY,
    brownWideBlockMaxNormY: spec.options.brownWideBlockMaxNormY,
    brownWishContinuationLines: spec.options.brownWishContinuationLines,
    brownWishTotalLines: spec.options.brownWishTotalLines,
    brownCareerAnswerFirstNormY: spec.options.brownCareerAnswerFirstNormY,
    brownPage6CareerQuestionNormY: spec.options.brownPage6CareerQuestionNormY,
    brownCareerAnswerRowGap: spec.options.brownCareerAnswerRowGap,
    brownCareerAnswerSecondNormY: spec.options.brownCareerAnswerSecondNormY,
    brownCareerAnswerMinNormY: spec.options.brownCareerAnswerMinNormY,
    brownPage6BestFriendMaleNormY: spec.options.brownPage6BestFriendMaleNormY,
    brownPage6BestFriendMaleLeftNorm: spec.options.brownPage6BestFriendMaleLeftNorm,
    brownCareerAnswerMinWidth: spec.options.brownCareerAnswerMinWidth,
    brownQuestionnaireStartNormY: spec.options.brownQuestionnaireStartNormY,
    brownQuestionnaireEndNormY: spec.options.brownQuestionnaireEndNormY,
    brownInputMinSpanFallback: spec.options.brownInputMinSpanFallback,
    brownInputMinRightShort: spec.options.brownInputMinRightShort,
    brownInputMinGapRatio: spec.options.brownInputMinGapRatio,
    brownRowMergeGapNorm: spec.options.brownRowMergeGapNorm,
    brownCoverGapRatio: spec.options.brownCoverGapRatio,
    brownSolidMinLeftRatio: spec.options.brownSolidMinLeftRatio,
    brownShortFullMinLeftRatio: spec.options.brownShortFullMinLeftRatio,
    brownDashClusterGapRatio: spec.options.brownDashClusterGapRatio,
    singleRowGroups: spec.options.singleRowGroups ?? false,
    brownSimpleMaxLines: spec.options.brownSimpleMaxLines,
    brownFullWidthMaxLines: spec.options.brownFullWidthMaxLines,
    columnGapRatio: spec.options.columnGapRatio,
    slotMode: spec.options.slotMode,
    maxBlocksPerPage: spec.options.maxBlocksPerPage,
    blockPadPt: spec.options.blockPadPt,
    whiteFillThreshold: spec.options.whiteFillThreshold,
    allowCreamFill: spec.options.allowCreamFill,
    hybridLineFallback: spec.options.hybridLineFallback,
    lineFallbackOptions: spec.options.lineFallbackOptions,
  };

  const slotsByPage = {};
  const guidesByPage = {};
  const onlyPage = process.env.ONLY_PAGE;
  const pdfFiles = listPerPagePdfFiles(folderPath);
  const legacyPdfRel = PDF_SOURCES[spec.albumId];
  const legacyPdfPath = legacyPdfRel ? path.join(projectRoot, legacyPdfRel) : null;
  let legacyDoc = null;
  if (legacyPdfPath && fs.existsSync(legacyPdfPath)) {
    legacyDoc = await loadPdfDocument(legacyPdfPath);
  }

  console.log(
    `[${spec.albumId}] using per-page PDF folder:`,
    path.relative(projectRoot, folderPath),
    `(${pdfFiles.length} files)`,
  );

  for (const { pageNumber, filePath } of pdfFiles) {
    const pageKey = String(pageNumber);
    if (onlyPage) {
      const onlyIndex = Number(onlyPage.match(/^page_(\d+)\.png$/i)?.[1] ?? onlyPage);
      if (pageNumber !== onlyIndex) continue;
    }

    if (Object.prototype.hasOwnProperty.call(albumManualOverrides, pageKey)) {
      const overrideSlots = albumManualOverrides[pageKey];
      slotsByPage[pageKey] = overrideSlots;
      guidesByPage[pageKey] = overrideSlots.map((s) => s.y);
      console.log(`[${spec.albumId}] page ${pageKey}: manual ${overrideSlots.length} slots`);
      continue;
    }

    const doc = await loadPdfDocument(filePath);
    let pdfPageSlots = await extractSlotsForPdfPage(doc, 1, {
      ...pdfOptions,
      pageNumber,
    });
    let source = 'per-page-pdf';

    const PNG_FALLBACK_THRESHOLD = 3;
    if (pdfPageSlots.length < PNG_FALLBACK_THRESHOLD) {
      const pngPath = path.join(
        projectRoot,
        'albums',
        'diary',
        'cover',
        'in album',
        spec.folder,
        `page_${String(pageNumber).padStart(3, '0')}.png`,
      );
      if (fs.existsSync(pngPath)) {
        const png = await readPng(pngPath);
        const formStartNormY = spec.options.formStartNormY ?? 0;
        const linesPx = refineDetectedLines(
          png,
          detectAllHorizontalLines(png, spec.options)
            .filter((y) => !isDecorativeTopLine(png, y, spec.options))
            .filter((y) => y / png.height >= formStartNormY),
          spec.options,
        );
        const pngSlots = buildSlotsForPage(png, linesPx, spec.options, spec.margins);
        if (pngSlots.length > pdfPageSlots.length) {
          pdfPageSlots = pngSlots;
          source = 'per-page-png-fallback';
        }
      }
    }

    const MIN_SLOTS_BEFORE_LEGACY = 3;
    if (pdfPageSlots.length < MIN_SLOTS_BEFORE_LEGACY && legacyDoc) {
      const legacySlots = await extractSlotsForPdfPage(legacyDoc, pageNumber, {
        ...pdfOptions,
        pageNumber,
      });
      if (legacySlots.length > pdfPageSlots.length) {
        pdfPageSlots = legacySlots;
        source = 'legacy-block-pdf-fallback';
      }
    }

    const usePngFallback = spec.pdfOnly !== true;
    const pngPageOverride = usePngFallback ? albumPngOverrides[pageKey] : undefined;
    const slots = usePngFallback
      ? pickPageSlots(pdfPageSlots, pngPageOverride, {
          preferPngOverrides: spec.preferPngOverrides === true,
        })
      : pdfPageSlots;

    slotsByPage[pageKey] = slots;
    guidesByPage[pageKey] = slots.map((s) => s.y);
    console.log(`[${spec.albumId}] page ${pageKey}: ${source} ${slots.length} slots`);
  }

  return { slots: slotsByPage, guides: guidesByPage };
}

async function generateForAlbumFromPng(projectRoot, spec, overrides) {
  const folderPath = path.join(projectRoot, 'assets', 'pdfs', spec.folder);
  if (!fs.existsSync(folderPath)) {
    console.warn(`Skip ${spec.albumId}: folder not found`, folderPath);
    return null;
  }

  const files = fs
    .readdirSync(folderPath)
    .filter((f) => /^page_\d+\.png$/i.test(f))
    .sort();

  if (files.length === 0) return null;

  if (!matchesOnlyAlbum(spec.albumId)) return null;

  const albumOverrides = overrides[spec.albumId] ?? {};
  const slotsByPage = {};
  const guidesByPage = {};
  const onlyPage = process.env.ONLY_PAGE;
  const targetFiles = onlyPage ? files.filter((f) => f === onlyPage) : files;

  for (const fileName of targetFiles) {
    const pageNumber = String(Number(fileName.match(/^page_(\d+)\.png$/i)[1]));
    if (Object.prototype.hasOwnProperty.call(albumOverrides, pageNumber)) {
      const overrideSlots = albumOverrides[pageNumber];
      slotsByPage[pageNumber] = overrideSlots;
      guidesByPage[pageNumber] = overrideSlots.map((s) => s.y);
      console.log(`[${spec.albumId}] ${fileName}: override ${overrideSlots.length} slots`);
      continue;
    }

    const filePath = path.join(folderPath, fileName);
    const png = await readPng(filePath);
    const formStartNormY = spec.options.formStartNormY ?? 0;
    const linesPx = refineDetectedLines(
      png,
      detectAllHorizontalLines(png, spec.options)
        .filter((y) => !isDecorativeTopLine(png, y, spec.options))
        .filter((y) => y / png.height >= formStartNormY),
      spec.options
    );
    const slots = buildSlotsForPage(png, linesPx, spec.options, spec.margins);
    slotsByPage[pageNumber] = slots;
    guidesByPage[pageNumber] = slots.map((s) => s.y);
    console.log(`[${spec.albumId}] ${fileName}: png ${slots.length} slots`);
  }

  return { slots: slotsByPage, guides: guidesByPage };
}

async function generateForAlbum(projectRoot, spec, overrides) {
  if (!matchesOnlyAlbum(spec.albumId)) return null;

  const perPageFolderName = PER_PAGE_PDF_FOLDERS[spec.albumId];
  const perPageFolderPath = perPageFolderName
    ? findPerPagePdfFolder(projectRoot, perPageFolderName)
    : null;
  const usePerPagePdf =
    perPageFolderPath &&
    fs.existsSync(perPageFolderPath) &&
    process.env.USE_PNG_SLOTS !== '1' &&
    process.env.USE_LEGACY_DIARY_PDF !== '1';

  if (usePerPagePdf) {
    return generateForAlbumFromPerPagePdfs(projectRoot, spec, overrides, perPageFolderPath);
  }

  const pdfRel = PDF_SOURCES[spec.albumId];
  const pdfPath = pdfRel ? path.join(projectRoot, pdfRel) : null;
  const usePdf = pdfPath && fs.existsSync(pdfPath) && process.env.USE_PNG_SLOTS !== '1';

  if (usePdf) {
    console.log(`[${spec.albumId}] using PDF source:`, path.relative(projectRoot, pdfPath));
    return generateForAlbumFromPdf(projectRoot, spec, overrides, pdfPath);
  }

  return generateForAlbumFromPng(projectRoot, spec, overrides);
}

async function main() {
  const projectRoot = process.cwd();
  const overrides = loadOverrides(projectRoot);
  const lineSlots = {};
  const lineGuides = {};
  const report = { generatedAt: new Date().toISOString(), albums: {} };
  const slotsJsonPath = path.join(projectRoot, 'constants', 'line-slots.json');
  const guidesJsonPath = path.join(projectRoot, 'constants', 'line-guides.json');

  if (process.env.ONLY_ALBUM) {
    for (const [file, target] of [
      [slotsJsonPath, lineSlots],
      [guidesJsonPath, lineGuides],
    ]) {
      if (!fs.existsSync(file)) {
        console.warn(
          `ONLY_ALBUM=${process.env.ONLY_ALBUM}: нет ${path.basename(file)} — остальные альбомы будут удалены из выхода. Сначала запустите полный generate:line-slots.`
        );
        continue;
      }
      try {
        Object.assign(target, JSON.parse(fs.readFileSync(file, 'utf8')));
      } catch (e) {
        console.warn(`Could not merge ${path.basename(file)}`, e.message);
      }
    }
  }

  for (const spec of ALBUM_FOLDERS) {
    if (!matchesOnlyAlbum(spec.albumId)) continue;
    const result = await generateForAlbum(projectRoot, spec, overrides);
    if (!result) continue;

    let albumSlots = result.slots;
    let albumGuides = result.guides;
    if (spec.albumId === 'holidays_birthday_60') {
      const trimmed = applyBirthday48LineSlots(albumSlots, albumGuides);
      albumSlots = trimmed.slots;
      albumGuides = trimmed.guides;
      console.log(`[${spec.albumId}] applied 48-page TZ slot overrides`);
    }

    if (process.env.ONLY_PAGE && lineSlots[spec.albumId]) {
      lineSlots[spec.albumId] = { ...lineSlots[spec.albumId], ...albumSlots };
      lineGuides[spec.albumId] = { ...lineGuides[spec.albumId], ...albumGuides };
    } else {
      lineSlots[spec.albumId] = albumSlots;
      lineGuides[spec.albumId] = albumGuides;
    }

    const pages = Object.keys(albumSlots);
    const empty = pages.filter((p) => !albumSlots[p]?.length);
    const totalSlots = pages.reduce((sum, p) => sum + (albumSlots[p]?.length ?? 0), 0);
    report.albums[spec.albumId] = {
      pageCount: pages.length,
      totalSlots,
      emptyPages: empty,
      emptyCount: empty.length,
      slotsPerPage: Object.fromEntries(
        pages.map((p) => [p, albumSlots[p]?.length ?? 0])
      ),
    };
  }

  const slotsFile = path.join(projectRoot, 'constants', 'line-slots.ts');
  const guidesFile = path.join(projectRoot, 'constants', 'line-guides.ts');
  const reportFile = path.join(projectRoot, 'scripts', 'line-slots-report.json');

  fs.writeFileSync(
    slotsFile,
    `// Auto-generated by scripts/generate-line-slots.js\n// Do not edit manually.\n\n` +
      `export type NormalizedLineSlot = {\n` +
      `  x: number;\n` +
      `  y: number;\n` +
      `  width: number;\n` +
      `  height: number;\n` +
      `  hasLabel: boolean;\n` +
      `  continuationGroup: number;\n` +
      `  inputKind?: 'line' | 'block';\n` +
      `};\n\n` +
      `export const LINE_SLOTS = ${JSON.stringify(lineSlots, null, 2)} as const;\n`,
    'utf8'
  );

  fs.writeFileSync(
    guidesFile,
    `// Auto-generated by scripts/generate-line-slots.js\n// Do not edit manually.\n\n` +
      `export const LINE_GUIDES = ${JSON.stringify(lineGuides, null, 2)} as const;\n`,
    'utf8'
  );

  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');

  const jsonFile = path.join(projectRoot, 'constants', 'line-slots.json');
  fs.writeFileSync(jsonFile, JSON.stringify(lineSlots, null, 2), 'utf8');
  fs.writeFileSync(guidesJsonPath, JSON.stringify(lineGuides, null, 2), 'utf8');

  console.log('✅ Wrote', path.relative(projectRoot, slotsFile));
  console.log('✅ Wrote', path.relative(projectRoot, jsonFile));
  console.log('✅ Wrote', path.relative(projectRoot, guidesJsonPath));
  console.log('✅ Wrote', path.relative(projectRoot, guidesFile));
  console.log('✅ Wrote', path.relative(projectRoot, reportFile));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
