/**
 * Shared text line capacity helpers for audit + calibration scripts.
 */
const fs = require('fs');
const path = require('path');

const SPACE_WIDTH_FACTOR = 0.35;
const REFERENCE_VIEWPORT = { width: 2480, height: 2480 };
const FIELD_LIMIT_PROBE_CYRILLIC =
  'Много отдыхать и радоваться жизни хочу купить арбуз и устроить пикник на выходных. '.repeat(20);

const FONT_WIDTH_MULTIPLIERS = {
  SvyaznoyRF: 1.02,
  'AmaticSC-Regular': 0.92,
  'AmaticSC-Bold': 0.94,
  'Nefelibata-Sans': 1.04,
  'Nefelibata-PenSans': 1.06,
};

const ALBUM_TYPOGRAPHY = {
  pregnancy_60: { fixedLineFontSize: 16, charWidthRatio: 0.54, lineWidthSlackRatio: 1.0 },
  pregnancy_a5: { fixedLineFontSize: 16, charWidthRatio: 0.54, lineWidthSlackRatio: 1.0 },
  kids_48: { fixedLineFontSize: 16, charWidthRatio: 0.5, lineWidthSlackRatio: 1.03 },
  holidays_birthday_60: { fixedLineFontSize: null, charWidthRatio: 0.56, lineWidthSlackRatio: 1.0 },
  diary_interior_brown: {
    fixedLineFontSize: 16,
    charWidthRatio: 0.5,
    lineWidthSlackRatio: 1.0,
    blockMaxFontSize: 16,
  },
  diary_interior_purple: {
    fixedLineFontSize: 16,
    charWidthRatio: 0.5,
    lineWidthSlackRatio: 1.0,
    blockMaxFontSize: 16,
  },
};

const DEFAULT_TYPOGRAPHY = {
  fixedLineFontSize: null,
  charWidthRatio: 0.56,
  lineWidthSlackRatio: 1.0,
};

const ALBUM_IDS = [
  'pregnancy_60',
  'pregnancy_a5',
  'kids_48',
  'holidays_birthday_60',
  'diary_interior_brown',
  'diary_interior_purple',
];

function getTypography(lineGuideId) {
  return ALBUM_TYPOGRAPHY[lineGuideId] ?? DEFAULT_TYPOGRAPHY;
}

function getCharWidthFactor(char, charWidthRatio) {
  if (char === ' ') return charWidthRatio * SPACE_WIDTH_FACTOR;
  return charWidthRatio;
}

function estimateTextWidth(text, fontSize, charWidthRatio) {
  let width = 0;
  for (const ch of text) {
    width += fontSize * getCharWidthFactor(ch, charWidthRatio);
  }
  return width;
}

