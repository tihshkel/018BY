/* eslint-disable no-console */
const fs = require('fs');

const PATH_OPS = {
  moveTo: 13,
  lineTo: 14,
  curveTo: 15,
  closePath: 18,
  rectangle: 19,
};

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function formatFloat(n) {
  return Number(n.toFixed(5));
}

function isBlockContinuationSlot(prev, curr) {
  if (!prev || curr.hasLabel) return false;
  if (Math.abs(curr.y - prev.y) < 0.003) return false;

  const yGap = curr.y - prev.y;
  if (yGap <= 0 || yGap > 0.12) return false;

  const minWide = 0.38;
  if (prev.width < minWide || curr.width < minWide) return false;

  const overlap =
    Math.max(0, Math.min(prev.x + prev.width, curr.x + curr.width) - Math.max(prev.x, curr.x)) /
    Math.min(prev.width, curr.width);

  return overlap >= 0.5;
}

function isContinuationSlot(prev, curr) {
  if (!prev || curr.hasLabel) return false;
  if (Math.abs(curr.y - prev.y) < 0.003) return false;

  if (prev.inputKind === 'block' || curr.inputKind === 'block') {
    return isBlockContinuationSlot(prev, curr);
  }

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

function isNewLabelledBlockField(prev, curr) {
  if (!prev || !curr) return false;
  if (!isBlockContinuationSlot(prev, curr)) return false;

  const prevIsFullWidth = prev.width >= 0.72 && prev.x < 0.35;
  const currIsFieldStart = curr.width >= 0.55 && curr.width < 0.82 && curr.x >= 0.12;

  return prevIsFullWidth && currIsFieldStart;
}

function assignBlockFieldGroups(slots) {
  let groupId = 0;

  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i];
    const prev = i > 0 ? slots[i - 1] : null;

    if (!prev || slot.hasLabel || !isBlockContinuationSlot(prev, slot) || isNewLabelledBlockField(prev, slot)) {
      groupId += 1;
    }

    slot.continuationGroup = groupId;
  }

  return slots;
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

function multiplyMatrix(a, b) {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function transformPoint(ctm, x, y) {
  return [ctm[0] * x + ctm[2] * y + ctm[4], ctm[1] * x + ctm[3] * y + ctm[5]];
}

function parseConstructPath(pathOps, coords, ctm, segments, options = {}) {
  const extractFlatCurves = options.extractFlatCurves === true;
  const maxCurveFlatDeltaPt = options.maxCurveFlatDeltaPt ?? 0.8;
  let i = 0;
  let cx = 0;
  let cy = 0;

  for (const op of pathOps) {
    if (op === PATH_OPS.moveTo) {
      cx = coords[i];
      cy = coords[i + 1];
      i += 2;
    } else if (op === PATH_OPS.lineTo) {
      const nx = coords[i];
      const ny = coords[i + 1];
      i += 2;
      const [x1, y1] = transformPoint(ctm, cx, cy);
      const [x2, y2] = transformPoint(ctm, nx, ny);
      segments.push({ x1, y1, x2, y2 });
      cx = nx;
      cy = ny;
    } else if (op === PATH_OPS.curveTo) {
      const x4 = coords[i + 4];
      const y4 = coords[i + 5];
      i += 6;
      if (extractFlatCurves) {
        const [x1, y1] = transformPoint(ctm, cx, cy);
        const [x2, y2] = transformPoint(ctm, x4, y4);
        if (Math.abs(y1 - y2) <= maxCurveFlatDeltaPt) {
          segments.push({ x1, y1, x2, y2 });
        }
      }
      cx = x4;
      cy = y4;
    } else if (op === PATH_OPS.rectangle) {
      const rx = coords[i];
      const ry = coords[i + 1];
      const rw = coords[i + 2];
      const rh = coords[i + 3];
      i += 4;
      const corners = [
        transformPoint(ctm, rx, ry),
        transformPoint(ctm, rx + rw, ry),
        transformPoint(ctm, rx + rw, ry + rh),
        transformPoint(ctm, rx, ry + rh),
      ];
      for (let c = 0; c < 4; c += 1) {
        const [x1, y1] = corners[c];
        const [x2, y2] = corners[(c + 1) % 4];
        segments.push({ x1, y1, x2, y2 });
      }
    } else if (op === PATH_OPS.closePath) {
      // no-op
    }
  }
}

async function collectPathSegments(page, options = {}) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const ops = await page.getOperatorList();
  const fn = pdfjs.OPS;
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack = [];
  const segments = [];

  for (let i = 0; i < ops.fnArray.length; i += 1) {
    const op = ops.fnArray[i];
    const args = ops.argsArray[i];
    if (op === fn.save) stack.push([...ctm]);
    else if (op === fn.restore) ctm = stack.pop() ?? ctm;
    else if (op === fn.transform) ctm = multiplyMatrix(ctm, args);
    else if (op === fn.constructPath) parseConstructPath(args[0], args[1], ctm, segments, options);
  }

  return segments;
}

