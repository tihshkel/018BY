import type { TextLineSlot } from '@/utils/textLineSlots';

/** Кириллица шире — меньший коэффициент = больше символов в строке до переноса. */
const TEMPLATE_CHAR_WIDTH_RATIO = 0.5;

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

function getMaxCharsForSlot(slot: TextLineSlot, fontSize: number): number {
  const fitted = fitFontSizeToSlot(fontSize, slot.lineHeight, slot.inputKind);
  const charWidth = fitted * TEMPLATE_CHAR_WIDTH_RATIO;
  return Math.max(1, Math.floor(slot.width / charWidth));
}

/** Одна строка для слота + остаток текста для следующих слотов группы. */
function consumeOneLineForSlot(
  text: string,
  slot: TextLineSlot,
  fontSize: number
): { line: string; rest: string } {
  const trimmed = text.replace(/^\s+/, '');
  if (!trimmed) return { line: '', rest: '' };

  const maxChars = getMaxCharsForSlot(slot, fontSize);
  const words = trimmed.split(/\s+/).filter(Boolean);
  let built = '';

  for (const word of words) {
    const testLine = built ? `${built} ${word}` : word;
    if (testLine.length <= maxChars) {
      built = testLine;
      continue;
    }

    if (built) {
      const rest = trimmed.slice(built.length).replace(/^\s+/, '');
      return { line: built, rest };
    }

    if (word.length <= maxChars) {
      return { line: word, rest: trimmed.slice(word.length).replace(/^\s+/, '') };
    }

    return {
      line: word.slice(0, maxChars),
      rest: word.slice(maxChars) + trimmed.slice(word.length).replace(/^\s+/, ''),
    };
  }

  return { line: built, rest: '' };
}

/**
 * Распределяет текст по слотам continuationGroup: каждая строка — своя ширина.
 * Первая строка — после подписи, продолжения — с начала полной линии.
 */
export function distributeTextWithinContinuationGroup(params: {
  text: string;
  startSlotIndex: number;
  slots: TextLineSlot[];
  fontSize: number;
}): {
  segments: { slotIndex: number; content: string }[];
  truncated: boolean;
} {
  const { text, startSlotIndex, slots, fontSize } = params;
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
    if (!remaining) break;
    const { line, rest } = consumeOneLineForSlot(remaining, slot, fontSize);
    segments.push({ slotIndex: slot.index, content: line });
    remaining = rest;
  }

  const truncated = remaining.length > 0;

  return { segments, truncated };
}

export function fitFontSizeToSlot(
  fontSize: number,
  lineHeight: number,
  inputKind: 'line' | 'block' = 'line'
): number {
  if (inputKind === 'block') {
    return Math.min(fontSize, Math.max(13, lineHeight * 0.78), 21);
  }
  const maxFromSlot = Math.max(8, lineHeight * 0.82);
  return Math.min(fontSize, maxFromSlot, 16);
}

export function getTemplateLineTypography(
  fontSize: number,
  lineHeight: number,
  inputKind: 'line' | 'block' = 'line'
) {
  const fittedSize = fitFontSizeToSlot(fontSize, lineHeight, inputKind);
  return {
    fontSize: fittedSize,
    lineHeight: inputKind === 'block' ? fittedSize * 1.05 : fittedSize,
    inputHeight: inputKind === 'block' ? lineHeight : fittedSize,
  };
}

/** Вертикаль: norm.y слота — центр линии/блока; текст чуть выше штриха или по центру блока. */
export function getTemplateLineTextTop(
  slot: Pick<TextLineSlot, 'y' | 'lineHeight' | 'inputKind'>,
  fontSize: number
): number {
  const inputKind = slot.inputKind ?? 'line';
  const { fontSize: fittedSize } = getTemplateLineTypography(fontSize, slot.lineHeight, inputKind);

  if (inputKind === 'block') {
    return slot.y + slot.lineHeight * 0.66 - fittedSize * 0.72;
  }

  const lineY = slot.y + slot.lineHeight * 0.46;
  return lineY - fittedSize * 0.92;
}
