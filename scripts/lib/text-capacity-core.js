/**
 * Shared text line capacity helpers for audit + calibration scripts.
 */
const fs = require('fs');
const path = require('path');

const SPACE_WIDTH_FACTOR = 0.35;
const REFERENCE_VIEWPORT = { width: 2480, height: 2480 };
const FIELD_LIMIT_PROBE_CYRILLIC = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ0123456789. '.repeat(20);

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
  diary_interior_brown: { fixedLineFontSize: 16, charWidthRatio: 0.5, lineWidthSlackRatio: 1.0 },
  diary_interior_purple: { fixedLineFontSize: 16, charWidthRatio: 0.5, lineWidthSlackRatio: 1.0 },
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

function getEffectiveLineWidthNorm(slot, lineGuideId) {
  const profile = getTypography(lineGuideId);
  return slot.width * profile.lineWidthSlackRatio;
}

function refineNormSlot(lineGuideId, page, norm) {
  if (lineGuideId === 'kids_48') {
    const isBlock = norm.inputKind === 'block';
    const labelInset = page === 11 ? 0.012 : 0.01;
    const xInset = isBlock ? 0.006 : norm.hasLabel ? labelInset : 0.002;
    const widthTrim = isBlock ? 0.008 : norm.hasLabel ? 0.012 : 0.002;
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
    const xInset = norm.hasLabel ? 0.003 : 0.002;
    const widthTrim = norm.hasLabel ? 0.004 : 0.002;
    const x = Math.min(0.98, Math.max(0, norm.x + xInset));
    const width = Math.max(0.05, Math.min(norm.width - widthTrim, 0.98 - x));
    return { ...norm, x, width };
  }

  return norm;
}

function normSlotsToViewportSlots(lineGuideId, page, norms) {
  const vw = REFERENCE_VIEWPORT.width;
  return norms.map((norm, index) => {
    const refined = refineNormSlot(lineGuideId, page, norm);
    return {
      index,
      x: refined.x * vw,
      y: refined.y * vw,
      width: refined.width * vw,
      lineHeight: refined.height * vw,
      inputKind: refined.inputKind ?? 'line',
      hasLabel: refined.hasLabel ?? false,
      normWidth: refined.width,
      normY: refined.y,
      normHeight: refined.height,
    };
  });
}

function textFitsInSlot(text, slot, fontSize, lineGuideId, fontId, fontTable) {
  if (!text) return true;
  const lineWidthNorm = getEffectiveLineWidthNorm(
    { width: slot.width / REFERENCE_VIEWPORT.width },
    lineGuideId,
  );
  const lineWidthPx = lineWidthNorm * REFERENCE_VIEWPORT.width;
  const measured = measureTextWidth(text, fontSize, lineGuideId, fontId, fontTable);
  return measured <= lineWidthPx;
}

function consumeOneLine(text, slot, fontSize, lineGuideId, fontId, fontTable) {
  const words = text.split(/(\s+)/).filter((part) => part.length > 0);
  let line = '';
  let rest = '';

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const candidate = line + word;
    if (textFitsInSlot(candidate, slot, fontSize, lineGuideId, fontId, fontTable)) {
      line = candidate;
      continue;
    }
    if (!line) {
      let partial = '';
      for (const ch of word) {
        const next = partial + ch;
        if (textFitsInSlot(next, slot, fontSize, lineGuideId, fontId, fontTable)) {
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

function clampTextToFieldLines(params) {
  const { text, startSlotIndex, lineCount, slots, fontSize, lineGuideId, fontId, fontTable } =
    params;
  if (!text) return text;

  let remaining = text;
  for (let i = 0; i < lineCount; i += 1) {
    const slot = slots[startSlotIndex + i];
    if (!slot) break;
    const { rest } = consumeOneLine(remaining, slot, fontSize, lineGuideId, fontId, fontTable);
    remaining = rest;
  }

  if (!remaining) return text;

  let lo = 0;
  let hi = text.length;
  let best = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    let probe = text.slice(0, mid);
    for (let i = 0; i < lineCount; i += 1) {
      const slot = slots[startSlotIndex + i];
      if (!slot) break;
      const { rest } = consumeOneLine(probe, slot, fontSize, lineGuideId, fontId, fontTable);
      probe = probe.slice(0, probe.length - rest.length);
    }
    const stillTruncated = (() => {
      let r = text.slice(0, mid);
      for (let i = 0; i < lineCount; i += 1) {
        const slot = slots[startSlotIndex + i];
        if (!slot) break;
        const { rest } = consumeOneLine(r, slot, fontSize, lineGuideId, fontId, fontTable);
        r = rest;
      }
      return r.length > 0;
    })();

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
  const fieldSlots = slots.slice(
    field.templateLineStart,
    field.templateLineStart + (field.templateLineCount ?? 1),
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
  textFitsInSlot,
  measureTextWidth,
  getEffectiveLineWidthNorm,
  expectedMinLineWidth,
};