function horizontalOverlap(a, b) {
  return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
}

/** Прерывистая линия в PDF — много коротких сегментов на одной Y; склеиваем в один span. */
function mergeRowToFullSpan(rowSegments) {
  const left = Math.min(...rowSegments.map((s) => s.left));
  const right = Math.max(...rowSegments.map((s) => s.right));
  const y = rowSegments.reduce((acc, seg) => acc + seg.y, 0) / rowSegments.length;
  return { y, left, right, span: right - left };
}

function dedupeNearbyHorizontalLines(lines, mergeGapPt) {
  const sorted = [...lines].sort((a, b) => b.y - a.y || a.left - b.left);
  const deduped = [];

  for (const line of sorted) {
    const prev = deduped[deduped.length - 1];
    if (prev && Math.abs(prev.y - line.y) <= mergeGapPt) {
      if (line.span > prev.span) {
        deduped[deduped.length - 1] = line;
      }
      continue;
    }
    deduped.push(line);
  }

  return deduped;
}

/** Схлопывает двойные штрихи и «лесенку» Y на одной визуальной строке. */
function collapseNearbyRows(lines, pageHeight, minRowGapNorm = 0.016) {
  const sorted = [...lines].sort((a, b) => b.y - a.y || a.left - b.left);
  const collapsed = [];

  for (const line of sorted) {
    const prev = collapsed[collapsed.length - 1];
    if (prev) {
      const prevNorm = (pageHeight - prev.y) / pageHeight;
      const norm = (pageHeight - line.y) / pageHeight;
      if (Math.abs(prevNorm - norm) < minRowGapNorm) {
        if (line.span > prev.span) {
          collapsed[collapsed.length - 1] = line;
        }
        continue;
      }
    }
    collapsed.push(line);
  }

  return collapsed;
}

/** На одной строке объединяем только сегменты без колоночного разрыва. */
function clusterRowSegments(rowSegments, columnGapPx) {
  const sorted = [...rowSegments].sort((a, b) => a.left - b.left);
  const clusters = [];

  for (const seg of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && seg.left - last.right <= columnGapPx) {
      last.y = (last.y + seg.y) / 2;
      last.right = Math.max(last.right, seg.right);
      last.span = last.right - last.left;
    } else {
      clusters.push({ y: seg.y, left: seg.left, right: seg.right, span: seg.span });
    }
  }

  return clusters;
}

function isPageBorderLine(line, pageWidth, pageHeight, normY) {
  const spanRatio = line.span / pageWidth;
  if (spanRatio > 0.78 && (normY < 0.04 || normY > 0.96)) return true;
  if (normY < 0 || normY > 1) return true;
  if (spanRatio > 0.92) return true;
  if (normY < 0.14 && spanRatio > 0.82) return true;
  if (normY > 0.93 && spanRatio > 0.75) return true;
  return false;
}

