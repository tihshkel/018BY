/**
 * Метрики baseline текста коричневого дневника (без RN-зависимостей).
 */
const fs = require('fs');
const path = require('path');

const CAP_HEIGHT_RATIO = 0.85;
const FONT_SIZE = 16;
const DIARY_LINE_FONT_OFFSET = 0.86;

const QUESTIONNAIRE_TEMPLATES = new Set([
  'GirlProfileTemplate',
  'ParentProfileTemplate_Mom',
  'ParentProfileTemplate_Dad',
  'GrandparentProfileTemplate',
  'FriendQuestionnaireTemplate',
  'HobbyTemplate',
  'DreamsTemplate',
  'PetsTemplate',
  'TravelTemplate',
  'MoodTemplate',
  'FoodTemplate',
]);

const WEEKLY_TEMPLATES = new Set(['WeeklyScheduleTemplate', 'WeeklyScheduleWithNoteTemplate']);

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

function fitFontSize(lineHeight, inputKind = 'line') {
  return FONT_SIZE;
}

function resolveLineFontOffset(page, template, normY) {
  if (QUESTIONNAIRE_TEMPLATES.has(template)) return 0.9;
  if (template === 'MyDayTemplate') return 0.92;
  if (template === 'SchoolLifeTemplate') return 0.9;
  if (WEEKLY_TEMPLATES.has(template)) return 0.9;
  if (page >= 45 && page <= 56) return 0.92;
  return 0.92;
}

function isBrownCoverField(normY) {
  return normY >= 0.52 && normY <= 0.62;
}

function isBrownWishSlot(page, normY, hasLabel) {
  if (hasLabel) return false;
  if (page === 6 && normY >= 0.755 && normY <= 0.845) return false;
  return normY >= 0.772 && normY <= 0.92;
}

function isBrownCareerAnswerSlot(page, normY, hasLabel) {
  return (
    page === 6 &&
    !hasLabel &&
    normY >= 0.755 &&
    normY <= 0.845
  );
}

function mapNormSlotToViewport(norm, pngW, pngH, index, page) {
  const topNormY = norm.y - norm.height;
  return {
    index,
    page,
    x: norm.x * pngW,
    y: topNormY * pngH,
    width: norm.width * pngW,
    lineHeight: norm.height * pngH,
    hasLabel: norm.hasLabel ?? false,
    inputKind: norm.inputKind ?? 'line',
    normY: norm.y,
    normHeight: norm.height,
    continuationGroup: norm.continuationGroup ?? index + 1,
  };
}

function getStrokeY(slot) {
  if (slot.page === 15 && slot.inputKind === 'line') {
    return slot.y + slot.lineHeight;
  }
  const isPeachCell =
    slot.inputKind === 'block' &&
    slot.normY >= 0.74 &&
    slot.normY <= 0.93 &&
    (slot.normHeight ?? 0) > 0.035;
  if (!isPeachCell) {
    return slot.y + slot.lineHeight;
  }
  return slot.y + slot.lineHeight * 0.58;
}

function isPeachCell(slot) {
  return (
    (slot.inputKind ?? 'line') === 'block' &&
    slot.normY >= 0.74 &&
    slot.normY <= 0.93 &&
    (slot.normHeight ?? 0) > 0.035
  );
}

function getTextTop(slot, pageTemplates) {
  const inputKind = slot.inputKind ?? 'line';
  const fitted = fitFontSize(slot.lineHeight, inputKind);

  if (slot.page === 15) {
    return slot.y + slot.lineHeight - fitted * 1.05;
  }

  if (isPeachCell(slot)) {
    return slot.y + slot.lineHeight * 0.58 - fitted * 0.88;
  }

  const lineY = slot.y + slot.lineHeight;

  if (isBrownCoverField(slot.normY)) {
    return lineY - fitted * 0.92;
  }
  if (isBrownWishSlot(slot.page, slot.normY, slot.hasLabel)) {
    return lineY - fitted * 0.9;
  }
  if (isBrownCareerAnswerSlot(slot.page, slot.normY, slot.hasLabel)) {
    return lineY - fitted * 0.9;
  }

  return lineY - fitted * DIARY_LINE_FONT_OFFSET;
}

function getBaselineY(slot, pageTemplates) {
  const fitted = fitFontSize(slot.lineHeight, slot.inputKind ?? 'line');
  const top = getTextTop(slot, pageTemplates);
  if (isPeachCell(slot)) {
    return getStrokeY(slot) - fitted * 0.04;
  }
  return top + fitted * CAP_HEIGHT_RATIO;
}

function measureDrift(slot, pageTemplates) {
  const strokeY = getStrokeY(slot);
  const baselineY = getBaselineY(slot, pageTemplates);
  const driftRatio =
    slot.lineHeight > 0 ? Math.abs(baselineY - strokeY) / slot.lineHeight : 0;
  return { strokeY, baselineY, driftRatio };
}

function textFitsInSlot(text, slot, fontSize) {
  const charWidth = fontSize * 0.5;
  const maxWidth = slot.width * 0.98;
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
      return { line: word.slice(0, Math.max(1, Math.floor(slot.width / (fontSize * 0.5)))), rest: words.slice(1).join(' ') };
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
    const fitted = fitFontSize(slot.lineHeight, slot.inputKind);
    const { line, rest } = consumeOneLine(remaining, slot, fitted);
    segments.push({ slotIndex: slot.index, content: line });
    remaining = rest;
  }
  return { segments, truncated: remaining.length > 0 };
}

module.exports = {
  FONT_SIZE,
  loadPageTemplates,
  mapNormSlotToViewport,
  measureDrift,
  distributeWithinFieldLines,
  fitFontSize,
  isPeachCell,
};
