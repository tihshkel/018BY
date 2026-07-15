/**
 * «Украшения» (brown p26): хвост после «какие?» + 2 полные строки (слоты 13–15).
 * Первая линия ввода — сразу после «?», дальше продолжение на полных строках.
 */
export const DIARY_BROWN_JEWELRY_START = 13;
export const DIARY_BROWN_JEWELRY_COUNT = 3;
/** Tip ~19% ширины ≈ 6 символов рукописным (10 клипалось); полные ≈ 36. */
export const DIARY_BROWN_JEWELRY_BUDGETS = [6, 36, 36] as const;

export function isDiaryBrownJewelryFieldLayout(params: {
  lineGuideId?: string;
  sourcePageNumber?: number | null;
  startSlotIndex: number;
  lineCount: number;
  fieldId?: string;
  annotationId?: string;
}): boolean {
  const {
    lineGuideId,
    sourcePageNumber,
    startSlotIndex,
    lineCount,
    fieldId,
    annotationId,
  } = params;

  if (
    typeof fieldId === 'string' &&
    fieldId.endsWith('_wearsJewelry') &&
    lineGuideId === 'diary_interior_brown'
  ) {
    return true;
  }
  if (
    typeof annotationId === 'string' &&
    annotationId.includes('wearsJewelry') &&
    (lineGuideId === 'diary_interior_brown' || sourcePageNumber === 26)
  ) {
    return true;
  }
  // Tip+fulls (13–15) и legacy full-only (14–15).
  if (
    lineGuideId === 'diary_interior_brown' &&
    sourcePageNumber === 26 &&
    startSlotIndex >= 13 &&
    startSlotIndex <= 15
  ) {
    return true;
  }
  return (
    startSlotIndex === DIARY_BROWN_JEWELRY_START &&
    lineCount === DIARY_BROWN_JEWELRY_COUNT
  );
}

/** Какой слот «держит» поле: канон 13, иначе самый ранний из legacy (например 14). */
export function getJewelryFieldOwnerSlotIndex(
  siblingStarts: readonly number[],
  jewelryStart: number = DIARY_BROWN_JEWELRY_START,
  jewelryCount: number = DIARY_BROWN_JEWELRY_COUNT,
): number {
  const inRange = siblingStarts.filter(
    (start) => start >= 13 && start < jewelryStart + jewelryCount,
  );
  if (inRange.includes(jewelryStart)) return jewelryStart;
  if (inRange.length === 0) return jewelryStart;
  return Math.min(...inRange);
}

export function normalizeJewelryFieldText(text: string): string {
  // Без trim: пробел в конце при вводе должен оставаться видимым.
  return String(text ?? '')
    .replace(/[\r\n\u2028\u2029]+/g, ' ')
    .replace(/[ \t\f\v]+/g, ' ');
}

/** Упаковка текста поля «украшения» строго по символьным budget. */
export function packJewelryFieldText(params: {
  text: string;
  slotIndices: readonly number[];
  budgets?: readonly number[];
}): {
  segments: { slotIndex: number; content: string }[];
  truncated: boolean;
} {
  const text = normalizeJewelryFieldText(params.text);
  const slotIndices = params.slotIndices;
  const budgets =
    params.budgets ??
    slotIndices.map((_, i) => DIARY_BROWN_JEWELRY_BUDGETS[i] ?? 36);

  if (slotIndices.length === 0) {
    return { segments: [], truncated: text.length > 0 };
  }

  const words = text.split(/\s+/).filter(Boolean);
  const segments: { slotIndex: number; content: string }[] = [];
  let wordIndex = 0;

  for (let i = 0; i < slotIndices.length; i += 1) {
    const slotIndex = slotIndices[i]!;
    const isLast = i === slotIndices.length - 1;

    if (wordIndex >= words.length) {
      segments.push({ slotIndex, content: '' });
      continue;
    }

    if (isLast) {
      segments.push({
        slotIndex,
        content: words.slice(wordIndex).join(' '),
      });
      wordIndex = words.length;
      break;
    }

    const budget = Math.max(1, budgets[i] ?? 36);
    let line = '';
    while (wordIndex < words.length) {
      const word = words[wordIndex]!;
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length <= budget) {
        line = candidate;
        wordIndex += 1;
        continue;
      }
      if (!line) {
        line = word.slice(0, budget);
        words[wordIndex] = word.slice(line.length);
        if (!words[wordIndex]) wordIndex += 1;
      }
      break;
    }
    segments.push({ slotIndex, content: line });
  }

  return { segments, truncated: wordIndex < words.length };
}

export function packJewelryFieldFromStart(params: {
  text: string;
  startSlotIndex?: number;
  lineCount?: number;
}): {
  segments: { slotIndex: number; content: string }[];
  truncated: boolean;
} {
  const start = params.startSlotIndex ?? DIARY_BROWN_JEWELRY_START;
  const count = params.lineCount ?? DIARY_BROWN_JEWELRY_COUNT;
  const slotIndices = Array.from({ length: count }, (_, i) => start + i);
  return packJewelryFieldText({ text: params.text, slotIndices });
}

/** Хвост после «?» + остаток для полных строк. */
export function splitJewelryTailAndBody(text: string): {
  tail: string;
  body: string;
} {
  const normalized = normalizeJewelryFieldText(text);
  if (!normalized) return { tail: '', body: '' };

  const tipBudget = DIARY_BROWN_JEWELRY_BUDGETS[0] ?? 10;
  const words = normalized.split(/\s+/).filter(Boolean);
  let tip = '';
  let used = 0;
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i]!;
    const candidate = tip ? `${tip} ${word}` : word;
    if (candidate.length <= tipBudget) {
      tip = candidate;
      used = i + 1;
      continue;
    }
    if (!tip) {
      tip = word.slice(0, tipBudget);
      const rest = word.slice(tip.length);
      const bodyWords = rest ? [rest, ...words.slice(i + 1)] : words.slice(i + 1);
      return { tail: tip, body: bodyWords.join(' ') };
    }
    break;
  }
  return { tail: tip, body: words.slice(used).join(' ') };
}
