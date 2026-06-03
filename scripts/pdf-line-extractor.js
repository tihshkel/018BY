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

function assignContinuationGroups(slots, options = {}) {
  if (options.singleRowGroups === true) {
    for (let i = 0; i < slots.length; i += 1) {
      slots[i].continuationGroup = i + 1;
    }
    return slots;
  }

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
    const duplicate = collapsed.find((prev) => {
      const prevNorm = (pageHeight - prev.y) / pageHeight;
      const norm = (pageHeight - line.y) / pageHeight;
      if (Math.abs(prevNorm - norm) >= minRowGapNorm) return false;
      return horizontalOverlap(prev, line) / Math.min(prev.span, line.span) > 0.35;
    });

    if (duplicate) {
      if (line.span > duplicate.span) {
        const idx = collapsed.indexOf(duplicate);
        collapsed[idx] = line;
      }
      continue;
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

  const useDiaryClusters = mergeDashedRows && options.diaryFormMode === true;
  const lines = [];
  for (const rowSegments of rowBins.values()) {
    if (useDiaryClusters) {
      for (const clustered of clusterRowSegments(rowSegments, columnGapPx)) {
        const normY = (pageHeight - clustered.y) / pageHeight;
        if (clustered.span >= minSpanPx && clustered.span <= maxSpanPx) {
          if (!isPageBorderLine(clustered, pageWidth, pageHeight, normY)) {
            lines.push(clustered);
          }
        }
      }
    } else if (mergeDashedRows) {
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

function scoreFormLine(line, pageWidth, pageHeight, options = {}) {
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
  if (
    normY < 0.22 &&
    leftRatio > 0.22 &&
    leftRatio < 0.72 &&
    spanRatio >= 0.07 &&
    spanRatio <= 0.11
  ) {
    score -= 2.5;
  }

  if (options.diaryFormMode === true) {
    if (leftRatio >= 0.24 && spanRatio >= 0.32 && spanRatio <= 0.72) score += 3;
    if (leftRatio < 0.12 && spanRatio > 0.55) score -= 4;
    if (leftRatio < 0.2 && spanRatio > 0.75) score -= 2;
    if (
      leftRatio >= 0.08 &&
      leftRatio <= 0.2 &&
      spanRatio >= 0.2 &&
      spanRatio <= 0.42
    ) {
      score -= 2.5;
    }
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
function isDecorativePairRow(lines, pageWidth, pageHeight) {
  if (lines.length < 2) return false;
  const spans = lines.map((line) => line.span / pageWidth);
  if (!spans.every((span) => span >= 0.07 && span <= 0.12)) return false;
  const lefts = lines.map((line) => line.left / pageWidth);
  const spread = Math.max(...lefts) - Math.min(...lefts);
  if (spread < 0.08 || spread > 0.45) return false;

  const avgNormY =
    lines.reduce((sum, line) => sum + (pageHeight - line.y) / pageHeight, 0) / lines.length;
  return avgNormY < 0.22;
}

function pickNonOverlappingColumnLines(scoredItems) {
  const lines = scoredItems.map((item) => item.line).sort((a, b) => a.left - b.left);
  const picked = [];

  for (const line of lines) {
    const overlaps = picked.some(
      (prev) => horizontalOverlap(prev, line) / Math.min(prev.span, line.span) > 0.3
    );
    if (!overlaps) picked.push(line);
  }

  return picked;
}

/** «Маму зовут | Папу зовут» — две колонки на одной строке, не одна линия. */
function isSideBySideFieldRow(lines, pageWidth) {
  if (lines.length < 2) return false;

  const sorted = [...lines].sort((a, b) => a.left - b.left);
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = sorted[i].left - sorted[i - 1].right;
    if (gap / pageWidth < 0.06) return false;
  }

  const spans = lines.map((line) => line.span / pageWidth);
  if (spans.some((span) => span > 0.38)) return false;

  return true;
}

/** Две близкие строки с одинаковыми колонками — верх/низ облака; оставляем более узкие линии ввода. */
function dedupeDuplicateFieldRows(lines, pageWidth, pageHeight, maxRowGapNorm = 0.08) {
  if (lines.length <= 2) return lines;

  const rows = [];
  for (const line of [...lines].sort((a, b) => (pageHeight - a.y) / pageHeight - (pageHeight - b.y) / pageHeight)) {
    const normY = (pageHeight - line.y) / pageHeight;
    const last = rows[rows.length - 1];
    if (last && Math.abs(last.normY - normY) <= 0.012) {
      last.lines.push(line);
    } else {
      rows.push({ normY, lines: [line] });
    }
  }

  if (rows.length <= 1) return lines;

  const toDrop = new Set();
  for (let i = 0; i < rows.length - 1; i += 1) {
    const upper = rows[i];
    const lower = rows[i + 1];
    if (Math.abs(lower.normY - upper.normY) > maxRowGapNorm) continue;
    if (upper.lines.length !== lower.lines.length || upper.lines.length < 2) continue;

    const upperLefts = [...upper.lines].sort((a, b) => a.left - b.left).map((l) => l.left);
    const lowerLefts = [...lower.lines].sort((a, b) => a.left - b.left).map((l) => l.left);
    const columnsMatch = upperLefts.every(
      (left, idx) => Math.abs(left - lowerLefts[idx]) / pageWidth < 0.04
    );
    if (!columnsMatch) continue;

    const avgSpan = (row) => row.lines.reduce((sum, l) => sum + l.span, 0) / row.lines.length;
    const avgSpanUpper = avgSpan(upper);
    const avgSpanLower = avgSpan(lower);
    const spanRatio =
      Math.max(avgSpanUpper, avgSpanLower) / Math.max(Math.min(avgSpanUpper, avgSpanLower), 1);
    if (spanRatio < 1.08) continue;

    const dropRow = avgSpanUpper <= avgSpanLower ? lower : upper;
    dropRow.lines.forEach((line) => toDrop.add(line));
  }

  return lines.filter((line) => !toDrop.has(line));
}

/** Дневники: подпись слева + пунктир справа — убираем подчёркивания подписей и обрезаем «склеенные» строки. */
function filterDiaryFormLines(lines, pageWidth, pageHeight, options = {}) {
  const minInputLeft = options.diaryInputMinLeftRatio ?? 0.28;
  const labelMaxLeft = options.diaryLabelMaxLeftRatio ?? 0.2;
  const labelMaxSpan = options.diaryLabelMaxSpanRatio ?? 0.45;
  const rowEpsilon = options.formYClusterEpsilon ?? 0.014;
  const labelPairGapNorm = options.diaryLabelPairGapNorm ?? 0.045;

  const meta = lines.map((line) => ({
    line,
    normY: (pageHeight - line.y) / pageHeight,
    leftRatio: line.left / pageWidth,
    spanRatio: line.span / pageWidth,
  }));

  const filtered = meta.filter((item, index, arr) => {
    const { normY, leftRatio, spanRatio } = item;

    if (normY < 0.2 && spanRatio < 0.12 && leftRatio > 0.2 && leftRatio < 0.75) {
      return false;
    }

    const hasInputPartner = (gapNorm) =>
      arr.some(
        (other, otherIndex) =>
          otherIndex !== index &&
          Math.abs(other.normY - normY) <= gapNorm &&
          other.leftRatio >= minInputLeft &&
          other.spanRatio >= 0.3
      );

    if (leftRatio <= labelMaxLeft && spanRatio <= labelMaxSpan) {
      if (hasInputPartner(labelPairGapNorm)) return false;
    }

    if (leftRatio < 0.15 && spanRatio < 0.48 && normY >= 0.25 && normY <= 0.85) {
      if (hasInputPartner(labelPairGapNorm)) return false;
    }

    if (leftRatio < 0.15 && spanRatio < 0.35 && normY >= 0.28 && normY <= 0.75) {
      return false;
    }

    if (leftRatio < 0.12 && spanRatio < 0.55) {
      if (hasInputPartner(rowEpsilon)) return false;
    }

    return true;
  });

  const trimmed = filtered.map(({ line, leftRatio, spanRatio }) => {
    if (leftRatio < 0.18 && spanRatio > 0.45) {
      const trimLeft = pageWidth * (spanRatio > 0.55 ? 0.32 : minInputLeft);
      const right = line.right;
      if (right - trimLeft >= pageWidth * 0.22) {
        return { y: line.y, left: trimLeft, right, span: right - trimLeft };
      }
    }

    return line;
  });

  const deduped = [];
  for (const line of trimmed.sort((a, b) => b.y - a.y || a.left - b.left)) {
    const normY = (pageHeight - line.y) / pageHeight;
    const duplicateIndex = deduped.findIndex(
      (prev) => Math.abs((pageHeight - prev.y) / pageHeight - normY) <= rowEpsilon
    );

    if (duplicateIndex >= 0) {
      const prev = deduped[duplicateIndex];
      const prevLeft = prev.left / pageWidth;
      const lineLeft = line.left / pageWidth;
      const keepLine =
        lineLeft >= prevLeft + 0.05 ||
        (Math.abs(lineLeft - prevLeft) < 0.05 && line.span > prev.span);
      if (keepLine) deduped[duplicateIndex] = line;
      continue;
    }

    deduped.push(line);
  }

  return deduped.sort((a, b) => b.y - a.y || a.left - b.left);
}

function isBrownFullRowArtifact(line, pageWidth) {
  const leftRatio = line.left / pageWidth;
  const spanRatio = line.span / pageWidth;
  if (leftRatio < 0.12 && spanRatio > 0.65) return true;
  if (leftRatio < 0.2 && spanRatio > 0.78) return true;
  return false;
}

function isBrownInputDashSegment(seg, pageWidth, options = {}) {
  const minSpan = options.brownInputMinSpanRatio ?? 0.35;
  const minRight = options.brownInputMinRightRatio ?? 0.85;
  const leftRatio = seg.left / pageWidth;
  const spanRatio = seg.span / pageWidth;
  const rightRatio = seg.right / pageWidth;
  if (spanRatio < minSpan || rightRatio < minRight) return false;
  if (leftRatio < 0.14) return false;
  if (leftRatio < 0.12 && spanRatio > 0.65) return false;
  return true;
}

function findBrownGapInput(sorted, pageWidth, options = {}) {
  const minFallbackSpan = options.brownInputMinSpanFallback ?? 0.14;
  const minRightShort = options.brownInputMinRightShort ?? 0.45;
  const minGapRatio = options.brownInputMinGapRatio ?? 0.018;

  let best = null;
  let bestScore = -1;

  for (let gapIndex = 1; gapIndex < sorted.length; gapIndex += 1) {
    const gap = sorted[gapIndex].left - sorted[gapIndex - 1].right;
    if (gap < pageWidth * minGapRatio) continue;

    const preGap = sorted.slice(0, gapIndex);
    const inputSegs = sorted.slice(gapIndex);
    const preRight = Math.max(...preGap.map((seg) => seg.right));
    const left = Math.min(...inputSegs.map((seg) => seg.left));
    const right = Math.max(...inputSegs.map((seg) => seg.right));
    const span = right - left;
    const spanRatio = span / pageWidth;
    const rightRatio = right / pageWidth;
    const leftRatio = left / pageWidth;
    const preRightRatio = preRight / pageWidth;
    const gapRatio = gap / pageWidth;

    if (spanRatio < minFallbackSpan || rightRatio < minRightShort) continue;
    if (leftRatio < preRightRatio + 0.012) continue;
    if (preRightRatio < 0.1 && gapIndex === 1) continue;
    if (preRightRatio > 0.58) continue;

    let score = spanRatio + rightRatio * 0.45 + gapRatio * 2;
    if (preRightRatio >= 0.14 && preRightRatio <= 0.5) score += 0.45;
    if (leftRatio >= 0.26 && leftRatio <= 0.58) score += 0.35;
    if (gapRatio >= 0.022) score += 0.25;

    if (score > bestScore) {
      bestScore = score;
      best = { left, right, span, source: 'gap' };
    }
  }

  return best;
}

function hasBrownSolidInputSegment(rowSegments, pageWidth, options = {}) {
  const minLongSpan = options.brownInputMinSpanRatio ?? 0.35;
  const minRightLong = options.brownInputMinRightRatio ?? 0.85;
  const minLeft = options.brownSolidMinLeftRatio ?? 0.28;
  return rowSegments.some((seg) => {
    const leftRatio = seg.left / pageWidth;
    const spanRatio = seg.span / pageWidth;
    const rightRatio = seg.right / pageWidth;
    return spanRatio >= minLongSpan && rightRatio >= minRightLong && leftRatio >= minLeft;
  });
}

/** Сплошная линия ввода — один длинный сегмент справа от подписи. */
function pickBrownSolidRowInputLine(rowSegments, pageWidth, options = {}) {
  const minLongSpan = options.brownInputMinSpanRatio ?? 0.35;
  const minRightLong = options.brownInputMinRightRatio ?? 0.85;
  const minLeft = options.brownSolidMinLeftRatio ?? 0.28;

  const candidates = rowSegments
    .filter((seg) => {
      const leftRatio = seg.left / pageWidth;
      const spanRatio = seg.span / pageWidth;
      const rightRatio = seg.right / pageWidth;
      return spanRatio >= minLongSpan && rightRatio >= minRightLong && leftRatio >= minLeft;
    })
    .sort((a, b) => b.span - a.span || b.right - a.right);

  if (!candidates.length) return null;

  const best = candidates[0];
  return {
    y: best.y,
    left: best.left,
    right: best.right,
    span: best.span,
    source: 'solid',
  };
}

function isBrownDecorativeDashedRow(rowSegments, pageWidth) {
  if (hasBrownSolidInputSegment(rowSegments, pageWidth)) return false;

  const left = Math.min(...rowSegments.map((seg) => seg.left));
  const right = Math.max(...rowSegments.map((seg) => seg.right));
  const totalSpan = (right - left) / pageWidth;
  const maxRight = right / pageWidth;
  const maxSpan = Math.max(...rowSegments.map((seg) => seg.span / pageWidth));

  if (maxSpan < 0.012) return true;
  if (totalSpan < 0.15 && maxRight < 0.55) return true;
  if (maxSpan < 0.05 && maxRight < 0.45) return true;
  return false;
}

/** Пунктирная линия — склеиваем короткие штрихи после разрыва под подписью. */
function pickBrownDashedRowInputLine(rowSegments, pageWidth, pageHeight, options = {}) {
  const minFallbackSpan = options.brownInputMinSpanFallback ?? 0.14;
  const minRightShort = options.brownInputMinRightShort ?? 0.45;
  const minShortFieldSpan = options.brownDashedShortFieldSpan ?? 0.12;
  const columnGapPx = pageWidth * (options.brownDashClusterGapRatio ?? 0.032);

  const prominentDash = rowSegments
    .filter((seg) => {
      const spanRatio = seg.span / pageWidth;
      const rightRatio = seg.right / pageWidth;
      const leftRatio = seg.left / pageWidth;
      return spanRatio >= minShortFieldSpan && rightRatio >= minRightShort && leftRatio >= 0.2;
    })
    .sort((a, b) => b.span - a.span || b.right - a.right)[0];

  if (prominentDash) {
    return {
      y: prominentDash.y,
      left: prominentDash.left,
      right: prominentDash.right,
      span: prominentDash.span,
      source: 'dashed',
    };
  }

  const dashedSegs = rowSegments.filter((seg) => seg.span / pageWidth < 0.12);
  if (dashedSegs.length < 2) return null;

  const sorted = [...dashedSegs].sort((a, b) => a.left - b.left);
  let gapIndex = 1;
  let gapSize = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = sorted[i].left - sorted[i - 1].right;
    if (gap > gapSize) {
      gapSize = gap;
      gapIndex = i;
    }
  }

  if (gapSize >= pageWidth * (options.brownInputMinGapRatio ?? 0.018)) {
    const inputSegs = sorted.slice(gapIndex);
    const left = Math.min(...inputSegs.map((seg) => seg.left));
    const right = Math.max(...inputSegs.map((seg) => seg.right));
    const span = right - left;
    const spanRatio = span / pageWidth;
    const rightRatio = right / pageWidth;
    const leftRatio = left / pageWidth;
    const y = inputSegs.reduce((sum, seg) => sum + seg.y, 0) / inputSegs.length;

    if (spanRatio >= minFallbackSpan && rightRatio >= minRightShort && leftRatio >= 0.2) {
      return { y, left, right, span, source: 'dashed-gap' };
    }
  }

  const clusters = clusterRowSegments(dashedSegs, columnGapPx);
  const y = dashedSegs.reduce((sum, seg) => sum + seg.y, 0) / dashedSegs.length;
  const clusterSegments = clusters
    .map((cluster) => ({
      y: cluster.y,
      left: cluster.left,
      right: cluster.right,
      span: cluster.span,
    }))
    .sort((a, b) => a.left - b.left);

  const gapInput = findBrownGapInput(clusterSegments, pageWidth, options);
  if (gapInput) {
    return { y, ...gapInput, source: 'dashed-gap' };
  }

  const bestCluster = clusters
    .filter((cluster) => {
      const spanRatio = cluster.span / pageWidth;
      const rightRatio = cluster.right / pageWidth;
      const leftRatio = cluster.left / pageWidth;
      return spanRatio >= minFallbackSpan && rightRatio >= minRightShort && leftRatio >= 0.2;
    })
    .sort((a, b) => b.span - a.span || b.right - a.right)[0];

  if (!bestCluster) return null;

  return {
    y: bestCluster.y,
    left: bestCluster.left,
    right: bestCluster.right,
    span: bestCluster.span,
    source: 'dashed',
  };
}

/** Одна визуальная строка: сплошная линия или склеенный пунктир. */
function pickBrownRowInputLine(rowSegments, pageWidth, pageHeight, options = {}) {
  if (!rowSegments.length) return null;

  const solid = pickBrownSolidRowInputLine(rowSegments, pageWidth, options);
  if (solid) return solid;

  const dashed = pickBrownDashedRowInputLine(rowSegments, pageWidth, pageHeight, options);
  if (dashed) return dashed;

  const minLongSpan = options.brownInputMinSpanRatio ?? 0.35;
  const minFallbackSpan = options.brownInputMinSpanFallback ?? 0.14;
  const minRightLong = options.brownInputMinRightRatio ?? 0.85;
  const minRightShort = options.brownInputMinRightShort ?? 0.45;
  const y = rowSegments.reduce((sum, seg) => sum + seg.y, 0) / rowSegments.length;
  const sorted = [...rowSegments].sort((a, b) => a.left - b.left);

  const gapInput = findBrownGapInput(sorted, pageWidth, options);
  if (gapInput) {
    return { y, ...gapInput, source: 'gap' };
  }

  for (const minSpan of [minLongSpan, minFallbackSpan]) {
    const longCandidates = rowSegments
      .filter((seg) => {
        const leftRatio = seg.left / pageWidth;
        const spanRatio = seg.span / pageWidth;
        const rightRatio = seg.right / pageWidth;
        return spanRatio >= minSpan && rightRatio >= minRightLong && leftRatio >= 0.22;
      })
      .sort((a, b) => b.span - a.span || b.right - a.right);

    if (longCandidates.length > 0) {
      const best = longCandidates[0];
      return {
        y: best.y,
        left: best.left,
        right: best.right,
        span: best.span,
        source: 'input',
      };
    }
  }

  const rowRight = Math.max(...rowSegments.map((seg) => seg.right));
  const rowRightRatio = rowRight / pageWidth;
  if (rowRightRatio >= 0.78) {
    const inputSegs = sorted.filter((seg) => seg.left / pageWidth >= 0.22);
    if (inputSegs.length > 0) {
      const left = Math.min(...inputSegs.map((seg) => seg.left));
      const right = Math.max(...inputSegs.map((seg) => seg.right));
      const span = right - left;
      const spanRatio = span / pageWidth;
      if (spanRatio >= minFallbackSpan && right / pageWidth >= minRightShort) {
        return { y, left, right, span, source: 'rowtrim' };
      }
    }
  }

  const columnGapPx = pageWidth * (options.brownClusterGapRatio ?? 0.04);
  const clusters = clusterRowSegments(
    rowSegments.filter((seg) => seg.left / pageWidth >= 0.16),
    columnGapPx
  );
  const bestCluster = clusters
    .filter((cluster) => {
      const spanRatio = cluster.span / pageWidth;
      const rightRatio = cluster.right / pageWidth;
      return spanRatio >= minFallbackSpan && rightRatio >= minRightShort;
    })
    .sort((a, b) => b.span - a.span || b.right - a.right)[0];

  if (bestCluster) {
    return {
      y: bestCluster.y,
      left: bestCluster.left,
      right: bestCluster.right,
      span: bestCluster.span,
      source: 'cluster',
    };
  }

  return null;
}

function groupBrownDiaryRowBins(rowBins, pageHeight, mergeGapNorm = 0.024) {
  const groups = [];
  const sorted = [...rowBins.entries()].sort(
    (a, b) => b[1][0].y - a[1][0].y
  );

  for (const [, segments] of sorted) {
    const normY = (pageHeight - segments[0].y) / pageHeight;
    const last = groups[groups.length - 1];
    if (last && Math.abs(last.normY - normY) <= mergeGapNorm) {
      last.segments.push(...segments);
      last.normY = (last.normY + normY) / 2;
      continue;
    }
    groups.push({ normY, segments: [...segments] });
  }

  return groups;
}

function extractBrownCoverRowLines(rowSegments, pageWidth, pageHeight, options = {}) {
  const columnGapPx = pageWidth * (options.brownCoverGapRatio ?? 0.055);
  const clusters = clusterRowSegments(rowSegments, columnGapPx);

  const valid = clusters.filter((cluster) => {
    const leftRatio = cluster.left / pageWidth;
    const spanRatio = cluster.span / pageWidth;
    if (spanRatio < 0.1) return false;
    if (leftRatio < 0.22) return false;
    if (spanRatio > 0.72) return false;
    if (isBrownFullRowArtifact(cluster, pageWidth)) return false;
    return true;
  });

  if (valid.length === 0) return [];

  const best = valid.sort((a, b) => {
    const score = (cluster) => {
      const leftRatio = cluster.left / pageWidth;
      const spanRatio = cluster.span / pageWidth;
      let value = spanRatio;
      if (leftRatio >= 0.24 && leftRatio <= 0.58) value += 0.35;
      if (leftRatio >= 0.26 && leftRatio <= 0.38) value += 0.3;
      if (leftRatio > 0.48) value -= 0.25;
      return value;
    };
    return score(b) - score(a);
  })[0];

  return [
    {
      y: best.y,
      left: best.left,
      right: best.right,
      span: best.span,
      source: 'cover',
    },
  ];
}

/** Коричневый дневник: поле ввода = длинный пунктир справа от подписи (из сегментов PDF). */
function mergeBrownDiaryFormLines(segments, pageWidth, pageHeight, options = {}) {
  const mergeGapPt = options.mergeGapPt ?? 10;
  const minSegmentSpanPt = options.minSegmentSpanPt ?? 1.2;
  const bottomCutPt = options.bottomCutPt ?? 28;
  const topCutPt = options.topCutPt ?? 40;
  const formStartNormY = options.formStartNormY ?? 0.05;
  const maxHorizontalDeltaPt = options.maxHorizontalDeltaPt ?? 1.2;
  const maxNormY = options.maxNormY ?? 0.96;

  const candidates = segments
    .filter((s) => Math.abs(s.y1 - s.y2) <= maxHorizontalDeltaPt)
    .map((s) => {
      const left = Math.min(s.x1, s.x2);
      const right = Math.max(s.x1, s.x2);
      const y = (s.y1 + s.y2) / 2;
      return { y, left, right, span: right - left };
    })
    .filter((l) => l.span >= minSegmentSpanPt)
    .filter((l) => l.y >= bottomCutPt && l.y <= pageHeight - topCutPt);

  const rowBins = new Map();
  for (const seg of candidates) {
    const normY = (pageHeight - seg.y) / pageHeight;
    if (normY > maxNormY || normY < formStartNormY) continue;
    const bin = Math.round(seg.y / mergeGapPt);
    if (!rowBins.has(bin)) rowBins.set(bin, []);
    rowBins.get(bin).push(seg);
  }

  const rowGroups = groupBrownDiaryRowBins(
    rowBins,
    pageHeight,
    options.brownRowMergeGapNorm ?? 0.024
  );

  let lines = [];
  for (const group of rowGroups) {
    if (isBrownDecorativeDashedRow(group.segments, pageWidth)) continue;

    const picked = pickBrownRowInputLine(group.segments, pageWidth, pageHeight, options);
    if (picked) {
      lines.push(picked);
      continue;
    }

    if (group.normY >= 0.28 && group.normY <= 0.44) {
      lines.push(...extractBrownCoverRowLines(group.segments, pageWidth, pageHeight, options));
    }
  }

  return finalizeBrownDiaryPageLines(lines, pageWidth, pageHeight, options);
}

function scoreBrownDiaryLine(line, pageWidth, pageHeight) {
  const leftRatio = line.left / pageWidth;
  const spanRatio = line.span / pageWidth;
  const normY = (pageHeight - line.y) / pageHeight;
  let score = spanRatio;
  if (line.source === 'solid' || line.source === 'dashed' || line.source === 'dashed-gap') score += 2.5;
  if (line.source === 'input' || line.source === 'gap' || line.source === 'cluster' || line.source === 'rowtrim') score += 2;
  if (leftRatio >= 0.18) score += 0.5;
  if (rightRatio(line, pageWidth) >= 0.82) score += 0.35;
  if (normY > 0.82 && spanRatio < 0.25) score -= 1;
  if (normY > 0.72 && spanRatio < 0.22) score -= 1.5;
  return score;
}

function rightRatio(line, pageWidth) {
  return line.right / pageWidth;
}

function scoreBrownCoverLine(line, pageWidth) {
  const leftRatio = line.left / pageWidth;
  const spanRatio = line.span / pageWidth;
  let score = spanRatio;
  if (leftRatio >= 0.24 && leftRatio <= 0.38) score += 0.6;
  if (spanRatio >= 0.35 && spanRatio <= 0.58) score += 0.35;
  if (leftRatio > 0.48) score -= 0.4;
  return score;
}

function isBrownCoverPage(lines, pageWidth, pageHeight, options = {}) {
  if (options.pageNumber === 1) return true;
  return false;
}

function finalizeBrownDiaryPageLines(lines, pageWidth, pageHeight, options = {}) {
  const minRowGap = options.brownMinRowGapNorm ?? 0.022;
  const formEndNormY = options.brownFormEndNormY ?? 0.88;

  let filtered = lines.filter((line) => {
    const normY = (pageHeight - line.y) / pageHeight;
    const spanRatio = line.span / pageWidth;
    const leftRatio = line.left / pageWidth;
    if (isBrownFullRowArtifact(line, pageWidth)) return false;
    if (normY > formEndNormY && spanRatio > 0.6) return false;
    if (spanRatio < 0.08) return false;
    if (leftRatio > 0.58 && spanRatio < 0.32) return false;
    return true;
  });

  if (isBrownCoverPage(lines, pageWidth, pageHeight, options)) {
    filtered = filtered.filter((line) => {
      const normY = (pageHeight - line.y) / pageHeight;
      const spanRatio = line.span / pageWidth;
      const leftRatio = line.left / pageWidth;
      return (
        normY >= 0.3 &&
        normY <= 0.42 &&
        spanRatio >= 0.1 &&
        spanRatio <= 0.72 &&
        leftRatio >= 0.22 &&
        leftRatio <= 0.58
      );
    });
    filtered.sort(
      (a, b) => (pageHeight - a.y) / pageHeight - (pageHeight - b.y) / pageHeight
    );
    const scored = filtered
      .map((line) => ({ line, score: scoreBrownCoverLine(line, pageWidth) }))
      .filter((item) => item.line.span / pageWidth >= 0.15)
      .sort((a, b) => b.score - a.score);
    const picked = [];
    for (const { line } of scored) {
      const normY = (pageHeight - line.y) / pageHeight;
      if (picked.some((prev) => Math.abs((pageHeight - prev.y) / pageHeight - normY) < 0.028)) {
        continue;
      }
      picked.push(line);
      if (picked.length >= 2) break;
    }
    picked.sort(
      (a, b) => (pageHeight - a.y) / pageHeight - (pageHeight - b.y) / pageHeight
    );
    return picked.map(({ source, ...line }) => line);
  }

  const formStartNormY = options.brownQuestionnaireStartNormY ?? 0.24;
  const questionnaireEndNormY = options.brownQuestionnaireEndNormY ?? 0.78;
  filtered = filtered.filter((line) => {
    const normY = (pageHeight - line.y) / pageHeight;
    const spanRatio = line.span / pageWidth;
    if (normY < formStartNormY) return false;
    if (normY > questionnaireEndNormY) return false;
    if (normY > 0.86 && spanRatio < 0.32) return false;
    return true;
  });

  filtered.sort((a, b) => b.y - a.y || a.left - b.left);
  const collapsed = [];

  for (const line of filtered) {
    const normY = (pageHeight - line.y) / pageHeight;
    const duplicate = collapsed.find((prev) => {
      const prevNorm = (pageHeight - prev.y) / pageHeight;
      return Math.abs(prevNorm - normY) < minRowGap;
    });

    if (duplicate) {
      if (scoreBrownDiaryLine(line, pageWidth, pageHeight) >
          scoreBrownDiaryLine(duplicate, pageWidth, pageHeight)) {
        const idx = collapsed.indexOf(duplicate);
        collapsed[idx] = line;
      }
      continue;
    }

    collapsed.push(line);
  }

  collapsed.sort((a, b) => b.y - a.y || a.left - b.left);
  const maxLines = options.maxLinesPerPage ?? 30;
  return collapsed.slice(0, maxLines).map(({ source, ...line }) => line);
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
    if (isDecorativePairRow(group.lines, pageWidth, pageHeight)) continue;

    const scored = group.lines
      .map((line) => ({ line, score: scoreFormLine(line, pageWidth, pageHeight, options) }))
      .filter((item) => item.score >= minScore)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) continue;

    const columnLines = pickNonOverlappingColumnLines(scored);
    if (isSideBySideFieldRow(columnLines, pageWidth)) {
      picked.push(...columnLines);
      continue;
    }

    picked.push(scored[0].line);
  }

  let deduped = dedupeDuplicateFieldRows(picked, pageWidth, pageHeight);
  deduped.sort((a, b) => b.y - a.y || a.left - b.left);
  const maxLines = options.maxLinesPerPage ?? 12;
  if (deduped.length <= maxLines) return deduped;

  return deduped
    .map((line) => ({ line, score: scoreFormLine(line, pageWidth, pageHeight, options) }))
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

  return assignContinuationGroups(slots, options);
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
  let lines;

  if (options.diaryBrownFormMode === true) {
    lines = mergeBrownDiaryFormLines(segments, pageWidth, pageHeight, options);
  } else {
    lines = mergeHorizontalLines(segments, pageWidth, pageHeight, options);
    if (options.formLineRefine) {
      lines = refineFormInputLines(lines, pageWidth, pageHeight, options);
    }
    if (options.collapseNearbyRows) {
      lines = collapseNearbyRows(lines, pageHeight, options.minRowGapNorm ?? 0.016);
    }
    if (options.diaryFormMode === true) {
      lines = filterDiaryFormLines(lines, pageWidth, pageHeight, options);
    }
  }

  const textItems = await collectTextItems(page);
  return buildSlotsFromPdfLines(lines, textItems, pageWidth, pageHeight, options);
}

async function extractSlotsForPdfPage(pdfDocument, pageNumber, options) {
  const page = await pdfDocument.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  const { width: pageWidth, height: pageHeight } = viewport;
  const pageOptions = { ...options, pageNumber };

  if (pageOptions.slotMode === 'whiteBlocks') {
    let blocks = await collectWhiteInputBlocks(page, pageOptions);
    blocks = filterBirthdayNoiseBlocks(blocks, pageWidth, pageOptions);
    const maxBlocks = pageOptions.maxBlocksPerPage ?? 12;
    if (blocks.length > maxBlocks) {
      blocks = [...blocks]
        .sort((a, b) => b.span - a.span)
        .slice(0, maxBlocks)
        .sort((a, b) => b.normY - a.normY);
    }
    const textItems = await collectTextItems(page);
    const blockSlots = buildSlotsFromWhiteBlocks(blocks, textItems, pageWidth, pageHeight, pageOptions);
    if (blockSlots.length > 0) {
      return blockSlots;
    }
    if (pageOptions.hybridLineFallback !== false) {
      return extractLineSlotsForPage(
        page,
        pageWidth,
        pageHeight,
        pageOptions.lineFallbackOptions ?? pageOptions
      );
    }
    return blockSlots;
  }

  return extractLineSlotsForPage(page, pageWidth, pageHeight, pageOptions);
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
  mergeBrownDiaryFormLines,
  refineFormInputLines,
};