function mergeHorizontalLines(segments, pageWidth, pageHeight, options) {
  const mergeDashedRows = options.mergeDashedRows === true;
  const minSpanPx = Math.max(
    pageWidth * (options.minSpanRatio ?? 0.08),
    options.minSpanPt ?? 4
  );
  const minSegmentSpanPt = options.minSegmentSpanPt ?? 1.5;
  const maxSpanPx = pageWidth * (options.maxSpanRatio ?? 0.92);
  const bottomCutPt = options.bottomCutPt ?? 55;
  const topCutPt = options.topCutPt ?? 40;
  const mergeGapPt = options.mergeGapPt ?? (mergeDashedRows ? 6 : 4);
  const maxNormY = options.maxNormY ?? 0.96;
  const minNormY = options.minNormY ?? 0.03;
  const formStartNormY = options.formStartNormY ?? 0;
  const columnGapPx = pageWidth * (options.columnGapRatio ?? 0.035);
  const maxHorizontalDeltaPt = options.maxHorizontalDeltaPt ?? 1.2;

  const candidates = segments
    .filter((s) => Math.abs(s.y1 - s.y2) <= maxHorizontalDeltaPt)
    .map((s) => {
      const left = Math.min(s.x1, s.x2);
      const right = Math.max(s.x1, s.x2);
      const y = (s.y1 + s.y2) / 2;
      return { y, left, right, span: right - left };
    })
    .filter((l) => l.span >= (mergeDashedRows ? minSegmentSpanPt : minSpanPx))
    .filter((l) => l.y >= bottomCutPt && l.y <= pageHeight - topCutPt);

  const rowBins = new Map();
  for (const line of candidates) {
    const normY = (pageHeight - line.y) / pageHeight;
    if (normY > maxNormY || normY < minNormY) continue;
    if (normY < formStartNormY) continue;

    const bin = Math.round(line.y / mergeGapPt);
    if (!rowBins.has(bin)) rowBins.set(bin, []);
    rowBins.get(bin).push(line);
  }

  const lines = [];
  for (const rowSegments of rowBins.values()) {
    if (mergeDashedRows) {
      const merged = mergeRowToFullSpan(rowSegments);
      if (merged.span >= minSpanPx && merged.span <= maxSpanPx) {
        const normY = (pageHeight - merged.y) / pageHeight;
        if (!isPageBorderLine(merged, pageWidth, pageHeight, normY)) {
          lines.push(merged);
        }
      }
    } else {
      for (const clustered of clusterRowSegments(rowSegments, columnGapPx)) {
        const normY = (pageHeight - clustered.y) / pageHeight;
        if (isPageBorderLine(clustered, pageWidth, pageHeight, normY)) continue;
        lines.push(clustered);
      }
    }
  }

  lines.sort((a, b) => b.y - a.y || a.left - b.left);

  let deduped = mergeDashedRows ? dedupeNearbyHorizontalLines(lines, mergeGapPt) : lines;
  deduped = deduped.filter((line, index, arr) => {
    const normY = (pageHeight - line.y) / pageHeight;
    if (isPageBorderLine(line, pageWidth, pageHeight, normY)) return false;
    return !arr.slice(0, index).some(
      (prev) =>
        Math.abs(prev.y - line.y) <= mergeGapPt &&
        horizontalOverlap(prev, line) / Math.min(prev.span, line.span) > 0.45
    );
  });

  const maxLines = options.maxLinesPerPage ?? 40;
  if (deduped.length > maxLines) {
    const scored = deduped.map((l) => ({ ...l, score: l.span }));
    scored.sort((a, b) => b.score - a.score);
    return scored
      .slice(0, maxLines)
      .sort((a, b) => b.y - a.y || a.left - b.left);
  }

  return deduped;
}

function scoreFormLine(line, pageWidth, pageHeight) {
  const leftRatio = line.left / pageWidth;
  const spanRatio = line.span / pageWidth;
  const normY = (pageHeight - line.y) / pageHeight;
  let score = spanRatio * 4;
  if (spanRatio >= 0.18) score += 2.5;
  else if (spanRatio >= 0.08) score += 1;
  if (spanRatio >= 0.038 && spanRatio <= 0.075) score += 0.18;
  if (normY > 0.84 && spanRatio >= 0.008 && spanRatio <= 0.035) score += 0.3;
  if (spanRatio < 0.018) score -= 3;
  else if (spanRatio < 0.06 && normY <= 0.84) score -= 1;
  if (leftRatio > 0.22 && leftRatio < 0.72 && spanRatio >= 0.07 && spanRatio <= 0.11) {
    score -= 2.5;
  }
  return score;
}

