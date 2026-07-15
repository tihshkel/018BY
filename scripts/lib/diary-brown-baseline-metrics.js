/**
 * Метрики baseline текста коричневого дневника — синхрон с runtime:
 * getDiarySlotTopNormY(norm) = norm.y (штрих)
 * getTemplateLineTextTop: top = strokeY - fontSize * DIARY_LINE_FONT_OFFSET
 */
const fs = require('fs');
const path = require('path');

const CAP_HEIGHT_RATIO = 0.85;
const FONT_SIZE = 16;
/** Как constants/album-text-margins.ts → DIARY_UNIFORM_LINE_FONT_OFFSET */
const DIARY_LINE_FONT_OFFSET = 0.85;
/** Как TEMPLATE_LINE_STROKE_CLEARANCE_RATIO + default Nefelibata previewCap (0.92) */
const STROKE_CLEARANCE = 0.12;
const DEFAULT_PREVIEW_CAP = 0.92;

function resolveUniformStrokeFontOffset(previewCap = DEFAULT_PREVIEW_CAP) {
  return Math.max(DIARY_LINE_FONT_OFFSET, previewCap) + STROKE_CLEARANCE;
}

function loadPageTemplates(root) {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'scripts/diary-60-tz-manifest.json'), 'utf8'),
  );
  return Object.fromEntries(
    Object.entries(manifest).map(([pageKey, entry]) => [
      Number(pageKey),
      entry.template ?? '',
    ]),
  );
}

function fitFontSize() {
  return FONT_SIZE;
}

/** Viewport: верх полосы = штрих (norm.y), полоса уходит вниз на height. */
function mapNormSlotToViewport(norm, pngW, pngH, index, page) {
  return {
    index,
    page,
    x: norm.x * pngW,
    y: norm.y * pngH,
    width: norm.width * pngW,
    lineHeight: norm.height * pngH,
    hasLabel: norm.hasLabel ?? false,
    inputKind: norm.inputKind ?? 'line',
    normY: norm.y,
    normHeight: norm.height,
    continuationGroup: norm.continuationGroup ?? index + 1,
  };
}

function isPeachCell(slot) {
  return (
    (slot.inputKind ?? 'line') === 'block' &&
    slot.normY >= 0.74 &&
    slot.normY <= 0.93 &&
    (slot.normHeight ?? 0) > 0.035
  );
}

function getStrokeY(slot) {
  if (isPeachCell(slot)) {
    return slot.y + slot.lineHeight * 0.58;
  }
  // runtime: slot.y уже штрих
  return slot.y;
}

function resolveDiaryFontOffset(_slot) {
  return resolveUniformStrokeFontOffset();
}

function getTextTop(slot) {
  const fitted = fitFontSize();
  if (isPeachCell(slot)) {
    return slot.y + slot.lineHeight * 0.58 - fitted * resolveUniformStrokeFontOffset();
  }
  const lineY = getStrokeY(slot);
  return lineY - fitted * resolveDiaryFontOffset(slot);
}

function getBaselineY(slot) {
  const fitted = fitFontSize();
  const top = getTextTop(slot);
  if (isPeachCell(slot)) {
    return getStrokeY(slot) - fitted * STROKE_CLEARANCE;
  }
  // previewCap для default шрифта — baseline чуть выше штриха на CLEARANCE
  return top + fitted * DEFAULT_PREVIEW_CAP;
}

function measureDrift(slot) {
  const strokeY = getStrokeY(slot);
  const baselineY = getBaselineY(slot);
  const driftPx = baselineY - strokeY;
  const driftRatio =
    slot.lineHeight > 0 ? Math.abs(driftPx) / slot.lineHeight : Math.abs(driftPx);
  return { strokeY, baselineY, driftPx, driftRatio };
}

function textFitsInSlot(text, slot, fontSize) {
  const charWidth = fontSize * 0.62;
  const maxWidth = slot.width * 0.96;
  return text.length * charWidth <= maxWidth;
}

function consumeOneLine(text, slot, fontSize) {
  const words = text.replace(/^\s+/, '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return { line: '', rest: '' };

  let built = '';
  let wordCount = 0;
  for (const word of words) {
    const test = built ? `${built} ${word}` : word;
    if (textFitsInSlot(test, slot, fontSize)) {
      built = test;
      wordCount += 1;
    } else if (built) {
      return { line: built, rest: words.slice(wordCount).join(' ') };
    } else {
      const maxChars = Math.max(1, Math.floor(slot.width / (fontSize * 0.62)));
      return { line: word.slice(0, maxChars), rest: words.slice(1).join(' ') };
    }
  }
  return { line: built, rest: '' };
}

function distributeWithinFieldLines(text, startIndex, lineCount, slots) {
  const fieldSlots = slots.slice(startIndex, startIndex + lineCount);
  const segments = [];
  let remaining = text;
  for (const slot of fieldSlots) {
    if (!remaining) {
      segments.push({ slotIndex: slot.index, content: '' });
      continue;
    }
    const fitted = fitFontSize();
    const { line, rest } = consumeOneLine(remaining, slot, fitted);
    segments.push({ slotIndex: slot.index, content: line });
    remaining = rest;
  }
  return { segments, truncated: remaining.length > 0 };
}

module.exports = {
  FONT_SIZE,
  DIARY_LINE_FONT_OFFSET,
  CAP_HEIGHT_RATIO,
  loadPageTemplates,
  mapNormSlotToViewport,
  measureDrift,
  distributeWithinFieldLines,
  fitFontSize,
  isPeachCell,
  getStrokeY,
  getBaselineY,
  getTextTop,
};