function loadFontCharWidths(projectRoot) {
  const file = path.join(projectRoot, 'constants/generated/font-char-widths.json');
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function measureWithFontTable(text, fontSize, fontId, fontTable) {
  const entry = fontTable?.fonts?.[fontId];
  if (!entry?.avgCharWidthAt16) {
    return null;
  }
  const scale = fontSize / 16;
  let width = 0;
  for (const ch of text) {
    const perChar = entry.chars?.[ch];
    width += (perChar ?? entry.avgCharWidthAt16) * scale;
  }
  return width;
}

function measureTextWidth(text, fontSize, lineGuideId, fontId, fontTable) {
  const fromTable = measureWithFontTable(text, fontSize, fontId, fontTable);
  if (fromTable != null) return fromTable;
  const profile = getTypography(lineGuideId);
  const multiplier = FONT_WIDTH_MULTIPLIERS[fontId] ?? 1;
  return estimateTextWidth(text, fontSize, profile.charWidthRatio * multiplier);
}

const PREGNANCY_WEEKLY_COMPACT_LINE_HEIGHT = 0.035;
const PREGNANCY_WEEKLY_LINE_PITCH = 0.0412;
const PREGNANCY_WEEKLY_INLINE_TAIL_MIN_X_GAP = 0.015;

/** PNG-калибровка p9 inline-tail (norm X 0–1). */
const PREGNANCY_WEEKLY_P9_INLINE_TAIL = {
  plans: {
    labelEndNormX: 0.302,
    lineRightNormX: 0.572,
    lineLeftNormX: 0.06522,
  },
  feelings: {
    labelEndNormX: 0.528,
    lineRightNormX: 0.935,
    lineLeftNormX: 0.06522,
  },
};

function getPregnancyWeeklyInlineTailFieldCalib(lineGuideId, page, continuationGroup) {
  if (lineGuideId !== 'pregnancy_60' || page !== 9) return null;
  if (continuationGroup === 3) return PREGNANCY_WEEKLY_P9_INLINE_TAIL.plans;
  if (continuationGroup === 5) return PREGNANCY_WEEKLY_P9_INLINE_TAIL.feelings;
  return null;
}

function findWeeklyFieldBodyAnchorSlot(slot, allSlots, lineGuideId) {
  const bellyIndex = lineGuideId === 'pregnancy_60' ? 6 : 5;
  return allSlots.find(
    (s) =>
      s.continuationGroup === slot.continuationGroup &&
      !s.hasLabel &&
      !s.inlineLabelTail &&
      (s.inputKind ?? 'line') === 'line' &&
      s.index !== 1 &&
      s.index !== bellyIndex,
  );
}

function resolveTemplateTextRenderBox(slot, insets) {
  if (insets.anchorX != null && insets.anchorWidth != null) {
    return {
      viewLeft: insets.anchorX,
      viewWidth: insets.anchorWidth,
      textLeft: insets.left,
      textWidth: insets.width,
    };
  }
  return {
    viewLeft: slot.x + insets.left,
    viewWidth: insets.width,
    textLeft: 0,
    textWidth: insets.width,
  };
}

function getTemplateBlockTextInsets(slot, lineGuideId, allSlots) {
  if (slot.inlineLabelTail && isPregnancyWeeklyStructuredPage(lineGuideId, slot.page)) {
    return getPregnancyWeeklyInlineTailTextInsets(slot, lineGuideId, allSlots);
  }
  return { left: 0, width: slot.width };
}

function resolvePregnancyWeeklyFieldRowLayout(slot, lineGuideId, allSlots) {
  const calibGeometry = getPregnancyWeeklyFieldLineGeometry(slot, lineGuideId, allSlots);
  if (calibGeometry) {
    return calibGeometry;
  }
  const insets = getTemplateBlockTextInsets(slot, lineGuideId, allSlots);
  return resolveTemplateTextRenderBox(slot, insets);
}

function getPregnancyWeeklyFieldLineGeometry(slot, lineGuideId, allSlots) {
  if (slot.inlineLabelTail) {
    return {
      viewLeft: slot.x,
      viewWidth: slot.width,
      textLeft: 0,
      textWidth: slot.width,
    };
  }

  const calib = getPregnancyWeeklyInlineTailFieldCalib(
    lineGuideId,
    slot.page,
    slot.continuationGroup,
  );
  if (!calib || !allSlots?.length) return null;

  const anchorSlot = findWeeklyFieldBodyAnchorSlot(slot, allSlots, lineGuideId);
  if (!anchorSlot || anchorSlot.x <= 0 || calib.lineLeftNormX <= 0) return null;

  const profile = getTypography(lineGuideId);
  const slack = profile.lineWidthSlackRatio;
  const scale = anchorSlot.x / calib.lineLeftNormX;
  const lineLeftPx = calib.lineLeftNormX * scale;
  const lineRightPx = calib.lineRightNormX * scale;
  const fullWidth = (lineRightPx - lineLeftPx) * slack;

  return {
    viewLeft: lineLeftPx,
    viewWidth: fullWidth,
    textLeft: 0,
    textWidth: fullWidth,
  };
}

const PREGNANCY_WEEKLY_GUIDE_STROKE_FONT_OFFSET = 0.86;

function getPregnancyWeeklyFieldTextTopInView(rowViewTop, slot, fontSize) {
  const strokeY =
    typeof slot.strokeY === 'number' ? slot.strokeY : slot.y + slot.lineHeight;
  return Math.max(0, strokeY - rowViewTop - fontSize * PREGNANCY_WEEKLY_GUIDE_STROKE_FONT_OFFSET);
}

function getViewportNormScale(slot) {
  const normWidth = slot.normWidth ?? 0;
  if (normWidth <= 0 || slot.width <= 0) return 1;
  return slot.width / normWidth;
}

function getPregnancyWeeklyInlineTailTextInsets(slot, lineGuideId, allSlots) {
  if (
    !slot.inlineLabelTail ||
    !isPregnancyWeeklyStructuredPage(lineGuideId, slot.page)
  ) {
    return { left: 0, width: slot.width };
  }

  const calibGeometry = getPregnancyWeeklyFieldLineGeometry(slot, lineGuideId, allSlots);
  if (calibGeometry) {
    return {
      left: calibGeometry.textLeft,
      width: calibGeometry.textWidth,
      anchorX: calibGeometry.viewLeft,
      anchorWidth: calibGeometry.viewWidth,
    };
  }

  return { left: 0, width: slot.width };
}

function getEffectiveLineWidthPx(slot, lineGuideId, allSlots) {
  const calibGeometry = getPregnancyWeeklyFieldLineGeometry(slot, lineGuideId, allSlots);
  if (calibGeometry) {
    return calibGeometry.textWidth;
  }
  if (
    slot?.inlineLabelTail &&
    isPregnancyWeeklyStructuredPage(lineGuideId, slot.page)
  ) {
    return getPregnancyWeeklyInlineTailTextInsets(slot, lineGuideId, allSlots).width;
  }
  const profile = getTypography(lineGuideId);
  return slot.width * profile.lineWidthSlackRatio;
}

function refineNormSlot(lineGuideId, page, norm) {
  if (lineGuideId === 'kids_48') {
    const isBlock = norm.inputKind === 'block';
    const labelInset = page === 11 ? 0.016 : 0.014;
    const xInset = isBlock ? 0.006 : norm.hasLabel ? labelInset : 0.008;
    const widthTrim = isBlock ? 0.008 : norm.hasLabel ? 0.014 : 0.008;
    const x = Math.min(0.98, Math.max(0, norm.x + xInset));
    const width = Math.max(0.05, Math.min(norm.width - widthTrim, 0.98 - x));
    return { ...norm, x, width };
  }

  if (lineGuideId?.startsWith('diary_interior_')) {
    const isBlock = norm.inputKind === 'block';
    const xInset = isBlock ? 0.006 : norm.hasLabel ? 0.003 : 0.002;
    const widthTrim = isBlock ? 0.008 : norm.hasLabel ? 0.004 : 0.002;
    const x = Math.min(0.98, Math.max(0, norm.x + xInset));
    const width = Math.max(0.05, Math.min(norm.width - widthTrim, 0.98 - x));
    return { ...norm, x, width };
  }

  if (lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5') {
    if (isPregnancyRuledNotebookPage(lineGuideId, page)) {
      return norm;
    }
    const xInset = norm.hasLabel ? 0.014 : 0.008;
    const widthTrim = norm.hasLabel ? 0.014 : 0.008;
    const x = Math.min(0.98, Math.max(0, norm.x + xInset));
    const width = Math.max(0.05, Math.min(norm.width - widthTrim, 0.98 - x));
    return { ...norm, x, width };
  }

  return norm;
}

function markPregnancyWeeklyInlineTailSlots(slots, lineGuideId) {
  if (lineGuideId !== 'pregnancy_60' && lineGuideId !== 'pregnancy_a5') return slots;
  const bellyIndex = lineGuideId === 'pregnancy_60' ? 6 : 5;
  return slots.map((slot) => {
    if (!slot.hasLabel || slot.inlineLabelTail) return slot;
    const bodySlot = slots.find(
      (s) =>
        s.continuationGroup === slot.continuationGroup &&
        !s.hasLabel &&
        (s.inputKind ?? 'line') === 'line' &&
        s.index > slot.index &&
        s.index !== 1 &&
        s.index !== bellyIndex,
    );
    if (!bodySlot || slot.x <= bodySlot.x + 0.015 * getViewportNormScale(bodySlot)) return slot;
    return { ...slot, inlineLabelTail: true };
  });
}

function refinePregnancyWeeklyCollapsedGuideStrokes(lineGuideId, page, norms, guides) {
  if (!isPregnancyWeeklyStructuredPage(lineGuideId, page) || !guides?.length) {
    return [...guides];
  }
  const pitch = PREGNANCY_WEEKLY_LINE_PITCH;
  const minGap = pitch * 0.5;
  const bellyIndex = lineGuideId === 'pregnancy_60' ? 6 : 5;
  const result = [...guides];
  let i = 0;
  while (i < result.length - 1) {
    const normA = norms[i];
    const normB = norms[i + 1];
    if (
      !normA ||
      !normB ||
      (normA.inputKind ?? 'line') !== 'line' ||
      (normB.inputKind ?? 'line') !== 'line' ||
      normA.continuationGroup !== normB.continuationGroup ||
      i === 1 ||
      i + 1 === bellyIndex ||
      typeof result[i] !== 'number' ||
      typeof result[i + 1] !== 'number'
    ) {
      i += 1;
      continue;
    }
    if (result[i + 1] - result[i] < minGap) {
      result[i + 1] = result[i] + pitch;
      let j = i + 2;
      while (j < norms.length && norms[j]?.continuationGroup === normA.continuationGroup) {
        if (
          j === bellyIndex ||
          (norms[j]?.inputKind ?? 'line') !== 'line' ||
          typeof result[j] !== 'number' ||
          typeof result[j - 1] !== 'number'
        ) {
          j += 1;
          continue;
        }
        if (result[j] - result[j - 1] < minGap) {
          result[j] = result[j - 1] + pitch;
        }
        j += 1;
      }
      i = j;
      continue;
    }
    i += 1;
  }
  return result;
}

function refinePregnancyWeeklyRuledLineNorms(lineGuideId, page, norms, guides) {
  if (!isPregnancyWeeklyStructuredPage(lineGuideId, page) || !guides?.length) {
    return [...norms];
  }
  const bellyIndex = lineGuideId === 'pregnancy_60' ? 6 : 5;
  const pitch = PREGNANCY_WEEKLY_LINE_PITCH;
  return norms.map((norm, index) => {
    if (index === 1 || index === bellyIndex) return norm;
    if ((norm.inputKind ?? 'line') !== 'line') return norm;
    const guideStrokeY = guides[index];
    if (typeof guideStrokeY !== 'number') return norm;
    const bandHeight =
      norm.hasLabel && norm.height <= PREGNANCY_WEEKLY_COMPACT_LINE_HEIGHT
        ? norm.height
        : pitch;
    const topY = guideStrokeY - bandHeight;
    return {
      ...norm,
      y: topY,
      height: bandHeight,
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    };
  });
}

function normSlotsToViewportSlots(lineGuideId, page, norms, lineGuides) {
  const vw = REFERENCE_VIEWPORT.width;
  const preppedNorms = norms.map((norm, index) => refineNormSlot(lineGuideId, page, norm));
  let guides = lineGuides?.[lineGuideId]?.[String(page)] ?? [];
  if (isPregnancyWeeklyStructuredPage(lineGuideId, page)) {
    guides = refinePregnancyWeeklyCollapsedGuideStrokes(
      lineGuideId,
      page,
      preppedNorms,
      guides,
    );
  }
  let weeklyNorms = preppedNorms;
  if (isPregnancyWeeklyStructuredPage(lineGuideId, page)) {
    weeklyNorms = refinePregnancyWeeklyRuledLineNorms(
      lineGuideId,
      page,
      preppedNorms,
      guides,
    );
  }
  const refinedNorms = refinePregnancyRuledNotebookLineNorms(
    lineGuideId,
    page,
    weeklyNorms,
    lineGuides?.[lineGuideId],
  );
  const mapped = refinedNorms.map((norm, index) => {
    const refined = refineNormSlot(lineGuideId, page, norm);
    const guideStroke = guides[index];
    return {
      index,
      page,
      x: refined.x * vw,
      y: refined.y * vw,
      width: refined.width * vw,
      lineHeight: refined.height * vw,
      inputKind: refined.inputKind ?? 'line',
      hasLabel: refined.hasLabel ?? false,
      continuationGroup: refined.continuationGroup ?? index + 1,
      normWidth: refined.width,
      normY: refined.y,
      normHeight: refined.height,
      strokeY: typeof guideStroke === 'number' ? guideStroke * vw : undefined,
    };
  });
  return markPregnancyWeeklyInlineTailSlots(mapped, lineGuideId);
}

function textFitsInSlot(text, slot, fontSize, lineGuideId, fontId, fontTable, allSlots) {
  if (!text) return true;
  const lineWidthPx = getEffectiveLineWidthPx(slot, lineGuideId, allSlots);
  const measured = measureTextWidth(text, fontSize, lineGuideId, fontId, fontTable);
  return measured <= lineWidthPx;
}

function consumeOneLine(text, slot, fontSize, lineGuideId, fontId, fontTable, allSlots) {
  const words = text.split(/(\s+)/).filter((part) => part.length > 0);
  let line = '';
  let rest = '';

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const candidate = line + word;
    if (textFitsInSlot(candidate, slot, fontSize, lineGuideId, fontId, fontTable, allSlots)) {
      line = candidate;
      continue;
    }
    if (!line) {
      let partial = '';
      for (const ch of word) {
        const next = partial + ch;
        if (textFitsInSlot(next, slot, fontSize, lineGuideId, fontId, fontTable, allSlots)) {
          partial = next;
        } else {
          break;
        }
      }
      line = partial || word.slice(0, 1);
      rest = word.slice(line.length) + words.slice(i + 1).join('');
      return { line, rest };
    }
    rest = words.slice(i).join('');
    break;
  }

  return { line, rest };
}

