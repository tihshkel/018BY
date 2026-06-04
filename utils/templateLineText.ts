import { getTemplateTypographyProfile } from '@/constants/album-text-margins';
import type { TextLineSlot } from '@/utils/textLineSlots';

/** Пробел уже буквы — иначе перенос срабатывает раньше визуального края строки. */
const SPACE_WIDTH_FACTOR = 0.35;

function getEffectiveLineWidth(slot: TextLineSlot, lineGuideId?: string): number {
  const profile = getTemplateTypographyProfile(lineGuideId);
  return slot.width * profile.lineWidthSlackRatio;
}

function getCharWidthFactor(char: string, charWidthRatio: number): number {
  if (char === ' ') return charWidthRatio * SPACE_WIDTH_FACTOR;
  return charWidthRatio;
}

export function estimateTextWidth(
  text: string,
  fontSize: number,
  charWidthRatio: number
): number {
  let width = 0;
  for (const ch of text) {
    width += fontSize * getCharWidthFactor(ch, charWidthRatio);
  }
  return width;
}

export function textFitsInSlot(
  text: string,
  slot: TextLineSlot,
  fontSize: number,
  lineGuideId?: string
): boolean {
  if (!text) return true;
  const fitted = fitFontSizeToSlot(fontSize, slot.lineHeight, slot.inputKind, lineGuideId);
  const profile = getTemplateTypographyProfile(lineGuideId);
  return (
    estimateTextWidth(text, fitted, profile.charWidthRatio) <=
    getEffectiveLineWidth(slot, lineGuideId)
  );
}

function splitWordToFit(
  word: string,
  slot: TextLineSlot,
  fontSize: number,
  lineGuideId?: string
): { line: string; rest: string } {
  const fitted = fitFontSizeToSlot(fontSize, slot.lineHeight, slot.inputKind, lineGuideId);
  const profile = getTemplateTypographyProfile(lineGuideId);

  let line = '';
  for (const ch of word) {
    const candidate = line + ch;
    if (
      estimateTextWidth(candidate, fitted, profile.charWidthRatio) <=
      getEffectiveLineWidth(slot, lineGuideId)
    ) {
      line = candidate;
      continue;
    }
    break;
  }

  if (!line) {
    return { line: word.slice(0, 1), rest: word.slice(1) };
  }

  return { line, rest: word.slice(line.length) };
}

/** Обрезает строку, если оценка ширины превышает слот (защита от «сжатия» на iOS). */
export function truncateTextToSlotWidth(
  text: string,
  slot: TextLineSlot,
  fontSize: number,
  lineGuideId?: string
): string {
  if (!text || textFitsInSlot(text, slot, fontSize, lineGuideId)) {
    return text;
  }

  let lo = 0;
  let hi = text.length;
  let best = 0;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = text.slice(0, mid);
    if (textFitsInSlot(candidate, slot, fontSize, lineGuideId)) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return text.slice(0, best);
}

export function getSlotsInContinuationGroup(
  slots: TextLineSlot[],
  groupId: number
): TextLineSlot[] {
  return slots.filter((s) => s.continuationGroup === groupId);
}

export function getContinuationGroupForSlot(
  slots: TextLineSlot[],
  slotIndex: number
): number | null {
  const slot = slots[slotIndex];
  return slot?.continuationGroup ?? null;
}

export function getContinuationGroupSlots(
  slots: TextLineSlot[],
  slotIndex: number
): { startSlotIndex: number; groupSlots: TextLineSlot[] } {
  const tapped = slots[slotIndex];
  if (!tapped) {
    return { startSlotIndex: slotIndex, groupSlots: [] };
  }

  const groupSlots = slots
    .filter((s) => s.continuationGroup === tapped.continuationGroup)
    .sort((a, b) => a.index - b.index);

  return {
    startSlotIndex: groupSlots[0]?.index ?? slotIndex,
    groupSlots,
  };
}

