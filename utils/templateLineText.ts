import {
  DIARY_LINE_FONT_OFFSET,
  getTemplateTypographyProfile,
  KIDS_MONTH_LINE_FONT_OFFSET,
  PREGNANCY_WEEKLY_CAP_HEIGHT_RATIO,
  PREGNANCY_WEEKLY_COMPACT_LINE_HEIGHT,
  TEMPLATE_LINE_STROKE_CLEARANCE_RATIO,
} from '@/constants/album-text-margins';
import {
  DIARY_BROWN_MY_DAY_TEMPLATE,
  DIARY_BROWN_QUESTIONNAIRE_TEMPLATES,
  DIARY_BROWN_SCHOOL_LIFE_TEMPLATE,
  DIARY_BROWN_WEEKLY_SCHEDULE_TEMPLATES,
  getDiaryBrownPageTemplate,
} from '@/constants/diary-brown-page-templates';
import { getAlbumFontCharWidthMultiplier } from '@/constants/album-fonts';
import { LINE_GUIDES } from '@/constants/line-guides';
import type { TextLineSlot } from '@/utils/textLineSlots';
import {
  isPregnancy60GuideRuledLineSlot,
  isPregnancy60WeeklyValueSlot,
  isPregnancyWeeklyStructuredPage,
  isPregnancyWeeklyTextLineSlot,
} from '@/utils/textLineSlots';

/** Пробел уже буквы — иначе перенос срабатывает раньше визуального края строки. */
const SPACE_WIDTH_FACTOR = 0.35;

/** Единая нормализация многострочных полей: iOS/Android → одинаковый перенос по слотам. */
export function normalizeTemplateMultilineText(text: string, lineCount?: number): string {
  if (!text || lineCount == null || lineCount <= 1) return text;
  return text.replace(/\r?\n/g, ' ');
}

function isDiaryInteriorLineGuide(lineGuideId?: string): boolean {
  return lineGuideId === 'diary_interior_brown' || lineGuideId === 'diary_interior_purple';
}

function getEffectiveCharWidthRatio(lineGuideId?: string, fontId?: string): number {
  const profile = getTemplateTypographyProfile(lineGuideId);
  return profile.charWidthRatio * getAlbumFontCharWidthMultiplier(fontId);
}

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

export type TextWidthMeasure = (text: string, fittedFontSize: number) => number;

function measureTextLineWidth(
  text: string,
  fittedFontSize: number,
  lineGuideId: string | undefined,
  fontId: string | undefined,
  measureTextWidth?: TextWidthMeasure
): number {
  if (measureTextWidth) {
    return measureTextWidth(text, fittedFontSize);
  }
  return estimateTextWidth(
    text,
    fittedFontSize,
    getEffectiveCharWidthRatio(lineGuideId, fontId)
  );
}

export function textFitsInSlot(
  text: string,
  slot: TextLineSlot,
  fontSize: number,
  lineGuideId?: string,
  fontId?: string,
  measureTextWidth?: TextWidthMeasure
): boolean {
  if (!text) return true;
  const fitted = fitFontSizeToSlot(fontSize, slot.lineHeight, slot.inputKind, lineGuideId);
  return (
    measureTextLineWidth(text, fitted, lineGuideId, fontId, measureTextWidth) <=
    getEffectiveLineWidth(slot, lineGuideId)
  );
}