function isPregnancyWeeklyLineGuide(lineGuideId) {
  return lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5';
}

function findPregnancyWeeklyInlineLabelTailSlot(slots, bodyStartIndex, groupId, lineGuideId) {
  const bellyIndex = lineGuideId === 'pregnancy_60' ? 6 : 5;
  const labelSlot = slots
    .filter(
      (s) =>
        s.continuationGroup === groupId &&
        s.hasLabel &&
        s.index < bodyStartIndex &&
        (s.inputKind ?? 'line') === 'line' &&
        s.index !== 1 &&
        s.index !== bellyIndex,
    )
    .sort((a, b) => b.index - a.index)[0];

  if (!labelSlot) return null;
  const bodySlot = slots.find(
    (s) =>
      s.continuationGroup === groupId &&
      !s.hasLabel &&
      (s.inputKind ?? 'line') === 'line' &&
      s.index >= bodyStartIndex &&
      s.index !== 1 &&
      s.index !== bellyIndex,
  );
  if (!bodySlot || labelSlot.x <= bodySlot.x + 0.015) return null;
  return labelSlot;
}

function isPregnancyWeeklyStructuredPage(lineGuideId, page) {
  if (lineGuideId === 'pregnancy_60') {
    return (
      (page >= 9 && page <= 17) ||
      (page >= 19 && page <= 32) ||
      (page >= 34 && page <= 47)
    );
  }
  if (lineGuideId === 'pregnancy_a5') {
    return (
      (page >= 5 && page <= 13) ||
      (page >= 15 && page <= 28) ||
      (page >= 30 && page <= 43)
    );
  }
  return false;
}