export function fitFontSizeToSlot(
  fontSize: number,
  lineHeight: number,
  inputKind: 'line' | 'block' = 'line',
  lineGuideId?: string
): number {
  const profile = getTemplateTypographyProfile(lineGuideId);

  if (inputKind === 'block') {
    return Math.min(fontSize, Math.max(13, lineHeight * 0.78), profile.blockMaxFontSize);
  }

  if (profile.fixedLineFontSize != null) {
    return profile.fixedLineFontSize;
  }

  const maxFromSlot = Math.max(8, lineHeight * 0.82);
  return Math.min(fontSize, maxFromSlot, 16);
}

export function getEffectiveTemplateFontSize(
  lineGuideId: string | undefined,
  slot: Pick<TextLineSlot, 'lineHeight' | 'inputKind'> | undefined,
  annotationFontSize = 16
): number {
  return fitFontSizeToSlot(
    annotationFontSize,
    slot?.lineHeight ?? 24,
    slot?.inputKind ?? 'line',
    lineGuideId
  );
}

export function getTemplateLineTypography(
  fontSize: number,
  lineHeight: number,
  inputKind: 'line' | 'block' = 'line',
  lineGuideId?: string
) {
  const fittedSize = fitFontSizeToSlot(fontSize, lineHeight, inputKind, lineGuideId);
  const isDiaryBlock =
    inputKind === 'block' &&
    (lineGuideId === 'diary_interior_brown' || lineGuideId === 'diary_interior_purple');

  return {
    fontSize: fittedSize,
    lineHeight: isDiaryBlock ? fittedSize : inputKind === 'block' ? fittedSize * 1.05 : fittedSize,
    inputHeight: inputKind === 'block' ? lineHeight : fittedSize,
  };
}

function resolveTemplateTextVerticalRatios(
  slot: Pick<TextLineSlot, 'inputKind' | 'normY' | 'normHeight'>,
  lineGuideId?: string
): { centerRatio: number; fontOffsetRatio: number } {
  const profile = getTemplateTypographyProfile(lineGuideId);
  const inputKind = slot.inputKind ?? 'line';

  if (
    inputKind === 'block' &&
    (lineGuideId === 'diary_interior_brown' || lineGuideId === 'diary_interior_purple')
  ) {
    return { centerRatio: 0.72, fontOffsetRatio: 0.88 };
  }

  if (inputKind === 'line') {
    if (
      lineGuideId === 'diary_interior_brown' ||
      lineGuideId === 'diary_interior_purple'
    ) {
      const isBrownCoverField =
        lineGuideId === 'diary_interior_brown' &&
        slot.normY != null &&
        slot.normY >= 0.52 &&
        slot.normY <= 0.62;
      const isPurpleCoverField =
        lineGuideId === 'diary_interior_purple' &&
        slot.normY != null &&
        slot.normY >= 0.58 &&
        slot.normY <= 0.72;

      return {
        centerRatio: isBrownCoverField || isPurpleCoverField ? 0.44 : 0.52,
        fontOffsetRatio:
          isBrownCoverField || isPurpleCoverField
            ? 1.02
            : lineGuideId === 'diary_interior_brown'
              ? 0.92
              : 0.9,
      };
    }

    return {
      centerRatio: profile.lineCenterRatio,
      fontOffsetRatio: profile.lineFontOffsetRatio,
    };
  }

  if (lineGuideId === 'holidays_birthday_60') {
    const normHeight = slot.normHeight ?? 0;
    const normY = slot.normY ?? 0;

    // Крупные белые блоки (обложка стр. 1, заголовки)
    if (normHeight >= 0.055) {
      if (normY >= 0.55 && normY <= 0.82) {
        return { centerRatio: 0.46, fontOffsetRatio: 0.88 };
      }
      return { centerRatio: 0.5, fontOffsetRatio: 0.85 };
    }
    // Нижняя строка коротких полей (место рождения и аналоги на стр. 2+)
    if (normY >= 0.85 && normHeight < 0.055) {
      return { centerRatio: 0.5, fontOffsetRatio: 0.86 };
    }
  }

  return {
    centerRatio: profile.blockCenterRatio,
    fontOffsetRatio: profile.blockFontOffsetRatio,
  };
}

