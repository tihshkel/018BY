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
  const spans = sorted.map((line) => line.span / pageWidth);
  const leftSpan = spans[0];
  const rightSpan = spans[spans.length - 1];
  const rightLeftRatio = sorted[sorted.length - 1].left / pageWidth;

  // Широкая строка слева + узкое поле в сером блоке справа (недели дневника беременности).
  const isSidebarRow =
    lines.length === 2 &&
    leftSpan > 0.38 &&
    rightSpan < 0.35 &&
    rightLeftRatio > 0.55;

  if (!isSidebarRow) {
    for (let i = 1; i < sorted.length; i += 1) {
      const gap = sorted[i].left - sorted[i - 1].right;
      if (gap / pageWidth < 0.06) return false;
    }
  }

  if (isSidebarRow) return true;

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

    // Верхняя строка — подпись в облаке, нижняя — поле ввода (детский альбом, стр. 4).
    const dropRow =
      upper.normY < lower.normY && spanRatio >= 1.08
        ? upper
        : avgSpanUpper <= avgSpanLower
          ? lower
          : upper;
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

/** Декоративный rowtrim рядом с полной линией ввода (артефакт склейки строк PDF). */
function isBrownSpuriousRowtrimLine(line, pageWidth, pageHeight, lines) {
  if (line.source !== 'rowtrim') return false;

  const spanRatio = line.span / pageWidth;
  const normY = (pageHeight - line.y) / pageHeight;
  if (spanRatio >= 0.62) return false;

  return lines.some((other) => {
    if (other === line) return false;
    const otherNormY = (pageHeight - other.y) / pageHeight;
    if (Math.abs(otherNormY - normY) > 0.05) return false;
    const otherSpan = other.span / pageWidth;
    const otherLeft = other.left / pageWidth;
    return other.source === 'wide-block' || (otherSpan >= 0.72 && otherLeft < 0.16);
  });
}