function isPregnancyRuledNotebookPage(lineGuideId, page) {
  if (lineGuideId === 'pregnancy_60') {
    return page === 53 || page === 60;
  }
  if (lineGuideId === 'pregnancy_a5') {
    return page === 45;
  }
  return false;
}

function refinePregnancyRuledNotebookLineNorms(lineGuideId, page, norms, guides) {
  if (!isPregnancyRuledNotebookPage(lineGuideId, page)) return norms;
  const pageGuides = guides?.[String(page)];
  if (!pageGuides?.length) return norms;

  const compactLineHeight = 0.035;
  const linePitch = 0.0412;

  return norms.map((norm, index) => {
    if ((norm.inputKind ?? 'line') !== 'line') return norm;
    const guideStrokeY = pageGuides[index];
    if (typeof guideStrokeY !== 'number') return norm;
    const nextGuide = pageGuides[index + 1];
    const bandHeight =
      typeof nextGuide === 'number'
        ? Math.max(compactLineHeight, nextGuide - guideStrokeY)
        : linePitch;
    const topY = guideStrokeY - bandHeight;
    return {
      ...norm,
      y: topY,
      height: bandHeight,
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    };
  });
}

function filterPregnancyWeeklyPlanSpuriousBodySlots(bodySlots, lineGuideId) {
  if (lineGuideId !== 'pregnancy_60' || bodySlots.length < 3) return bodySlots;
  const indices = new Set(bodySlots.map((slot) => slot.index));
  if (indices.has(3) && indices.has(4) && indices.has(5)) {
    return bodySlots.filter((slot) => slot.index !== 5);
  }
  return bodySlots;
}