function splitWordToFit(
  word: string,
  slot: TextLineSlot,
  fontSize: number,
  lineGuideId?: string,
  fontId?: string,
  measureTextWidth?: TextWidthMeasure
): { line: string; rest: string } {
  const fitted = fitFontSizeToSlot(fontSize, slot.lineHeight, slot.inputKind, lineGuideId);
  const charWidthRatio = getEffectiveCharWidthRatio(lineGuideId, fontId);

  let line = '';
  for (const ch of word) {
    const candidate = line + ch;
    const width = measureTextWidth
      ? measureTextWidth(candidate, fitted)
      : estimateTextWidth(candidate, fitted, charWidthRatio);
    if (width <= getEffectiveLineWidth(slot, lineGuideId)) {
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
  lineGuideId?: string,
  fontId?: string,
  measureTextWidth?: TextWidthMeasure
): string {
  if (!text || textFitsInSlot(text, slot, fontSize, lineGuideId, fontId, measureTextWidth)) {
    return text;
  }

  let lo = 0;
  let hi = text.length;
  let best = 0;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = text.slice(0, mid);
    if (textFitsInSlot(candidate, slot, fontSize, lineGuideId, fontId, measureTextWidth)) {
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

  if (isDiaryInteriorLineGuide(lineGuideId) && profile.fixedLineFontSize != null) {
    return profile.fixedLineFontSize;
  }

  if (inputKind === 'block') {
    return Math.min(fontSize, Math.max(13, lineHeight * 0.78), profile.blockMaxFontSize);
  }

  if (profile.fixedLineFontSize != null) {
    return profile.fixedLineFontSize;
  }

  if (
    inputKind === 'line' &&
    lineGuideId === 'holidays_birthday_60'
  ) {
    return Math.min(fontSize, Math.max(10, lineHeight * 0.82), 18);
  }

  const maxFromSlot = Math.max(8, lineHeight * 0.76);
  return Math.min(fontSize, maxFromSlot, 16);
}

export function getTemplateLineAscenderPadding(
  fontSize: number,
  inputKind: 'line' | 'block' = 'line'
): number {
  return Math.ceil(fontSize * (inputKind === 'block' ? 0.34 : 0.28));
}

export function isDiaryPeachCellField(
  slot: Pick<TextLineSlot, 'inputKind' | 'normY' | 'normHeight'>,
): boolean {
  return (
    (slot.inputKind ?? 'line') === 'block' &&
    slot.normY != null &&
    slot.normY >= 0.74 &&
    slot.normY <= 0.93 &&
    (slot.normHeight ?? 0) > 0.035
  );
}

function getStrokeBaselineFontOffset(
  slot: Pick<TextLineSlot, 'page' | 'normY' | 'hasLabel' | 'inputKind' | 'index' | 'textAnchorTop'>,
  lineGuideId?: string,
): number {
  if (lineGuideId === 'pregnancy_a5' && slot.page === 44) {
    return 0.84;
  }
  if (isDiaryInteriorLineGuide(lineGuideId)) {
    const isBrownCoverField =
      lineGuideId === 'diary_interior_brown' &&
      slot.normY != null &&
      slot.normY >= 0.52 &&
      slot.normY <= 0.62;
    const isPurpleCoverField =
      lineGuideId === 'diary_interior_purple' &&
      slot.normY != null &&
      ((slot.normY >= 0.46 && slot.normY <= 0.52) ||
        (slot.normY >= 0.54 && slot.normY <= 0.62));
    if (isBrownCoverField || isPurpleCoverField) {
      return 0.92;
    }
    if (isBrownWishSlot(slot, lineGuideId) || isBrownCareerAnswerSlot(slot, lineGuideId)) {
      return 0.9;
    }
    if (lineGuideId === 'diary_interior_purple') {
      return 0.9;
    }
    return DIARY_LINE_FONT_OFFSET;
  }
  return KIDS_MONTH_LINE_FONT_OFFSET;
}

/** Недельные и статические pregnancy_60 — позиция по LINE_GUIDES, без android bottom-align. */
export function usesPregnancyGuideRuledTextLayout(
  lineGuideId: string | undefined,
  slot: Pick<TextLineSlot, 'page' | 'index' | 'inputKind' | 'textAnchorTop'>,
): boolean {
  return (
    isPregnancyWeeklyTextLineSlot(lineGuideId, slot) ||
    isPregnancy60GuideRuledLineSlot(lineGuideId, slot)
  );
}

/** Baseline прямо на штрихе линии — kids_48, pregnancy A5 p44, дневники. */
export function usesStrokeBaselineLayout(
  slot: Pick<
    TextLineSlot,
    'lineStrokeAtBottom' | 'page' | 'normY' | 'hasLabel' | 'inputKind' | 'index' | 'textAnchorTop'
  >,
  lineGuideId?: string,
): boolean {
  if (isPregnancyWeeklyTextLineSlot(lineGuideId, slot)) return true;
  if (!Boolean(slot.lineStrokeAtBottom)) return false;
  if (lineGuideId === 'kids_48') return true;
  if (lineGuideId === 'pregnancy_a5' && slot.page === 44) return true;
  if (isDiaryInteriorLineGuide(lineGuideId)) {
    return !isDiaryPeachCellField(slot);
  }
  return false;
}

/** @deprecated Use usesStrokeBaselineLayout */
export function usesKidsMonthStrokeBaselineLayout(
  slot: Pick<TextLineSlot, 'lineStrokeAtBottom' | 'page' | 'normY' | 'hasLabel' | 'inputKind'>,
  lineGuideId?: string
): boolean {
  return usesStrokeBaselineLayout(slot, lineGuideId);
}

/** Viewport/text insets для строки макета (month pages — baseline прямо на штрихе). */
export function getTemplateLineRowInsets(
  slot: Pick<
    TextLineSlot,
    'lineStrokeAtBottom' | 'page' | 'index' | 'textAnchorTop' | 'inputKind'
  >,
  fontSize: number,
  inputKind: 'line' | 'block',
  lineGuideId?: string
): { viewportTopInset: number; textTopInset: number } {
  if (isPregnancy60WeeklyValueSlot(lineGuideId, slot)) {
    return { viewportTopInset: 0, textTopInset: 0 };
  }
  if (usesPregnancyGuideRuledTextLayout(lineGuideId, slot)) {
    return { viewportTopInset: 0, textTopInset: 0 };
  }
  if (usesStrokeBaselineLayout(slot, lineGuideId)) {
    return { viewportTopInset: 0, textTopInset: 0 };
  }
  const ascenderPadding = getTemplateLineAscenderPadding(fontSize, inputKind);
  return { viewportTopInset: ascenderPadding, textTopInset: ascenderPadding };
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
  const isBirthdayLetterLine =
    lineGuideId === 'holidays_birthday_60' && inputKind === 'line';

  const isKidsMonthAnswerLine =
    lineGuideId === 'kids_48' &&
    inputKind === 'line' &&
    lineHeight <= fittedSize * 1.15;

  const isDiaryStrokeAnswerLine = isDiaryInteriorLineGuide(lineGuideId);

  const isPregnancyWeeklyLine =
    (lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5') &&
    inputKind === 'line';

  const lineTextLineHeight =
    isBirthdayLetterLine || isKidsMonthAnswerLine || isDiaryStrokeAnswerLine || isPregnancyWeeklyLine
      ? fittedSize
      : inputKind === 'block'
        ? fittedSize * 1.08
        : fittedSize * 1.06;
  const ascenderPadding = getTemplateLineAscenderPadding(fittedSize, inputKind);
  const lineInputHeight =
    inputKind === 'block'
      ? Math.max(lineHeight, lineTextLineHeight + ascenderPadding)
      : Math.min(lineHeight, lineTextLineHeight + ascenderPadding);

  return {
    fontSize: fittedSize,
    lineHeight: lineTextLineHeight,
    inputHeight: lineInputHeight,
  };
}

type DiaryBrownSlotGeometry = Pick<
  TextLineSlot,
  'inputKind' | 'normY' | 'normHeight' | 'page' | 'x' | 'width'
>;

function resolveDiaryBrownBlockRatios(
  slot: DiaryBrownSlotGeometry,
): { centerRatio: number; fontOffsetRatio: number } | null {
  if (slot.page == null) return null;
  const template = getDiaryBrownPageTemplate(slot.page);
  if (!template) return null;

  const normY = slot.normY ?? 0;
  if (normY >= 0.74 && normY <= 0.93) {
    return { centerRatio: 0.58, fontOffsetRatio: 0.88 };
  }

  if (template === DIARY_BROWN_SCHOOL_LIFE_TEMPLATE) {
    const isLabelTail = (slot.x ?? 0) >= 0.5 && (slot.width ?? 0) <= 0.4;
    if (isLabelTail) {
      return { centerRatio: 0.5, fontOffsetRatio: 0.93 };
    }
    return { centerRatio: 0.56, fontOffsetRatio: 0.94 };
  }

  if (template === DIARY_BROWN_MY_DAY_TEMPLATE) {
    return { centerRatio: 0.56, fontOffsetRatio: 0.93 };
  }

  if (template === 'MoodTemplate' || template === 'TravelTemplate') {
    return { centerRatio: 1, fontOffsetRatio: 0.9 };
  }

  if (DIARY_BROWN_WEEKLY_SCHEDULE_TEMPLATES.has(template)) {
    return { centerRatio: 0.5, fontOffsetRatio: 0.88 };
  }

  if (DIARY_BROWN_QUESTIONNAIRE_TEMPLATES.has(template)) {
    const isWide = (slot.width ?? 0) >= 0.62;
    return {
      centerRatio: isWide ? 0.52 : 0.5,
      fontOffsetRatio: isWide ? 0.94 : 0.92,
    };
  }

  return { centerRatio: 1, fontOffsetRatio: 0.96 };
}

function resolveDiaryBrownLineFontOffset(slot: DiaryBrownSlotGeometry): number | null {
  if (slot.page == null) return null;
  const template = getDiaryBrownPageTemplate(slot.page);
  if (!template) return null;

  if (DIARY_BROWN_QUESTIONNAIRE_TEMPLATES.has(template)) {
    return 0.93;
  }
  if (template === DIARY_BROWN_MY_DAY_TEMPLATE) {
    return 0.94;
  }
  if (template === 'MoodTemplate' || template === 'TravelTemplate') {
    return 0.9;
  }
  if (template === DIARY_BROWN_SCHOOL_LIFE_TEMPLATE) {
    return 0.94;
  }
  if (DIARY_BROWN_WEEKLY_SCHEDULE_TEMPLATES.has(template)) {
    return 0.9;
  }
  if (slot.page != null && slot.page >= 45 && slot.page <= 56) {
    return 0.92;
  }
  return 0.92;
}

function resolveTemplateTextVerticalRatios(
  slot: Pick<TextLineSlot, 'inputKind' | 'normY' | 'normHeight' | 'page'>,
  lineGuideId?: string
): { centerRatio: number; fontOffsetRatio: number } {
  const profile = getTemplateTypographyProfile(lineGuideId);
  const inputKind = slot.inputKind ?? 'line';

  if (
    inputKind === 'block' &&
    (lineGuideId === 'diary_interior_brown' || lineGuideId === 'diary_interior_purple')
  ) {
    if (isDiaryPeachCellField(slot)) {
      return { centerRatio: 0.58, fontOffsetRatio: 0.88 };
    }

    if (lineGuideId === 'diary_interior_brown') {
      const brownBlock = resolveDiaryBrownBlockRatios(slot);
      if (brownBlock) {
        return { centerRatio: 1, fontOffsetRatio: brownBlock.fontOffsetRatio };
      }
    }

    return { centerRatio: 1, fontOffsetRatio: DIARY_LINE_FONT_OFFSET };
  }

  if (inputKind === 'line') {
    if (
      lineGuideId === 'holidays_birthday_60' &&
      slot.page === 48 &&
      slot.normY != null &&
      slot.normY >= 0.22 &&
      slot.normY <= 0.75
    ) {
      return { centerRatio: 1, fontOffsetRatio: 0.98 };
    }

    if (lineGuideId === 'kids_48') {
      return { centerRatio: 0.5, fontOffsetRatio: 0.86 };
    }

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
        ((slot.normY >= 0.46 && slot.normY <= 0.52) ||
          (slot.normY >= 0.54 && slot.normY <= 0.62));

      if (lineGuideId === 'diary_interior_brown' && !isBrownCoverField) {
        const templateOffset = resolveDiaryBrownLineFontOffset(slot);
        if (templateOffset != null) {
          return { centerRatio: 1, fontOffsetRatio: templateOffset };
        }
      }

      return {
        centerRatio: isBrownCoverField || isPurpleCoverField ? 0.44 : 1,
        fontOffsetRatio:
          isBrownCoverField || isPurpleCoverField
            ? 0.92
            : lineGuideId === 'diary_interior_purple'
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
        return { centerRatio: 0.5, fontOffsetRatio: 0.8 };
      }
      return { centerRatio: 0.52, fontOffsetRatio: 0.78 };
    }
    // Верхний/средний ряд коротких полей (дата, вес, рост на стр. 2 и «Мне N лет»)
    if (normHeight < 0.055 && normY >= 0.25 && normY <= 0.38) {
      return { centerRatio: 0.5, fontOffsetRatio: 0.72 };
    }
    // Нижняя строка коротких полей (место рождения и аналоги на стр. 2+)
    if (normY >= 0.85 && normHeight < 0.055) {
      return { centerRatio: 0.5, fontOffsetRatio: 0.72 };
    }
  }

  if (lineGuideId === 'pregnancy_a5' && slot.page === 44 && inputKind === 'block') {
    const normHeight = slot.normHeight ?? 0;
    if (normHeight <= 0.032) {
      const normY = slot.normY ?? 0;
      if (normY >= 0.49 && normY <= 0.52) {
        return { centerRatio: 0.34, fontOffsetRatio: 0.78 };
      }
      if (normY >= 0.54 && normY <= 0.57) {
        return { centerRatio: 0.36, fontOffsetRatio: 0.78 };
      }
      return { centerRatio: 0.34, fontOffsetRatio: 0.78 };
    }
    return { centerRatio: 0.5, fontOffsetRatio: 0.72 };
  }

  if (
    (lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5') &&
    inputKind === 'line'
  ) {
    return {
      centerRatio: profile.lineCenterRatio,
      fontOffsetRatio: profile.lineFontOffsetRatio,
    };
  }

  return {
    centerRatio: profile.blockCenterRatio,
    fontOffsetRatio: profile.blockFontOffsetRatio,
  };
}

function getDiaryCareerQuestionPage(lineGuideId?: string): number {
  return lineGuideId === 'diary_interior_purple' ? 5 : 6;
}

export function isBrownWishSlot(
  slot: Pick<TextLineSlot, 'normY' | 'hasLabel' | 'page'>,
  lineGuideId?: string
): boolean {
  const careerPage = getDiaryCareerQuestionPage(lineGuideId);
  if (
    (lineGuideId === 'diary_interior_brown' || lineGuideId === 'diary_interior_purple') &&
    slot.page === careerPage &&
    slot.normY != null &&
    slot.normY >= 0.755 &&
    slot.normY <= 0.845
  ) {
    return false;
  }

  return (
    (lineGuideId === 'diary_interior_brown' || lineGuideId === 'diary_interior_purple') &&
    !slot.hasLabel &&
    slot.normY != null &&
    slot.normY >= 0.772 &&
    slot.normY <= 0.92
  );
}

/** Стр. 6: «Кем ты хочешь стать…» — хвост после «?» и широкие строки ответа. */
export function isBrownCareerAnswerSlot(
  slot: Pick<TextLineSlot, 'normY' | 'hasLabel' | 'page'>,
  lineGuideId?: string
): boolean {
  const careerPage = getDiaryCareerQuestionPage(lineGuideId);
  return (
    (lineGuideId === 'diary_interior_brown' || lineGuideId === 'diary_interior_purple') &&
    slot.page === careerPage &&
    !slot.hasLabel &&
    slot.normY != null &&
    slot.normY >= 0.755 &&
    slot.normY <= 0.845
  );
}

export function getWishSlotInputKind(
  slot: Pick<TextLineSlot, 'normY' | 'hasLabel' | 'inputKind' | 'page' | 'normHeight'>,
  lineGuideId?: string
): 'line' | 'block' {
  if (lineGuideId === 'diary_interior_brown' && slot.page === 15) return 'line';
  if (isBrownWishSlot(slot, lineGuideId)) return 'line';
  if (isBrownCareerAnswerSlot(slot, lineGuideId)) return 'line';
  if (
    isDiaryInteriorLineGuide(lineGuideId) &&
    (slot.inputKind ?? 'line') === 'block' &&
    (slot.normHeight ?? 0) <= 0.035 &&
    (slot.normY == null || slot.normY < 0.74 || slot.normY > 0.93)
  ) {
    return 'line';
  }
  return slot.inputKind ?? 'line';
}

export function getTemplateBlockTextInsets(
  slot: Pick<TextLineSlot, 'inputKind' | 'width' | 'page' | 'hasLabel'>,
  lineGuideId?: string,
): { left: number; width: number } {
  if (lineGuideId === 'holidays_birthday_60' && slot.inputKind === 'block') {
    const pad = slot.width * 0.08;
    return { left: pad, width: Math.max(0, slot.width - pad * 2) };
  }
  if (
    lineGuideId === 'pregnancy_a5' &&
    slot.page === 44 &&
    slot.inputKind === 'block' &&
    slot.width <= 0.2 &&
    !slot.hasLabel
  ) {
    const pad = slot.width * 0.07;
    return { left: pad, width: Math.max(0, slot.width - pad * 2) };
  }
  return { left: 0, width: slot.width };
}

/** Высота заглавных глифов от top до baseline (RN ≈ PDF для sans). */
const TEMPLATE_LINE_CAP_HEIGHT_RATIO = 0.85;

function applyTemplateLineStrokeClearance(
  top: number,
  fittedSize: number,
  inputKind: 'line' | 'block',
): number {
  if (inputKind !== 'line') return top;
  return top - fittedSize * TEMPLATE_LINE_STROKE_CLEARANCE_RATIO;
}

/** Y штриха в viewport px для недельных строк pregnancy_60 / pregnancy_a5. */
type PregnancyWeeklyStrokeSlot = Pick<
  TextLineSlot,
  | 'y'
  | 'lineHeight'
  | 'normHeight'
  | 'normY'
  | 'index'
  | 'page'
  | 'continuationGroup'
  | 'hasLabel'
  | 'inputKind'
>;


/** LINE_GUIDES[i] — Y штриха линии в PNG (норм. 0–1), не верх OCR-слота. */
function getPregnancyWeeklyGuideStrokeNormY(
  lineGuideId: string,
  page: number,
  slotIndex: number,
  _normHeight: number,
): number | null {
  const guides = (LINE_GUIDES as Record<string, Record<string, readonly number[]>>)[
    lineGuideId
  ]?.[String(page)];
  if (!guides?.length || slotIndex < 0 || slotIndex >= guides.length) return null;

  return guides[slotIndex]!;
}

function mapPregnancyWeeklyStrokeNormYToViewport(
  slot: PregnancyWeeklyStrokeSlot,
  strokeNormY: number,
): number {
  const normH = slot.normHeight ?? 0;
  if (normH <= 0) return slot.y + slot.lineHeight;

  const slotTopNormY = (slot.normY ?? 0) - normH / 2;
  const offsetRatio = (strokeNormY - slotTopNormY) / normH;
  return slot.y + offsetRatio * slot.lineHeight;
}

export function getPregnancyWeeklyLineStrokeY(
  slot: PregnancyWeeklyStrokeSlot,
  _allSlots?: PregnancyWeeklyStrokeSlot[],
  lineGuideId?: string,
  _fieldStartIndex?: number,
): number {
  const normH = slot.normHeight ?? 0;

  if (lineGuideId) {
    const strokeNormY = getPregnancyWeeklyGuideStrokeNormY(
      lineGuideId,
      slot.page,
      slot.index,
      normH,
    );
    if (strokeNormY != null) {
      return mapPregnancyWeeklyStrokeNormYToViewport(slot, strokeNormY);
    }
  }

  if (normH <= PREGNANCY_WEEKLY_COMPACT_LINE_HEIGHT) {
    return slot.y + slot.lineHeight * 0.5;
  }

  return slot.y + slot.lineHeight;
}

/** @deprecated Используйте getPregnancyWeeklyLineStrokeY */
export function getPregnancyWeeklyLineStrokeRatio(normHeight: number): number {
  if (normHeight <= PREGNANCY_WEEKLY_COMPACT_LINE_HEIGHT) return 0.5;
  return 1;
}

export function getTemplateLineTextTop(
  slot: Pick<
    TextLineSlot,
    | 'y'
    | 'lineHeight'
    | 'inputKind'
    | 'normY'
    | 'normHeight'
    | 'page'
    | 'lineStrokeAtBottom'
    | 'index'
    | 'textAnchorTop'
    | 'continuationGroup'
    | 'hasLabel'
  >,
  fontSize: number,
  lineGuideId?: string,
  allSlots?: PregnancyWeeklyStrokeSlot[],
  fieldStartIndex?: number,
): number {
  if (isPregnancy60WeeklyValueSlot(lineGuideId, slot)) {
    if (slot.index === 5) {
      const inputKind = slot.inputKind ?? 'block';
      const fittedSize = fitFontSizeToSlot(
        fontSize,
        slot.lineHeight,
        inputKind,
        lineGuideId,
      );
      return slot.y + slot.lineHeight * 0.38 - fittedSize * 0.7;
    }
    return slot.y;
  }

  const inputKind = slot.inputKind ?? 'line';
  const { fontSize: fittedSize } = getTemplateLineTypography(
    fontSize,
    slot.lineHeight,
    inputKind,
    lineGuideId
  );
  let top: number;

  if (lineGuideId === 'diary_interior_brown' && slot.page === 15) {
    const lineY = slot.y + slot.lineHeight;
    const lineFitted = fitFontSizeToSlot(
      fontSize,
      slot.lineHeight,
      inputKind,
      lineGuideId,
    );
    top = lineY - lineFitted * 1.05;
  } else if (isDiaryInteriorLineGuide(lineGuideId) && isDiaryPeachCellField(slot)) {
    const { centerRatio, fontOffsetRatio } = resolveTemplateTextVerticalRatios(
      slot,
      lineGuideId,
    );
    top = slot.y + slot.lineHeight * centerRatio - fittedSize * fontOffsetRatio;
  } else if (
    usesPregnancyGuideRuledTextLayout(lineGuideId, slot) &&
    inputKind === 'line' &&
    !isPregnancy60WeeklyValueSlot(lineGuideId, slot)
  ) {
    const strokeY = getPregnancyWeeklyLineStrokeY(
      slot,
      allSlots,
      lineGuideId,
      fieldStartIndex,
    );
    return strokeY - fittedSize * PREGNANCY_WEEKLY_CAP_HEIGHT_RATIO;
  } else if (usesStrokeBaselineLayout(slot, lineGuideId)) {
    const lineY = slot.y + slot.lineHeight;
    const lineFitted = fitFontSizeToSlot(
      fontSize,
      slot.lineHeight,
      inputKind,
      lineGuideId,
    );
    top = lineY - lineFitted * getStrokeBaselineFontOffset(slot, lineGuideId);
    return top;
  } else if (
    lineGuideId === 'holidays_birthday_60' &&
    slot.page === 48 &&
    inputKind === 'line'
  ) {
    const lineY = slot.y + slot.lineHeight;
    top = lineY - fittedSize * 0.98;
  } else if (lineGuideId === 'kids_48' && inputKind === 'line') {
    const lineY = slot.y + slot.lineHeight / 2;
    const lineFitted = fitFontSizeToSlot(
      fontSize,
      slot.lineHeight,
      'line',
      lineGuideId
    );
    const profile = getTemplateTypographyProfile(lineGuideId);
    top = lineY - lineFitted * profile.lineFontOffsetRatio;
  } else {
    const { centerRatio, fontOffsetRatio } = resolveTemplateTextVerticalRatios(slot, lineGuideId);

    if (inputKind === 'block') {
      top = slot.y + slot.lineHeight * centerRatio - fittedSize * fontOffsetRatio;
    } else {
      const lineY = slot.y + slot.lineHeight * centerRatio;
      top = lineY - fittedSize * fontOffsetRatio;
    }
  }

  const isPregnancyA5P44StrokeBaseline =
    lineGuideId === 'pregnancy_a5' &&
    slot.page === 44 &&
    inputKind === 'line' &&
    slot.lineStrokeAtBottom;

  if (isPregnancyA5P44StrokeBaseline || usesStrokeBaselineLayout(slot, lineGuideId)) {
    return top;
  }

  return applyTemplateLineStrokeClearance(top, fittedSize, inputKind);
}

/** Y штриха подчёркивания в viewport px. */
export function getTemplateLineStrokeY(
  slot: Pick<
    TextLineSlot,
    | 'y'
    | 'lineHeight'
    | 'inputKind'
    | 'normY'
    | 'normHeight'
    | 'page'
    | 'lineStrokeAtBottom'
    | 'index'
    | 'continuationGroup'
    | 'hasLabel'
  >,
  _fontSize: number,
  lineGuideId?: string,
  allSlots?: PregnancyWeeklyStrokeSlot[],
  fieldStartIndex?: number,
): number {
  const inputKind = slot.inputKind ?? 'line';

  if (lineGuideId === 'diary_interior_brown' || lineGuideId === 'diary_interior_purple') {
    const isBrownPeachDreamsPage =
      lineGuideId === 'diary_interior_brown' && slot.page === 15;
    if (isBrownPeachDreamsPage && inputKind === 'line') {
      return slot.y + slot.lineHeight;
    }
    const isPeachCellField =
      inputKind === 'block' &&
      slot.normY != null &&
      slot.normY >= 0.74 &&
      slot.normY <= 0.93;
    if (!isPeachCellField) {
      return slot.y + slot.lineHeight;
    }
  }

  if (
    lineGuideId === 'holidays_birthday_60' &&
    slot.page === 48 &&
    inputKind === 'line'
  ) {
    return slot.y + slot.lineHeight;
  }

  if (usesStrokeBaselineLayout(slot, lineGuideId)) {
    return slot.y + slot.lineHeight;
  }

  if (
    usesPregnancyGuideRuledTextLayout(lineGuideId, slot) &&
    inputKind === 'line' &&
    !isPregnancy60WeeklyValueSlot(lineGuideId, slot)
  ) {
    return getPregnancyWeeklyLineStrokeY(slot, allSlots, lineGuideId, fieldStartIndex);
  }

  if (lineGuideId === 'kids_48' && inputKind === 'line' && slot.lineStrokeAtBottom) {
    return slot.y + slot.lineHeight;
  }

  if (
    lineGuideId === 'pregnancy_a5' &&
    slot.page === 44 &&
    inputKind === 'line' &&
    slot.lineStrokeAtBottom
  ) {
    return slot.y + slot.lineHeight;
  }

  const { centerRatio } = resolveTemplateTextVerticalRatios(slot, lineGuideId);
  return slot.y + slot.lineHeight * centerRatio;
}

/** @deprecated Use getTemplateLineStrokeY — имя сохранено для совместимости. */
export function getTemplateLineBaselineY(
  slot: Pick<
    TextLineSlot,
    'y' | 'lineHeight' | 'inputKind' | 'normY' | 'normHeight' | 'page' | 'lineStrokeAtBottom'
  >,
  fontSize: number,
  lineGuideId?: string,
): number {
  return getTemplateLineStrokeY(slot, fontSize, lineGuideId);
}

/** Зазор между низом глифов и штрихом линии в PDF (доля fontSize) — для block-полей. */
const PDF_BLOCK_STROKE_CLEARANCE_RATIO = 0.04;

/**
 * Baseline для pdf-lib drawText в viewport px — совпадает с предпросмотром.
 */
export function getTemplateLinePdfBaselineY(
  slot: Pick<
    TextLineSlot,
    'y' | 'lineHeight' | 'inputKind' | 'normY' | 'normHeight' | 'page' | 'lineStrokeAtBottom'
  >,
  fontSize: number,
  lineGuideId?: string,
): number {
  const inputKind = slot.inputKind ?? 'line';
  const fittedSize = fitFontSizeToSlot(
    fontSize,
    slot.lineHeight,
    inputKind,
    lineGuideId,
  );

  if (usesStrokeBaselineLayout(slot, lineGuideId)) {
    const textTop = getTemplateLineTextTop(slot, fontSize, lineGuideId);
    return textTop + fittedSize * TEMPLATE_LINE_CAP_HEIGHT_RATIO;
  }

  const textTop = getTemplateLineTextTop(slot, fontSize, lineGuideId);

  if (inputKind === 'line') {
    return textTop + fittedSize * TEMPLATE_LINE_CAP_HEIGHT_RATIO;
  }

  const strokeY = getTemplateLineStrokeY(slot, fontSize, lineGuideId);
  return strokeY - fittedSize * PDF_BLOCK_STROKE_CLEARANCE_RATIO;
}

function consumeOneLineForSlot(
  text: string,
  slot: TextLineSlot,
  fontSize: number,
  lineGuideId?: string,
  fontId?: string,
  measureTextWidth?: TextWidthMeasure
): { line: string; rest: string } {
  const withoutLeading = text.replace(/^\s+/, '');
  const trailingMatch = withoutLeading.match(/(\s+)$/);
  const trailingSpaces = trailingMatch?.[1] ?? '';
  const core = trailingSpaces
    ? withoutLeading.slice(0, withoutLeading.length - trailingSpaces.length)
    : withoutLeading;

  if (!core) {
    return { line: trailingSpaces, rest: '' };
  }

  const words = core.split(/\s+/).filter(Boolean);
  let built = '';
  let wordCount = 0;

  for (const word of words) {
    const testLine = built ? `${built} ${word}` : word;
    if (textFitsInSlot(testLine, slot, fontSize, lineGuideId, fontId, measureTextWidth)) {
      built = testLine;
      wordCount += 1;
      continue;
    }

    if (built) {
      return { line: built + trailingSpaces, rest: words.slice(wordCount).join(' ') };
    }

    if (textFitsInSlot(word, slot, fontSize, lineGuideId, fontId, measureTextWidth)) {
      return { line: word + trailingSpaces, rest: words.slice(1).join(' ') };
    }

    const { line, rest: wordRest } = splitWordToFit(
      word,
      slot,
      fontSize,
      lineGuideId,
      fontId,
      measureTextWidth
    );
    const tail = [wordRest, ...words.slice(1)].filter(Boolean).join(' ');
    return { line: line + trailingSpaces, rest: tail };
  }

  return { line: built + trailingSpaces, rest: '' };
}

/** Текст после первой строки группы (хвост для merge при редактировании). */
export function getTailAfterFirstLine(params: {
  text: string;
  startSlotIndex: number;
  slots: TextLineSlot[];
  fontSize: number;
  lineGuideId?: string;
  fontId?: string;
}): string {
  const { text, startSlotIndex, slots, fontSize, lineGuideId, fontId } = params;
  const trimmed = text.replace(/^\s+/, '');
  if (!trimmed) return '';

  const startSlot = slots[startSlotIndex];
  if (!startSlot) return '';

  return consumeOneLineForSlot(trimmed, startSlot, fontSize, lineGuideId, fontId).rest;
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
  fontId?: string;
}): string {
  const { text, startSlotIndex, slots, fontSize, lineGuideId, fontId } = params;
  const trimmed = text.replace(/^\s+/, '');
  if (!trimmed) return '';

  const startSlot = slots[startSlotIndex];
  if (!startSlot) return trimmed;

  const { rest } = consumeOneLineForSlot(trimmed, startSlot, fontSize, lineGuideId, fontId);
  if (!rest) return trimmed;

  return trimmed.slice(0, trimmed.length - rest.length);
}

export function joinContinuationSegmentTexts(segments: readonly { content: string }[]): string {
  return segments.reduce((full, segment) => {
    if (!segment.content) return full;
    if (!full) return segment.content;
    if (full.endsWith(' ') || segment.content.startsWith(' ')) {
      return full + segment.content;
    }
    return `${full} ${segment.content}`;
  }, '');
}

/** Собирает полный текст после правки только первой строки. */
export function mergeFirstLineEdit(params: {
  newFirstLine: string;
  previousText: string;
  startSlotIndex: number;
  slots: TextLineSlot[];
  fontSize: number;
  lineGuideId?: string;
  fontId?: string;
}): string {
  const { newFirstLine, previousText, startSlotIndex, slots, fontSize, lineGuideId, fontId } = params;
  const { segments } = distributeTextWithinContinuationGroup({
    text: previousText,
    startSlotIndex,
    slots,
    fontSize,
    lineGuideId,
    fontId,
  });

  if (!segments.length) return newFirstLine;

  const headIndex = segments[0]?.slotIndex ?? startSlotIndex;
  const updated = segments.map((segment) =>
    segment.slotIndex === headIndex
      ? { ...segment, content: newFirstLine }
      : segment
  );

  return joinContinuationSegmentTexts(updated);
}

/** Индекс слота для TextInput: последняя строка с текстом (курсор не убегает на пустую ниже). */
export function getActiveEditSlotIndex(
  segments: { slotIndex: number; content: string }[],
  startSlotIndex: number
): number {
  let lastFilled = startSlotIndex;

  for (const segment of segments) {
    if (segment.content.length > 0) {
      lastFilled = segment.slotIndex;
    }
  }

  return lastFilled;
}

/** Собирает полный текст после правки одной строки в группе продолжений. */
export function mergeActiveLineEdit(params: {
  newLineText: string;
  previousText: string;
  editSlotIndex: number;
  startSlotIndex: number;
  slots: TextLineSlot[];
  fontSize: number;
  lineGuideId?: string;
  fontId?: string;
}): string {
  const {
    newLineText,
    previousText,
    editSlotIndex,
    startSlotIndex,
    slots,
    fontSize,
    lineGuideId,
    fontId,
  } = params;

  const { segments } = distributeTextWithinContinuationGroup({
    text: previousText,
    startSlotIndex,
    slots,
    fontSize,
    lineGuideId,
    fontId,
  });

  const updated = segments.map((segment) =>
    segment.slotIndex === editSlotIndex
      ? { ...segment, content: newLineText }
      : segment
  );

  return joinContinuationSegmentTexts(updated);
}

export function distributeTextWithinContinuationGroup(params: {
  text: string;
  startSlotIndex: number;
  slots: TextLineSlot[];
  fontSize: number;
  lineGuideId?: string;
  fontId?: string;
  measureTextWidth?: TextWidthMeasure;
  /** Сколько слотов занимает поле, начиная с startSlotIndex (не вся continuation group). */
  slotCount?: number;
}): {
  segments: { slotIndex: number; content: string }[];
  truncated: boolean;
} {
  const {
    text,
    startSlotIndex,
    slots,
    fontSize,
    lineGuideId,
    fontId,
    measureTextWidth,
    slotCount,
  } = params;
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

  let eligibleSlots = groupSlots.filter((slot) => slot.index >= startSlotIndex);
  if (slotCount != null && slotCount > 0) {
    eligibleSlots = eligibleSlots.slice(0, slotCount);
  }
  if (eligibleSlots.length === 0) {
    return { segments: [{ slotIndex: startSlotIndex, content: text }], truncated: false };
  }

  const segments: { slotIndex: number; content: string }[] = [];
  let remaining = text;
  const headIndex = eligibleSlots[0]?.index ?? startSlotIndex;

  for (const slot of eligibleSlots) {
    if (!remaining) {
      segments.push({ slotIndex: slot.index, content: '' });
      continue;
    }
    const { line, rest } = consumeOneLineForSlot(
      remaining,
      slot,
      fontSize,
      lineGuideId,
      fontId,
      measureTextWidth
    );
    const content = slot.index === headIndex ? line : line.replace(/^\s+/, '');
    segments.push({ slotIndex: slot.index, content });
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
  fontId?: string;
}): string {
  const { text, startSlotIndex, slots, fontSize, lineGuideId, fontId } = params;
  if (!text) return text;

  const { truncated } = distributeTextWithinContinuationGroup({
    text,
    startSlotIndex,
    slots,
    fontSize,
    lineGuideId,
    fontId,
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
      fontId,
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

/** Распределяет текст по слотам аннотации (многострочные поля — подряд по индексу). */
export function distributeTextForTemplateAnnotation(params: {
  text: string;
  startSlotIndex: number;
  slots: TextLineSlot[];
  fontSize: number;
  lineGuideId?: string;
  fontId?: string;
  lineCount?: number;
  measureTextWidth?: TextWidthMeasure;
}): {
  segments: { slotIndex: number; content: string }[];
  truncated: boolean;
} {
  const {
    text: rawText,
    startSlotIndex,
    slots,
    fontSize,
    lineGuideId,
    fontId,
    lineCount = 1,
    measureTextWidth,
  } = params;
  const text = normalizeTemplateMultilineText(rawText, lineCount);

  if (lineCount > 1) {
    return distributeTextWithinFieldLines({
      text,
      startSlotIndex,
      lineCount,
      slots,
      fontSize,
      lineGuideId,
      fontId,
      measureTextWidth,
    });
  }

  return distributeTextWithinContinuationGroup({
    text,
    startSlotIndex,
    slots,
    fontSize,
    lineGuideId,
    fontId,
    measureTextWidth,
    slotCount: 1,
  });
}

/** Распределяет текст по фиксированному числу строк поля (templateLineCount). */
export function distributeTextWithinFieldLines(params: {
  text: string;
  startSlotIndex: number;
  lineCount: number;
  slots: TextLineSlot[];
  fontSize: number;
  lineGuideId?: string;
  fontId?: string;
  measureTextWidth?: TextWidthMeasure;
}): {
  segments: { slotIndex: number; content: string }[];
  truncated: boolean;
} {
  const {
    text: rawText,
    startSlotIndex,
    lineCount,
    slots,
    fontSize,
    lineGuideId,
    fontId,
    measureTextWidth,
  } = params;
  const text = normalizeTemplateMultilineText(rawText, lineCount);
  const fieldSlots = slots.slice(startSlotIndex, startSlotIndex + lineCount);

  if (fieldSlots.length === 0) {
    return { segments: [], truncated: text.length > 0 };
  }

  const segments: { slotIndex: number; content: string }[] = [];
  let remaining = text;
  const headIndex = fieldSlots[0]?.index ?? startSlotIndex;

  for (const slot of fieldSlots) {
    if (!remaining) {
      segments.push({ slotIndex: slot.index, content: '' });
      continue;
    }

    const { line, rest } = consumeOneLineForSlot(
      remaining,
      slot,
      fontSize,
      lineGuideId,
      fontId,
      measureTextWidth,
    );
    const content = slot.index === headIndex ? line : line.replace(/^\s+/, '');
    segments.push({ slotIndex: slot.index, content });
    remaining = rest;
  }

  return { segments, truncated: remaining.length > 0 };
}

export function clampTextToFieldLines(params: {
  text: string;
  startSlotIndex: number;
  lineCount: number;
  slots: TextLineSlot[];
  fontSize: number;
  lineGuideId?: string;
  fontId?: string;
}): string {
  const { text: rawText, startSlotIndex, lineCount, slots, fontSize, lineGuideId, fontId } = params;
  const text = normalizeTemplateMultilineText(rawText, lineCount);
  if (!text) return text;

  const fieldSlots = slots.slice(startSlotIndex, startSlotIndex + lineCount);

  const { truncated } = distributeTextWithinFieldLines({
    text,
    startSlotIndex,
    lineCount,
    slots,
    fontSize,
    lineGuideId,
    fontId,
  });

  if (!truncated) return text;

  let lo = 0;
  let hi = text.length;
  let best = 0;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = text.slice(0, mid);
    const { truncated: stillTruncated } = distributeTextWithinFieldLines({
      text: candidate,
      startSlotIndex,
      lineCount,
      slots,
      fontSize,
      lineGuideId,
      fontId,
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