function groupLinesByNormY(lines, pageHeight, epsilonNorm = 0.012) {
  const enriched = lines
    .map((line) => ({
      line,
      normY: (pageHeight - line.y) / pageHeight,
    }))
    .sort((a, b) => b.normY - a.normY);

  const groups = [];
  for (const item of enriched) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(last.normY - item.normY) <= epsilonNorm) {
      last.lines.push(item.line);
    } else {
      groups.push({ normY: item.normY, lines: [item.line] });
    }
  }
  return groups;
}

/** Две короткие линии на одной высоте — типичный boho-орнамент, не поле ввода. */
function isDecorativePairRow(lines, pageWidth) {
  if (lines.length < 2) return false;
  const spans = lines.map((line) => line.span / pageWidth);
  if (!spans.every((span) => span >= 0.07 && span <= 0.12)) return false;
  const lefts = lines.map((line) => line.left / pageWidth);
  const spread = Math.max(...lefts) - Math.min(...lefts);
  return spread >= 0.08 && spread <= 0.45;
}

function refineFormInputLines(lines, pageWidth, pageHeight, options) {
  const groups = groupLinesByNormY(
    lines,
    pageHeight,
    options.formYClusterEpsilon ?? 0.012
  );
  const minScore = options.formMinScore ?? 0.25;
  const picked = [];

  for (const group of groups) {
    if (isDecorativePairRow(group.lines, pageWidth)) continue;

    const scored = group.lines
      .map((line) => ({ line, score: scoreFormLine(line, pageWidth, pageHeight) }))
      .filter((item) => item.score >= minScore)
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      picked.push(scored[0].line);
    }
  }

  picked.sort((a, b) => b.y - a.y || a.left - b.left);
  const maxLines = options.maxLinesPerPage ?? 12;
  if (picked.length <= maxLines) return picked;

  return picked
    .map((line) => ({ line, score: scoreFormLine(line, pageWidth, pageHeight) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxLines)
    .map((item) => item.line)
    .sort((a, b) => b.y - a.y || a.left - b.left);
}

async function collectTextItems(page) {
  const textContent = await page.getTextContent();
  return textContent.items
    .filter((item) => typeof item.str === 'string' && item.str.trim().length > 0)
    .map((item) => {
      const transform = item.transform ?? [1, 0, 0, 1, 0, 0];
      const x = transform[4];
      const y = transform[5];
      const width = item.width ?? 0;
      return {
        str: item.str.trim(),
        x,
        y,
        right: x + width,
      };
    });
}

function detectHasLabel(textItems, line, pageWidth, pageHeight, options = {}) {
  const labelYWindow = pageHeight * 0.018;
  const labels = textItems.filter(
    (item) =>
      Math.abs(item.y - line.y) <= labelYWindow &&
      item.x < line.left + pageWidth * 0.04 &&
      item.x <= pageWidth * 0.62
  );

  if (labels.length > 0) {
    const meaningful = labels.filter((item) => {
      const compact = item.str.replace(/\s+/g, '');
      if (compact.length === 0) return false;
      if (compact.toLowerCase() === 'лет') return false;
      return true;
    });
    if (meaningful.length > 0) return true;
  }

  if (!options.inferLabelFromGeometry) return false;

  const leftRatio = line.left / pageWidth;
  const spanRatio = line.span / pageWidth;
  return leftRatio < 0.42 && spanRatio < 0.72;
}

function buildSlotsFromPdfLines(lines, textItems, pageWidth, pageHeight, options) {
  if (!lines.length) return [];

  const slots = [];
  const normYs = lines.map((line) => (pageHeight - line.y) / pageHeight);
  const rowEpsilon = 0.002;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const normY = normYs[i];

    let prevRowNorm = null;
    for (let j = i - 1; j >= 0; j -= 1) {
      if (Math.abs(normYs[j] - normY) > rowEpsilon) {
        prevRowNorm = normYs[j];
        break;
      }
    }
    let nextRowNorm = null;
    for (let j = i + 1; j < normYs.length; j += 1) {
      if (Math.abs(normYs[j] - normY) > rowEpsilon) {
        nextRowNorm = normYs[j];
        break;
      }
    }

    let bandNorm;
    if (prevRowNorm !== null && nextRowNorm !== null) {
      bandNorm = Math.min((nextRowNorm - prevRowNorm) / 2, 0.08);
    } else if (nextRowNorm !== null) {
      bandNorm = nextRowNorm - normY;
    } else if (prevRowNorm !== null) {
      bandNorm = normY - prevRowNorm;
    } else {
      bandNorm = 0.028;
    }

    bandNorm = clamp(bandNorm, 0.012, 0.12);

    const padNorm = (options.textPadPt ?? 4) / pageWidth;
    const hasLabel = detectHasLabel(textItems, line, pageWidth, pageHeight, options);
    const xNorm = clamp(line.left / pageWidth + (hasLabel ? padNorm : 0), 0, 0.98);
    const widthNorm = clamp((line.right - line.left) / pageWidth - (hasLabel ? padNorm : 0), 0.05, 1);

    slots.push({
      x: formatFloat(xNorm),
      y: formatFloat(clamp(normY, 0, 1)),
      width: formatFloat(widthNorm),
      height: formatFloat(bandNorm),
      hasLabel,
    });
  }

  return assignContinuationGroups(slots);
}