function resolveWeeklyFieldLineSlots(slots, startSlotIndex, lineCount, lineGuideId) {
  const startSlot = slots[startSlotIndex];
  if (!startSlot || lineCount <= 0) return [];

  if (lineGuideId && isPregnancyWeeklyStructuredPage(lineGuideId, startSlot.page)) {
    const groupId = startSlot.continuationGroup;
    const bellyIndex = lineGuideId === 'pregnancy_60' ? 6 : 5;
    const bodySlots = filterPregnancyWeeklyPlanSpuriousBodySlots(
      slots
        .filter(
          (s) =>
            s.continuationGroup === groupId &&
            s.index >= startSlotIndex &&
            !s.hasLabel &&
            (s.inputKind ?? 'line') === 'line' &&
            s.index !== 1 &&
            s.index !== bellyIndex,
        )
        .sort((a, b) => a.index - b.index),
      lineGuideId,
    );
    let labelTail = findPregnancyWeeklyInlineLabelTailSlot(
      slots,
      startSlotIndex,
      groupId,
      lineGuideId,
    );
    if (!labelTail && lineGuideId === 'pregnancy_60') {
      const fallbackTailIndex = groupId === 3 ? 2 : groupId === 5 ? 7 : null;
      if (fallbackTailIndex != null && slots[fallbackTailIndex]) {
        labelTail = slots[fallbackTailIndex];
      }
    }
    if (lineCount === 1) {
      return [startSlot];
    }
    const fieldSlots = labelTail ? [labelTail, ...bodySlots] : bodySlots;
    return fieldSlots.slice(0, lineCount);
  }

  return slots.slice(startSlotIndex, startSlotIndex + lineCount);
}