function isBrownFullRowArtifact(line, pageWidth) {
  if (line.source === 'box' || line.source === 'wide-block') return false;

  const leftRatio = line.left / pageWidth;
  const spanRatio = line.span / pageWidth;
  if (leftRatio < 0.12 && spanRatio > 0.65 && spanRatio < 0.95) return false;
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

/** Строка из десятков микро-штрихов (контуры подписи без текстового слоя PDF). */
function isBrownMicroSegmentLabelRow(sorted, pageWidth, options = {}) {
  const minSegments = options.brownMicroRowMinSegments ?? 12;
  if (sorted.length < minSegments) return false;
  const avgSpanRatio =
    sorted.reduce((sum, seg) => sum + seg.span, 0) / sorted.length / pageWidth;
  return avgSpanRatio < (options.brownMicroRowMaxAvgSpanRatio ?? 0.008);
}

function findBrownGapInput(sorted, pageWidth, options = {}) {
  const minFallbackSpan = options.brownInputMinSpanFallback ?? 0.14;
  const minRightShort = options.brownInputMinRightShort ?? 0.45;
  const minGapRatio = options.brownInputMinGapRatio ?? 0.018;
  const microRow = isBrownMicroSegmentLabelRow(sorted, pageWidth, options);
  const microMinSpan = options.brownMicroRowMinWritableSpan ?? 0.08;
  const microMinLabelEnd = options.brownMicroRowMinLabelEndRatio ?? 0.55;

  let best = null;
  let bestScore = -1;
  const microCandidates = [];

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
    const minSpan = microRow ? microMinSpan : minFallbackSpan;

    if (spanRatio < minSpan || rightRatio < minRightShort) continue;
    if (leftRatio < preRightRatio + 0.012) continue;
    if (preRightRatio < 0.1 && gapIndex === 1) continue;
    const maxPreRight = options.brownGapMaxPreRightRatio ?? 0.74;
    if (preRightRatio > maxPreRight) continue;

    const candidate = { left, right, span, source: 'gap', labelRight: preRight };

    if (microRow) {
      if (preRightRatio >= microMinLabelEnd) {
        microCandidates.push(candidate);
      }
      continue;
    }

    let score = spanRatio + rightRatio * 0.45 + gapRatio * 2;
    if (preRightRatio >= 0.14 && preRightRatio <= 0.5) score += 0.45;
    if (preRightRatio > 0.5 && preRightRatio <= 0.72) score += 0.55;
    if (leftRatio >= 0.26 && leftRatio <= 0.72) score += 0.35;
    if (gapRatio >= 0.022) score += 0.25;

    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  if (microRow) {
    if (!microCandidates.length) return null;
    microCandidates.sort((a, b) => b.labelRight - a.labelRight || b.span - a.span);
    return microCandidates[0];
  }

  return best;
}

function attachRowLabelGeometry(line, rowSegments, pageWidth, options = {}) {
  if (!line || line.labelRight != null || !rowSegments?.length) return line;
  const sorted = [...rowSegments].sort((a, b) => a.left - b.left);
  const gapMeta = findBrownGapInput(sorted, pageWidth, options);
  if (gapMeta?.labelRight != null) {
    return { ...line, labelRight: gapMeta.labelRight };
  }
  return line;
}

function hasBrownSolidInputSegment(rowSegments, pageWidth, options = {}) {
  const minLongSpan = options.brownInputMinSpanRatio ?? 0.35;
  const minRightLong = options.brownInputMinRightRatio ?? 0.85;
  const minLeft = options.brownSolidMinLeftRatio ?? 0.28;
  const minFullLeft = options.brownShortFullMinLeftRatio ?? 0.05;
  return rowSegments.some((seg) => {
    const leftRatio = seg.left / pageWidth;
    const spanRatio = seg.span / pageWidth;
    const rightRatio = seg.right / pageWidth;
    if (
      leftRatio >= minFullLeft &&
      leftRatio < minLeft &&
      spanRatio >= 0.45 &&
      rightRatio >= minRightLong
    ) {
      return true;
    }
    return spanRatio >= minLongSpan && rightRatio >= minRightLong && leftRatio >= minLeft;
  });
}

function isBrownDecorativeRightMicroLine(line, pageWidth) {
  const leftRatio = line.left / pageWidth;
  const spanRatio = line.span / pageWidth;
  return leftRatio > 0.55 && spanRatio < 0.25;
}

function brownPageHasFormInputs(segments, pageWidth, pageHeight, options = {}) {
  const maxHorizontalDeltaPt = options.maxHorizontalDeltaPt ?? 1.2;
  const minSegmentSpanPt = options.minSegmentSpanPt ?? 1.2;
  const bottomCutPt = options.bottomCutPt ?? 28;
  const topCutPt = options.topCutPt ?? 40;

  return segments.some((s) => {
    if (Math.abs(s.y1 - s.y2) > maxHorizontalDeltaPt) return false;
    const left = Math.min(s.x1, s.x2);
    const right = Math.max(s.x1, s.x2);
    const y = (s.y1 + s.y2) / 2;
    const span = right - left;
    if (span < minSegmentSpanPt) return false;
    if (y < bottomCutPt || y > pageHeight - topCutPt) return false;
    const leftRatio = left / pageWidth;
    const spanRatio = span / pageWidth;
    if (leftRatio < 0 || spanRatio > 0.92) return false;
    return (
      (leftRatio < 0.35 && spanRatio >= 0.25) ||
      (leftRatio < 0.12 && spanRatio >= 0.55)
    );
  });
}

function isBrownNarrativeProsePage(lines, pageWidth) {
  if (!lines.length) return false;
  const hasRealFormLine = lines.some((line) => {
    const leftRatio = line.left / pageWidth;
    const spanRatio = line.span / pageWidth;
    return (
      (leftRatio < 0.35 && spanRatio >= 0.3) ||
      (leftRatio < 0.15 && spanRatio >= 0.55) ||
      line.source === 'wide-block' ||
      line.source === 'box'
    );
  });
  if (hasRealFormLine) return false;
  return lines.every((line) => isBrownDecorativeRightMicroLine(line, pageWidth));
}

/**
 * Короткая подпись («Имя:») — длинная линия ввода начинается левее brownSolidMinLeftRatio.
 * Эталон: bbox сегмента PDF, не PNG.
 */
function pickBrownShortLabelFullRowLine(rowSegments, pageWidth, options = {}) {
  const minLeft = options.brownShortFullMinLeftRatio ?? 0.1;
  const maxLeft = options.brownShortFullMaxLeftRatio ?? (options.brownSolidMinLeftRatio ?? 0.28);
  const minSpan = options.brownShortFullMinSpanRatio ?? 0.48;
  const minRight = options.brownInputMinRightRatio ?? 0.85;

  const candidates = rowSegments
    .filter((seg) => {
      const leftRatio = seg.left / pageWidth;
      const spanRatio = seg.span / pageWidth;
      const rightRatio = seg.right / pageWidth;
      return (
        leftRatio >= minLeft &&
        leftRatio < maxLeft &&
        spanRatio >= minSpan &&
        rightRatio >= minRight
      );
    })
    .sort((a, b) => b.span - a.span || a.left - b.left);

  if (!candidates.length) return null;

  const best = candidates[0];
  return {
    y: best.y,
    left: best.left,
    right: best.right,
    span: best.span,
    source: 'solid-short',
  };
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

/**
 * Короткий хвост подписи на строке с микро-штрихами (контуры букв без текстового слоя).
 * Пример: «…заниматься?____» на стр. 13 — ввод с конца вопроса до правого края.
 */
function pickBrownMicroRowLabelTailLine(rowSegments, pageWidth, pageHeight, options = {}) {
  const rowY =
    rowSegments.reduce((sum, seg) => sum + seg.y, 0) / Math.max(rowSegments.length, 1);
  const normY = (pageHeight - rowY) / pageHeight;
  const labeledMinY = options.brownQuestionnaireLabeledRowMinNormY ?? 0.55;
  const labeledMaxY = options.brownQuestionnaireLabeledRowMaxNormY ?? 0.72;
  const disableMicroTailBand =
    options.brownDisableMicroTailBand === true ||
    (options.pageNumber === getDiaryCareerQuestionPage(options) &&
      normY >= 0.68 &&
      normY <= 0.72);
  if (
    disableMicroTailBand &&
    isDiaryQuestionnairePage(options) &&
    normY >= labeledMinY &&
    normY <= labeledMaxY
  ) {
    return null;
  }

  const sorted = [...rowSegments].sort((a, b) => a.left - b.left);
  if (!isBrownMicroSegmentLabelRow(sorted, pageWidth, options)) return null;

  const gapMeta = findBrownGapInput(sorted, pageWidth, options);
  if (!gapMeta?.labelRight) return null;

  const labelRightRatio = gapMeta.labelRight / pageWidth;
  const tailGap = options.brownMicroRowTailGapRatio ?? 0.008;
  const minTailLeft = labelRightRatio + tailGap;
  const tailSegs = sorted.filter((seg) => seg.left / pageWidth >= minTailLeft - 0.012);
  if (!tailSegs.length) return null;

  const columnGapPx = pageWidth * (options.brownDashClusterGapRatio ?? 0.032);
  const clusters = clusterRowSegments(tailSegs, columnGapPx);
  const rightCluster = clusters.sort((a, b) => b.right - a.right)[0];
  if (!rightCluster) return null;

  const minTailSpan = options.brownMicroRowMinTailSpan ?? 0.04;
  const maxTailSpan = options.brownMicroRowMaxTailSpan ?? 0.32;
  const targetRightRatio = options.brownMicroRowTailTargetRight ?? 0.895;

  const gapPx = options.brownLabelInputGapPt ?? 5;
  const leftFromLabel = gapMeta.labelRight + gapPx;
  let left = Math.max(leftFromLabel, rightCluster.left);
  let right = Math.max(rightCluster.right, pageWidth * targetRightRatio);
  let span = right - left;
  let spanRatio = span / pageWidth;

  if (spanRatio < minTailSpan) {
    right = pageWidth * targetRightRatio;
    left = leftFromLabel;
    span = right - left;
    spanRatio = span / pageWidth;
  }

  if (spanRatio < minTailSpan || spanRatio > maxTailSpan) return null;

  const leftRatio = left / pageWidth;
  const minTailLeftRatio = options.brownMicroRowTailMinLeftRatio ?? 0.55;
  if (leftRatio < minTailLeftRatio) return null;

  const tailRowY =
    tailSegs.reduce((sum, seg) => sum + seg.y, 0) / Math.max(tailSegs.length, 1);
  const tailNormY = (pageHeight - tailRowY) / pageHeight;
  const minNormY = options.brownMicroRowTailMinNormY ?? 0.2;
  const maxNormY = options.brownMicroRowTailMaxNormY ?? 0.92;
  if (tailNormY < minNormY || tailNormY > maxNormY) return null;

  return {
    y: tailRowY,
    left,
    right,
    span,
    source: 'dashed-gap',
    labelRight: gapMeta.labelRight,
  };
}

/**
 * Короткий хвост после «?» на «Кем ты хочешь стать…» (стр. 6).
 * PDF даёт сплошную линию под всем вопросом — ввод только справа от «?».
 * Не путать со строками «Лучшая подруга» (~0.69) и «Лучший друг» (~0.73).
 */
function pickBrownPage6CareerQuestionTailLine(rowSegments, pageWidth, pageHeight, options = {}) {
  if (
    options.pageNumber !== getDiaryCareerQuestionPage(options) ||
    !isDiaryQuestionnairePage(options) ||
    !rowSegments.length
  ) {
    return null;
  }

  const rowY =
    rowSegments.reduce((sum, seg) => sum + seg.y, 0) / Math.max(rowSegments.length, 1);
  const normY = (pageHeight - rowY) / pageHeight;
  const questionY = options.brownPage6CareerQuestionNormY ?? 0.773;
  const minNormY = options.brownPage6CareerQuestionMinNormY ?? questionY - 0.012;
  const maxNormY = options.brownPage6CareerQuestionMaxNormY ?? questionY + 0.012;
  if (normY < minNormY || normY > maxNormY) return null;

  const solid = rowSegments
    .filter((seg) => {
      const spanRatio = seg.span / pageWidth;
      const rightRatio = seg.right / pageWidth;
      const leftRatio = seg.left / pageWidth;
      return spanRatio >= 0.45 && rightRatio >= 0.85 && leftRatio < 0.4;
    })
    .sort((a, b) => b.span - a.span)[0];

  if (!solid) return null;

  const targetRightRatio = options.brownMicroRowTailTargetRight ?? 0.895;
  const tailLeftRatio = options.brownPage6CareerTailLeftRatio ?? 0.768;
  const gapPx = options.brownLabelInputGapPt ?? 5;
  const minTailSpan = options.brownPage6CareerMinTailSpan ?? 0.06;
  const maxTailSpan = options.brownPage6CareerMaxTailSpan ?? 0.18;

  const right = Math.max(solid.right, pageWidth * targetRightRatio);
  let left = pageWidth * tailLeftRatio;
  let span = right - left;
  let spanRatio = span / pageWidth;

  if (spanRatio < minTailSpan) {
    left = right - pageWidth * minTailSpan;
    span = right - left;
    spanRatio = span / pageWidth;
  }

  if (spanRatio < minTailSpan || spanRatio > maxTailSpan) return null;

  return {
    y: solid.y,
    left,
    right,
    span,
    source: 'dashed-gap',
    labelRight: left - gapPx,
  };
}

function isBrownDecorativeDashedRow(rowSegments, pageWidth, pageHeight, options = {}) {
  if (hasBrownSolidInputSegment(rowSegments, pageWidth, options)) return false;
  if (pickBrownMicroRowLabelTailLine(rowSegments, pageWidth, pageHeight, options)) {
    return false;
  }

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
  const rowY =
    rowSegments.reduce((sum, seg) => sum + seg.y, 0) / Math.max(rowSegments.length, 1);
  const sortedRow = [...rowSegments].sort((a, b) => a.left - b.left);
  const gapFromRow = findBrownGapInput(sortedRow, pageWidth, options);
  if (gapFromRow) {
    const leftRatio = gapFromRow.left / pageWidth;
    const minGapLeft = options.brownDashedGapMinLeftRatio ?? 0.18;
    if (leftRatio >= minGapLeft) {
      return { y: rowY, ...gapFromRow, source: 'dashed-gap' };
    }
  }

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

/**
 * Строки анкеты с подписью («Лучшая подруга:», «Лучший друг:» и т.п.).
 * PDF даёт контуры букв + пунктир — micro-tail ошибочно ставит ввод у правого края.
 */
function pickBrownQuestionnaireLabeledRowLine(
  rowSegments,
  pageWidth,
  pageHeight,
  options = {}
) {
  if (!isDiaryQuestionnairePage(options) || !rowSegments.length) return null;

  const rowY =
    rowSegments.reduce((sum, seg) => sum + seg.y, 0) / Math.max(rowSegments.length, 1);
  const normY = (pageHeight - rowY) / pageHeight;
  const minY = options.brownQuestionnaireLabeledRowMinNormY ?? 0.55;
  const maxY = options.brownQuestionnaireLabeledRowMaxNormY ?? 0.72;
  if (normY < minY || normY > maxY) return null;

  const maxLeft = options.brownQuestionnaireLabeledRowMaxLeftRatio ?? 0.68;
  const minSpan = options.brownQuestionnaireLabeledRowMinSpan ?? 0.18;

  const shortFull = pickBrownShortLabelFullRowLine(rowSegments, pageWidth, options);
  if (shortFull) {
    const leftRatio = shortFull.left / pageWidth;
    const spanRatio = shortFull.span / pageWidth;
    if (leftRatio < maxLeft && spanRatio >= minSpan) {
      return attachRowLabelGeometry(shortFull, rowSegments, pageWidth, options);
    }
  }

  const line = pickBrownRowInputLine(rowSegments, pageWidth, pageHeight, options);
  if (!line) return null;

  const leftRatio = line.left / pageWidth;
  const spanRatio = line.span / pageWidth;
  if (leftRatio >= maxLeft || spanRatio < minSpan) return null;

  return line;
}

/** Одна визуальная строка: сплошная линия или склеенный пунктир. */
function pickBrownRowInputLine(rowSegments, pageWidth, pageHeight, options = {}) {
  if (!rowSegments.length) return null;

  const shortFull = pickBrownShortLabelFullRowLine(rowSegments, pageWidth, options);
  if (shortFull) {
    return attachRowLabelGeometry(shortFull, rowSegments, pageWidth, options);
  }

  const solid = pickBrownSolidRowInputLine(rowSegments, pageWidth, options);
  if (solid) {
    return attachRowLabelGeometry(solid, rowSegments, pageWidth, options);
  }

  const dashed = pickBrownDashedRowInputLine(rowSegments, pageWidth, pageHeight, options);
  if (dashed) {
    return attachRowLabelGeometry(dashed, rowSegments, pageWidth, options);
  }

  const minLongSpan = options.brownInputMinSpanRatio ?? 0.35;
  const minFallbackSpan = options.brownInputMinSpanFallback ?? 0.14;
  const minRightLong = options.brownInputMinRightRatio ?? 0.85;
  const minRightShort = options.brownInputMinRightShort ?? 0.45;
  const y = rowSegments.reduce((sum, seg) => sum + seg.y, 0) / rowSegments.length;
  const sorted = [...rowSegments].sort((a, b) => a.left - b.left);

  const gapInput = findBrownGapInput(sorted, pageWidth, options);
  if (gapInput) {
    return attachRowLabelGeometry({ y, ...gapInput, source: 'gap' }, rowSegments, pageWidth, options);
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
      return attachRowLabelGeometry(
        {
          y: best.y,
          left: best.left,
          right: best.right,
          span: best.span,
          source: 'input',
        },
        rowSegments,
        pageWidth,
        options
      );
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
        return attachRowLabelGeometry(
          { y, left, right, span, source: 'rowtrim' },
          rowSegments,
          pageWidth,
          options
        );
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
    return attachRowLabelGeometry(
      {
        y: bestCluster.y,
        left: bestCluster.left,
        right: bestCluster.right,
        span: bestCluster.span,
        source: 'cluster',
      },
      rowSegments,
      pageWidth,
      options
    );
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
  if (options.pageNumber === 1) {
    const coverLines = extractBrownCoverPageLinesWithFallback(
      segments,
      pageWidth,
      pageHeight,
      options
    );
    if (coverLines.length > 0) {
      return coverLines;
    }
  }

  if (
    options.pageNumber !== 1 &&
    !brownPageHasFormInputs(segments, pageWidth, pageHeight, options)
  ) {
    return [];
  }

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
    const careerTail =
      isDiaryQuestionnairePage(options) &&
      pickBrownPage6CareerQuestionTailLine(
        group.segments,
        pageWidth,
        pageHeight,
        options
      );
    if (careerTail) {
      lines.push(careerTail);
      continue;
    }

    const labeledRow = pickBrownQuestionnaireLabeledRowLine(
      group.segments,
      pageWidth,
      pageHeight,
      options
    );
    if (labeledRow) {
      lines.push(labeledRow);
      continue;
    }

    const microTail =
      isDiaryQuestionnairePage(options) &&
      pickBrownMicroRowLabelTailLine(group.segments, pageWidth, pageHeight, options);
    if (microTail) {
      lines.push(microTail);
      continue;
    }

    if (isBrownDecorativeDashedRow(group.segments, pageWidth, pageHeight, options)) {
      continue;
    }

    const boxLines = extractBrownBoxedInputLinesFromRow(
      group.segments,
      pageWidth,
      pageHeight,
      options
    );
    if (boxLines.length > 0) {
      lines.push(...boxLines);
      continue;
    }

    const wideBlockLines = extractBrownWideBlockLinesFromRow(
      group.segments,
      pageWidth,
      pageHeight,
      options
    );
    if (wideBlockLines.length > 0) {
      lines.push(...wideBlockLines);
      continue;
    }

    const picked = pickBrownRowInputLine(group.segments, pageWidth, pageHeight, options);
    if (picked) {
      lines.push(picked);
      continue;
    }

    if (
      options.pageNumber !== 1 &&
      group.normY >= (options.brownCoverFallbackMinNormY ?? 0.28) &&
      group.normY <= (options.brownCoverFallbackMaxNormY ?? 0.44)
    ) {
      lines.push(...extractBrownCoverRowLines(group.segments, pageWidth, pageHeight, options));
    }
  }

  return finalizeBrownDiaryPageLines(lines, pageWidth, pageHeight, options);
}

function extractBrownBoxedInputLinesFromSegmentList(
  rowSegments,
  pageWidth,
  pageHeight,
  columnBounds,
  options = {}
) {
  const minSpan = options.brownBoxMinSpanRatio ?? 0.18;
  const maxSpan = options.brownBoxMaxSpanRatio ?? 0.52;
  const minLeft = columnBounds.minLeft ?? options.brownBoxMinLeftRatio ?? 0.05;
  const maxLeft = columnBounds.maxLeft ?? options.brownBoxMaxLeftRatio ?? 0.28;
  const minNormY = options.brownBoxMinNormY ?? 0.14;
  const maxNormY = options.brownBoxMaxNormY ?? 0.96;

  const valid = rowSegments.filter((seg) => {
    const spanRatio = seg.span / pageWidth;
    const leftRatio = seg.left / pageWidth;
    const normY = (pageHeight - seg.y) / pageHeight;
    if (normY < minNormY || normY > maxNormY) return false;
    if (spanRatio < minSpan || spanRatio > maxSpan) return false;
    if (leftRatio < minLeft || leftRatio > maxLeft) return false;
    if (spanRatio > 0.72) return false;
    return true;
  });

  return valid.map((seg) => ({
    y: seg.y,
    left: seg.left,
    right: seg.right,
    span: seg.span,
    source: 'box',
  }));
}

/** Розовые блоки «Мечты» и др.: короткие линии в двух колонках (PDF-вектор). */
function extractBrownBoxedInputLinesFromRow(rowSegments, pageWidth, pageHeight, options = {}) {
  const splitRatio = options.brownBoxColumnSplitRatio ?? 0.5;
  const splitX = pageWidth * splitRatio;
  const leftSegs = rowSegments.filter((seg) => seg.right <= splitX + pageWidth * 0.04);
  const rightSegs = rowSegments.filter((seg) => seg.left >= splitX - pageWidth * 0.04);

  const lines = [
    ...extractBrownBoxedInputLinesFromSegmentList(
      leftSegs,
      pageWidth,
      pageHeight,
      { minLeft: 0.05, maxLeft: 0.28 },
      options
    ),
    ...extractBrownBoxedInputLinesFromSegmentList(
      rightSegs,
      pageWidth,
      pageHeight,
      { minLeft: 0.42, maxLeft: 0.78 },
      options
    ),
  ];

  return lines;
}

/** Широкие белые линии внутри розового блока (стр. «Твой день», «Мечты» и т.п.). */
function extractBrownWideBlockLinesFromRow(rowSegments, pageWidth, pageHeight, options = {}) {
  const minSpan = options.brownWideBlockMinSpanRatio ?? 0.45;
  const maxSpan = options.brownWideBlockMaxSpanRatio ?? 0.95;
  const maxLeft = options.brownWideBlockMaxLeftRatio ?? 0.2;
  const minNormY = options.brownWideBlockMinNormY ?? 0.28;
  const maxNormY = options.brownWideBlockMaxNormY ?? 0.92;

  return rowSegments
    .filter((seg) => {
      const spanRatio = seg.span / pageWidth;
      const leftRatio = seg.left / pageWidth;
      const normY = (pageHeight - seg.y) / pageHeight;
      if (normY < minNormY || normY > maxNormY) return false;
      if (spanRatio < minSpan || spanRatio > maxSpan) return false;
      if (leftRatio > maxLeft) return false;
      return true;
    })
    .map((seg) => ({
      y: seg.y,
      left: seg.left,
      right: seg.right,
      span: seg.span,
      source: 'wide-block',
    }));
}

function scoreBrownDiaryLine(line, pageWidth, pageHeight) {
  const leftRatio = line.left / pageWidth;
  const spanRatio = line.span / pageWidth;
  const normY = (pageHeight - line.y) / pageHeight;
  let score = spanRatio;
  if (line.source === 'solid' || line.source === 'dashed' || line.source === 'dashed-gap') score += 2.5;
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

function isBrownCoverPage(_lines, _pageWidth, _pageHeight, options = {}) {
  return options.pageNumber === 1;
}

/** Обложка коричневого блока: две сплошные линии «принадлежит» (из вектора PDF, не PNG). */
function extractBrownCoverPageLines(segments, pageWidth, pageHeight, options = {}) {
  const maxHorizontalDeltaPt = options.maxHorizontalDeltaPt ?? 1.2;
  const minSegmentSpanPt = options.minSegmentSpanPt ?? 1.2;
  const bottomCutPt = options.bottomCutPt ?? 28;
  const topCutPt = options.topCutPt ?? 40;
  const minNormY = options.brownCoverMinNormY ?? 0.45;
  const maxNormY = options.brownCoverMaxNormY ?? 0.68;
  const minSpanRatio = options.brownCoverMinSpanRatio ?? 0.38;
  const maxSpanRatio = options.brownCoverMaxSpanRatio ?? 0.72;
  const minLeftRatio = options.brownCoverMinLeftRatio ?? 0.14;
  const maxLeftRatio = options.brownCoverMaxLeftRatio ?? 0.28;
  const minRightRatio = options.brownCoverMinRightRatio ?? 0.75;

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

  const rows = [];
  for (const line of candidates) {
    const normY = (pageHeight - line.y) / pageHeight;
    const spanRatio = line.span / pageWidth;
    const leftRatio = line.left / pageWidth;
    const rightRatio = line.right / pageWidth;
    if (normY < minNormY || normY > maxNormY) continue;
    if (spanRatio < minSpanRatio || spanRatio > maxSpanRatio) continue;
    if (leftRatio < minLeftRatio || leftRatio > maxLeftRatio) continue;
    if (rightRatio < minRightRatio) continue;
    rows.push({ ...line, normY });
  }

  rows.sort((a, b) => a.normY - b.normY);
  const clustered = [];
  for (const row of rows) {
    const last = clustered[clustered.length - 1];
    if (last && Math.abs(last.normY - row.normY) < 0.028) {
      if (row.span > last.span) clustered[clustered.length - 1] = row;
      continue;
    }
    clustered.push(row);
  }

  return clustered.slice(0, 2).map(({ normY, ...line }) => ({ ...line, source: 'cover-input' }));
}

/** Обложка: пунктирные строки + сплошные (фиолетовый блок часто без solid). */
function extractBrownCoverPageLinesWithFallback(segments, pageWidth, pageHeight, options = {}) {
  const minNormY = options.brownCoverMinNormY ?? 0.45;
  const maxNormY = options.brownCoverMaxNormY ?? 0.72;
  const maxHorizontalDeltaPt = options.maxHorizontalDeltaPt ?? 1.2;
  const minSegmentSpanPt = options.minSegmentSpanPt ?? 1.2;
  const mergeGapPt = options.mergeGapPt ?? 6;

  let lines = extractBrownCoverPageLines(segments, pageWidth, pageHeight, options);

  if (lines.length >= 2) {
    return lines.sort(
      (a, b) => (pageHeight - a.y) / pageHeight - (pageHeight - b.y) / pageHeight
    );
  }

  const candidates = segments
    .filter((s) => Math.abs(s.y1 - s.y2) <= maxHorizontalDeltaPt)
    .map((s) => {
      const left = Math.min(s.x1, s.x2);
      const right = Math.max(s.x1, s.x2);
      const y = (s.y1 + s.y2) / 2;
      return { y, left, right, span: right - left };
    })
    .filter((l) => l.span >= minSegmentSpanPt);

  const rowBins = new Map();
  for (const seg of candidates) {
    const normY = (pageHeight - seg.y) / pageHeight;
    if (normY < minNormY || normY > maxNormY) continue;
    const bin = Math.round(seg.y / mergeGapPt);
    if (!rowBins.has(bin)) rowBins.set(bin, []);
    rowBins.get(bin).push(seg);
  }

  for (const [, rowSegments] of rowBins) {
    if (isBrownDecorativeDashedRow(rowSegments, pageWidth, pageHeight, options)) {
      continue;
    }
    const picked = pickBrownRowInputLine(rowSegments, pageWidth, pageHeight, options);
    if (!picked) continue;
    const normY = (pageHeight - picked.y) / pageHeight;
    const duplicate = lines.some(
      (prev) => Math.abs((pageHeight - prev.y) / pageHeight - normY) < 0.028
    );
    if (!duplicate) lines.push({ ...picked, source: picked.source ?? 'cover-input' });
  }

  lines.sort(
    (a, b) => (pageHeight - a.y) / pageHeight - (pageHeight - b.y) / pageHeight
  );

  return lines.slice(0, 2);
}

function finalizeBrownDiaryPageLines(lines, pageWidth, pageHeight, options = {}) {
  if (isBrownNarrativeProsePage(lines, pageWidth)) {
    return [];
  }

  const minRowGap = options.brownMinRowGapNorm ?? 0.022;
  const formEndNormY = options.brownFormEndNormY ?? 0.88;

  let filtered = lines.filter((line) => {
    const normY = (pageHeight - line.y) / pageHeight;
    const spanRatio = line.span / pageWidth;
    const leftRatio = line.left / pageWidth;
    if (isBrownDecorativeRightMicroLine(line, pageWidth)) return false;
    if (isBrownFullRowArtifact(line, pageWidth)) return false;
    if (
      line.source !== 'box' &&
      line.source !== 'wide-block' &&
      normY > formEndNormY &&
      spanRatio > 0.6
    ) {
      return false;
    }
    if (spanRatio < 0.08) return false;
    const isMicroLabelTail =
      line.source === 'dashed-gap' && line.labelRight != null && leftRatio >= 0.55;
    if (
      !isMicroLabelTail &&
      line.source !== 'box' &&
      line.source !== 'wide-block' &&
      leftRatio > 0.58 &&
      spanRatio < 0.22
    ) {
      return false;
    }
    return true;
  });

  if (isBrownCoverPage(lines, pageWidth, pageHeight, options)) {
    const minCoverY = options.brownCoverMinNormY ?? 0.45;
    const maxCoverY = options.brownCoverMaxNormY ?? 0.68;
    filtered = filtered.filter((line) => {
      const normY = (pageHeight - line.y) / pageHeight;
      const spanRatio = line.span / pageWidth;
      const leftRatio = line.left / pageWidth;
      return (
        normY >= minCoverY &&
        normY <= maxCoverY &&
        spanRatio >= 0.35 &&
        spanRatio <= 0.72 &&
        leftRatio >= 0.14 &&
        leftRatio <= 0.28
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

  const formStartNormY = options.brownQuestionnaireStartNormY ?? 0.14;
  const questionnaireEndNormY = options.brownQuestionnaireEndNormY ?? 0.94;
  filtered = filtered.filter((line) => {
    const normY = (pageHeight - line.y) / pageHeight;
    const spanRatio = line.span / pageWidth;
    const leftRatio = line.left / pageWidth;
    if (line.source === 'box') {
      const boxMinY = options.brownBoxMinNormY ?? 0.14;
      const boxMaxY = options.brownBoxMaxNormY ?? 0.96;
      if (normY < boxMinY || normY > boxMaxY) return false;
      return true;
    }
    if (line.source === 'wide-block') {
      if (normY < (options.brownWideBlockMinNormY ?? 0.28)) return false;
      if (normY > (options.brownWideBlockMaxNormY ?? 0.92)) return false;
      if (normY > 0.935 && leftRatio < 0.14 && spanRatio > 0.75) return false;
      return true;
    }
    if (line.source === 'wide-block') {
      if (normY < (options.brownWideBlockMinNormY ?? 0.28)) return false;
      if (normY > (options.brownWideBlockMaxNormY ?? 0.92)) return false;
      if (normY > 0.88 && leftRatio < 0.14 && spanRatio > 0.75) return false;
      return true;
    }
    if (normY < formStartNormY) return false;
    if (normY > questionnaireEndNormY) return false;
    if (normY > 0.86 && spanRatio < 0.32) return false;
    return true;
  });

  filtered = filtered.filter(
    (line) => !isBrownSpuriousRowtrimLine(line, pageWidth, pageHeight, filtered)
  );

  filtered.sort((a, b) => b.y - a.y || a.left - b.left);
  const collapsed = [];

  for (const line of filtered) {
    const normY = (pageHeight - line.y) / pageHeight;
    const lineLeftRatio = line.left / pageWidth;
    const duplicate = collapsed.find((prev) => {
      const prevNorm = (pageHeight - prev.y) / pageHeight;
      if (Math.abs(prevNorm - normY) >= minRowGap) return false;
      const prevLeftRatio = prev.left / pageWidth;
      if (
        prev.source === 'box' &&
        line.source === 'box' &&
        Math.abs(prevLeftRatio - lineLeftRatio) > 0.22
      ) {
        return false;
      }
      const overlap =
        horizontalOverlap(prev, line) / Math.min(prev.span, line.span);
      return overlap > 0.35;
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
  const maxLines = isBrownPeachDreamsPage(options)
    ? (options.brownPeachMaxLinesPerPage ?? 35)
    : (options.maxLinesPerPage ?? 30);
  return collapsed.slice(0, maxLines);
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

/** Правая граница подписи на строке (вопрос «Кем ты хочешь…» и т.п.). */
function getBrownRowLabelExtents(textItems, line, pageWidth, pageHeight, options = {}) {
  if (line.labelRight != null) {
    return {
      left: 0,
      right: line.labelRight,
    };
  }

  const labelYWindow = pageHeight * (options.brownLabelYWindowRatio ?? 0.026);
  const maxLabelLeft = pageWidth * (options.brownLabelMaxLeftRatio ?? 0.88);

  const onRow = textItems.filter((item) => {
    if (Math.abs(item.y - line.y) > labelYWindow) return false;
    const compact = item.str.replace(/\s+/g, '');
    if (compact.length === 0) return false;
    if (compact.toLowerCase() === 'лет') return false;
    if (item.x > maxLabelLeft) return false;
    return item.right <= line.right + pageWidth * 0.03;
  });

  if (!onRow.length) return null;

  return {
    left: Math.min(...onRow.map((item) => item.x)),
    right: Math.max(...onRow.map((item) => item.right)),
  };
}

/** Сдвигает left поля ввода за конец подписи (длинные вопросы анкеты). */
function trimBrownWritableLineFromLabels(line, textItems, pageWidth, pageHeight, options = {}) {
  const extents = getBrownRowLabelExtents(textItems, line, pageWidth, pageHeight, options);
  if (!extents) return line;

  const gapPx = options.brownLabelInputGapPt ?? 5;
  const minLeft = extents.right + gapPx;
  const minSpanPx = pageWidth * (options.brownMinWritableSpanRatio ?? 0.12);

  if (minLeft <= line.left + pageWidth * 0.01) return line;

  const newLeft = Math.min(minLeft, line.right - minSpanPx);
  if (newLeft >= line.right - minSpanPx) return line;

  return { ...line, left: newLeft, span: line.right - newLeft };
}


const BROWN_WRITABLE_LINE_SOURCES = new Set([
  'gap',
  'solid',
  'dashed',
  'cover-input',
  'box',
  'wide-block',
  'rowtrim',
  'cluster',
  'input',
]);

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

  if (options.diaryBrownFormMode === true) {
    if (line.source && BROWN_WRITABLE_LINE_SOURCES.has(line.source)) {
      return false;
    }
    if (
      line.labelRight != null &&
      line.left >= line.labelRight - pageWidth * 0.012
    ) {
      return false;
    }
  }

  if (!options.inferLabelFromGeometry) return false;

  const leftRatio = line.left / pageWidth;
  const spanRatio = line.span / pageWidth;
  const maxLeft = options.brownInferLabelMaxLeftRatio ?? 0.42;
  const maxSpan = options.brownInferLabelMaxSpanRatio ?? 0.72;
  const inlineLeftMax = options.brownInlineLabelMaxLeftRatio ?? 0.16;
  const inlineSpanMax = options.brownInlineLabelMaxSpanRatio ?? 0.48;

  if (leftRatio >= inlineLeftMax) return false;
  if (spanRatio >= inlineSpanMax) return false;
  return leftRatio < maxLeft && spanRatio < maxSpan;
}

function buildSlotsFromPdfLines(lines, textItems, pageWidth, pageHeight, options) {
  if (!lines.length) return [];

  const slots = [];
  const normYs = lines.map((line) => (pageHeight - line.y) / pageHeight);
  const rowEpsilon = 0.002;

  for (let i = 0; i < lines.length; i += 1) {
    let line = lines[i];
    if (
      options.diaryBrownFormMode === true &&
      line.source !== 'box' &&
      line.source !== 'wide-block'
    ) {
      line = trimBrownWritableLineFromLabels(line, textItems, pageWidth, pageHeight, options);
    }
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
    const isPdfBoxLine =
      options.diaryBrownFormMode === true &&
      (line.source === 'box' || line.source === 'wide-block');
    const xNorm = isPdfBoxLine
      ? clamp(line.left / pageWidth, 0, 0.98)
      : clamp(line.left / pageWidth + (hasLabel ? padNorm : 0), 0, 0.98);
    const widthNorm = isPdfBoxLine
      ? clamp(line.span / pageWidth, 0.05, 1)
      : clamp((line.right - line.left) / pageWidth - (hasLabel ? padNorm : 0), 0.05, 1);

    slots.push({
      x: formatFloat(xNorm),
      y: formatFloat(clamp(normY, 0, 1)),
      width: formatFloat(widthNorm),
      height: formatFloat(bandNorm),
      hasLabel,
      lineSource: line.source,
    });
  }

  if (options.diaryBrownFormMode === true) {
    return slots;
  }

  if (options.diaryBrownFormMode === true) {
    return slots;
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

function isKidsAlbum(options = {}) {
  return options.lineGuideId === 'kids_48';
}

function isPregnancyA5Album(options = {}) {
  return options.lineGuideId === 'pregnancy_a5';
}

function isPregnancyA5WeeklyPage(pageNumber) {
  return pageNumber >= 5 && pageNumber <= 43 && pageNumber !== 14 && pageNumber !== 29;
}

/** A5-дневник беременности: группы переноса на анкете и недельных страницах. */
function assignPregnancyA5SlotGroups(slots, options = {}) {
  if (!isPregnancyA5Album(options) || !slots.length) return slots;

  const page = options.pageNumber;
  const sorted = [...slots].sort((a, b) => a.y - b.y || a.x - b.x);

  if (page === 3) {
    const whenChildHead = sorted.find((slot) => slot.y > 0.53 && slot.y < 0.55 && slot.hasLabel);
    const whenChildTail = sorted.find((slot) => slot.y > 0.57 && slot.y < 0.59 && !slot.hasLabel);
    if (whenChildHead && whenChildTail) {
      whenChildTail.continuationGroup = whenChildHead.continuationGroup;
    }

    return slots;
  }

  if (!isPregnancyA5WeeklyPage(page)) return slots;

  const classifyWeeklySlot = (slot) => {
    if (slot.y < 0.16 && slot.hasLabel) return 'date';
    if (slot.x > 0.58 && slot.width < 0.35 && slot.y < 0.2) return 'weight';
    if (slot.x > 0.58 && slot.width < 0.35 && slot.y > 0.26 && slot.y < 0.3) return 'belly';
    if (slot.y >= 0.19 && slot.y <= 0.4 && slot.x < 0.58) return 'plans';
    if (slot.y > 0.74 && slot.y < 0.79 && slot.hasLabel) return 'sensations';
    if (slot.y > 0.79 && slot.width > 0.7) return 'sensations';
    return 'other';
  };

  let groupId = 0;
  let plansGroupId = null;
  let sensationsGroupId = null;

  for (const slot of sorted) {
    const kind = classifyWeeklySlot(slot);

    if (kind === 'plans') {
      if (plansGroupId === null) {
        groupId += 1;
        plansGroupId = groupId;
      }
      slot.continuationGroup = plansGroupId;
      continue;
    }

    if (kind === 'sensations') {
      if (sensationsGroupId === null) {
        groupId += 1;
        sensationsGroupId = groupId;
      }
      slot.continuationGroup = sensationsGroupId;
      continue;
    }

    groupId += 1;
    slot.continuationGroup = groupId;
  }

  return sorted;
}

/** Детский фотоальбом: правки страниц с облаками и зубками. */
function assignKidsAlbumSlotGroups(slots, options = {}) {
  if (!isKidsAlbum(options) || !slots.length) return slots;

  const page = options.pageNumber;
  if (page === 10) {
    const teethBand = options.kidsTeethLineHeight ?? 0.028;
    const normalized = slots
      .filter((slot) => slot.y < 0.78)
      .map((slot) => ({
        ...slot,
        height: formatFloat(teethBand),
      }));

    const centerTeeth = [
      { y: 0.2465, x: 0.52 },
      { y: 0.7006, x: 0.52 },
    ];
    for (const target of centerTeeth) {
      const exists = normalized.some(
        (slot) =>
          Math.abs(slot.y - target.y) < 0.012 &&
          Math.abs(slot.x - target.x) < 0.04
      );
      if (exists) continue;
      normalized.push({
        x: formatFloat(target.x),
        y: formatFloat(target.y),
        width: formatFloat(0.1),
        height: formatFloat(teethBand),
        hasLabel: false,
      });
    }
    normalized.sort((a, b) => a.y - b.y || a.x - b.x);

    let teethGroupId = 0;
    for (const slot of normalized) {
      teethGroupId += 1;
      slot.continuationGroup = teethGroupId;
      delete slot.inputKind;
    }

    const brushingHeadY = options.kidsBrushingHeadNormY ?? 0.8349;
    const brushingTailY = options.kidsBrushingTailNormY ?? 0.868;
    const brushingHeadX = options.kidsBrushingHeadNormX ?? 0.559;
    const brushingHeadWidth = options.kidsBrushingHeadNormWidth ?? 0.174;
    const brushingTailX = options.kidsBrushingTailNormX ?? 0.08;
    const brushingTailWidth = options.kidsBrushingTailNormWidth ?? 0.84;
    const numberY = options.kidsTeethCountNormY ?? 0.895;
    const numberX = options.kidsTeethCountNormX ?? 0.525;
    const numberWidth = options.kidsTeethCountNormWidth ?? 0.053;
    const lineHeight = options.kidsBottomLineHeight ?? 0.028;

    const brushingGroupId = teethGroupId + 1;
    normalized.push(
      {
        x: formatFloat(brushingHeadX),
        y: formatFloat(brushingHeadY),
        width: formatFloat(brushingHeadWidth),
        height: formatFloat(lineHeight),
        hasLabel: false,
        continuationGroup: brushingGroupId,
      },
      {
        x: formatFloat(brushingTailX),
        y: formatFloat(brushingTailY),
        width: formatFloat(brushingTailWidth),
        height: formatFloat(lineHeight),
        hasLabel: false,
        continuationGroup: brushingGroupId,
        inputKind: 'block',
      },
      {
        x: formatFloat(numberX),
        y: formatFloat(numberY),
        width: formatFloat(numberWidth),
        height: formatFloat(lineHeight),
        hasLabel: false,
        continuationGroup: brushingGroupId + 1,
      }
    );

    return normalized;
  }

  if (page === 21) {
    if (slots.length >= 2) return slots;
    return [
      {
        x: formatFloat(0.22),
        y: formatFloat(0.18),
        width: formatFloat(0.56),
        height: formatFloat(0.04),
        hasLabel: false,
        continuationGroup: 1,
      },
      {
        x: formatFloat(0.22),
        y: formatFloat(0.24),
        width: formatFloat(0.56),
        height: formatFloat(0.04),
        hasLabel: false,
        continuationGroup: 2,
      },
    ];
  }

  if (page >= 22 && page <= 33) {
    const hasCanLine = slots.some((slot) => slot.continuationGroup === 2);
    if (!hasCanLine && slots.length >= 2) {
      const anchor = slots[slots.length - 1];
      slots.push({
        x: formatFloat(anchor.x),
        y: formatFloat(anchor.y + 0.055),
        width: formatFloat(anchor.width),
        height: formatFloat(anchor.height),
        hasLabel: false,
        continuationGroup: 2,
      });
    }
    return slots;
  }

  return slots;
}

async function extractLineSlotsForPage(page, pageWidth, pageHeight, options) {
  const pageOptions = options;
  const segments = await collectPathSegments(page, pageOptions);
  let lines;

  if (pageOptions.diaryBrownFormMode === true) {
    lines = mergeBrownDiaryFormLines(segments, pageWidth, pageHeight, pageOptions);
  } else {
    lines = mergeHorizontalLines(segments, pageWidth, pageHeight, pageOptions);
    if (pageOptions.formLineRefine) {
      lines = refineFormInputLines(lines, pageWidth, pageHeight, pageOptions);
    }
    if (pageOptions.collapseNearbyRows) {
      lines = collapseNearbyRows(lines, pageHeight, pageOptions.minRowGapNorm ?? 0.016);
    }
    if (pageOptions.diaryFormMode === true) {
      lines = filterDiaryFormLines(lines, pageWidth, pageHeight, pageOptions);
    }
  }

  const textItems = await collectTextItems(page);
  const brownOptions =
    pageOptions.diaryBrownFormMode === true
      ? { ...pageOptions, brownPdfLines: lines, pageWidth, pageHeight }
      : pageOptions;
  let slots = buildSlotsFromPdfLines(lines, textItems, pageWidth, pageHeight, pageOptions);

  if (pageOptions.diaryBrownFormMode === true) {
    slots = normalizeBrownSlotBandHeights(slots);
    slots = assignBrownDiarySlotGroups(slots, brownOptions);
  } else {
    slots = assignContinuationGroups(slots, pageOptions);
    slots = assignKidsAlbumSlotGroups(slots, { ...pageOptions, pageWidth, pageHeight });
    slots = assignPregnancyA5SlotGroups(slots, { ...pageOptions, pageWidth, pageHeight });
  }

  return slots;
}

function brownSlotHorizontalOverlapRatio(a, b) {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const overlap = Math.max(0, right - left);
  const minSpan = Math.min(a.width, b.width);
  if (minSpan <= 0) return 0;
  return overlap / minSpan;
}

function isBrownQuestionnaireWideLine(slot) {
  return slot.width >= 0.52;
}

function isBrownPeachBlockLine(slot) {
  return slot.width >= 0.16 && slot.width <= 0.58 && slot.x <= 0.22;
}

function canJoinBrownBoxLines(prev, slot, clusterMinY, options = {}) {
  if (!prev || !slot) return false;

  const isWideBlock =
    prev.lineSource === 'wide-block' || slot.lineSource === 'wide-block';
  const rowGap = slot.y - prev.y;
  const rowGapMin = options.brownGroupRowGapMin ?? 0.003;
  const rowGapMax = isWideBlock
    ? (options.brownWideGroupRowGapMax ?? 0.048)
    : (options.brownGroupRowGapMax ?? 0.043);
  const overlapMin = isWideBlock
    ? (options.brownWideGroupOverlapMin ?? 0.25)
    : (options.brownGroupOverlapMin ?? 0.38);
  const maxBlockSpan = isWideBlock
    ? (options.brownWideGroupMaxHeight ?? 0.55)
    : (options.brownGroupMaxHeight ?? 0.1);

  if (rowGap <= rowGapMin || rowGap >= rowGapMax) return false;
  if (slot.y - clusterMinY > maxBlockSpan) return false;

  if (isWideBlock) {
    return (
      prev.lineSource === 'wide-block' &&
      slot.lineSource === 'wide-block' &&
      Math.abs(prev.x - slot.x) < 0.1
    );
  }

  if (brownSlotHorizontalOverlapRatio(prev, slot) < overlapMin) return false;

  if (isBrownQuestionnaireWideLine(prev) || isBrownQuestionnaireWideLine(slot)) {
    return false;
  }

  const fromBoxSource = prev.lineSource === 'box' && slot.lineSource === 'box';
  const fromPeachHeuristic =
    isBrownPeachBlockLine(prev) &&
    isBrownPeachBlockLine(slot) &&
    Math.abs(prev.x - slot.x) < 0.14;

  return fromBoxSource || fromPeachHeuristic;
}

function isBrownFooterArtifactSlot(slot) {
  return slot.x < 0.12 && slot.width > 0.7 && slot.y > 0.948;
}

/** Нижняя декоративная линия под блоком «Пожелания» (не строки ввода). */
function isBrownWishExcludeSlot(slot) {
  return isBrownFooterArtifactSlot(slot);
}

function isDiaryQuestionnairePage(options = {}) {
  const pageNum = options.pageNumber;
  if (pageNum == null) return false;
  if (isDiaryDaySpreadPage(options)) return false;
  const pages = options.diaryQuestionnairePageNumbers;
  if (Array.isArray(pages) && pages.length > 0) {
    return pages.includes(pageNum);
  }
  const anchor = options.diaryQuestionnairePageNumber ?? 6;
  if (pageNum === anchor) return true;
  const minParent = options.brownParentQuestionnaireMinPage;
  const maxParent = options.brownParentQuestionnaireMaxPage;
  if (
    minParent != null &&
    maxParent != null &&
    pageNum >= minParent &&
    pageNum <= maxParent
  ) {
    return true;
  }
  return false;
}

function getBrownQuestionnaireWideLineTemplate(slots) {
  const wide = slots
    .filter(
      (s) =>
        !s.hasLabel &&
        s.width >= 0.65 &&
        s.y >= 0.35 &&
        s.y <= 0.715
    )
    .sort((a, b) => b.width - a.width || a.y - b.y);

  if (wide.length > 0) {
    return {
      x: wide[0].x,
      width: wide[0].width,
      height: wide[0].height,
    };
  }

  return { x: 0.08479, width: 0.81765, height: 0.03525 };
}

/**
 * «Кем ты хочешь стать…»: первая строка — короткая после «?», ниже — на всю ширину.
 */
function normalizeBrownCareerAnswerSlots(slots, options = {}) {
  if (!isDiaryQuestionnairePage(options)) return;
  const careerPage = options.diaryCareerQuestionPageNumber ?? 6;
  if (options.pageNumber !== careerPage) return;

  const careerMinY = options.brownCareerAnswerMinNormY ?? 0.735;
  const careerMaxY = options.brownCareerAnswerMaxNormY ?? 0.84;
  const minWidth = options.brownCareerAnswerMinWidth ?? 0.25;

  const careerLines = slots
    .filter(
      (s) =>
        !s.hasLabel &&
        s.y >= careerMinY &&
        s.y <= careerMaxY &&
        s.width >= minWidth &&
        s.x <= 0.15 &&
        s.width >= 0.72
    )
    .sort((a, b) => a.y - b.y);

  if (!careerLines.length) return;

  const template = getBrownQuestionnaireWideLineTemplate(slots);

  for (const line of careerLines) {
    line.x = template.x;
    line.width = template.width;
    if (template.height != null && (line.height == null || line.height <= 0)) {
      line.height = template.height;
    }
  }
}

/**
 * Разреженные страницы (PDF без контуров подписи): длинный вопрос + 2–3 строки ответа.
 * Пример: «Чем ты любишь заниматься на переменах?» (стр. 22).
 */
function ensureBrownSparsePageInlineQuestionBlock(slots, options = {}) {
  if (!isDiaryQuestionnairePage(options)) return;
  if (slots.length > 8) return;

  const rowGap = options.brownQuestionnaireRowGap ?? 0.042;
  const tailLeftRatio = options.brownInlineQuestionTailLeftRatio ?? 0.73;
  const targetRightRatio = options.brownMicroRowTailTargetRight ?? 0.895;
  const minAnswerY = options.brownInlineQuestionMinNormY ?? 0.68;
  const maxAnswerY = options.brownInlineQuestionMaxNormY ?? 0.88;

  const wideBlocks = slots
    .filter(
      (s) =>
        !s.hasLabel &&
        s.width >= 0.72 &&
        s.x < 0.15 &&
        s.y >= minAnswerY &&
        s.y <= maxAnswerY &&
        (s.lineSource === 'wide-block' || s.lineSource == null)
    )
    .sort((a, b) => a.y - b.y);

  for (const anchor of wideBlocks) {
    const hasShortHeadAbove = slots.some(
      (s) =>
        !s.hasLabel &&
        s.y < anchor.y &&
        anchor.y - s.y <= 0.05 &&
        s.x >= 0.55 &&
        s.width < 0.35
    );
    if (hasShortHeadAbove) continue;

    const headY = formatFloat(anchor.y - rowGap);
    if (
      headY >= minAnswerY - 0.06 &&
      !slots.some((s) => Math.abs(s.y - headY) < 0.015)
    ) {
      slots.push({
        x: formatFloat(tailLeftRatio),
        y: headY,
        width: formatFloat(Math.max(0.08, targetRightRatio - tailLeftRatio)),
        height: anchor.height,
        hasLabel: false,
        lineSource: 'dashed-gap',
      });
    }

    const tailY = formatFloat(anchor.y + rowGap);
    if (
      tailY <= maxAnswerY + 0.04 &&
      !slots.some((s) => Math.abs(s.y - tailY) < 0.015)
    ) {
      slots.push({
        x: anchor.x,
        y: tailY,
        width: anchor.width,
        height: anchor.height,
        hasLabel: false,
        lineSource: anchor.lineSource,
      });
    }
  }

  slots.sort((a, b) => a.y - b.y || a.x - b.x);
}

/**
 * «Кем ты хочешь стать…»: широкие строки ответа ниже строки вопроса (PDF часто даёт одну).
 * Первая линия сразу под вопросом (y≈0.784) — дубль подчёркивания, не слот ввода.
 */
function ensureDiaryQuestionnaireCareerAnswerSlots(slots, options = {}) {
  if (!isDiaryQuestionnairePage(options) || !slots.length) return;

  const careerPage = options.diaryCareerQuestionPageNumber ?? 6;
  if (options.pageNumber !== careerPage) return;

  const bandNorm = options.brownCareerAnswerBandNorm ?? 0.042;
  const minAnswerWidth = options.brownCareerAnswerMinWidth ?? 0.35;
  const careerMinY =
    options.brownPage6CareerAnswerLineMinNormY ??
    options.brownCareerAnswerMinNormY ??
    0.788;
  const template = getBrownQuestionnaireWideLineTemplate(slots);
  const secondY = formatFloat(
    options.brownCareerAnswerSecondNormY ??
      (options.brownCareerAnswerFirstNormY ?? 0.784) +
        (options.brownCareerAnswerRowGap ?? 0.048)
  );

  const careerLines = slots
    .filter(
      (s) =>
        !s.hasLabel &&
        s.width >= minAnswerWidth &&
        s.y >= careerMinY &&
        s.y <= 0.85 &&
        s.x <= 0.15 &&
        s.width >= 0.72
    )
    .sort((a, b) => a.y - b.y);

  if (!careerLines.length) {
    slots.push({
      x: template.x,
      y: secondY,
      width: template.width,
      height: formatFloat(template.height ?? bandNorm),
      hasLabel: false,
      inputKind: 'block',
    });
    slots.sort((a, b) => a.y - b.y || a.x - b.x);
    return;
  }

  const anchor = careerLines[0];
  anchor.y = secondY;
  anchor.x = template.x;
  anchor.width = template.width;
  if (anchor.height == null || anchor.height <= 0) {
    anchor.height = formatFloat(template.height ?? bandNorm);
  }
  anchor.inputKind = 'block';

  let extra = careerLines.find(
    (s) => s !== anchor && Math.abs(s.y - secondY) > 0.022
  );
  if (!extra && careerLines.length >= 2) {
    extra = careerLines[1];
  }
  if (extra) {
    const extraY = formatFloat(secondY + (options.brownCareerAnswerRowGap ?? 0.048));
    extra.y = extraY;
    extra.x = template.x;
    extra.width = template.width;
    if (extra.height == null || extra.height <= 0) {
      extra.height = formatFloat(template.height ?? bandNorm);
    }
    extra.inputKind = 'block';
  }
}

/** Строка с текстом вопроса над полем ответа — не слот ввода. */
function isBrownQuestionHeaderRowSlot(slot, slots, options = {}) {
  if (!isDiaryQuestionnairePage(options)) return false;
  if (!slot.hasLabel) return false;

  return slots.some(
    (candidate) =>
      !candidate.hasLabel &&
      candidate.y > slot.y &&
      candidate.y - slot.y >= 0.02 &&
      candidate.y - slot.y <= 0.095 &&
      brownSlotHorizontalOverlapRatio(slot, candidate) >= 0.25
  );
}

function isBrownAlbum(options = {}) {
  return options.lineGuideId === 'diary_interior_brown';
}

function isPurpleAlbum(options = {}) {
  return options.lineGuideId === 'diary_interior_purple';
}

function getDiaryCareerQuestionPage(options = {}) {
  return options.diaryCareerQuestionPageNumber ?? options.diaryQuestionnairePageNumber ?? 6;
}

const BROWN_JOURNAL_PAGE_SET = new Set([
  16, 20, 23, 25, 28, 33,
  45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
]);

const PURPLE_JOURNAL_PAGE_SET = new Set([
  9, 11, 13, 15, 17, 19, 23, 34, 35, 36, 37, 38, 39,
]);

function isJournalTemplateByFirstSlot(slots) {
  const first = slots[0];
  return (
    !!first &&
    first.y >= 0.14 &&
    first.y <= 0.18 &&
    first.x >= 0.25 &&
    first.width >= 0.28 &&
    first.width <= 0.42
  );
}

function isBrownPeachDreamsPage(options = {}) {
  return isBrownAlbum(options) && options.pageNumber === 15;
}

function isBrownPetsPage(options = {}) {
  return isBrownAlbum(options) && options.pageNumber === 17;
}

function isBrownHobbyPage(options = {}) {
  return isBrownAlbum(options) && options.pageNumber === 13;
}

function isBrownMoodPage(options = {}) {
  return isBrownAlbum(options) && options.pageNumber === 24;
}

function isBrownJournalTemplatePage(options = {}, slots = []) {
  if (!isBrownAlbum(options)) return false;
  const page = options.pageNumber;
  if (page == null || page < 16 || page > 56) return false;
  if (BROWN_JOURNAL_PAGE_SET.has(page)) return true;
  return isJournalTemplateByFirstSlot(slots);
}

function isPurpleJournalTemplatePage(options = {}, slots = []) {
  if (!isPurpleAlbum(options)) return false;
  const page = options.pageNumber;
  if (page == null) return false;
  if (PURPLE_JOURNAL_PAGE_SET.has(page)) return true;
  const wideMid = (slots || []).filter(
    (s) =>
      !s.hasLabel &&
      s.y >= 0.28 &&
      s.y <= 0.55 &&
      s.x < 0.15 &&
      s.width >= 0.65
  );
  const bottomBlock = (slots || []).filter(
    (s) => s.y >= 0.68 && s.x < 0.2 && s.width >= 0.65
  );
  if (wideMid.length >= 5 && bottomBlock.length >= 3) return true;
  return isJournalTemplateByFirstSlot(slots);
}

function isDiaryJournalTemplatePage(options = {}, slots = []) {
  return isBrownJournalTemplatePage(options, slots) || isPurpleJournalTemplatePage(options, slots);
}

function isBrownDaySpreadPage(options = {}) {
  if (!isBrownAlbum(options)) return false;
  const page = options.pageNumber;
  return page != null && page >= 34 && page <= 40;
}

function isPurpleDaySpreadPage(options = {}) {
  if (!isPurpleAlbum(options)) return false;
  const page = options.pageNumber;
  return page != null && page >= 24 && page <= 27;
}

function isDiaryDaySpreadPage(options = {}) {
  return isBrownDaySpreadPage(options) || isPurpleDaySpreadPage(options);
}

/** Первый розовый блок «НАПИШИ ИЛИ НАРИСУЙ!» — не поле ввода. */
function isBrownJournalFirstInstructionSpuriousSlot(slot, options = {}) {
  if (!isDiaryJournalTemplatePage(options) || slot.hasLabel) return false;
  return (
    slot.y >= 0.25 &&
    slot.y <= 0.3 &&
    slot.x < 0.15 &&
    slot.width >= 0.65
  );
}

function isBrownJournalInstructionSpuriousSlot(slot, options = {}) {
  if (!isDiaryJournalTemplatePage(options) || slot.hasLabel) return false;
  return false;
}

function isBrownPeachBottomTitleSpuriousSlot(slot, options = {}) {
  if (!isBrownPeachDreamsPage(options) || slot.hasLabel) return false;
  return (
    slot.y >= 0.82 &&
    slot.y <= 0.86 &&
    slot.x < 0.2 &&
    slot.width >= 0.4
  );
}

function isBrownJournalTemplateSpuriousSlot(slot, options = {}, slots = []) {
  if (!isDiaryJournalTemplatePage(options, slots) || slot.hasLabel) return false;
  if (slot.y >= 0.57 && slot.y <= 0.64 && slot.width >= 0.35 && slot.width <= 0.55) {
    return true;
  }
  if (slot.y >= 0.68 && slot.y <= 0.715 && slot.x < 0.15 && slot.width >= 0.65) {
    return true;
  }
  return false;
}

function isBrownDaySpreadTitleSpuriousSlot(slot, options = {}) {
  if (!isDiaryDaySpreadPage(options) || slot.hasLabel) return false;
  if (slot.y >= 0.14 && slot.y <= 0.22 && slot.x < 0.15 && slot.width >= 0.55) {
    return true;
  }
  if (slot.y >= 0.52 && slot.y <= 0.68 && slot.x < 0.15 && slot.width >= 0.55) {
    return true;
  }
  if (slot.y >= 0.55 && slot.y <= 0.67 && slot.x >= 0.35 && slot.width <= 0.28) {
    return true;
  }
  return false;
}

function refineBrownDaySpreadIllustrationWidths(slots, options = {}) {
  if (!isDiaryDaySpreadPage(options) || !slots.length) return slots;

  const illustrationSafeWidth = options.brownDaySpreadIllustrationMaxWidth ?? 0.55;
  const bands = [
    { minY: 0.16, maxY: 0.52 },
    { minY: 0.6, maxY: 0.95 },
  ];

  for (const band of bands) {
    const bandSlots = slots
      .filter((slot) => slot.y >= band.minY && slot.y < band.maxY)
      .sort((a, b) => a.y - b.y || a.x - b.x);
    if (bandSlots.length < 2) continue;

    const widths = bandSlots.map((slot) => slot.width);
    const minWidth = Math.min(...widths);
    const maxWidth = Math.max(...widths);
    const shortLineWidth = widths
      .filter((width) => width < maxWidth - 0.03)
      .sort((a, b) => a - b)[0];
    const bottomStartIndex = Math.max(1, Math.floor(bandSlots.length * 0.5));

    for (let index = bottomStartIndex; index < bandSlots.length; index += 1) {
      const slot = bandSlots[index];
      const targetWidth = shortLineWidth != null
        ? Math.min(shortLineWidth, illustrationSafeWidth)
        : illustrationSafeWidth;
      if (slot.width > targetWidth + 0.01) {
        slot.width = formatFloat(targetWidth);
      }
    }
  }

  return slots;
}

/** Стр. 24: список 1–5 — отдельные строки; не сливать последний пункт. */
function assignBrownPage24MoodSlotGroups(slots, options = {}) {
  const listMinY = options.brownMoodListMinNormY ?? 0.63;
  const footerMinY = options.brownMoodFooterMinNormY ?? 0.915;
  const listMinX = options.brownMoodListMinNormX ?? 0.22;
  const uniformHeight = options.brownMoodLineHeight ?? 0.032;

  const prepared = slots
    .filter((slot) => slot.y < footerMinY)
    .map((slot) => {
      const next = {
        ...slot,
        height: formatFloat(uniformHeight),
      };
      if (next.y >= listMinY && next.x < listMinX) {
        const right = next.x + next.width;
        next.x = formatFloat(listMinX);
        next.width = formatFloat(Math.max(0.05, right - listMinX));
      }
      return next;
    })
    .sort((a, b) => a.y - b.y || a.x - b.x);

  let groupId = 0;
  for (const slot of prepared) {
    groupId += 1;
    slot.continuationGroup = groupId;
    slot.inputKind = 'line';
  }

  return prepared;
}

function injectBrownPage17MissingTailSlots(slots, options = {}) {
  if (!isBrownPetsPage(options) || !slots.length) return;

  const tails = [
    { y: 0.57208, x: 0.77355, width: 0.1224 },
    { y: 0.65608, x: 0.78355, width: 0.1123 },
  ];
  const extras = [
    { y: 0.84745, x: 0.07755, width: 0.8199, minWidth: 0.5 },
  ];
  const band = options.brownPetsLineHeight ?? 0.032;

  for (const extra of extras) {
    const exists = slots.some(
      (slot) =>
        Math.abs(slot.y - extra.y) < 0.015 &&
        slot.x < 0.2 &&
        slot.width >= extra.minWidth
    );
    if (exists) continue;
    slots.push({
      x: formatFloat(extra.x),
      y: formatFloat(extra.y),
      width: formatFloat(extra.width),
      height: formatFloat(band),
      hasLabel: false,
      lineSource: 'wide-block',
    });
  }

  for (const tail of tails) {
    const exists = slots.some(
      (slot) =>
        Math.abs(slot.y - tail.y) < 0.02 &&
        ((slot.x >= 0.55 && slot.width >= 0.06 && slot.width <= 0.35) ||
          (slot.x < 0.16 && slot.width >= 0.72))
    );
    if (exists) continue;
    slots.push({
      x: formatFloat(tail.x),
      y: formatFloat(tail.y),
      width: formatFloat(tail.width),
      height: formatFloat(band),
      hasLabel: false,
      lineSource: 'dashed-gap',
    });
  }

  slots.sort((a, b) => a.y - b.y || a.x - b.x);
}

function injectBrownPage21MissingTailSlots(slots, options = {}) {
  if (options.pageNumber !== 21 || !slots.length) return;

  const tails = [
    { y: 0.36182, x: 0.51255, width: 0.3874 },
    { y: 0.44162, x: 0.51255, width: 0.3874 },
    { y: 0.60082, x: 0.51255, width: 0.3874 },
  ];
  const band = options.brownTravelLineHeight ?? 0.032;

  for (const tail of tails) {
    const exists = slots.some(
      (slot) =>
        Math.abs(slot.y - tail.y) < 0.045 &&
        (slot.x >= 0.38 || (slot.x < 0.16 && slot.width >= 0.72))
    );
    if (exists) continue;
    slots.push({
      x: formatFloat(tail.x),
      y: formatFloat(tail.y),
      width: formatFloat(tail.width),
      height: formatFloat(band),
      hasLabel: false,
      lineSource: 'dashed-gap',
    });
  }

  slots.sort((a, b) => a.y - b.y || a.x - b.x);
}

function injectBrownPage37MissingBottomLines(slots, options = {}) {
  if (options.pageNumber !== 37 || !slots.length) return;

  const extras = [
    { y: 0.54812, x: 0.10182, width: 0.7958 },
    { y: 0.59258, x: 0.10182, width: 0.7958 },
    { y: 0.63704, x: 0.10182, width: 0.7958 },
    { y: 0.6815, x: 0.10182, width: 0.7958 },
  ];
  const band = slots[0]?.height ?? 0.028;

  for (const extra of extras) {
    const exists = slots.some((slot) => Math.abs(slot.y - extra.y) < 0.015);
    if (exists) continue;
    slots.push({
      x: formatFloat(extra.x),
      y: formatFloat(extra.y),
      width: formatFloat(extra.width),
      height: formatFloat(band),
      hasLabel: false,
      lineSource: 'wide-block',
    });
  }

  slots.sort((a, b) => a.y - b.y || a.x - b.x);
}

function refineBrownPage38FoodSlotWidths(slots, options = {}) {
  if (options.pageNumber !== 38 || !slots.length) return slots;

  const fullTemplate = slots
    .filter((slot) => slot.x < 0.12 && slot.width >= 0.72)
    .sort((a, b) => b.width - a.width)[0];
  if (!fullTemplate) return slots;

  for (const slot of slots) {
    if (slot.x < 0.12 && slot.width >= 0.72) continue;
    if (slot.width < 0.45 && slot.x >= 0.35) {
      slot.x = fullTemplate.x;
      slot.width = formatFloat(fullTemplate.width);
    }
  }

  return slots;
}

/** Стр. 13 «ХОББИ»: хвост после подписи + широкая строка ниже — одна группа. */
function assignBrownPage13HobbySlotGroups(slots, options = {}) {
  const uniformHeight = options.brownHobbyLineHeight ?? 0.032;
  const prepared = slots.map((slot) => ({
    ...slot,
    height: formatFloat(uniformHeight),
    continuationGroup: undefined,
    inputKind: undefined,
  }));

  prepared.sort((a, b) => a.y - b.y || a.x - b.x);

  let groupId = 0;
  for (let i = 0; i < prepared.length; i += 1) {
    const slot = prepared[i];
    if (slot.continuationGroup != null) continue;

    groupId += 1;
    slot.continuationGroup = groupId;

    const next = prepared[i + 1];
    const gap = next ? next.y - slot.y : null;
    const isTail = slot.x >= 0.28 && slot.width >= 0.2 && slot.width < 0.68;
    const nextIsWide = next && next.x < 0.16 && next.width >= 0.72;
    if (isTail && nextIsWide && gap != null && gap >= 0.02 && gap <= 0.055) {
      next.continuationGroup = groupId;
      next.inputKind = 'block';
      slot.inputKind = 'block';
      continue;
    }

    const run = [slot];
    let j = i + 1;
    while (j < prepared.length) {
      const prev = run[run.length - 1];
      const candidate = prepared[j];
      if (candidate.continuationGroup != null) break;
      const rowGap = candidate.y - prev.y;
      if (
        candidate.x < 0.16 &&
        prev.x < 0.16 &&
        candidate.width >= 0.72 &&
        prev.width >= 0.72 &&
        rowGap >= 0.028 &&
        rowGap <= 0.052
      ) {
        candidate.continuationGroup = groupId;
        run.push(candidate);
        j += 1;
        if (run.length >= 3) break;
        continue;
      }
      break;
    }

    if (run.length >= 2) {
      for (const row of run) {
        row.inputKind = 'block';
      }
    }
    i = j - 1;
  }

  for (const slot of prepared) {
    if (slot.continuationGroup == null) {
      groupId += 1;
      slot.continuationGroup = groupId;
    }
  }

  return prepared.sort((a, b) => a.y - b.y || a.x - b.x);
}

/** Стр. 17 «Твои питомцы»: каждый вопрос — своё поле; низ — блок из 3 строк. */
function assignBrownPage17PetsSlotGroups(slots, options = {}) {
  const uniformHeight = options.brownPetsLineHeight ?? 0.032;
  const bottomMinY = options.brownPetsBottomMinNormY ?? 0.75;
  const bottomMaxWidth = options.brownPetsBottomMaxWidth ?? 0.59;
  const footerMinY = options.brownPetsFooterMinNormY ?? 0.87;

  const prepared = slots
    .filter((slot) => slot.y < footerMinY)
    .map((slot) => ({
      ...slot,
      height: formatFloat(uniformHeight),
    }));

  const bottom = prepared
    .filter((slot) => slot.y >= bottomMinY && slot.x < 0.2 && slot.width >= 0.5)
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const top = prepared
    .filter((slot) => !(slot.y >= bottomMinY && slot.x < 0.2 && slot.width >= 0.5))
    .sort((a, b) => a.y - b.y || a.x - b.x);

  let groupId = 0;
  for (const slot of top) {
    groupId += 1;
    slot.continuationGroup = groupId;
    slot.inputKind = 'line';
  }

  if (bottom.length) {
    groupId += 1;
    for (const slot of bottom) {
      slot.continuationGroup = groupId;
      slot.inputKind = 'block';
      if (slot.width > bottomMaxWidth) {
        slot.width = formatFloat(bottomMaxWidth);
      }
    }
  }

  return prepared.sort((a, b) => a.y - b.y || a.x - b.x);
}

function getBrownPeachDreamsLeftStackId(normY) {
  if (normY < 0.345) return 1;
  if (normY < 0.572) return 2;
  if (normY < 0.82) return 3;
  return 4;
}

/** Стр. 15 «Мечты»: белые линии внутри розовых блоков (координаты из PDF). */
function buildBrownPage15CanonicalSlots(options = {}) {
  const lineHeight = options.brownPeachLineHeight ?? 0.028;
  const leftX = 0.14785;
  const leftWidth = 0.34319;
  const rightX = 0.5932;
  const rightWidth = 0.27072;
  const bottomX = 0.1418;
  const bottomWidth = 0.4862;

  const leftBlockLines = [
    [0.2235, 0.268, 0.3124],
    [0.4379, 0.4824, 0.5268],
    [0.6517, 0.6961, 0.7406],
  ];
  const rightLines = [
    0.2235, 0.268, 0.3124, 0.3553, 0.3997, 0.4442, 0.4919,
    0.5364, 0.5808, 0.6292, 0.6737, 0.7182,
  ];
  const bottomLines = [0.8947];

  const slots = [];
  let groupId = 0;

  for (const block of leftBlockLines) {
    groupId += 1;
    for (const y of block) {
      slots.push({
        x: formatFloat(leftX),
        y: formatFloat(y),
        width: formatFloat(leftWidth),
        height: formatFloat(lineHeight),
        hasLabel: false,
        continuationGroup: groupId,
        inputKind: 'block',
        lineSource: 'box',
      });
    }
  }

  groupId += 1;
  for (const y of rightLines) {
    slots.push({
      x: formatFloat(rightX),
      y: formatFloat(y),
      width: formatFloat(rightWidth),
      height: formatFloat(lineHeight),
      hasLabel: false,
      continuationGroup: groupId,
      inputKind: 'block',
      lineSource: 'box',
    });
  }

  groupId += 1;
  for (const y of bottomLines) {
    slots.push({
      x: formatFloat(bottomX),
      y: formatFloat(y),
      width: formatFloat(bottomWidth),
      height: formatFloat(lineHeight),
      hasLabel: false,
      continuationGroup: groupId,
      inputKind: 'block',
      lineSource: 'box',
    });
  }

  return slots.sort((a, b) => a.y - b.y || a.x - b.x);
}

function injectBrownJournalDateSlot(slots, options = {}) {
  if (!isDiaryJournalTemplatePage(options, slots)) return;
  if (isPurpleAlbum(options) && PURPLE_JOURNAL_PAGE_SET.has(options.pageNumber)) {
    return;
  }

  const dateY = options.brownJournalDateNormY ?? 0.156;
  const dateX = options.brownJournalDateNormX ?? 0.36;
  const dateWidth = options.brownJournalDateNormWidth ?? 0.34;
  const band = options.brownJournalDateHeight ?? 0.032;

  const hasDate = slots.some(
    (slot) =>
      slot.y >= 0.13 &&
      slot.y <= 0.2 &&
      slot.width >= 0.2 &&
      slot.width <= 0.45
  );
  if (hasDate) return;

  slots.push({
    x: formatFloat(dateX),
    y: formatFloat(dateY),
    width: formatFloat(dateWidth),
    height: formatFloat(band),
    hasLabel: false,
    lineSource: 'dashed-gap',
  });
  slots.sort((a, b) => a.y - b.y || a.x - b.x);
}

/** Журнал: седьмая строка «Как прошёл день» вне розового блока. */
function injectBrownJournalSeventhMainLineSlot(slots, options = {}) {
  if (!isDiaryJournalTemplatePage(options, slots) || !slots.length) return;

  const mainLines = slots
    .filter(
      (slot) =>
        !slot.hasLabel &&
        slot.y >= 0.3 &&
        slot.y <= 0.535 &&
        slot.x < 0.15 &&
        slot.width >= 0.65
    )
    .sort((a, b) => a.y - b.y);

  if (mainLines.length < 5) return;

  const hasSeventh = slots.some(
    (slot) =>
      !slot.hasLabel &&
      slot.y >= 0.5 &&
      slot.y <= 0.535 &&
      slot.x < 0.15 &&
      slot.width >= 0.65
  );
  if (hasSeventh) return;

  const template = mainLines[0];
  const last = mainLines[mainLines.length - 1];
  const gaps = [];
  for (let i = 1; i < mainLines.length; i += 1) {
    gaps.push(mainLines[i].y - mainLines[i - 1].y);
  }
  const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  const band = template.height ?? options.brownJournalMainLineHeight ?? 0.03644;

  slots.push({
    x: formatFloat(template.x),
    y: formatFloat(last.y + avgGap),
    width: formatFloat(template.width),
    height: formatFloat(band),
    hasLabel: false,
    inputKind: 'block',
    lineSource: 'journal-seventh',
  });
  slots.sort((a, b) => a.y - b.y || a.x - b.x);
}

/** Декоративное подчёркивание заголовка «Анкета для…» (не поле «Имя»). */
function isBrownQuestionnaireTitleUnderlineSlot(slot, slots, options = {}) {
  if (!isDiaryQuestionnairePage(options)) return false;
  if (isBrownPeachDreamsPage(options)) return false;

  // Короткий штрих справа под подзаголовком «Анкета для…»
  if (
    slot.y >= 0.17 &&
    slot.y <= 0.28 &&
    slot.width < 0.35 &&
    slot.x >= 0.55
  ) {
    return true;
  }

  if (slot.y < 0.305 || slot.y > 0.328) return false;
  if (slot.width < 0.68) return false;
  if (slot.y < 0.308 && slot.width < 0.7) return false;
  // Полноширинная строка «Имя:» / «Дата…» — не декоративное подчёркивание заголовка.
  if (slot.x <= 0.2 && slot.width >= 0.72) return false;

  return slots.some(
    (candidate) =>
      candidate !== slot &&
      candidate.y >= slot.y + 0.03 &&
      candidate.y <= slot.y + 0.055 &&
      candidate.width >= 0.35 &&
      candidate.width <= 0.78
  );
}


/** Закрывающий текст анкеты на стр. карьеры — не поле ввода. */
function isBrownCareerClosingTextSpuriousSlot(slot, slots, options = {}) {
  if (!isDiaryQuestionnairePage(options)) return false;
  if (options.pageNumber !== getDiaryCareerQuestionPage(options) || slot.hasLabel) {
    return false;
  }
  if (slot.y >= 0.765 && slot.y <= 0.785 && slot.x >= 0.6 && slot.width < 0.35) {
    return true;
  }
  if (
    slot.y >= 0.772 &&
    slot.y <= 0.785 &&
    slot.x < 0.15 &&
    slot.width >= 0.72 &&
    slots.some((c) => c.y >= 0.81 && c.x < 0.15 && c.width >= 0.72)
  ) {
    return true;
  }
  return false;
}

/** Полная линия под текстом вопроса «Кем ты хочешь…» — не поле ответа (хвост отдельно). */
function isBrownPage6QuestionBandSlot(slot, slots, options = {}) {
  if (!isDiaryQuestionnairePage(options)) return false;
  const careerPage = options.diaryCareerQuestionPageNumber ?? 6;
  if (options.pageNumber !== careerPage) return false;
  if (slot.y < 0.745 || slot.y > 0.778) return false;
  if (slot.width < 0.72) return false;
  if (slot.x > 0.15) return false;
  if (slot.hasLabel) return false;

  return slots.some(
    (candidate) =>
      !candidate.hasLabel &&
      candidate.y >= 0.73 &&
      candidate.y <= 0.85 &&
      candidate.y >= slot.y + 0.008 &&
      brownSlotHorizontalOverlapRatio(slot, candidate) >= 0.2
  );
}

/** Стр. 6: «Лучший друг:» — PDF часто не выделяет строку отдельно. */
function injectBrownPage6MissingBestFriendMaleRow(slots, options = {}) {
  const careerPage = getDiaryCareerQuestionPage(options);
  if (!isDiaryQuestionnairePage(options) || options.pageNumber !== careerPage || !slots.length) {
    return;
  }

  const bestFriendFemale = slots
    .filter(
      (s) =>
        !s.hasLabel &&
        s.y >= 0.675 &&
        s.y <= 0.705 &&
        s.width >= 0.45 &&
        s.x < 0.55
    )
    .sort((a, b) => b.y - a.y)[0];
  if (!bestFriendFemale) return;

  const rowGap = options.brownQuestionnaireRowGap ?? 0.047;
  const maleY = formatFloat(
    options.brownPage6BestFriendMaleNormY ?? bestFriendFemale.y + rowGap
  );
  const maleX = formatFloat(
    options.brownPage6BestFriendMaleLeftNorm ??
      Math.max(0.3, bestFriendFemale.x - 0.04)
  );
  const targetRight = options.brownMicroRowTailTargetRight ?? 0.895;
  const maleWidth = formatFloat(
    Math.max(0.45, targetRight - maleX)
  );

  const existingMale = slots.find(
    (s) =>
      !s.hasLabel &&
      Math.abs(s.y - maleY) < 0.008 &&
      s.width >= 0.4 &&
      s.x < 0.55
  );
  if (existingMale) {
    existingMale.x = maleX;
    existingMale.y = maleY;
    existingMale.width = maleWidth;
    existingMale.height = bestFriendFemale.height;
    delete existingMale.inputKind;
    slots.sort((a, b) => a.y - b.y || a.x - b.x);
    return;
  }

  const misdetectedMale = slots.find(
    (s) =>
      !s.hasLabel &&
      s.y > bestFriendFemale.y + 0.035 &&
      s.y < (options.brownPage6CareerQuestionNormY ?? 0.773) - 0.02 &&
      s.width >= 0.4 &&
      s.x < 0.55
  );
  if (misdetectedMale) {
    misdetectedMale.x = maleX;
    misdetectedMale.y = maleY;
    misdetectedMale.width = maleWidth;
    misdetectedMale.height = bestFriendFemale.height;
    delete misdetectedMale.inputKind;
    slots.sort((a, b) => a.y - b.y || a.x - b.x);
    return;
  }

  const misdetectedTail = slots.find(
    (s) =>
      !s.hasLabel &&
      Math.abs(s.y - maleY) < 0.012 &&
      s.x >= 0.62 &&
      s.width < 0.25
  );
  if (misdetectedTail) {
    misdetectedTail.x = maleX;
    misdetectedTail.y = maleY;
    misdetectedTail.width = maleWidth;
    misdetectedTail.height = bestFriendFemale.height;
    delete misdetectedTail.inputKind;
    slots.sort((a, b) => a.y - b.y || a.x - b.x);
    return;
  }

  slots.push({
    x: maleX,
    y: maleY,
    width: maleWidth,
    height: bestFriendFemale.height,
    hasLabel: false,
    lineSource: 'gap',
  });
  slots.sort((a, b) => a.y - b.y || a.x - b.x);
}

/** Стр. 6: убрать широкий блок ответа, попавший на строку вопроса. */
function removeBrownPage6MisplacedCareerAnswerSlots(slots, options = {}) {
  if (!isDiaryQuestionnairePage(options) || options.pageNumber !== getDiaryCareerQuestionPage(options)) {
    return;
  }

  const questionY = options.brownPage6CareerQuestionNormY ?? 0.773;
  const answerLineMinY =
    options.brownPage6CareerAnswerLineMinNormY ??
    options.brownCareerAnswerMinNormY ??
    0.788;
  for (let i = slots.length - 1; i >= 0; i -= 1) {
    const slot = slots[i];
    if (!slot.hasLabel) {
      if (
        slot.x < 0.15 &&
        slot.width >= 0.72 &&
        slot.y > 0.74 &&
        slot.y < answerLineMinY
      ) {
        slots.splice(i, 1);
        continue;
      }
      if (
        slot.x >= 0.2 &&
        slot.x < 0.55 &&
        slot.width >= 0.45 &&
        slot.y > questionY - 0.02 &&
        slot.y < answerLineMinY + 0.02
      ) {
        slots.splice(i, 1);
      }
    }
  }
}

/** Стр. 6: короткий ввод справа от «?» на строке вопроса. */
function isBrownPage31ClassQuestionSpuriousSlot(slot, options = {}) {
  if (
    !isBrownAlbum(options) ||
    !isDiaryQuestionnairePage(options) ||
    options.pageNumber !== 31 ||
    slot.hasLabel
  ) {
    return false;
  }
  return (
    slot.y >= 0.548 &&
    slot.y <= 0.562 &&
    slot.x < 0.35 &&
    slot.width >= 0.55
  );
}

function injectBrownPage31ClassSizeTailSlot(slots, options = {}) {
  if (!isDiaryQuestionnairePage(options) || options.pageNumber !== 31 || !slots.length) {
    return;
  }

  const tailY = formatFloat(options.brownPage31ClassTailNormY ?? 0.5573);
  const tailLeft = options.brownPage31ClassTailLeftRatio ?? 0.5992;
  const tailWidth = options.brownPage31ClassTailWidthRatio ?? 0.325;
  const bandNorm = options.brownCareerAnswerBandNorm ?? 0.042;

  const hasTail = slots.some(
    (s) =>
      !s.hasLabel &&
      Math.abs(s.y - tailY) < 0.018 &&
      s.x >= 0.55 &&
      s.width >= 0.06 &&
      s.width <= 0.42
  );
  if (hasTail) return;

  slots.push({
    x: formatFloat(tailLeft),
    y: tailY,
    width: formatFloat(tailWidth),
    height: formatFloat(bandNorm),
    hasLabel: false,
    lineSource: 'dashed-gap',
  });
  slots.sort((a, b) => a.y - b.y || a.x - b.x);
}

function applyBrownLabeledRowMinX(slot, rows) {
  for (const row of rows) {
    if (slot.y < row.minY || slot.y > row.maxY) continue;
    if (slot.x >= row.minX) return slot;
    const right = slot.x + slot.width;
    const x = row.minX;
    return {
      ...slot,
      x,
      width: formatFloat(Math.max(0.05, Math.min(right - x, 0.98 - x))),
    };
  }
  return slot;
}

function refineBrownDiaryPageSlotGeometry(slots, options = {}) {
  if (!isBrownAlbum(options) && !isPurpleAlbum(options)) return slots;
  const page = options.pageNumber;
  if (!isDiaryQuestionnairePage(options) || page == null) return slots;

  const page26Rows = [
    { minY: 0.498, maxY: 0.518, minX: 0.58 },
    { minY: 0.572, maxY: 0.592, minX: 0.58 },
    { minY: 0.752, maxY: 0.772, minX: 0.52 },
  ];
  const page31Rows = [
    { minY: 0.412, maxY: 0.432, minX: 0.55 },
    { minY: 0.478, maxY: 0.498, minX: 0.42 },
    { minY: 0.544, maxY: 0.564, minX: 0.62 },
    { minY: 0.618, maxY: 0.638, minX: 0.65 },
    { minY: 0.868, maxY: 0.888, minX: 0.52 },
  ];
  const purplePage5Rows = [
    { minY: 0.728, maxY: 0.758, minX: 0.52 },
  ];
  const purplePage16Rows = [
    { minY: 0.488, maxY: 0.508, minX: 0.58 },
    { minY: 0.552, maxY: 0.572, minX: 0.56 },
  ];
  const purplePage22Rows = [
    { minY: 0.338, maxY: 0.368, minX: 0.52 },
    { minY: 0.598, maxY: 0.628, minX: 0.58 },
    { minY: 0.818, maxY: 0.848, minX: 0.52 },
  ];

  for (let i = 0; i < slots.length; i += 1) {
    let slot = slots[i];
    if (slot.hasLabel) continue;

    if (page === 26 && isBrownAlbum(options)) {
      slot = applyBrownLabeledRowMinX(slot, page26Rows);
      if (slot.inputKind !== 'block' && slot.y >= 0.28 && slot.y <= 0.94) {
        slot = { ...slot, height: formatFloat(0.032) };
      }
    } else if (page === 31 && isBrownAlbum(options)) {
      slot = applyBrownLabeledRowMinX(slot, page31Rows);
      if (slot.inputKind !== 'block' && slot.y >= 0.32 && slot.y <= 0.94) {
        slot = { ...slot, height: formatFloat(0.032) };
      }
    } else if (page === 5 && isPurpleAlbum(options)) {
      slot = applyBrownLabeledRowMinX(slot, purplePage5Rows);
    } else if (page === 16 && isPurpleAlbum(options)) {
      slot = applyBrownLabeledRowMinX(slot, purplePage16Rows);
    } else if (page === 22 && isPurpleAlbum(options)) {
      slot = applyBrownLabeledRowMinX(slot, purplePage22Rows);
    }

    slots[i] = slot;
  }

  return slots;
}

function injectBrownPage6CareerQuestionTailSlot(slots, options = {}) {
  if (
    !isDiaryQuestionnairePage(options) ||
    options.pageNumber !== getDiaryCareerQuestionPage(options) ||
    !slots.length
  ) {
    return;
  }

  const defaultTailY = options.brownPage6CareerQuestionNormY ?? 0.773;
  const detectedTail = slots
    .filter(
      (s) =>
        !s.hasLabel &&
        s.y >= 0.72 &&
        s.y <= 0.76 &&
        s.x >= 0.52 &&
        s.width >= 0.06 &&
        s.width <= 0.42
    )
    .sort((a, b) => Math.abs(a.y - defaultTailY) - Math.abs(b.y - defaultTailY))[0];
  const tailY = formatFloat(detectedTail?.y ?? defaultTailY);
  const tailLeft = options.brownPage6CareerTailLeftRatio ?? 0.768;
  const targetRight = options.brownMicroRowTailTargetRight ?? 0.895;
  const bandNorm = options.brownCareerAnswerBandNorm ?? 0.042;

  const hasTail = slots.some(
    (s) =>
      !s.hasLabel &&
      Math.abs(s.y - tailY) < 0.018 &&
      s.x >= 0.52 &&
      s.width >= 0.06 &&
      s.width <= 0.42
  );
  if (hasTail) return;

  slots.push({
    x: formatFloat(tailLeft),
    y: tailY,
    width: formatFloat(Math.max(0.06, targetRight - tailLeft)),
    height: formatFloat(bandNorm),
    hasLabel: false,
    lineSource: 'dashed-gap',
  });
  slots.sort((a, b) => a.y - b.y || a.x - b.x);
}

/** Стр. 6: широкие строки ответа — в одну группу (хвост после «?» отдельно). */
function mergeBrownPage6CareerAnswerLines(slots, options = {}) {
  if (!isDiaryQuestionnairePage(options) || options.pageNumber !== getDiaryCareerQuestionPage(options)) {
    return;
  }

  const minAnswerY =
    options.brownPage6CareerAnswerLineMinNormY ??
    options.brownCareerAnswerMinNormY ??
    0.788;
  const answers = slots
    .filter(
      (s) =>
        !s.hasLabel &&
        s.y >= minAnswerY &&
        s.y <= 0.85 &&
        s.x < 0.16 &&
        s.width >= 0.72
    )
    .sort((a, b) => a.y - b.y || a.x - b.x);
  if (answers.length < 2) return;

  const groupId = answers[0].continuationGroup;
  for (let i = 1; i < answers.length; i += 1) {
    answers[i].continuationGroup = groupId;
    answers[i].inputKind = 'block';
  }
  answers[0].inputKind = 'block';
}

/** Стр. 6: сплошная линия под вопросом → короткий хвост после «?». */
function normalizeBrownPage6CareerHeadSlot(slots, options = {}) {
  if (!isDiaryQuestionnairePage(options) || options.pageNumber !== getDiaryCareerQuestionPage(options)) {
    return;
  }

  const tailLeft = options.brownPage6CareerTailLeftRatio ?? 0.768;
  const targetRight = options.brownMicroRowTailTargetRight ?? 0.895;
  const questionY = options.brownPage6CareerQuestionNormY ?? 0.773;
  const minY = options.brownPage6CareerQuestionMinNormY ?? questionY - 0.012;
  const maxY = options.brownPage6CareerQuestionMaxNormY ?? questionY + 0.012;

  for (const slot of slots) {
    if (slot.hasLabel) continue;
    if (slot.y < minY || slot.y > maxY) continue;

    if (slot.x >= 0.55 && slot.width <= 0.22) {
      slot.x = formatFloat(tailLeft);
      slot.width = formatFloat(Math.max(0.06, targetRight - tailLeft));
      delete slot.inputKind;
      continue;
    }

    if (slot.width < 0.35) continue;

    slot.x = formatFloat(tailLeft);
    slot.width = formatFloat(Math.max(0.06, targetRight - tailLeft));
    delete slot.inputKind;
  }
}

/** Пропущенные строки анкеты между соседними полями (телефон, цвет и т.д.). */
function injectBrownQuestionnaireMissingMiddleRows(slots, options = {}) {
  if (!isDiaryQuestionnairePage(options)) return;
  if (!slots.length) return;

  const careerPage = getDiaryCareerQuestionPage(options);
  const isCareerPage = options.pageNumber === careerPage;
  const rowGap = options.brownQuestionnaireRowGap ?? 0.042;
  const maxGap = rowGap * 1.55;
  const maxBodyY = isCareerPage ? 0.72 : 0.76;
  const sorted = [...slots].sort((a, b) => a.y - b.y || a.x - b.x);
  const toAdd = [];

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const prev = sorted[i];
    const next = sorted[i + 1];
    if (prev.y < 0.28 || next.y > maxBodyY) continue;
    if (prev.width < 0.25 || next.width < 0.25) continue;
    const gap = next.y - prev.y;
    if (gap <= maxGap) continue;

    let y = formatFloat(prev.y + rowGap);
    while (y < next.y - rowGap * 0.5) {
      const exists =
        sorted.some((s) => Math.abs(s.y - y) < 0.012) ||
        toAdd.some((s) => Math.abs(s.y - y) < 0.012);
      if (!exists) {
        const template = prev.width >= next.width ? prev : next;
        toAdd.push({
          x: template.x,
          y,
          width: template.width,
          height: template.height,
          hasLabel: false,
          lineSource: template.lineSource,
        });
      }
      y = formatFloat(y + rowGap);
    }
  }

  if (toAdd.length) {
    slots.push(...toAdd);
    slots.sort((a, b) => a.y - b.y || a.x - b.x);
  }
}

/** Стр. 16 «Одежда и стиль»: PDF отдаёт строку, но merge иногда её теряет. */
function injectPurplePage16MissingColorComboRow(slots, options = {}) {
  if (!isPurpleAlbum(options) || options.pageNumber !== 16 || !slots.length) return;

  const targetY = 0.5275;
  if (slots.some((s) => Math.abs(s.y - targetY) < 0.018)) return;

  const anchor = slots.find(
    (s) => !s.hasLabel && s.y >= 0.488 && s.y <= 0.498 && s.width >= 0.25 && s.width <= 0.35
  );
  if (!anchor) return;

  slots.push({
    x: formatFloat(0.482),
    y: formatFloat(targetY),
    width: formatFloat(0.427),
    height: anchor.height,
    hasLabel: false,
    lineSource: 'dashed-gap',
  });
  slots.sort((a, b) => a.y - b.y || a.x - b.x);
}

/** «Анкета для друзей»: Instagram / VK / TikTok внизу страницы. */
function injectBrownFriendQuestionnaireSocialLines(slots, options = {}) {
  if (!isPurpleAlbum(options) || !slots.length) return;
  const page = options.pageNumber;
  if (page < 28 || page > 33) return;

  const rowGap = options.brownQuestionnaireRowGap ?? 0.042;
  const band = slots[0]?.height ?? 0.033;
  const anchor = slots
    .filter((s) => !s.hasLabel && s.y >= 0.72 && s.y <= 0.82 && s.x < 0.2 && s.width >= 0.45)
    .sort((a, b) => b.y - a.y)[0];
  if (!anchor) return;

  const template = {
    x: formatFloat(Math.min(anchor.x, 0.078)),
    width: formatFloat(Math.max(anchor.width, 0.62)),
    height: band,
    lineSource: anchor.lineSource,
  };

  const targets = [
    formatFloat(anchor.y + rowGap),
    formatFloat(anchor.y + rowGap * 2),
    formatFloat(anchor.y + rowGap * 3),
  ];

  for (const y of targets) {
    if (y > 0.945) continue;
    const exists = slots.some(
      (s) => !s.hasLabel && Math.abs(s.y - y) < 0.016 && s.x < 0.25
    );
    if (exists) continue;
    slots.push({
      x: template.x,
      y,
      width: template.width,
      height: template.height,
      hasLabel: false,
      lineSource: 'dashed-gap',
    });
  }

  slots.sort((a, b) => a.y - b.y || a.x - b.x);
}

/** Двойные дневные страницы (фиолетовый): PDF часто не отдаёт верхние широкие строки. */
function injectPurpleDaySpreadMissingTopLines(slots, options = {}) {
  if (!isPurpleDaySpreadPage(options) || !slots.length) return;

  const rowGap = options.brownDaySpreadRowGap ?? 0.044;
  const band = slots[0]?.height ?? 0.033;
  const bands = [
    { minY: 0.28, maxY: 0.52, topLines: options.purpleDaySpreadTopLines ?? 3 },
    { minY: 0.62, maxY: 0.86, topLines: options.purpleDaySpreadBottomTopLines ?? 2 },
  ];

  for (const bandDef of bands) {
    const firstBand = slots
      .filter(
        (s) =>
          s.y >= bandDef.minY &&
          s.y <= bandDef.maxY &&
          s.x < 0.15 &&
          s.width >= 0.55
      )
      .sort((a, b) => a.y - b.y);
    if (!firstBand.length || firstBand[0].y <= bandDef.minY + 0.02) continue;

    const template = firstBand[0];
    for (let i = bandDef.topLines; i >= 1; i -= 1) {
      const y = formatFloat(firstBand[0].y - rowGap * i);
      if (y < bandDef.minY - 0.12) continue;
      if (slots.some((s) => Math.abs(s.y - y) < 0.012)) continue;
      slots.push({
        x: template.x,
        y,
        width: formatFloat(Math.max(template.width, 0.75)),
        height: band,
        hasLabel: false,
        lineSource: 'dashed-gap',
      });
    }
  }

  slots.sort((a, b) => a.y - b.y || a.x - b.x);
}

/**
 * Анкета «для мамы/папы»: PDF часто пропускает первую строку «Имя:» под заголовком.
 */
function injectBrownQuestionnaireMissingFirstRow(slots, options = {}) {
  if (!isDiaryQuestionnairePage(options) || options.pageNumber === getDiaryCareerQuestionPage(options)) {
    return;
  }
  if (!slots.length) return;

  const rowGap = options.brownQuestionnaireRowGap ?? 0.042;
  const maxFirstY = options.brownQuestionnaireFirstRowMaxNormY ?? 0.305;
  slots.sort((a, b) => a.y - b.y || a.x - b.x);

  if (options.brownPdfLines?.length && options.pageHeight && options.pageWidth) {
    const hasPdfFirstRow = options.brownPdfLines.some((line) => {
      const normY = (options.pageHeight - line.y) / options.pageHeight;
      const left = line.left / options.pageWidth;
      const span = line.span / options.pageWidth;
      return normY >= 0.28 && normY <= 0.34 && left <= 0.2 && span >= 0.65;
    });
    if (hasPdfFirstRow) return;
  }

  const hasShortHeadNearTop = slots.some(
    (s) =>
      !s.hasLabel &&
      s.y >= 0.22 &&
      s.y <= 0.34 &&
      s.x >= 0.35 &&
      s.width >= 0.3 &&
      s.width <= 0.58
  );
  if (hasShortHeadNearTop) return;

  const maxInjectBandY = options.brownQuestionnaireFirstRowInjectMaxNormY ?? 0.36;
  const first = slots.find(
    (s) => !s.hasLabel && s.y >= 0.28 && s.y <= maxInjectBandY && s.width >= 0.35
  );
  if (!first || first.y <= maxFirstY) return;

  const nameY = formatFloat(first.y - rowGap);
  if (nameY < 0.24) return;
  if (slots.some((s) => Math.abs(s.y - nameY) < 0.014)) return;

  const pageHeight = options.pageHeight;
  const pageWidth = options.pageWidth;
  const pdfLine = options.brownPdfLines?.find((line) => {
    if (!pageHeight) return false;
    const normY = (pageHeight - line.y) / pageHeight;
    return Math.abs(normY - nameY) < 0.014;
  });

  if (pdfLine && pageWidth && pdfLine.source !== 'rowtrim') {
    slots.unshift({
      x: formatFloat(pdfLine.left / pageWidth),
      y: nameY,
      width: formatFloat(pdfLine.span / pageWidth),
      height: first.height,
      hasLabel: false,
      lineSource: pdfLine.source,
    });
    return;
  }

  slots.unshift({
    x: first.x,
    y: nameY,
    width: first.width,
    height: first.height,
    hasLabel: false,
    lineSource: first.lineSource,
  });
}

/**
 * «Пожелания хозяйке дневника»: PDF не всегда отдаёт 3–4 строки продолжения.
 */
function injectBrownPage6MissingWishLines(slots, options = {}) {
  if (options.pageNumber !== getDiaryCareerQuestionPage(options) || !slots.length) return;

  const rowGap = options.brownQuestionnaireRowGap ?? 0.042;
  const band = slots[0]?.height ?? 0.028;
  const template = slots.find((slot) => slot.x < 0.12 && slot.width >= 0.72);
  if (!template) return;

  const targets = [
    options.brownCareerAnswerFirstNormY ?? 0.815,
    (options.brownCareerAnswerFirstNormY ?? 0.815) + rowGap,
    (options.brownCareerAnswerFirstNormY ?? 0.815) + rowGap * 2,
    (options.brownCareerAnswerFirstNormY ?? 0.815) + rowGap * 3,
  ];

  for (const y of targets) {
    const normY = formatFloat(y);
    if (slots.some((slot) => Math.abs(slot.y - normY) < 0.018)) continue;
    slots.push({
      x: template.x,
      y: normY,
      width: template.width,
      height: band,
      hasLabel: false,
      lineSource: template.lineSource,
    });
  }

  slots.sort((a, b) => a.y - b.y || a.x - b.x);
}

function injectBrownQuestionnaireMissingWishLines(slots, options = {}) {
  if (!isDiaryQuestionnairePage(options) || options.pageNumber === getDiaryCareerQuestionPage(options)) {
    return;
  }
  if (slots.length < 8) return;

  const rowGap = options.brownQuestionnaireRowGap ?? 0.042;
  const wishMinY = options.brownWishFieldMinNormY ?? 0.772;
  const wishMaxY = options.brownWishFieldMaxNormY ?? 0.92;
  const targetWishLines = options.brownWishTotalLines ?? 4;

  slots.sort((a, b) => a.y - b.y || a.x - b.x);

  const pickWishLines = () =>
    slots.filter(
      (s) =>
        !s.hasLabel &&
        !isBrownFooterArtifactSlot(s) &&
        !isBrownWishExcludeSlot(s) &&
        s.y >= wishMinY &&
        s.y <= wishMaxY
    );

  let wishLines = pickWishLines();
  if (!wishLines.length) return;

  const anchor = [...wishLines].sort((a, b) => a.y - b.y)[0];
  const wideTemplate = [...wishLines]
    .filter((s) => s.width >= 0.52)
    .sort((a, b) => b.width - a.width)[0];
  const template = {
    x: wideTemplate?.x ?? Math.min(anchor.x, 0.2),
    width: wideTemplate?.width ?? Math.max(anchor.width, 0.72),
    height: anchor.height,
    lineSource: wideTemplate?.lineSource ?? anchor.lineSource,
  };

  for (let attempt = 0; attempt < targetWishLines; attempt += 1) {
    const current = [...pickWishLines()].sort((a, b) => a.y - b.y);
    if (current.length >= targetWishLines) break;

    const last = current[current.length - 1];
    const prev = current[current.length - 2];
    const measuredGap = prev ? last.y - prev.y : rowGap;
    const stepGap =
      measuredGap > 0.028 && measuredGap < 0.05 ? measuredGap : rowGap;
    const nextY = formatFloat(last.y + stepGap);
    if (nextY > (options.brownQuestionnaireEndNormY ?? 0.94)) break;
    if (slots.some((s) => Math.abs(s.y - nextY) < 0.014)) continue;

    slots.push({
      x: template.x,
      y: nextY,
      width: template.width,
      height: template.height,
      hasLabel: false,
      lineSource: template.lineSource,
    });
  }

  slots.sort((a, b) => a.y - b.y || a.x - b.x);
}

/**
 * PDF иногда не даёт вторую линию («Кем ты хочешь стать…»), а ниже сразу футер.
 */
function injectBrownQuestionnaireMissingWideLine(slots, options = {}) {
  const typicalGap = options.brownQuestionnaireRowGap ?? 0.042;
  const sorted = [...slots].sort((a, b) => a.y - b.y || a.x - b.x);
  const toAdd = [];

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const prev = sorted[i];
    const next = sorted[i + 1];
    if (prev.width < 0.45 || prev.y < 0.7 || prev.y > 0.8) continue;
    if (isDiaryQuestionnairePage(options) && prev.hasLabel && prev.y < 0.735) continue;
    if (!isBrownWishExcludeSlot(next) && !isBrownFooterArtifactSlot(next)) continue;

    const gap = next.y - prev.y;
    if (gap < 0.085 || gap > 0.12) continue;

    const midY = formatFloat(prev.y + typicalGap);
    if (sorted.some((s) => Math.abs(s.y - midY) < 0.018)) continue;

    toAdd.push({
      x: prev.x,
      y: midY,
      width: prev.width,
      height: prev.height,
      hasLabel: false,
      lineSource: prev.lineSource,
    });
  }

  if (toAdd.length) {
    slots.push(...toAdd);
    slots.sort((a, b) => a.y - b.y || a.x - b.x);
  }
}

/** Левые розовые блоки («Мечты»): 2–4 короткие линии с равномерным шагом. */
function mergeBrownPeachColumnStacks(slots, options = {}) {
  const rowGapMax = options.brownPeachStackRowGapMax ?? 0.056;
  const minLines = options.brownPeachStackMinLines ?? 2;
  const maxLines = options.brownPeachStackMaxLines ?? 4;

  const leftPeach = slots
    .filter(
      (s) =>
        isBrownPeachBlockLine(s) &&
        !isBrownFooterArtifactSlot(s) &&
        !isBrownWishExcludeSlot(s)
    )
    .sort((a, b) => a.y - b.y || a.x - b.x);

  let i = 0;
  while (i < leftPeach.length) {
    const slot = leftPeach[i];
    const run = [slot];
    let j = i + 1;
    while (j < leftPeach.length) {
      const prev = run[run.length - 1];
      const next = leftPeach[j];
      const gap = next.y - prev.y;
      if (
        Math.abs(next.x - slot.x) > 0.08 ||
        gap <= 0.003 ||
        gap > rowGapMax ||
        brownSlotHorizontalOverlapRatio(prev, next) < 0.2
      ) {
        break;
      }
      run.push(next);
      j += 1;
      if (run.length >= maxLines) break;
    }

    if (run.length >= minLines) {
      const mergedGroupId = run[0].continuationGroup;
      for (let k = 1; k < run.length; k += 1) {
        run[k].continuationGroup = mergedGroupId;
        run[k].inputKind = 'block';
      }
      run[0].inputKind = 'block';
    }

    i = j;
  }
}

function isBrownAdjacentWideMergeCandidate(slot) {
  if (isBrownFooterArtifactSlot(slot) || isBrownWishExcludeSlot(slot)) return false;
  if (slot.width < 0.4) return false;
  if (slot.y < 0.68 || slot.y > 0.82) return false;
  return true;
}

/** Пара широких строк анкеты с типичным шагом (~0.04), когда PDF не отдал вторую линию. */
function mergeBrownAdjacentQuestionnaireWideLines(slots, options = {}) {
  const rowGapMin = options.brownAdjacentWideGapMin ?? 0.034;
  const rowGapMax = options.brownAdjacentWideGapMax ?? 0.048;
  const maxLines = options.brownAdjacentWideMaxLines ?? 2;

  const sorted = slots
    .filter(isBrownAdjacentWideMergeCandidate)
    .sort((a, b) => a.y - b.y || a.x - b.x);

  let i = 0;
  while (i < sorted.length) {
    const run = [sorted[i]];
    let j = i + 1;
    while (j < sorted.length) {
      const gap = sorted[j].y - run[run.length - 1].y;
      if (gap < rowGapMin || gap > rowGapMax) break;
      run.push(sorted[j]);
      j += 1;
      if (run.length >= maxLines) break;
    }

    if (run.length >= 2) {
      const mergedGroupId = run[0].continuationGroup;
      for (let k = 1; k < run.length; k += 1) {
        run[k].continuationGroup = mergedGroupId;
        run[k].inputKind = 'block';
      }
      run[0].inputKind = 'block';
    }

    i = j;
  }
}

/**
 * Двухстрочные вопросы анкеты («Кем ты хочешь стать…»): 2+ широких линии с близким шагом.
 */
function mergeBrownWideQuestionnaireFieldRuns(slots, options = {}) {
  const rowGapMin = options.brownFieldRunGapMin ?? 0.07;
  const rowGapMax = options.brownFieldRunGapMax ?? 0.11;
  const minLines = options.brownFieldRunMinLines ?? 2;
  const maxLines = options.brownFieldRunMaxLines ?? 2;
  const minWidth = options.brownFieldRunMinWidth ?? 0.28;
  const minStartY = options.brownFieldRunMinStartNormY ?? 0.68;
  const maxEndY = options.brownFieldRunMaxEndNormY ?? 0.87;

  const sorted = [...slots].sort((a, b) => a.y - b.y || a.x - b.x);
  let i = 0;

  while (i < sorted.length) {
    const slot = sorted[i];
    if (
      slot.inputKind === 'block' ||
      slot.width < minWidth ||
      slot.y < minStartY ||
      slot.y > maxEndY ||
      isBrownFooterArtifactSlot(slot)
    ) {
      i += 1;
      continue;
    }

    const run = [slot];
    let j = i + 1;
    while (j < sorted.length) {
      const prev = run[run.length - 1];
      const next = sorted[j];
      const gap = next.y - prev.y;
      if (
        next.inputKind === 'block' ||
        next.width < minWidth ||
        next.y > maxEndY ||
        isBrownFooterArtifactSlot(next) ||
        isBrownWishExcludeSlot(next) ||
        gap < rowGapMin ||
        gap > rowGapMax ||
        brownSlotHorizontalOverlapRatio(prev, next) < 0.15
      ) {
        break;
      }
      run.push(next);
      j += 1;
      if (run.length >= maxLines) break;
    }

    if (run.length >= minLines) {
      const mergedGroupId = run[0].continuationGroup;
      for (let k = 1; k < run.length; k += 1) {
        run[k].continuationGroup = mergedGroupId;
        run[k].inputKind = 'block';
      }
      run[0].inputKind = 'block';
    }

    i = j;
  }
}

/** Последняя пара широких строк («Кем ты хочешь стать…» — 2-я линия ниже). */
function mergeBrownLastWideDualLinePair(slots, options = {}) {
  const questionnaireParentPage =
    isDiaryQuestionnairePage(options) &&
    options.pageNumber >= (options.brownParentQuestionnaireMinPage ?? 7);
  if (questionnaireParentPage) return;

  const rowGapMin = options.brownDualLineGapMin ?? 0.07;
  const rowGapMax = options.brownDualLineGapMax ?? 0.11;
  const minWidth = options.brownFieldRunMinWidth ?? 0.28;

  const singles = [...slots]
    .filter(
      (s) =>
        s.inputKind !== 'block' &&
        s.width >= minWidth &&
        !isBrownFooterArtifactSlot(s) &&
        !isBrownWishExcludeSlot(s)
    )
    .sort((a, b) => a.y - b.y);

  if (singles.length < 2) return;

  const last = singles[singles.length - 1];
  const prev = singles[singles.length - 2];
  const gap = last.y - prev.y;

  if (gap < rowGapMin || gap > rowGapMax) return;

  const mergedGroupId = prev.continuationGroup;
  last.continuationGroup = mergedGroupId;
  last.inputKind = 'block';
  prev.inputKind = 'block';
}


/**
 * Нижний блок анкеты («Пожелания…»): 3–6 строк подряд с равномерным шагом.
 */
function mergeBrownQuestionnaireWishTail(slots, options = {}) {
  const wishPage = options.brownWishPageNumber ?? 3;
  if (options.pageNumber !== wishPage) return;

  const minSlotsOnPage = options.brownWishPageMinSlots ?? 10;
  const minLines = options.brownWishMinLines ?? 3;
  const maxLines = options.brownWishMaxLines ?? 6;
  const rowGapMax = options.brownWishRowGapMax ?? 0.048;
  const minStartY = options.brownWishMinStartNormY ?? 0.625;
  const maxEndY = options.brownWishMaxEndNormY ?? 0.9;
  const minWidth = options.brownWishMinWidth ?? 0.28;

  if (slots.length < minSlotsOnPage) return;

  const peachLineCount = slots.filter(
    (s) => s.x < 0.22 && s.width >= 0.16 && s.width <= 0.55
  ).length;
  if (peachLineCount >= (options.brownWishSkipPeachLines ?? 6)) return;

  const candidates = [...slots]
    .filter(
      (s) =>
        s.y >= minStartY &&
        s.y <= maxEndY &&
        s.width >= minWidth &&
        !isBrownWishExcludeSlot(s)
    )
    .sort((a, b) => b.y - a.y || a.x - b.x);

  if (!candidates.length || candidates[0].y < 0.76) return;

  const wishFieldTopMinY = options.brownWishFieldMinNormY ?? 0.772;
  const bestRun = [candidates[0]];
  for (let i = 1; i < candidates.length; i += 1) {
    const gap = bestRun[0].y - candidates[i].y;
    if (gap <= 0 || gap > rowGapMax) break;
    if (candidates[i].y < wishFieldTopMinY) break;
    bestRun.unshift(candidates[i]);
    if (bestRun.length >= maxLines) break;
  }

  if (bestRun.length < minLines) return;
  const wishAnchorMinY = options.brownWishMinJoinNormY ?? 0.69;
  if (bestRun[bestRun.length - 1].y < wishAnchorMinY) return;
  if (bestRun[0].y < wishFieldTopMinY) return;

  const mergedGroupId = bestRun[0].continuationGroup;
  for (let k = 1; k < bestRun.length; k += 1) {
    bestRun[k].continuationGroup = mergedGroupId;
    bestRun[k].inputKind = 'block';
  }
  bestRun[0].inputKind = 'block';
}

/** Высота полосы слота из шага до соседней строки PDF (эталон — normY линии). */
function normalizeBrownSlotBandHeights(slots) {
  if (!slots.length) return slots;

  const sorted = [...slots].sort((a, b) => a.y - b.y || a.x - b.x);
  for (let i = 0; i < sorted.length; i += 1) {
    const slot = sorted[i];
    const prev = sorted[i - 1];
    const next = sorted[i + 1];
    let band = slot.height;

    if (next && next.y - slot.y < 0.12) {
      band = Math.min(band, (next.y - slot.y) * 0.9);
    }
    if (prev && slot.y - prev.y < 0.12) {
      band = Math.min(band, (slot.y - prev.y) * 0.9);
    }

    slot.height = formatFloat(clamp(band, 0.028, 0.058));
  }

  return slots;
}

function isBrownFullWidthInputLine(slot) {
  return !slot.hasLabel && slot.width >= 0.68 && slot.x < 0.18;
}

/** Соседние широкие строки (блок «Мечты», линованные страницы) — одна группа переноса. */
function canMergeBrownFullWidthAdjacentLines(prev, next, options = {}) {
  const gapMin = options.brownFullWidthGapMin ?? 0.028;
  const gapMax = options.brownFullWidthGapMax ?? 0.058;
  const gap = next.y - prev.y;
  if (gap < gapMin || gap > gapMax) return false;
  if (isBrownFooterArtifactSlot(next)) return false;
  if (!isBrownFullWidthInputLine(prev) || !isBrownFullWidthInputLine(next)) return false;
  return brownSlotHorizontalOverlapRatio(prev, next) >= 0.45;
}

function mergeBrownFullWidthAdjacentRuns(slots, options = {}) {
  if (slots.length < 2) return slots;

  const maxLines = options.brownFullWidthMaxLines ?? 10;
  const sorted = [...slots].sort((a, b) => a.y - b.y || a.x - b.x);
  let i = 0;

  while (i < sorted.length) {
    const run = [sorted[i]];
    let j = i + 1;
    while (j < sorted.length) {
      const next = sorted[j];
      if (!canMergeBrownFullWidthAdjacentLines(run[run.length - 1], next, options)) {
        break;
      }
      run.push(next);
      j += 1;
      if (run.length >= maxLines) break;
    }

    if (run.length >= 2) {
      const mergedGroupId = run[0].continuationGroup;
      for (const slot of run) {
        slot.continuationGroup = mergedGroupId;
        slot.inputKind = 'block';
      }
    }

    i = j;
  }

  return slots;
}

function assignMissingBrownContinuationGroups(slots) {
  let maxGroup = slots.reduce(
    (max, slot) => Math.max(max, slot.continuationGroup ?? 0),
    0
  );
  const sorted = [...slots].sort((a, b) => a.y - b.y || a.x - b.x);

  for (const slot of sorted) {
    if (slot.continuationGroup != null) continue;
    maxGroup += 1;
    slot.continuationGroup = maxGroup;
  }

  return slots;
}

/** Соседние строки PDF → одна группа переноса; x/y/width каждой линии не трогаем. */
function canJoinBrownSimpleAdjacentLines(prev, next, options = {}) {
  if (options.pageNumber === 1) return false;

  const gapMin = options.brownSimpleGapMin ?? 0.03;
  const gapMax = options.brownSimpleGapMax ?? 0.058;
  const gap = next.y - prev.y;
  if (isBrownFooterArtifactSlot(next) || isBrownWishExcludeSlot(next)) return false;

  if (canMergeBrownFullWidthAdjacentLines(prev, next, options)) {
    return true;
  }

  const columnEpsilon = options.brownSimpleColumnEpsilon ?? 0.04;
  const xAlign = Math.abs(prev.x - next.x) <= columnEpsilon;
  const overlap = brownSlotHorizontalOverlapRatio(prev, next);

  const careerPage = getDiaryCareerQuestionPage(options);
  const blocksQuestionnaireToCareer =
    isDiaryQuestionnairePage(options) &&
    options.pageNumber === careerPage &&
    prev.y >= 0.65 &&
    prev.y <= 0.715 &&
    next.y >= 0.725 &&
    prev.width >= 0.35;

  const blocksQuestionRowToAnswer =
    isDiaryQuestionnairePage(options) &&
    prev.hasLabel &&
    prev.y >= 0.68 &&
    prev.y <= 0.72 &&
    next.y >= 0.73 &&
    next.y <= 0.83;

  const blocksFriendToCareerAnswer =
    isDiaryQuestionnairePage(options) &&
    options.pageNumber === careerPage &&
    !prev.hasLabel &&
    !next.hasLabel &&
    prev.y >= 0.72 &&
    prev.y <= 0.752 &&
    prev.x >= 0.28 &&
    prev.x <= 0.55 &&
    prev.width >= 0.45 &&
    next.y >= 0.755 &&
    next.x < 0.16 &&
    next.width >= 0.72;

  const questionnaireParentPage =
    isDiaryQuestionnairePage(options) &&
    options.pageNumber >= (options.brownParentQuestionnaireMinPage ?? 7);

  const shortHeadWideTail =
    !blocksQuestionnaireToCareer &&
    !blocksQuestionRowToAnswer &&
    !blocksFriendToCareerAnswer &&
    !prev.hasLabel &&
    !next.hasLabel &&
    prev.x >= 0.27 &&
    prev.x < 0.65 &&
    prev.width >= 0.25 &&
    prev.width <= 0.68 &&
    next.x < 0.16 &&
    next.width >= 0.72 &&
    gap >= 0.02 &&
    gap <= 0.055;

  const microLabelTailWideContinuation =
    !blocksQuestionnaireToCareer &&
    !blocksQuestionRowToAnswer &&
    !blocksFriendToCareerAnswer &&
    !prev.hasLabel &&
    !next.hasLabel &&
    prev.x >= 0.38 &&
    prev.width >= 0.06 &&
    prev.width <= 0.35 &&
    next.x < 0.16 &&
    next.width >= 0.72 &&
    gap >= 0.02 &&
    gap <= 0.055;

  const careerHeadWidePair =
    isDiaryQuestionnairePage(options) &&
    options.pageNumber === careerPage &&
    !prev.hasLabel &&
    !next.hasLabel &&
    prev.y >= 0.685 &&
    prev.y <= 0.705 &&
    prev.x >= 0.55 &&
    prev.width <= 0.22 &&
    next.y >= 0.755 &&
    next.y <= 0.795 &&
    next.x < 0.16 &&
    next.width >= 0.72 &&
    gap >= 0.055 &&
    gap <= 0.09;

  const blocksFriendRowToCareerTail =
    isDiaryQuestionnairePage(options) &&
    options.pageNumber === careerPage &&
    !prev.hasLabel &&
    !next.hasLabel &&
    prev.y >= 0.72 &&
    prev.y <= 0.752 &&
    prev.x < 0.55 &&
    prev.width >= 0.45 &&
    next.y >= 0.755 &&
    next.x >= 0.55 &&
    next.width <= 0.28;

  const careerAnswerPair =
    isDiaryQuestionnairePage(options) &&
    options.pageNumber === careerPage &&
    !blocksFriendRowToCareerTail &&
    !prev.hasLabel &&
    !next.hasLabel &&
    prev.y >= 0.73 &&
    next.y >= 0.73 &&
    next.y <= 0.83 &&
    gap >= 0.034 &&
    gap <= 0.052 &&
    overlap >= 0.25;

  const wishOverlapMin = options.brownWishRelaxedColumn ? 0.25 : 0.18;
  const wishFieldTopMinY = options.brownWishFieldMinNormY ?? 0.772;
  const wishPage = options.brownWishPageNumber ?? 3;
  const wishTail =
    options.pageNumber === wishPage &&
    !options.brownSingleLineGroups &&
    prev.y >= wishFieldTopMinY &&
    next.y >= wishFieldTopMinY &&
    next.y <= (options.brownWishFieldMaxNormY ?? 0.92) &&
    !blocksQuestionnaireToCareer &&
    !blocksQuestionRowToAnswer &&
    gap >= gapMin &&
    gap <= 0.052 &&
    overlap >= wishOverlapMin &&
    (xAlign || (options.brownWishRelaxedColumn === true && overlap >= 0.35));

  if (shortHeadWideTail) return true;
  if (microLabelTailWideContinuation) return true;
  if (careerHeadWidePair) return true;
  if (careerAnswerPair) return true;
  if (wishTail) return true;

  if (gap < gapMin || gap > gapMax) return false;

  const fromBox =
    prev.lineSource === 'box' && next.lineSource === 'box' && xAlign;

  const fromWide =
    prev.lineSource === 'wide-block' &&
    next.lineSource === 'wide-block' &&
    xAlign;

  return fromBox || fromWide;
}

/** Продолжения блока с короткой первой строкой — на всю ширину, с левого края. */
function alignBrownBlockContinuationWidths(slots) {
  const groups = new Map();
  for (const slot of slots) {
    if (!groups.has(slot.continuationGroup)) {
      groups.set(slot.continuationGroup, []);
    }
    groups.get(slot.continuationGroup).push(slot);
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => a.y - b.y || a.x - b.x);
    const head = group[0];
    const isShortHeadRow = head.x >= 0.27 && head.width >= 0.3 && head.width < 0.66;
    if (!head || !isShortHeadRow) continue;

    const wideTemplate = group
      .filter((slot) => slot.width >= 0.72 && slot.x < 0.16)
      .sort((a, b) => a.x - b.x || b.width - a.width)[0];
    if (!wideTemplate) continue;

    for (let i = 1; i < group.length; i += 1) {
      group[i].x = wideTemplate.x;
      group[i].width = wideTemplate.width;
    }
  }

  return slots;
}

/** Обложка дневника: две строки «принадлежит» и «телефон», если PDF дал одну. */
function ensureDiaryCoverPageSlots(slots, options = {}) {
  if (options.pageNumber !== 1 || slots.length === 0) return;

  slots.sort((a, b) => a.y - b.y || a.x - b.x);

  if (slots.length >= 2) {
    slots[0].continuationGroup = 1;
    slots[1].continuationGroup = 2;
    return;
  }

  const first = slots[0];
  const rowGap = options.brownCoverRowGap ?? 0.055;
  const secondY = formatFloat(first.y + rowGap);

  slots.push({
    x: first.x,
    y: secondY,
    width: first.width,
    height: first.height ?? 0.028,
    hasLabel: first.hasLabel ?? false,
  });
  first.continuationGroup = 1;
  slots[1].continuationGroup = 2;
}

/**
 * Эталон PDF → слоты: одна линия = координаты из вектора.
 * Группа только для переноса (continuationGroup), без сдвига геометрии.
 */
function assignBrownDiarySlotGroups(slots, options = {}) {
  if (!slots.length) return slots;

  const minLinesInBlock = options.brownSimpleMinLines ?? 2;
  const maxLinesInBlock = options.brownSimpleMaxLines ?? 10;

  slots.sort((a, b) => a.y - b.y || a.x - b.x);

  injectBrownQuestionnaireMissingFirstRow(slots, options);
  injectBrownQuestionnaireMissingMiddleRows(slots, options);
  injectBrownQuestionnaireMissingWideLine(slots, options);
  injectBrownQuestionnaireMissingWishLines(slots, options);
  injectBrownPage6MissingWishLines(slots, options);
  injectBrownFriendQuestionnaireSocialLines(slots, options);
  injectPurpleDaySpreadMissingTopLines(slots, options);
  ensureBrownSparsePageInlineQuestionBlock(slots, options);

  const working = slots.filter(
    (slot) =>
      !isBrownFooterArtifactSlot(slot) &&
      !isBrownWishExcludeSlot(slot) &&
      !isBrownQuestionHeaderRowSlot(slot, slots, options) &&
      !isBrownQuestionnaireTitleUnderlineSlot(slot, slots, options) &&
      !isBrownPage6QuestionBandSlot(slot, slots, options) &&
      !isBrownCareerClosingTextSpuriousSlot(slot, slots, options) &&
      !isBrownPage31ClassQuestionSpuriousSlot(slot, options) &&
      !isBrownJournalTemplateSpuriousSlot(slot, options, slots) &&
      !isBrownJournalFirstInstructionSpuriousSlot(slot, options) &&
      !isBrownJournalInstructionSpuriousSlot(slot, options) &&
      !isBrownPeachBottomTitleSpuriousSlot(slot, options) &&
      !isBrownDaySpreadTitleSpuriousSlot(slot, options)
  );

  normalizeBrownPage6CareerHeadSlot(working, options);
  injectBrownPage6MissingBestFriendMaleRow(working, options);
  injectBrownPage6CareerQuestionTailSlot(working, options);
  injectBrownPage31ClassSizeTailSlot(working, options);
  removeBrownPage6MisplacedCareerAnswerSlots(working, options);
  ensureDiaryQuestionnaireCareerAnswerSlots(working, options);
  normalizeBrownCareerAnswerSlots(working, options);
  working.sort((a, b) => a.y - b.y || a.x - b.x);

  if (isBrownPeachDreamsPage(options)) {
    const grouped = buildBrownPage15CanonicalSlots(options);
    for (const slot of grouped) {
      delete slot.lineSource;
    }
    return grouped;
  }

  injectBrownJournalDateSlot(working, options);
  injectBrownJournalSeventhMainLineSlot(working, options);

  if (isBrownHobbyPage(options)) {
    const grouped = assignBrownPage13HobbySlotGroups(working, options);
    for (const slot of grouped) {
      delete slot.lineSource;
    }
    return grouped;
  }

  if (isBrownPetsPage(options)) {
    injectBrownPage17MissingTailSlots(working, options);
    const grouped = assignBrownPage17PetsSlotGroups(working, options);
    for (const slot of grouped) {
      delete slot.lineSource;
    }
    return grouped;
  }

  if (isBrownMoodPage(options)) {
    const grouped = assignBrownPage24MoodSlotGroups(working, options);
    for (const slot of grouped) {
      delete slot.lineSource;
    }
    return grouped;
  }

  if (isBrownAlbum(options) && options.pageNumber === 21) {
    injectBrownPage21MissingTailSlots(working, options);
    working.sort((a, b) => a.y - b.y || a.x - b.x);
  }

  if (isBrownAlbum(options) && options.pageNumber === 37) {
    injectBrownPage37MissingBottomLines(working, options);
    working.sort((a, b) => a.y - b.y || a.x - b.x);
  }

  if (isBrownAlbum(options) && options.pageNumber === 38) {
    refineBrownPage38FoodSlotWidths(working, options);
    working.sort((a, b) => a.y - b.y || a.x - b.x);
  }

  if (isDiaryDaySpreadPage(options)) {
    refineBrownDaySpreadIllustrationWidths(working, options);
    working.sort((a, b) => a.y - b.y || a.x - b.x);
  }

  let groupId = 0;
  for (let i = 0; i < working.length; i += 1) {
    groupId += 1;
    working[i].continuationGroup = groupId;
  }

  if (options.brownSingleLineGroups === true) {
    for (const slot of working) {
      delete slot.lineSource;
    }
    return working;
  }

  mergeBrownQuestionnaireWishTail(working, options);
  mergeBrownLastWideDualLinePair(working, options);

  let i = 0;
  while (i < working.length) {
    const start = working[i];
    const run = [start];
    let j = i + 1;
    while (j < working.length) {
      const next = working[j];
      if (!canJoinBrownSimpleAdjacentLines(run[run.length - 1], next, options)) {
        break;
      }
      run.push(next);
      j += 1;
      if (run.length >= maxLinesInBlock) break;
    }

    if (run.length >= minLinesInBlock) {
      const mergedGroupId = run[0].continuationGroup;
      for (let k = 1; k < run.length; k += 1) {
        run[k].continuationGroup = mergedGroupId;
        run[k].inputKind = 'block';
      }
      run[0].inputKind = 'block';
    }

    i = j;
  }

  ensureBrownQuestionnaireWishBlock(working, options);
  mergeBrownFullWidthAdjacentRuns(working, options);
  alignBrownBlockContinuationWidths(working);
  mergeBrownPage6CareerAnswerLines(working, options);
  assignMissingBrownContinuationGroups(working);
  refineBrownDiaryPageSlotGeometry(working, options);
  injectPurplePage16MissingColorComboRow(working, options);
  ensureDiaryCoverPageSlots(working, options);

  for (const slot of working) {
    delete slot.lineSource;
  }

  return working;
}

/** «Пожелания хозяйке дневника»: 4 строки с переносом текста. */
function ensureBrownQuestionnaireWishBlock(slots, options = {}) {
  if (!isDiaryQuestionnairePage(options) || options.pageNumber === getDiaryCareerQuestionPage(options)) {
    return;
  }
  const wishPage = options.brownWishPageNumber ?? 3;
  if (options.pageNumber !== wishPage) return;
  if (slots.length < 10) return;

  const rowGap = options.brownQuestionnaireRowGap ?? 0.042;
  const wishMinY = options.brownWishFieldMinNormY ?? 0.772;
  const targetLines = options.brownWishTotalLines ?? 4;

  const isWishSlot = (slot) =>
    !slot.hasLabel &&
    !isBrownFooterArtifactSlot(slot) &&
    !isBrownWishExcludeSlot(slot) &&
    slot.y >= wishMinY;

  let wishSlots = slots.filter(isWishSlot).sort((a, b) => a.y - b.y);
  if (!wishSlots.length) return;

  const anchor = wishSlots[0];
  const wideTemplate = wishSlots
    .filter((s) => s.width >= 0.52)
    .sort((a, b) => b.width - a.width)[0];
  const template = {
    x: wideTemplate?.x ?? Math.min(anchor.x, 0.2),
    width: wideTemplate?.width ?? Math.max(anchor.width, 0.72),
    height: anchor.height ?? 0.033,
  };

  const wishGaps = [];
  for (let i = 1; i < wishSlots.length; i += 1) {
    wishGaps.push(wishSlots[i].y - wishSlots[i - 1].y);
  }
  const medianGap =
    wishGaps.length > 0
      ? wishGaps.sort((a, b) => a - b)[Math.floor(wishGaps.length / 2)]
      : rowGap;
  const stepGap =
    medianGap > 0.028 && medianGap < 0.05 ? medianGap : rowGap;

  let cursorY = wishSlots[wishSlots.length - 1]?.y ?? anchor.y;
  while (wishSlots.length < targetLines) {
    cursorY = formatFloat(cursorY + stepGap);
    if (cursorY > (options.brownQuestionnaireEndNormY ?? 0.94)) break;
    if (slots.some((s) => Math.abs(s.y - cursorY) < 0.012)) {
      wishSlots = slots.filter(isWishSlot).sort((a, b) => a.y - b.y);
      if (wishSlots.length >= targetLines) break;
      continue;
    }
    slots.push({
      x: template.x,
      y: cursorY,
      width: template.width,
      height: template.height,
      hasLabel: false,
    });
    wishSlots = slots.filter(isWishSlot).sort((a, b) => a.y - b.y);
  }

  wishSlots = slots.filter(isWishSlot).sort((a, b) => a.y - b.y);
  if (wishSlots.length < 2) return;

  const primaryWish = wishSlots.slice(0, targetLines);
  let mergedGroupId = primaryWish[0]?.continuationGroup;
  if (mergedGroupId == null) {
    mergedGroupId =
      slots.reduce((max, slot) => Math.max(max, slot.continuationGroup ?? 0), 0) + 1;
  }

  for (const slot of primaryWish) {
    slot.continuationGroup = mergedGroupId;
    slot.inputKind = 'block';
  }

  for (const slot of wishSlots.slice(targetLines)) {
    if (slot.continuationGroup != null) continue;
    slot.continuationGroup = mergedGroupId;
    slot.inputKind = 'block';
  }

  slots.sort((a, b) => a.y - b.y || a.x - b.x);
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
    slotsByPage[String(pageNumber)] = await extractSlotsForPdfPage(doc, pageNumber, {
      ...options,
      pageNumber,
    });

  }

  return slotsByPage;
}

module.exports = {
  assignContinuationGroups,
  assignBrownDiarySlotGroups,
  buildSlotsFromPdfLines,
  buildSlotsFromWhiteBlocks,
  collapseNearbyRows,
  collectPathSegments,
  collectTextItems,
  collectWhiteInputBlocks,
  extractAllSlotsFromPdf,
  extractLineSlotsForPage,
  extractSlotsForPdfPage,
  loadPdfDocument,
  mergeBrownDiaryFormLines,
  mergeHorizontalLines,
  refineFormInputLines,
};