function normalizeRgb(color) {
  if (!color || color.length < 3) return [0, 0, 0];
  const max = Math.max(color[0], color[1], color[2]);
  if (max > 1.5) return [color[0] / 255, color[1] / 255, color[2] / 255];
  return [color[0], color[1], color[2]];
}

function isNearWhiteFill(color, threshold = 0.97, options = {}) {
  const [r, g, b] = normalizeRgb(color);
  if (r >= threshold && g >= threshold && b >= threshold) return true;

  if (options.allowCreamFill !== true) return false;

  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  return lum >= 0.92 && sat <= 0.09 && Math.min(r, g, b) >= 0.88;
}

function isBirthdayInputFill(color, options = {}) {
  const threshold = options.whiteFillThreshold ?? 0.97;
  if (isNearWhiteFill(color, threshold, options)) return true;

  const [r, g, b] = normalizeRgb(color);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  return lum >= 0.88 && sat <= 0.12;
}

/** Белые «таблетки» и широкие поля ввода в альбоме дня рождения. */
function isWhiteInputBlock(wRatio, hRatio) {
  const aspect = wRatio / Math.max(hRatio, 0.001);

  if (wRatio > 0.92 && hRatio > 0.85) return false;
  if (hRatio > 0.12) return false;
  if (aspect >= 0.85 && aspect <= 1.25 && hRatio > 0.055) return false;

  if (wRatio >= 0.35 && hRatio >= 0.022 && hRatio <= 0.05) return true;
  if (wRatio >= 0.12 && hRatio >= 0.034 && hRatio <= 0.058 && aspect >= 1.6) return true;
  if (wRatio >= 0.15 && hRatio >= 0.055 && hRatio <= 0.12 && aspect >= 1.2) return true;

  return false;
}

function dedupeWhiteBlocks(blocks, pageWidth, pageHeight) {
  const sorted = [...blocks].sort((a, b) => b.normY - a.normY || a.left - b.left);
  const deduped = [];

  for (const block of sorted) {
    const duplicate = deduped.some((prev) => {
      const yGap = Math.abs(prev.normY - block.normY);
      const overlap =
        Math.max(0, Math.min(prev.right, block.right) - Math.max(prev.left, block.left)) /
        Math.min(prev.span, block.span);
      return yGap < 0.008 && overlap > 0.7;
    });
    if (!duplicate) deduped.push(block);
  }

  return deduped;
}

function getPathBoundingBox(pathOps, coords, ctm) {
  let j = 0;
  const xs = [];
  const ys = [];

  for (const op of pathOps) {
    if (op === PATH_OPS.moveTo || op === PATH_OPS.lineTo) {
      const [x, y] = transformPoint(ctm, coords[j], coords[j + 1]);
      xs.push(x);
      ys.push(y);
      j += 2;
    } else if (op === PATH_OPS.curveTo) {
      for (let k = 0; k < 3; k += 1) {
        const [x, y] = transformPoint(ctm, coords[j], coords[j + 1]);
        xs.push(x);
        ys.push(y);
        j += 2;
      }
    } else if (op === PATH_OPS.rectangle) {
      const rx = coords[j];
      const ry = coords[j + 1];
      const rw = coords[j + 2];
      const rh = coords[j + 3];
      j += 4;
      for (const [px, py] of [
        [rx, ry],
        [rx + rw, ry],
        [rx + rw, ry + rh],
        [rx, ry + rh],
      ]) {
        const [x, y] = transformPoint(ctm, px, py);
        xs.push(x);
        ys.push(y);
      }
    }
  }

  if (!xs.length) return null;

  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    bottom: Math.min(...ys),
    top: Math.max(...ys),
  };
}