function distributeTextWithinFieldLines(params) {
  const {
    text: rawText,
    startSlotIndex,
    lineCount,
    slots,
    fontSize,
    lineGuideId,
    fontId,
    fontTable,
  } = params;
  const text = rawText.replace(/\r?\n/g, ' ');
  const fieldSlots = resolveWeeklyFieldLineSlots(
    slots,
    startSlotIndex,
    lineCount,
    lineGuideId,
  );

  if (fieldSlots.length === 0) {
    return { segments: [], truncated: text.length > 0 };
  }

  const segments = [];
  let remaining = text;
  const headIndex = fieldSlots[0]?.index ?? startSlotIndex;

  for (const slot of fieldSlots) {
    if (!remaining) {
      segments.push({ slotIndex: slot.index, content: '' });
      continue;
    }
    const { line, rest } = consumeOneLine(
      remaining,
      slot,
      fontSize,
      lineGuideId,
      fontId,
      fontTable,
      slots,
    );
    const content = slot.index === headIndex ? line : line.replace(/^\s+/, '');
    segments.push({ slotIndex: slot.index, content });
    remaining = rest;
  }

  return { segments, truncated: remaining.length > 0 };
}

function clampTextToFieldLines(params) {
  const {
    text: rawText,
    startSlotIndex,
    lineCount,
    slots,
    fontSize,
    lineGuideId,
    fontId,
    fontTable,
  } = params;
  const text = rawText.replace(/\r?\n/g, ' ');
  if (!text) return text;

  const distribute = (value) =>
    distributeTextWithinFieldLines({
      text: value,
      startSlotIndex,
      lineCount,
      slots,
      fontSize,
      lineGuideId,
      fontId,
      fontTable,
    });

  const { truncated } = distribute(text);
  if (!truncated) return text;

  let lo = 0;
  let hi = text.length;
  let best = 0;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = text.slice(0, mid);
    const { truncated: stillTruncated } = distribute(candidate);

    if (stillTruncated) {
      hi = mid - 1;
    } else {
      best = mid;
      lo = mid + 1;
    }
  }

  return text.slice(0, best);
}

