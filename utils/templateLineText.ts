import {
  DIARY_LINE_FONT_OFFSET,
  DIARY_DREAMS_LINE_FONT_OFFSET,
  getTemplateTypographyProfile,
  KIDS48_TEETH_TOOTH_DATE_FONT_SIZE,
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
import { getAlbumFontCharWidthMultiplier, getAlbumFontPreviewCapHeightRatio, PDF_TEXT_CAP_HEIGHT_RATIO } from '@/constants/album-fonts';
import { LINE_GUIDES } from '@/constants/line-guides';
import type { TextLineSlot } from '@/utils/textLineSlots';
import { isKids48TeethToothDateSlot } from '@/utils/kids48TeethDates';
import {
  isPregnancy60GuideRuledLineSlot,
  isPregnancy60WeeklyValueSlot,
  isPregnancyWeeklyStructuredPage,
  isPregnancyWeeklyTextLineSlot,
} from '@/utils/textLineSlots';
import { EDITOR_PAGE_VIEWPORT_WIDTH } from '@/utils/responsive';

/**
 * Масштаб кегля относительно эталона редактора (390dp).
 * Слоты в px растут с шириной страницы; без scale 16px на узком/широком
 * экране выглядит разным относительно линий. Clamp — старые 320dp…новые ~430dp.
 */
export function getTemplatePageFontScale(
  slot?: Pick<TextLineSlot, 'width' | 'normWidth'> | null,
): number {
  const normW = slot?.normWidth;
  if (!slot || normW == null || normW <= 0.001 || !(slot.width > 0)) return 1;
  const contentWidth = slot.width / normW;
  if (!(contentWidth > 0) || !Number.isFinite(contentWidth)) return 1;
  const scale = contentWidth / EDITOR_PAGE_VIEWPORT_WIDTH;
  return Math.min(1.18, Math.max(0.85, scale));
}

function scaleTemplateFontSize(
  fontSize: number,
  slot?: Pick<TextLineSlot, 'width' | 'normWidth'> | null,
): number {
  return Math.max(8, Math.round(fontSize * getTemplatePageFontScale(slot)));
}

/**
 * Канонический кегль для хранения в annotation (без page-scale).
 * Scale применяется только при рендере/экспорте — иначе на другом телефоне
 * migrate/viewport умножает уже масштабированный размер.
 */
export function getCanonicalAlbumLineFontSize(
  lineGuideId?: string,
  annotationFontSize?: number | null,
): number {
  const fontGuideId =
    lineGuideId === 'pregnancy_60' ? 'pregnancy_a5' : lineGuideId;
  const profile = getTemplateTypographyProfile(fontGuideId);
  if (profile.fixedLineFontSize != null) {
    return profile.fixedLineFontSize;
  }
  if (annotationFontSize != null && Number.isFinite(annotationFontSize) && annotationFontSize > 0) {
    return annotationFontSize;
  }
  return 16;
}

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

type WrapWidthSlot = Pick<
  TextLineSlot,
  'width' | 'continuationGroup' | 'hasLabel' | 'inputKind' | 'page' | 'index' | 'textAnchorTop'
>;

/** «История родов» — полноширинные строки (только A5 p45). */
function isPregnancyBirthStoryPage(lineGuideId?: string, page?: number): boolean {
  if (page == null || !lineGuideId) return false;
  return lineGuideId === 'pregnancy_a5' && page === 45;
}

function getEffectiveCharWidthRatio(
  lineGuideId?: string,
  fontId?: string,
  slot?: WrapWidthSlot,
): number {
  const profile = getTemplateTypographyProfile(lineGuideId);
  let ratio = profile.charWidthRatio * getAlbumFontCharWidthMultiplier(fontId);
  if (
    slot &&
    lineGuideId &&
    usesPregnancyGuideRuledTextLayout(lineGuideId, slot) &&
    !isPregnancy60WeeklyValueSlot(lineGuideId, slot) &&
    (slot.inputKind ?? 'line') === 'line'
  ) {
    // Рукописные шрифты в RN уже уже; weekly «Планы» — плотнее (ранний wrap на labeled head).
    ratio *= isPregnancyWeeklyTextLineSlot(lineGuideId, slot) ? 0.78 : 0.88;
  } else if (
    lineGuideId === 'kids_48' &&
    slot &&
    (slot.inputKind ?? 'line') === 'line'
  ) {
    // То же для kids_48: иначе «ДД.ММ.ГГГГ» обрезается до 9 символов на узком viewport.
    ratio *= 0.88;
  } else if (
    slot?.page != null &&
    isPregnancyBirthStoryPage(lineGuideId, slot.page) &&
    (slot.inputKind ?? 'line') === 'line'
  ) {
    ratio *= 0.88;
  } else if (slot && isBrownCareerAnswerSlot(slot, lineGuideId)) {
    // Две строки ответа «Кем я хочу стать» — чуть плотнее, чтобы уложиться в 54 символа.
    ratio *= 0.82;
  }
  return ratio;
}

/** Ширина для переноса: на ruled-строках pregnancy берём максимум группы (OCR-слоты уже линии). */
function getWrapWidthForSlot(
  slot: WrapWidthSlot,
  lineGuideId?: string,
  allSlots?: readonly TextLineSlot[],
): number {
  const profile = getTemplateTypographyProfile(lineGuideId);
  let width = slot.width;

  if (isPregnancyBirthQuestionnaireNarrowTailLineSlot(lineGuideId, slot)) {
    return width * 0.86;
  }

  if (
    slot.page != null &&
    isPregnancyBirthStoryPage(lineGuideId, slot.page) &&
    (slot.inputKind ?? 'line') === 'line'
  ) {
    return width * Math.min(1.06, profile.lineWidthSlackRatio + 0.06);
  }

  if (
    lineGuideId &&
    usesPregnancyGuideRuledTextLayout(lineGuideId, slot) &&
    !isPregnancy60WeeklyValueSlot(lineGuideId, slot) &&
    (slot.inputKind ?? 'line') === 'line'
  ) {
    if (allSlots && allSlots.length > 0) {
      const groupId = slot.continuationGroup;
      const groupLineWidths = allSlots
        .filter(
          (candidate) =>
            candidate.continuationGroup === groupId &&
            !candidate.hasLabel &&
            (candidate.inputKind ?? 'line') === 'line',
        )
        .map((candidate) => candidate.width);
      if (groupLineWidths.length > 0) {
        width = Math.max(width, ...groupLineWidths);
      }
    }
    // Weekly plans: чуть шире usable wrap, чтобы слово не переносилось «раньше края».
    const slackBoost = isPregnancyWeeklyTextLineSlot(lineGuideId, slot) ? 0.1 : 0.06;
    return width * Math.min(1.1, profile.lineWidthSlackRatio + slackBoost);
  }

  return width * profile.lineWidthSlackRatio;
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
  measureTextWidth?: TextWidthMeasure,
  slot?: WrapWidthSlot,
): number {
  if (measureTextWidth) {
    return measureTextWidth(text, fittedFontSize);
  }
  return estimateTextWidth(
    text,
    fittedFontSize,
    getEffectiveCharWidthRatio(lineGuideId, fontId, slot),
  );
}

export function textFitsInSlot(
  text: string,
  slot: TextLineSlot,
  fontSize: number,
  lineGuideId?: string,
  fontId?: string,
  measureTextWidth?: TextWidthMeasure,
  allSlots?: readonly TextLineSlot[],
): boolean {
  if (!text) return true;
  const fitted = fitFontSizeToSlot(
    fontSize,
    slot.lineHeight,
    slot.inputKind,
    lineGuideId,
    slot,
  );
  return (
    measureTextLineWidth(text, fitted, lineGuideId, fontId, measureTextWidth, slot) <=
    getWrapWidthForSlot(slot, lineGuideId, allSlots)
  );
}

function splitWordToFit(
  word: string,
  slot: TextLineSlot,
  fontSize: number,
  lineGuideId?: string,
  fontId?: string,
  measureTextWidth?: TextWidthMeasure,
  allSlots?: readonly TextLineSlot[],
): { line: string; rest: string } {
  const fitted = fitFontSizeToSlot(
    fontSize,
    slot.lineHeight,
    slot.inputKind,
    lineGuideId,
    slot,
  );
  const charWidthRatio = getEffectiveCharWidthRatio(lineGuideId, fontId, slot);

  let line = '';
  for (const ch of word) {
    const candidate = line + ch;
    const width = measureTextWidth
      ? measureTextWidth(candidate, fitted)
      : estimateTextWidth(candidate, fitted, charWidthRatio);
    if (width <= getWrapWidthForSlot(slot, lineGuideId, allSlots)) {
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
  if (
    text &&
    isKids48TeethToothDateSlot(lineGuideId ?? '', slot.page, slot.index)
  ) {
    return text;
  }
  // Семейное дерево: лимит 7 символов — не режем display по узкой оценке ширины.
  if (text && lineGuideId === 'kids_48' && slot.page === 5) {
    return text;
  }

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

/** pregnancy_60 — размер шрифта значений как в pregnancy_a5 (48 стр.). */
function getPregnancyValueFontGuideId(lineGuideId?: string): string | undefined {
  return lineGuideId === 'pregnancy_60' ? 'pregnancy_a5' : lineGuideId;
}

export function fitFontSizeToSlot(
  fontSize: number,
  lineHeight: number,
  inputKind: 'line' | 'block' = 'line',
  lineGuideId?: string,
  slotForScale?: Pick<TextLineSlot, 'width' | 'normWidth'> | null,
): number {
  const fontGuideId = getPregnancyValueFontGuideId(lineGuideId);
  const profile = getTemplateTypographyProfile(fontGuideId);

  if (isDiaryInteriorLineGuide(lineGuideId) && profile.fixedLineFontSize != null) {
    return scaleTemplateFontSize(profile.fixedLineFontSize, slotForScale);
  }

  // Альбом 60 стр.: LINE — тот же fixed 16px, что и a5; BLOCK (ячейки анкеты) — по высоте.
  if (lineGuideId === 'pregnancy_60' && inputKind === 'line') {
    const p60Profile = getTemplateTypographyProfile('pregnancy_60');
    if (p60Profile.fixedLineFontSize != null) {
      return scaleTemplateFontSize(p60Profile.fixedLineFontSize, slotForScale);
    }
  }

  // Birthday (iOS e24a739): A+/A− меняют размер; не зажимать по lineHeight слота.
  if (lineGuideId === 'holidays_birthday_60' && Number.isFinite(fontSize)) {
    return Math.min(Math.max(fontSize, 10), 28);
  }

  if (inputKind === 'block') {
    const minFromHeight = lineHeight * 0.78;
    const minFontSize = lineHeight < 16 ? 8 : 11;
    const blockCap =
      (lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5') && lineHeight < 22
        ? Math.min(profile.blockMaxFontSize, lineHeight * 0.88)
        : profile.blockMaxFontSize;
    return Math.min(
      fontSize,
      Math.max(minFontSize, minFromHeight),
      blockCap,
    );
  }

  // Fixed-альбомы (kids / pregnancy_a5): эталон × scale страницы.
  // Не Math.min(fontSize, scaled) — иначе на широких телефонах кегль не растёт.
  if (profile.fixedLineFontSize != null) {
    return scaleTemplateFontSize(profile.fixedLineFontSize, slotForScale);
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

function resolveUniformStrokeFontOffset(
  _fontId?: string,
  _lineGuideId?: string,
): number {
  // Фиксированный offset (без cap шрифта): при смене Amatic→Nefelibata зазор
  // text→линия не «съезжает». Cap учитывается только в PDF baseline / Dreams.
  return DIARY_LINE_FONT_OFFSET + TEMPLATE_LINE_STROKE_CLEARANCE_RATIO;
}

/** «Мечты»: baseline на белом штрихе = previewCap шрифта (без CLEARANCE). */
function resolveDiaryOnStrokeFontOffset(fontId?: string): number {
  return Math.max(
    DIARY_DREAMS_LINE_FONT_OFFSET,
    getAlbumFontPreviewCapHeightRatio(fontId),
  );
}

export function isPregnancyBirthQuestionnairePage(
  lineGuideId: string | undefined,
  page: number | undefined,
): boolean {
  if (page == null || !lineGuideId) return false;
  return (
    (lineGuideId === 'pregnancy_60' && page === 52) ||
    (lineGuideId === 'pregnancy_a5' && page === 44)
  );
}

function getStrokeBaselineFontOffset(
  fontId?: string,
  lineGuideId?: string,
): number {
  return resolveUniformStrokeFontOffset(fontId, lineGuideId);
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

/** Baseline прямо на штрихе линии — kids_48, pregnancy A5 p44, дневники, birthday letter. */
export function usesStrokeBaselineLayout(
  slot: Pick<
    TextLineSlot,
    'lineStrokeAtBottom' | 'page' | 'normY' | 'hasLabel' | 'inputKind' | 'index' | 'textAnchorTop'
  >,
  lineGuideId?: string,
): boolean {
  if (isPregnancyWeeklyTextLineSlot(lineGuideId, slot)) return true;
  // Праздники: все LINE-слоты (письмо p48 и пр.) — как на iOS e24a739.
  if (lineGuideId === 'holidays_birthday_60') {
    return (slot.inputKind ?? 'line') === 'line';
  }
  // Анкета родов: LINE всегда к штриху (иначе высокий OCR-бокс → текст «висит» над линией).
  if (
    (slot.inputKind ?? 'line') === 'line' &&
    ((lineGuideId === 'pregnancy_a5' && slot.page === 44) ||
      (lineGuideId === 'pregnancy_60' && slot.page === 52))
  ) {
    return true;
  }
  if (!Boolean(slot.lineStrokeAtBottom)) return false;
  if (lineGuideId === 'kids_48') return true;
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
  slot: Pick<TextLineSlot, 'lineHeight' | 'inputKind' | 'width' | 'normWidth'> | undefined,
  annotationFontSize = 16
): number {
  return fitFontSizeToSlot(
    annotationFontSize,
    slot?.lineHeight ?? 24,
    slot?.inputKind ?? 'line',
    lineGuideId,
    slot,
  );
}

export function getTemplateLineTypography(
  fontSize: number,
  lineHeight: number,
  inputKind: 'line' | 'block' = 'line',
  lineGuideId?: string,
  slotForScale?: Pick<TextLineSlot, 'width' | 'normWidth'> | null,
) {
  const fittedSize = fitFontSizeToSlot(fontSize, lineHeight, inputKind, lineGuideId, slotForScale);
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

  const isCompactBirthFormBlock =
    inputKind === 'block' &&
    lineHeight < 20 &&
    (lineGuideId === 'pregnancy_a5' || lineGuideId === 'pregnancy_60');

  const lineTextLineHeight =
    isBirthdayLetterLine || isKidsMonthAnswerLine || isDiaryStrokeAnswerLine || isPregnancyWeeklyLine
      ? fittedSize
      : isCompactBirthFormBlock
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
    return { centerRatio: 0.58, fontOffsetRatio: DIARY_LINE_FONT_OFFSET };
  }

  if (template === DIARY_BROWN_SCHOOL_LIFE_TEMPLATE) {
    const isLabelTail = (slot.x ?? 0) >= 0.5 && (slot.width ?? 0) <= 0.4;
    if (isLabelTail) {
      return { centerRatio: 0.5, fontOffsetRatio: DIARY_LINE_FONT_OFFSET };
    }
    return { centerRatio: 0.56, fontOffsetRatio: DIARY_LINE_FONT_OFFSET };
  }

  if (template === DIARY_BROWN_MY_DAY_TEMPLATE) {
    return { centerRatio: 0.56, fontOffsetRatio: DIARY_LINE_FONT_OFFSET };
  }

  if (template === 'MoodTemplate' || template === 'TravelTemplate') {
    return { centerRatio: 1, fontOffsetRatio: DIARY_LINE_FONT_OFFSET };
  }

  if (DIARY_BROWN_WEEKLY_SCHEDULE_TEMPLATES.has(template)) {
    return { centerRatio: 0.5, fontOffsetRatio: DIARY_LINE_FONT_OFFSET };
  }

  if (DIARY_BROWN_QUESTIONNAIRE_TEMPLATES.has(template)) {
    const isWide = (slot.width ?? 0) >= 0.62;
    return {
      centerRatio: isWide ? 0.52 : 0.5,
      fontOffsetRatio: DIARY_LINE_FONT_OFFSET,
    };
  }

  return { centerRatio: 1, fontOffsetRatio: DIARY_LINE_FONT_OFFSET };
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
      return { centerRatio: 0.58, fontOffsetRatio: DIARY_LINE_FONT_OFFSET };
    }

    if (lineGuideId === 'diary_interior_brown') {
      const brownBlock = resolveDiaryBrownBlockRatios(slot);
      if (brownBlock) {
        return brownBlock;
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
      return { centerRatio: 0.5, fontOffsetRatio: DIARY_LINE_FONT_OFFSET };
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

      return {
        centerRatio: isBrownCoverField || isPurpleCoverField ? 0.44 : 1,
        fontOffsetRatio: DIARY_LINE_FONT_OFFSET,
      };
    }

    return {
      centerRatio: profile.lineCenterRatio,
      fontOffsetRatio: profile.lineFontOffsetRatio,
    };
  }

  if (lineGuideId === 'holidays_birthday_60') {
    // Как на iOS (e24a739): единый вертикальный центр во всех белых pill.
    return { centerRatio: 0.5, fontOffsetRatio: 0.55 };
  }

  if (
    (lineGuideId === 'pregnancy_60' && slot.page === 52 && inputKind === 'block') ||
    (lineGuideId === 'pregnancy_a5' && slot.page === 44 && inputKind === 'block')
  ) {
    return { centerRatio: 0.5, fontOffsetRatio: DIARY_LINE_FONT_OFFSET };
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

/** Розовые ячейки анкеты родов — вес / рост / день / время / Ер·Кс. */
function isPregnancyBirthQuestionnairePinkBlockSlot(
  lineGuideId: string | undefined,
  slot: Pick<TextLineSlot, 'page' | 'inputKind' | 'normHeight' | 'index'>,
): boolean {
  if ((slot.inputKind ?? 'line') !== 'block') return false;
  const isBirthPage =
    (lineGuideId === 'pregnancy_60' && slot.page === 52) ||
    (lineGuideId === 'pregnancy_a5' && slot.page === 44);
  if (!isBirthPage) return false;
  if (slot.index != null && slot.index >= 8 && slot.index <= 12) return true;
  return (slot.normHeight ?? 0) <= 0.032;
}

export function isPregnancyBirthQuestionnaireCenteredBlockSlot(
  lineGuideId: string | undefined,
  slot: Pick<TextLineSlot, 'page' | 'inputKind' | 'normHeight' | 'index'>,
): boolean {
  return isPregnancyBirthQuestionnairePinkBlockSlot(lineGuideId, slot);
}

/** Free-страницы birthday с подписями под фото (нечётные 3…39). */
function isBirthdayFreeCaptionPage(page: number): boolean {
  if (page === 3 || page === 5) return true;
  if (page >= 7 && page <= 39 && page % 2 === 1) return true;
  return false;
}

/**
 * Выравнивание текста в слоте макета.
 * Birthday (iOS e24a739): узкие pill (дата/вес/рост) — center; широкие и free-captions — left.
 */
export function resolveTemplateSlotTextAlign(
  lineGuideId: string | undefined,
  slot: Pick<TextLineSlot, 'inputKind' | 'page' | 'normWidth' | 'normHeight' | 'index'>,
  fallback: 'left' | 'center' | 'right' = 'left',
): 'left' | 'center' | 'right' {
  if (isPregnancyBirthQuestionnaireCenteredBlockSlot(lineGuideId, slot)) {
    return 'center';
  }
  if (lineGuideId === 'holidays_birthday_60') {
    if ((slot.inputKind ?? 'line') !== 'block') return 'left';
    if (typeof slot.page === 'number' && isBirthdayFreeCaptionPage(slot.page)) {
      return 'left';
    }
    const normW = slot.normWidth ?? 0;
    if (normW >= 0.35) return 'left';
    return 'center';
  }
  return fallback;
}

/** Розовые ячейки анкеты родов — без nudge; центрирование через symmetric insets + textAlign. */
function getPregnancyBirthQuestionnaireBlockTextNudge(
  _lineGuideId: string | undefined,
  _slot: Pick<TextLineSlot, 'page' | 'index' | 'inputKind'>,
): { leftWidthRatio: number; upLineHeightRatio: number } | null {
  return null;
}

function getPregnancyBirthQuestionnaireBlockTextTop(
  slot: Pick<TextLineSlot, 'y' | 'lineHeight' | 'page' | 'index' | 'inputKind'>,
  fontSize: number,
  _lineGuideId?: string,
  _capRatio = TEMPLATE_LINE_CAP_HEIGHT_RATIO,
): number {
  // Тот же lineHeight, что в read-only layout — идеальный вертикальный центр.
  const textLineHeight = Math.ceil(fontSize * 1.15);
  return slot.y + Math.max(0, (slot.lineHeight - textLineHeight) / 2);
}

/** @deprecated alias */
function getPregnancy60Page52BlockTextNudge(
  lineGuideId: string | undefined,
  slot: Pick<TextLineSlot, 'page' | 'index' | 'inputKind'>,
): { leftWidthRatio: number; upLineHeightRatio: number } | null {
  return getPregnancyBirthQuestionnaireBlockTextNudge(lineGuideId, slot);
}

/** «Обо мне» — первая строка «Когда я поняла, что хочу ребенка» (слот 12): отступ после длинной подписи. */
const PREGNANCY_ABOUT_ME_WANT_CHILD_HEAD_LEFT_WIDTH_RATIOS: Readonly<
  Partial<Record<string, number>>
> = {
  pregnancy_60: 0.07,
  pregnancy_a5: 0.09,
};

function isPregnancyAboutMeWantChildHeadSlot(
  lineGuideId: string | undefined,
  slot: Pick<TextLineSlot, 'page' | 'index' | 'hasLabel'>,
): boolean {
  if (!lineGuideId || slot.index !== 12 || !slot.hasLabel) return false;
  return (
    (lineGuideId === 'pregnancy_60' && slot.page === 2) ||
    (lineGuideId === 'pregnancy_a5' && slot.page === 3)
  );
}

export function getTemplateBlockTextInsets(
  slot: Pick<TextLineSlot, 'inputKind' | 'width' | 'page' | 'hasLabel' | 'index'>,
  lineGuideId?: string,
): { left: number; width: number } {
  if (lineGuideId === 'holidays_birthday_60' && slot.inputKind === 'block') {
    // Как на iOS (e24a739): pad 6% — текст не липнет к краю pill и не уезжает.
    const pad = slot.width * 0.06;
    return { left: pad, width: Math.max(0, slot.width - pad * 2) };
  }
  if (
    ((lineGuideId === 'pregnancy_60' && slot.page === 52) ||
      (lineGuideId === 'pregnancy_a5' && slot.page === 44)) &&
    slot.inputKind === 'block'
  ) {
    // Розовые ячейки вес/рост/день/время/Ер·Кс — симметричный pad для H-центра.
    if (isPregnancyBirthQuestionnairePinkBlockSlot(lineGuideId, slot)) {
      const pad = slot.width * 0.06;
      return { left: pad, width: Math.max(0, slot.width - pad * 2) };
    }
    const pad = slot.width * (slot.width <= 0.15 ? 0.04 : 0.03);
    return { left: pad, width: Math.max(0, slot.width - pad * 2) };
  }
  if (isPregnancyAboutMeWantChildHeadSlot(lineGuideId, slot)) {
    const ratio = PREGNANCY_ABOUT_ME_WANT_CHILD_HEAD_LEFT_WIDTH_RATIOS[lineGuideId] ?? 0.28;
    const pad = slot.width * ratio;
    return { left: pad, width: Math.max(0, slot.width - pad) };
  }
  return { left: 0, width: slot.width };
}

/** Высота заглавных глифов от top до baseline (RN ≈ PDF для sans). */
const TEMPLATE_LINE_CAP_HEIGHT_RATIO = 0.85;

/** Узкий хвост после длинной подписи — отключён, короткие поля всегда 16px. */

export function isPregnancyBirthQuestionnaireNarrowTailLineSlot(
  _lineGuideId: string | undefined,
  _slot: Pick<TextLineSlot, 'page' | 'inputKind' | 'hasLabel' | 'index' | 'normWidth'>,
): boolean {
  // Узкие числовые поля (вес, срок) и дата поступления (ДД.ММ) — всегда полный шрифт 16px.
  return false;
}

/**
 * Уменьшает fontSize, пока оценка ширины текста не влезет в слот.
 * Важно: измеряет именно candidate size, без повторного fitFontSizeToSlot
 * (иначе fixedLineFontSize альбома «прибивает» размер и сжатие не работает).
 */
export function shrinkFontSizeToFitSlot(
  fontSize: number,
  slot: TextLineSlot,
  textContent: string,
  lineGuideId?: string,
  fontId?: string,
  minFontSize = 9,
): number {
  if (!textContent || slot.width <= 0) return fontSize;
  const wrapWidth = getWrapWidthForSlot(slot, lineGuideId);
  let fs = Math.floor(fontSize);
  while (
    fs > minFontSize &&
    measureTextLineWidth(textContent, fs, lineGuideId, fontId, undefined, slot) > wrapWidth
  ) {
    fs -= 1;
  }
  if (isPregnancyBirthQuestionnaireNarrowTailLineSlot(lineGuideId, slot)) {
    while (
      fs > minFontSize &&
      measureTextLineWidth(textContent, fs - 1, lineGuideId, fontId, undefined, slot) <= wrapWidth
    ) {
      fs -= 1;
    }
  }
  return fs;
}

/**
 * Итоговый размер значения в слоте: профиль альбома → спец. слоты → высота.
 * Для pregnancy/kids/diary line — фиксированный кегль (как iOS); сжатие только
 * у узких спец-полей. При смене шрифта размер не уменьшается — текст переносится
 * на следующие слоты группы.
 */
export function resolveTemplateLineFontSizeForText(params: {
  fontSize: number;
  slot: Pick<
    TextLineSlot,
    | 'width'
    | 'lineHeight'
    | 'inputKind'
    | 'page'
    | 'index'
    | 'hasLabel'
    | 'continuationGroup'
    | 'normHeight'
    | 'normY'
    | 'textAnchorTop'
  >;
  lineGuideId?: string;
  fontId?: string;
  textContent?: string;
}): number {
  const { fontSize, slot, lineGuideId, fontId, textContent } = params;
  const inputKind = getWishSlotInputKind(slot, lineGuideId);
  let size = getTemplateLineTypography(
    fontSize,
    slot.lineHeight,
    inputKind,
    lineGuideId,
    slot,
  ).fontSize;

  if (
    lineGuideId &&
    isKids48TeethToothDateSlot(lineGuideId, slot.page, slot.index)
  ) {
    size = Math.min(size, scaleTemplateFontSize(KIDS48_TEETH_TOOTH_DATE_FONT_SIZE, slot));
  }

  const isWeeklyWeightBelly = isPregnancy60WeeklyValueSlot(lineGuideId, slot);
  const isTeethToothDate =
    !!lineGuideId && isKids48TeethToothDateSlot(lineGuideId, slot.page, slot.index);
  const isPinkBirthBlock = isPregnancyBirthQuestionnairePinkBlockSlot(lineGuideId, slot);
  const profile = getTemplateTypographyProfile(
    lineGuideId === 'pregnancy_60' ? 'pregnancy_a5' : lineGuideId,
  );
  const keepFixedAlbumLineSize =
    (profile.fixedLineFontSize != null &&
      inputKind === 'line' &&
      !isTeethToothDate &&
      !isWeeklyWeightBelly) ||
    // Birthday (iOS): не сжимать pill/caption по высоте слота — иначе текст «выпрыгивает».
    lineGuideId === 'holidays_birthday_60';

  // Не режем единый размер альбома по высоте слота — иначе на разных страницах
  // (и телефонах с разным viewport) буквы получаются разной величины.
  if (!keepFixedAlbumLineSize) {
    const heightCapRatio = isWeeklyWeightBelly ? 0.82 : isPinkBirthBlock ? 0.88 : 0.9;
    const heightCap = Math.max(8, Math.floor(slot.lineHeight * heightCapRatio));
    size = Math.min(size, heightCap);
  }

  if (textContent && slot.width > 0) {
    const insets = getTemplateBlockTextInsets(slot, lineGuideId);
    const fitWidth = insets.width > 0 ? insets.width : slot.width;
    const slotForFit = { ...slot, width: fitWidth } as TextLineSlot;

    // Как на iOS (e24a739): обычные line-слоты pregnancy/kids/diary — фиксированный
    // кегль без сжатия по ширине (иначе соседние строки визуально разного размера).
    // Длинный текст уходит на следующие слоты группы; сжимаем только узкие спец-поля.
    if (isTeethToothDate || isPinkBirthBlock) {
      size = shrinkFontSizeToFitSlot(
        size,
        slotForFit,
        textContent,
        lineGuideId,
        fontId,
        isTeethToothDate ? 8 : 9,
      );
    } else if (!keepFixedAlbumLineSize) {
      size = shrinkFontSizeToFitSlot(
        size,
        slotForFit,
        textContent,
        lineGuideId,
        fontId,
        9,
      );
    }
  }

  return size;
}

/** @deprecated alias — используйте shrinkFontSizeToFitSlot */
export function shrinkFontSizeToFitNormalizedSlotWidth(
  fontSize: number,
  slotWidth: number,
  textContent: string,
  lineGuideId?: string,
  minFontSize = 9,
): number {
  return shrinkFontSizeToFitSlot(
    fontSize,
    { width: slotWidth, lineHeight: 24, index: 0, page: 0, y: 0, x: 0, hasLabel: true, continuationGroup: 0 },
    textContent,
    lineGuideId,
    undefined,
    minFontSize,
  );
}

export type TemplateLineReadOnlyLayout = {
  containerTop: number;
  containerHeight: number;
  textTop: number;
  textLineHeight: number;
  fontSize: number;
  overflow: 'visible' | 'hidden';
};

/**
 * Единый layout строки макета для read-only превью (PageRenderer / PdfAnnotations display).
 * Baseline совпадает с PDF-экспортом (getTemplateLinePdfBaselineY).
 *
 * Покрывает все альбомы со строками макета (TEMPLATE_LINE_GUIDE_IDS):
 * pregnancy_60, pregnancy_a5, kids_48, holidays_birthday_60,
 * diary_interior_brown, diary_interior_purple — все страницы через LINE_SLOTS.
 */
function isPregnancy60Page52PinkBlockSlot(
  lineGuideId: string | undefined,
  slot: Pick<TextLineSlot, 'page' | 'inputKind' | 'normHeight' | 'index'>,
): boolean {
  return isPregnancyBirthQuestionnairePinkBlockSlot(lineGuideId, slot);
}

function getPregnancy60Page52BlockTextTop(
  slot: Pick<TextLineSlot, 'y' | 'lineHeight' | 'page' | 'index' | 'inputKind'>,
  fontSize: number,
  lineGuideId?: string,
  capRatio = TEMPLATE_LINE_CAP_HEIGHT_RATIO,
): number {
  return getPregnancyBirthQuestionnaireBlockTextTop(slot, fontSize, lineGuideId, capRatio);
}

export function getTemplateLineReadOnlyTextLayout(params: {
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
    | 'width'
  >;
  fontSize: number;
  lineGuideId?: string;
  fontId?: string;
  allSlots?: PregnancyWeeklyStrokeSlot[];
  fieldStartIndex?: number;
  textContent?: string;
}): TemplateLineReadOnlyLayout {
  const { slot, fontSize, lineGuideId, fontId, allSlots, fieldStartIndex, textContent } = params;
  const wishInputKind = getWishSlotInputKind(slot, lineGuideId);
  // fontSize здесь — канонический (без page-scale); scale внутри resolve/fit.
  const resolvedFontSize = resolveTemplateLineFontSizeForText({
    fontSize,
    slot,
    lineGuideId,
    fontId,
    textContent,
  });
  const typography = getTemplateLineTypography(
    resolvedFontSize,
    slot.lineHeight,
    wishInputKind,
    lineGuideId,
    slot,
  );
  const usesStrokeBaseline =
    usesStrokeBaselineLayout(slot, lineGuideId) ||
    usesPregnancyGuideRuledTextLayout(lineGuideId, slot);
  // Чуть выше em-box: иначе Amatic/Nefelibata обрезают низ цифр при lineHeight === fontSize.
  const textLineHeight = usesStrokeBaseline
    ? Math.ceil(resolvedFontSize * 1.18)
    : typography.lineHeight;
  const capRatio = getAlbumFontPreviewCapHeightRatio(fontId);

  if (isPregnancyBirthQuestionnairePinkBlockSlot(lineGuideId, slot)) {
    // Оба альбома: шрифт не выше ~88% высоты ячейки — иначе Amatic обрезается снизу.
    const cappedFont = Math.min(resolvedFontSize, slot.lineHeight * 0.88);
    const textTop = getPregnancyBirthQuestionnaireBlockTextTop(
      slot,
      cappedFont,
      lineGuideId,
      capRatio,
    );
    return {
      containerTop: slot.y,
      containerHeight: slot.lineHeight,
      textTop: textTop - slot.y,
      textLineHeight: Math.ceil(cappedFont * 1.15),
      fontSize: cappedFont,
      overflow: 'hidden',
    };
  }

  // Недельные «Вес» / «Обхват животика» — розовый блок справа.
  // Контейнер = вся полоса слота; lineHeight с запасом — иначе Amatic клипает верх/низ цифр.
  if (isPregnancy60WeeklyValueSlot(lineGuideId, slot)) {
    const safeFont = Math.min(resolvedFontSize, Math.max(10, slot.lineHeight * 0.78));
    const textLineHeight = Math.ceil(safeFont * 1.22);
    const textTop = Math.max(0, (slot.lineHeight - textLineHeight) / 2);
    return {
      containerTop: slot.y,
      containerHeight: Math.max(slot.lineHeight, textLineHeight),
      textTop,
      textLineHeight,
      fontSize: safeFont,
      overflow: 'visible',
    };
  }

  // Позицию считаем по фактическому (уже сжатому) размеру — иначе текст «висит» над линией.
  const textTopAbsolute = getTemplateLineTextTop(
    slot,
    resolvedFontSize,
    lineGuideId,
    allSlots,
    fieldStartIndex,
    fontId,
  );

  return {
    containerTop: textTopAbsolute,
    containerHeight: textLineHeight,
    textTop: 0,
    textLineHeight,
    fontSize: resolvedFontSize,
    overflow: usesStrokeBaseline ? 'visible' : 'hidden',
  };
}

/** Viewport-координаты drawText в PDF — те же, что read-only превью (PageRenderer). */
export function getTemplateLinePdfDrawLayout(params: {
  slot: Pick<
    TextLineSlot,
    | 'x'
    | 'y'
    | 'width'
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
  >;
  fontSize: number;
  lineGuideId?: string;
  fontId?: string;
  allSlots?: PregnancyWeeklyStrokeSlot[];
  fieldStartIndex?: number;
  textContent?: string;
}): {
  x: number;
  width: number;
  baselineY: number;
  fontSize: number;
} {
  const { slot, fontSize, lineGuideId, fontId, allSlots, fieldStartIndex, textContent } = params;
  const layout = getTemplateLineReadOnlyTextLayout({
    slot,
    fontSize,
    lineGuideId,
    fontId,
    allSlots,
    fieldStartIndex,
    textContent,
  });
  const insets = getTemplateBlockTextInsets(slot, lineGuideId);
  // PDF drawText всегда с cap 0.85 — как fixed RN offset (UNIFORM + CLEARANCE).
  return {
    x: slot.x + insets.left,
    width: insets.width,
    baselineY: layout.containerTop + layout.textTop + layout.fontSize * PDF_TEXT_CAP_HEIGHT_RATIO,
    fontSize: layout.fontSize,
  };
}

/** Слот для переноса/обрезки — с учётом горизонтальных inset'ов блока. */
export function getTemplateLineFitSlot(
  slot: Pick<TextLineSlot, 'x' | 'width' | 'inputKind' | 'page' | 'hasLabel' | 'index'>,
  lineGuideId?: string,
): Pick<TextLineSlot, 'x' | 'width'> {
  const insets = getTemplateBlockTextInsets(slot, lineGuideId);
  if (insets.left === 0 && insets.width === slot.width) {
    return slot;
  }
  return { ...slot, width: insets.width };
}

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
  fontId?: string,
): number {
  if (isPregnancy60WeeklyValueSlot(lineGuideId, slot)) {
    const inputKind = slot.inputKind ?? 'block';
    const fittedSize = Math.min(
      fontSize,
      fitFontSizeToSlot(fontSize, slot.lineHeight, inputKind, lineGuideId, slot),
    );
    // Вертикальный центр в розовой ячейке (с запасом под Amatic), без клипа верха цифр.
    const textLineHeight = Math.ceil(fittedSize * 1.22);
    return slot.y + Math.max(0, (slot.lineHeight - textLineHeight) / 2);
  }

  const inputKind = slot.inputKind ?? 'line';
  // fontSize уже может быть после resolveTemplateLineFontSizeForText — не поднимаем обратно
  // через diary fixedLineFontSize (иначе сжатый текст снова позиционируется как 16px).
  const fittedFromProfile = getTemplateLineTypography(
    fontSize,
    slot.lineHeight,
    inputKind,
    lineGuideId,
    slot,
  ).fontSize;
  const fittedSize = Math.min(fontSize, fittedFromProfile);
  const strokeFontOffset = resolveUniformStrokeFontOffset(fontId, lineGuideId);
  let top: number;

  if (isPregnancyBirthQuestionnairePinkBlockSlot(lineGuideId, slot)) {
    return getPregnancyBirthQuestionnaireBlockTextTop(slot, fittedSize, lineGuideId);
  }

  if (lineGuideId === 'diary_interior_brown' && slot.page === 15) {
    // «Мечты»: slot.y = белый штрих; без CLEARANCE, иначе текст «летит» над линией и вылезает из блока.
    const lineY = slot.y;
    const lineFitted = Math.min(
      fontSize,
      fitFontSizeToSlot(fontSize, slot.lineHeight, inputKind, lineGuideId, slot),
    );
    top = lineY - lineFitted * resolveDiaryOnStrokeFontOffset(fontId);
    return top;
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
    return strokeY - fittedSize * strokeFontOffset;
  } else if (
    usesStrokeBaselineLayout(slot, lineGuideId) &&
    !isPregnancyWeeklyTextLineSlot(lineGuideId, slot)
  ) {
    // diary: slot.y уже штрих; kids/pregnancy — верх полосы, штрих снизу.
    const lineY = isDiaryInteriorLineGuide(lineGuideId)
      ? slot.y
      : slot.y + slot.lineHeight;
    const lineFitted = Math.min(
      fontSize,
      fitFontSizeToSlot(fontSize, slot.lineHeight, inputKind, lineGuideId, slot),
    );
    top = lineY - lineFitted * getStrokeBaselineFontOffset(fontId, lineGuideId);
    return top;
  } else if (
    lineGuideId === 'holidays_birthday_60' &&
    slot.page === 48 &&
    inputKind === 'line'
  ) {
    const lineY = slot.y + slot.lineHeight;
    top = lineY - fittedSize * strokeFontOffset;
  } else if (lineGuideId === 'kids_48' && inputKind === 'line') {
    const lineY = slot.y + slot.lineHeight;
    const lineFitted = Math.min(
      fontSize,
      fitFontSizeToSlot(fontSize, slot.lineHeight, 'line', lineGuideId, slot),
    );
    top = lineY - lineFitted * strokeFontOffset;
  } else {
    const { centerRatio, fontOffsetRatio } = resolveTemplateTextVerticalRatios(slot, lineGuideId);

    if (inputKind === 'block') {
      top = slot.y + slot.lineHeight * centerRatio - fittedSize * fontOffsetRatio;
    } else if (
      lineGuideId === 'pregnancy_60' ||
      lineGuideId === 'pregnancy_a5'
    ) {
      // Ruled line fallback: тот же единый зазор от штриха.
      const lineY = slot.y + slot.lineHeight * centerRatio;
      top = lineY - fittedSize * strokeFontOffset;
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

  // Clearance уже входит в strokeFontOffset; для остальных line — доп. зазор.
  if (
    inputKind === 'line' &&
    (lineGuideId === 'kids_48' ||
      lineGuideId === 'pregnancy_60' ||
      lineGuideId === 'pregnancy_a5' ||
      isDiaryInteriorLineGuide(lineGuideId) ||
      lineGuideId === 'holidays_birthday_60')
  ) {
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
      return slot.y;
    }
    const isPeachCellField =
      inputKind === 'block' &&
      slot.normY != null &&
      slot.normY >= 0.74 &&
      slot.normY <= 0.93;
    if (!isPeachCellField) {
      // diary: slot.y = штрих PDF (см. getDiarySlotTopNormY).
      return slot.y;
    }
  }

  if (
    lineGuideId === 'holidays_birthday_60' &&
    slot.page === 48 &&
    inputKind === 'line'
  ) {
    return slot.y + slot.lineHeight;
  }

  if (
    usesPregnancyGuideRuledTextLayout(lineGuideId, slot) &&
    inputKind === 'line' &&
    !isPregnancy60WeeklyValueSlot(lineGuideId, slot)
  ) {
    return getPregnancyWeeklyLineStrokeY(slot, allSlots, lineGuideId, fieldStartIndex);
  }

  if (
    usesStrokeBaselineLayout(slot, lineGuideId) &&
    !isPregnancyWeeklyTextLineSlot(lineGuideId, slot)
  ) {
    return slot.y + slot.lineHeight;
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
    | 'y'
    | 'lineHeight'
    | 'inputKind'
    | 'normY'
    | 'normHeight'
    | 'page'
    | 'lineStrokeAtBottom'
    | 'index'
    | 'x'
    | 'width'
    | 'textAnchorTop'
    | 'continuationGroup'
    | 'hasLabel'
  >,
  fontSize: number,
  lineGuideId?: string,
  fontId?: string,
): number {
  return getTemplateLinePdfDrawLayout({
    slot,
    fontSize,
    lineGuideId,
    fontId,
  }).baselineY;
}

function consumeOneLineForSlot(
  text: string,
  slot: TextLineSlot,
  fontSize: number,
  lineGuideId?: string,
  fontId?: string,
  measureTextWidth?: TextWidthMeasure,
  allSlots?: readonly TextLineSlot[],
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
    if (textFitsInSlot(testLine, slot, fontSize, lineGuideId, fontId, measureTextWidth, allSlots)) {
      built = testLine;
      wordCount += 1;
      continue;
    }

    if (built) {
      return { line: built + trailingSpaces, rest: words.slice(wordCount).join(' ') };
    }

    if (textFitsInSlot(word, slot, fontSize, lineGuideId, fontId, measureTextWidth, allSlots)) {
      return { line: word + trailingSpaces, rest: words.slice(1).join(' ') };
    }

    const { line, rest: wordRest } = splitWordToFit(
      word,
      slot,
      fontSize,
      lineGuideId,
      fontId,
      measureTextWidth,
      allSlots,
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

  return consumeOneLineForSlot(trimmed, startSlot, fontSize, lineGuideId, fontId, undefined, slots).rest;
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

  const { rest } = consumeOneLineForSlot(trimmed, startSlot, fontSize, lineGuideId, fontId, undefined, slots);
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
      measureTextWidth,
      slots,
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
      slots,
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