export function getTemplateLineTextTop(
  slot: Pick<TextLineSlot, 'y' | 'lineHeight' | 'inputKind' | 'normY' | 'normHeight'>,
  fontSize: number,
  lineGuideId?: string
): number {
  const inputKind = slot.inputKind ?? 'line';
  const { fontSize: fittedSize } = getTemplateLineTypography(
    fontSize,
    slot.lineHeight,
    inputKind,
    lineGuideId
  );

  if (lineGuideId === 'diary_interior_brown' || lineGuideId === 'diary_interior_purple') {
    const lineCenterY = slot.y + slot.lineHeight / 2;
    const isPurpleCoverField =
      lineGuideId === 'diary_interior_purple' &&
      slot.normY != null &&
      slot.normY >= 0.58 &&
      slot.normY <= 0.72;
    if (isPurpleCoverField) {
      return lineCenterY - fittedSize * 1.02;
    }
    const isBrownCareerAnswerRow =
      slot.normY != null &&
      slot.normY >= 0.73 &&
      slot.normY <= 0.83;
    const fontOffsetRatio = isBrownCareerAnswerRow
      ? 0.7
      : inputKind === 'block'
        ? 0.86
        : 0.9;
    return lineCenterY - fittedSize * fontOffsetRatio;
  }

  const { centerRatio, fontOffsetRatio } = resolveTemplateTextVerticalRatios(slot, lineGuideId);

  if (inputKind === 'block') {
    return slot.y + slot.lineHeight * centerRatio - fittedSize * fontOffsetRatio;
  }

  const lineY = slot.y + slot.lineHeight * centerRatio;
  return lineY - fittedSize * fontOffsetRatio;
}

function consumeOneLineForSlot(
  text: string,
  slot: TextLineSlot,
  fontSize: number,
  lineGuideId?: string
): { line: string; rest: string } {
  const trimmed = text.replace(/^\s+/, '');
  if (!trimmed) return { line: '', rest: '' };

  const words = trimmed.split(/\s+/).filter(Boolean);
  let built = '';
  let wordCount = 0;

  for (const word of words) {
    const testLine = built ? `${built} ${word}` : word;
    if (textFitsInSlot(testLine, slot, fontSize, lineGuideId)) {
      built = testLine;
      wordCount += 1;
      continue;
    }

    if (built) {
      return { line: built, rest: words.slice(wordCount).join(' ') };
    }

    if (textFitsInSlot(word, slot, fontSize, lineGuideId)) {
      return { line: word, rest: words.slice(1).join(' ') };
    }

    const { line, rest: wordRest } = splitWordToFit(word, slot, fontSize, lineGuideId);
    const tail = [wordRest, ...words.slice(1)].filter(Boolean).join(' ');
    return { line, rest: tail };
  }

  return { line: built, rest: '' };
}

/** Текст после первой строки группы (хвост для merge при редактировании). */
export function getTailAfterFirstLine(params: {
  text: string;
  startSlotIndex: number;
  slots: TextLineSlot[];
  fontSize: number;
  lineGuideId?: string;
}): string {
  const { text, startSlotIndex, slots, fontSize, lineGuideId } = params;
  const trimmed = text.replace(/^\s+/, '');
  if (!trimmed) return '';

  const startSlot = slots[startSlotIndex];
  if (!startSlot) return '';

  return consumeOneLineForSlot(trimmed, startSlot, fontSize, lineGuideId).rest;
}

/**
 * Значение для однострочного TextInput: только первая строка группы.
 * iOS сжимает весь длинный value в одну линию — отсюда «налезание» символов.
 */