function computeLayoutCharacterLimit(field, lineGuideId, page, slots, fontId, fontTable) {
  const profile = getTypography(lineGuideId);
  const fontSize = profile.fixedLineFontSize ?? 16;
  const fieldSlots = resolveWeeklyFieldLineSlots(
    slots,
    field.templateLineStart,
    field.templateLineCount ?? 1,
    lineGuideId,
  );
  if (fieldSlots.length === 0) return undefined;

  return clampTextToFieldLines({
    text: FIELD_LIMIT_PROBE_CYRILLIC,
    startSlotIndex: field.templateLineStart,
    lineCount: field.templateLineCount ?? 1,
    slots,
    fontSize,
    lineGuideId,
    fontId,
    fontTable,
  }).length;
}

function loadAlbumSchemas(projectRoot, albumId) {
  const raw = fs.readFileSync(
    path.join(projectRoot, 'constants/generated/album-page-schemas.ts'),
    'utf8',
  );
  const marker = `"${albumId}": [`;
  const start = raw.indexOf(marker);
  if (start < 0) return [];
  const arrayStart = start + marker.length - 1;
  let depth = 0;
  let end = arrayStart;
  for (let i = arrayStart; i < raw.length; i += 1) {
    if (raw[i] === '[') depth += 1;
    if (raw[i] === ']') {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  return JSON.parse(raw.slice(arrayStart, end));
}

function loadLineGuides(projectRoot) {
  return JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'constants/line-guides.json'), 'utf8'),
  );
}

function expectedMinLineWidth(lineGuideId, slot, field) {
  if (slot.teethDate) return slot.width;
  if (field?.fieldId?.includes('teeth_count')) return 0.04;
  if (field?.type === 'measurement') return 0.08;
  if (
    lineGuideId === 'kids_48' &&
    field &&
    (field.fieldId.includes('_height') || field.fieldId.includes('_weight')) &&
    field.fieldId.includes('month_')
  ) {
    return 0.1;
  }
  // Семейное дерево — короткие имена во внешних полосах у кругов (узкие by design).
  if (field?.fieldId?.startsWith('kids_48_p5_')) return slot.width;
  if (slot.inputKind === 'block') return 0.12;
  if (slot.hasLabel) return 0.18;
  if (lineGuideId === 'kids_48' && slot.width >= 0.45) return slot.width;
  return 0.28;
}

const BLOCKING_ISSUE_CODES = new Set(['SLOT_NARROW', 'PREVIEW_OVERFLOW']);

module.exports = {
  ALBUM_IDS,
  REFERENCE_VIEWPORT,
  FIELD_LIMIT_PROBE_CYRILLIC,
  FONT_WIDTH_MULTIPLIERS,
  BLOCKING_ISSUE_CODES,
  getTypography,
  loadFontCharWidths,
  loadAlbumSchemas,
  loadLineGuides,
  normSlotsToViewportSlots,
  computeLayoutCharacterLimit,
  clampTextToFieldLines,
  distributeTextWithinFieldLines,
  resolveWeeklyFieldLineSlots,
  textFitsInSlot,
  measureTextWidth,
  getEffectiveLineWidthPx,
  getPregnancyWeeklyFieldLineGeometry,
  getPregnancyWeeklyFieldTextTopInView,
  getPregnancyWeeklyInlineTailTextInsets,
  resolvePregnancyWeeklyFieldRowLayout,
  resolveTemplateTextRenderBox,
  PREGNANCY_WEEKLY_P9_INLINE_TAIL,
  PREGNANCY_WEEKLY_GUIDE_STROKE_FONT_OFFSET,
  refinePregnancyWeeklyCollapsedGuideStrokes,
  expectedMinLineWidth,
  consumeOneLine,
};