async function collectWhiteInputBlocks(page, options = {}) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const viewport = page.getViewport({ scale: 1 });
  const { width: pageWidth, height: pageHeight } = viewport;
  const ops = await page.getOperatorList();
  const fn = pdfjs.OPS;
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack = [];
  let fillColor = [0, 0, 0];
  let lastPathOps = null;
  let lastCoords = null;
  const blocks = [];
  const whiteThreshold = options.whiteFillThreshold ?? 0.97;

  for (let i = 0; i < ops.fnArray.length; i += 1) {
    const op = ops.fnArray[i];
    const args = ops.argsArray[i];

    if (op === fn.save) {
      stack.push({ ctm: [...ctm], fill: [...fillColor] });
    } else if (op === fn.restore) {
      const saved = stack.pop();
      if (saved) {
        ctm = saved.ctm;
        fillColor = saved.fill;
      }
    } else if (op === fn.transform) {
      ctm = multiplyMatrix(ctm, args);
    } else if (op === fn.setFillRGBColor) {
      fillColor = args;
    } else if (op === fn.setFillGray) {
      fillColor = [args[0], args[0], args[0]];
    } else if (op === fn.constructPath) {
      lastPathOps = args[0];
      lastCoords = args[1];
    } else if (op === fn.fill || op === fn.eoFill) {
      if (!lastPathOps || !lastCoords) continue;
      if (!isBirthdayInputFill(fillColor, options)) continue;

      const bounds = getPathBoundingBox(lastPathOps, lastCoords, ctm);
      if (!bounds) continue;

      const span = bounds.right - bounds.left;
      const blockHeight = bounds.top - bounds.bottom;
      const wRatio = span / pageWidth;
      const hRatio = blockHeight / pageHeight;

      if (!isWhiteInputBlock(wRatio, hRatio)) continue;

      const centerY = (bounds.bottom + bounds.top) / 2;
      blocks.push({
        left: bounds.left,
        right: bounds.right,
        bottom: bounds.bottom,
        top: bounds.top,
        y: centerY,
        span,
        normY: (pageHeight - centerY) / pageHeight,
      });
    }
  }

  return dedupeWhiteBlocks(blocks, pageWidth, pageHeight);
}

function detectBlockHasLabel(textItems, block, pageWidth, pageHeight, options = {}) {
  const labelYWindow = pageHeight * (options.blockLabelYWindow ?? 0.028);

  const labels = textItems.filter((item) => {
    if (Math.abs(item.y - block.y) > labelYWindow) return false;
    if (item.x >= block.left + pageWidth * 0.08) return false;
    if (item.right > block.left + pageWidth * 0.62) return false;
    const compact = item.str.replace(/\s+/g, '');
    return compact.length >= 3;
  });

  return labels.length > 0;
}

function filterBirthdayNoiseBlocks(blocks, pageWidth, options = {}) {
  if (options.slotMode !== 'whiteBlocks') return blocks;

  const rowEpsilon = 0.008;
  const rowCounts = new Map();
  for (const block of blocks) {
    const rowKey = Math.round(block.normY / rowEpsilon);
    rowCounts.set(rowKey, (rowCounts.get(rowKey) || 0) + 1);
  }

  return blocks.filter((block) => {
    const widthRatio = block.span / pageWidth;
    const leftRatio = block.left / pageWidth;
    const rowKey = Math.round(block.normY / rowEpsilon);
    const rowSize = rowCounts.get(rowKey) || 0;

    // Узкие блоки справа в одиночку (декор у торта) — не поля ввода.
    if (widthRatio < 0.22 && leftRatio > 0.55 && rowSize <= 1) {
      return false;
    }
    return true;
  });
}