export function getFirstLineInputValue(params: {
  text: string;
  startSlotIndex: number;
  slots: TextLineSlot[];
  fontSize: number;
  lineGuideId?: string;
}): string {
  const { text, startSlotIndex, slots, fontSize, lineGuideId } = params;
  const trimmed = text.replace(/^\s+/, '');
  if (!trimmed) return '';

  const startSlot = slots[startSlotIndex];
  if (!startSlot) return trimmed;

  const { rest } = consumeOneLineForSlot(trimmed, startSlot, fontSize, lineGuideId);
  if (!rest) return trimmed;

  return trimmed.slice(0, trimmed.length - rest.length);
}

/** Собирает полный текст после правки только первой строки. */
export function mergeFirstLineEdit(params: {
  newFirstLine: string;
  previousText: string;
  startSlotIndex: number;
  slots: TextLineSlot[];
  fontSize: number;
  lineGuideId?: string;
}): string {
  const { newFirstLine, previousText, startSlotIndex, slots, fontSize, lineGuideId } = params;
  const tail = getTailAfterFirstLine({
    text: previousText,
    startSlotIndex,
    slots,
    fontSize,
    lineGuideId,
  });

  if (!tail) return newFirstLine;

  const trimmedFirst = newFirstLine.replace(/\s+$/, '');
  const trailingSpaces = newFirstLine.match(/\s+$/)?.[0] ?? '';

  if (!trimmedFirst) return tail;

  if (trailingSpaces.length > 0) {
    return `${trimmedFirst}${trailingSpaces}${tail}`;
  }

  return `${trimmedFirst} ${tail}`;
}

export function distributeTextWithinContinuationGroup(params: {
  text: string;
  startSlotIndex: number;
  slots: TextLineSlot[];
  fontSize: number;
  lineGuideId?: string;
}): {
  segments: { slotIndex: number; content: string }[];
  truncated: boolean;
} {
  const { text, startSlotIndex, slots, fontSize, lineGuideId } = params;
  const startSlot = slots[startSlotIndex];
  if (!startSlot) {
    return { segments: [{ slotIndex: startSlotIndex, content: text }], truncated: false };
  }

  const groupId = startSlot.continuationGroup;
  const groupSlots = slots
    .filter((s) => s.continuationGroup === groupId)
    .sort((a, b) => a.index - b.index);

  if (groupSlots.length === 0) {
    return { segments: [{ slotIndex: startSlotIndex, content: text }], truncated: false };
  }

  const segments: { slotIndex: number; content: string }[] = [];
  let remaining = text;

  for (const slot of groupSlots) {
    if (!remaining) {
      segments.push({ slotIndex: slot.index, content: '' });
      continue;
    }
    const { line, rest } = consumeOneLineForSlot(remaining, slot, fontSize, lineGuideId);
    segments.push({ slotIndex: slot.index, content: line });
    remaining = rest;
  }

  const truncated = remaining.length > 0;

  return { segments, truncated };
}

export function clampTextToContinuationGroup(params: {
  text: string;
  startSlotIndex: number;
  slots: TextLineSlot[];
  fontSize: number;
  lineGuideId?: string;
}): string {
  const { text, startSlotIndex, slots, fontSize, lineGuideId } = params;
  if (!text) return text;

  const { truncated } = distributeTextWithinContinuationGroup({
    text,
    startSlotIndex,
    slots,
    fontSize,
    lineGuideId,
  });

  if (!truncated) return text;

  let lo = 0;
  let hi = text.length;
  let best = 0;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = text.slice(0, mid);
    const { truncated: stillTruncated } = distributeTextWithinContinuationGroup({
      text: candidate,
      startSlotIndex,
      slots,
      fontSize,
      lineGuideId,
    });
    if (stillTruncated) {
      hi = mid - 1;
    } else {
      best = mid;
      lo = mid + 1;
    }
  }

  return text.slice(0, best);
}