function buildSlotsFromWhiteBlocks(blocks, textItems, pageWidth, pageHeight, options) {
  if (!blocks.length) return [];

  const padPt = options.blockPadPt ?? 8;
  const padNormX = padPt / pageWidth;
  const padNormY = padPt / pageHeight;
  const sorted = [...blocks].sort((a, b) => b.normY - a.normY);
  const slots = [];

  for (let i = 0; i < sorted.length; i += 1) {
    const block = sorted[i];
    const normY = block.normY;
    const blockHeightNorm = (block.top - block.bottom) / pageHeight;
    const xNorm = clamp(block.left / pageWidth + padNormX, 0, 0.98);
    const widthNorm = clamp(block.span / pageWidth - padNormX * 2, 0.05, 1);
    const hasLabel = detectBlockHasLabel(textItems, block, pageWidth, pageHeight, options);

    slots.push({
      x: formatFloat(xNorm),
      y: formatFloat(clamp(normY, 0, 1)),
      width: formatFloat(widthNorm),
      height: formatFloat(clamp(blockHeightNorm * 0.92, 0.034, 0.065)),
      hasLabel,
      inputKind: 'block',
    });
  }

  slots.sort((a, b) => a.y - b.y || a.x - b.x);
  return assignBlockFieldGroups(slots);
}

async function extractLineSlotsForPage(page, pageWidth, pageHeight, options) {
  const segments = await collectPathSegments(page, options);
  let lines = mergeHorizontalLines(segments, pageWidth, pageHeight, options);
  if (options.formLineRefine) {
    lines = refineFormInputLines(lines, pageWidth, pageHeight, options);
  }
  if (options.collapseNearbyRows) {
    lines = collapseNearbyRows(lines, pageHeight, options.minRowGapNorm ?? 0.016);
  }
  const textItems = await collectTextItems(page);
  return buildSlotsFromPdfLines(lines, textItems, pageWidth, pageHeight, options);
}

async function extractSlotsForPdfPage(pdfDocument, pageNumber, options) {
  const page = await pdfDocument.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  const { width: pageWidth, height: pageHeight } = viewport;

  if (options.slotMode === 'whiteBlocks') {
    let blocks = await collectWhiteInputBlocks(page, options);
    blocks = filterBirthdayNoiseBlocks(blocks, pageWidth, options);
    const maxBlocks = options.maxBlocksPerPage ?? 12;
    if (blocks.length > maxBlocks) {
      blocks = [...blocks]
        .sort((a, b) => b.span - a.span)
        .slice(0, maxBlocks)
        .sort((a, b) => b.normY - a.normY);
    }
    const textItems = await collectTextItems(page);
    const blockSlots = buildSlotsFromWhiteBlocks(blocks, textItems, pageWidth, pageHeight, options);
    if (blockSlots.length > 0) {
      return blockSlots;
    }
    if (options.hybridLineFallback !== false) {
      return extractLineSlotsForPage(page, pageWidth, pageHeight, options.lineFallbackOptions ?? options);
    }
    return blockSlots;
  }

  return extractLineSlotsForPage(page, pageWidth, pageHeight, options);
}

let pdfjsModulePromise;

async function getPdfJs() {
  if (!pdfjsModulePromise) {
    pdfjsModulePromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfjsModulePromise;
}

async function loadPdfDocument(pdfPath) {
  const pdfjs = await getPdfJs();
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  return pdfjs.getDocument({ data, useSystemFonts: true }).promise;
}

async function extractAllSlotsFromPdf(pdfPath, options = {}) {
  const doc = await loadPdfDocument(pdfPath);
  const slotsByPage = {};
  const pageCount = doc.numPages;

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    slotsByPage[String(pageNumber)] = await extractSlotsForPdfPage(doc, pageNumber, options);
  }

  return slotsByPage;
}

module.exports = {
  assignContinuationGroups,
  buildSlotsFromPdfLines,
  buildSlotsFromWhiteBlocks,
  collapseNearbyRows,
  collectWhiteInputBlocks,
  extractAllSlotsFromPdf,
  extractSlotsForPdfPage,
  loadPdfDocument,
  mergeHorizontalLines,
  refineFormInputLines,
};
