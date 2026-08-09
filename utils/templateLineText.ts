import { Platform } from 'react-native';

import {
  DIARY_AMATIC_VISUAL_SINK_RATIO,
  DIARY_ANDROID_AMATIC_LIFT_RATIO,
  DIARY_LINE_FONT_OFFSET,
  getTemplateTypographyProfile,
  isKidsMonthPage,
  KIDS_MONTH_LINE_FONT_OFFSET,
  KIDS_MONTH_STROKE_CLEARANCE_RATIO,
  KIDS_P1_STROKE_CLEARANCE_RATIO,
  KIDS_P1_BASELINE_SINK_RATIO,
  KIDS_P1_ANDROID_BASELINE_LIFT_RATIO,
  KIDS_P1_PDF_BASELINE_LIFT_RATIO,
  KIDS_STROKE_CLEARANCE_RATIO,
  KIDS_TEETH_STROKE_CLEARANCE_RATIO,
  KIDS_TEETH_DATE_BASELINE_SINK_RATIO,
  KIDS_TEETH_BOTTOM_BASELINE_LIFT_RATIO,
  KIDS_TEETH_BOTTOM_PDF_BASELINE_LIFT_RATIO,
  KIDS_TEETH_DATE_PDF_BASELINE_LIFT_RATIO,
  KIDS_TEETH_FIXED_LINE_FONT_SIZE,
  KIDS_GROWTH_STROKE_CLEARANCE_RATIO,
  KIDS_GROWTH_FIXED_LINE_FONT_SIZE,
  KIDS_GROWTH_PDF_BASELINE_LIFT_RATIO,
  KIDS_BOTTOM_DATE_STROKE_CLEARANCE_RATIO,
  KIDS_48_EVENT_DATE_TEXT_ABOVE_LINE_BAND_RATIO,
  KIDS_48_P8_EVENT_DATE_TEXT_LIFT_BAND_RATIO,
  KIDS_P12_DATE_LINE_GAP_BAND_RATIO,
  PREGNANCY_WEEKLY_CAP_HEIGHT_RATIO,
  PREGNANCY_WEEKLY_COMPACT_LINE_HEIGHT,
  PREGNANCY_WEEKLY_EXTRA_LIFT_BAND_RATIO,
  PREGNANCY_ALREADY_MOM_STROKE_CLEARANCE_RATIO,
  PREGNANCY_ALREADY_MOM_PDF_BASELINE_LIFT_RATIO,
  PREGNANCY_WEEKLY_GUIDE_STROKE_CAP_HEIGHT_RATIO,
  PREGNANCY_WEEKLY_GUIDE_STROKE_FONT_OFFSET,
  PREGNANCY_WEEKLY_GUIDE_STROKE_LIFT_BAND_RATIO,
  PREGNANCY_WEEKLY_INLINE_TAIL_EXTRA_LIFT_BAND_RATIO,
  PREGNANCY_WEEKLY_LONG_LABEL_TAIL_GAP_THRESHOLD,
  PREGNANCY_WEEKLY_LINE_PITCH,
  PREGNANCY_RULED_NOTEBOOK_CAP_HEIGHT_RATIO,
  PREGNANCY_RULED_NOTEBOOK_LIFT_BAND_RATIO,
  TEMPLATE_LINE_STROKE_CLEARANCE_RATIO,
  PURPLE_MY_DAY_PAGES,
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
import { getPregnancyWeeklyInlineTailFieldCalib } from '@/constants/pregnancy-weekly-inline-tail-calib';
import { getRnAscentRatioAt16 } from '@/utils/fontCharWidths';
import { normalizeAlbumUserText } from '@/utils/normalizeAlbumUserText';
import {
  isPregnancy60WeeklyValueSlot,
  isPregnancyRuledNotebookPage,
  isPregnancyWeeklyInlineTailLabelSlot,
  isPregnancyWeeklyStructuredPage,
  isPregnancyWeeklyTextLineSlot,
  resolveWeeklyFieldLineSlots,
  type TextLineSlot,
} from '@/utils/textLineSlots';

/** Пробел уже буквы — иначе перенос срабатывает раньше визуального края строки. */
const SPACE_WIDTH_FACTOR = 0.35;

/** Единая нормализация полей: Unicode-пробелы голосового ввода + перенос по слотам. */
export function normalizeTemplateMultilineText(text: string, lineCount?: number): string {
  if (!text) return text;
  const normalized = normalizeAlbumUserText(text);
  if (lineCount == null || lineCount <= 1) return normalized;
  return normalized.replace(/\r?\n/g, ' ');
}

/** Штрих внизу полосы — месячные, нижняя «ДАТА», p8/p9, сетка роста (стр. 11). */
function usesKids48BottomBandStroke(
  slot: Pick<TextLineSlot, 'page' | 'index' | 'textAnchorTop' | 'lineStrokeAtBottom'>,
): boolean {
  if (!slot.lineStrokeAtBottom) return false;
  if (slot.page === 11) return true;
  if (slot.page === 8 && slot.index === 0) return true;
  if (slot.page === 9 && slot.index === 0) return true;
  if (isKidsBottomDateLineSlot('kids_48', slot)) return true;
  if (isKidsP16DreamsTopDateLineSlot('kids_48', slot)) return true;
  if (isKidsP20BaptismDateLineSlot('kids_48', slot)) return true;
  return slot.page != null && isKidsMonthPage(slot.page) && slot.index >= 1;
}

/** Y печатной линии для kids_48: при textAnchorTop штрих на нижнем крае полосы. */
function resolveKids48LineStrokeY(
  slot: Pick<
    TextLineSlot,
    'y' | 'lineHeight' | 'textAnchorTop' | 'lineStrokeAtBottom' | 'page' | 'index'
  >,
): number {
  if (usesKids48BottomBandStroke(slot)) {
    return slot.y + slot.lineHeight;
  }
  if (slot.textAnchorTop && slot.lineStrokeAtBottom) {
    return slot.y + slot.lineHeight;
  }
  return slot.y + slot.lineHeight * 0.5;
}

/** Preview top над штрихом kids_48 — RN/PDF ascent + единый clearance (без PDF-only lift). */
function getKidsStrokeBaselineTextTop(
  strokeY: number,
  fittedSize: number,
  fontId: string | null | undefined,
  slot: Pick<TextLineSlot, 'page'> &
    Partial<
      Pick<TextLineSlot, 'normY' | 'hasLabel' | 'inputKind' | 'index' | 'textAnchorTop'>
    >,
  lineGuideId?: string,
  extraGapPx = 0,
): number {
  const offset = resolveStrokeBaselinePreviewFontOffset(fontId, slot, lineGuideId);
  const clearanceRatio =
    slot.page === 10
      ? KIDS_TEETH_STROKE_CLEARANCE_RATIO
      : slot.page === 11
        ? KIDS_GROWTH_STROKE_CLEARANCE_RATIO
        : isKidsBottomDateLineSlot('kids_48', slot) ||
            isKidsP16DreamsTopDateLineSlot('kids_48', slot) ||
            isKidsP20BaptismDateLineSlot('kids_48', slot)
          ? KIDS_BOTTOM_DATE_STROKE_CLEARANCE_RATIO
          : typeof slot.page === 'number' &&
              isKidsMonthPage(slot.page) &&
              (slot.index == null || slot.index >= 1)
            ? KIDS_MONTH_STROKE_CLEARANCE_RATIO
            : slot.page === 1
              ? KIDS_P1_STROKE_CLEARANCE_RATIO
              : KIDS_STROKE_CLEARANCE_RATIO;
  // p1 / p10: rnAscent=1 — точечный sink/lift к штриху.
  // Android p1: тот же sink, что iOS, опускает глифы под линию — компенсируем.
  const amaticSink =
    slot.page === 1 && (slot.index == null || slot.index >= 1)
      ? fittedSize *
        (KIDS_P1_BASELINE_SINK_RATIO -
          (Platform.OS === 'android' ? KIDS_P1_ANDROID_BASELINE_LIFT_RATIO : 0))
      : slot.page === 10 && (slot.index === 20 || slot.index === 21)
        ? -fittedSize * KIDS_TEETH_BOTTOM_BASELINE_LIFT_RATIO
        : slot.page === 10
          ? fittedSize * KIDS_TEETH_DATE_BASELINE_SINK_RATIO
          : 0;
  const clearance = fittedSize * clearanceRatio;
  return strokeY - fittedSize * offset - clearance - extraGapPx + amaticSink;
}

function isDiaryInteriorLineGuide(lineGuideId?: string): boolean {
  return lineGuideId === 'diary_interior_brown' || lineGuideId === 'diary_interior_purple';
}

function getEffectiveCharWidthRatio(lineGuideId?: string, fontId?: string): number {
  const profile = getTemplateTypographyProfile(lineGuideId);
  return profile.charWidthRatio * getAlbumFontCharWidthMultiplier(fontId);
}

/** Первая body-строка поля (для масштаба PNG-калибровки norm X → viewport). */
function findWeeklyFieldBodyAnchorSlot(
  slot: Pick<TextLineSlot, 'continuationGroup' | 'page'>,
  allSlots: readonly TextLineSlot[],
  lineGuideId?: string,
): TextLineSlot | undefined {
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

export type PregnancyWeeklyFieldLineGeometry = {
  viewLeft: number;
  viewWidth: number;
  textLeft: number;
  textWidth: number;
};

/** Единая геометрия строки weekly-поля (distribute = render) для groups 3/5 с PNG-калибровкой. */
export function getPregnancyWeeklyFieldLineGeometry(
  slot: TextLineSlot,
  lineGuideId?: string,
  allSlots?: readonly TextLineSlot[],
): PregnancyWeeklyFieldLineGeometry | null {
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

  let anchorSlot = findWeeklyFieldBodyAnchorSlot(slot, allSlots, lineGuideId);
  if ((!anchorSlot || anchorSlot.x <= 0) && lineGuideId === "pregnancy_60" && slot.page === 9) {
    const fallbackIndex = slot.continuationGroup === 3 ? 3 : slot.continuationGroup === 5 ? 8 : null;
    if (fallbackIndex != null) {
      anchorSlot = allSlots.find((s) => s.index === fallbackIndex);
    }
  }
  if (!anchorSlot || anchorSlot.x <= 0 || calib.lineLeftNormX <= 0) return null;

  const profile = getTemplateTypographyProfile(lineGuideId);
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

export type TemplateTextInsets = {
  left: number;
  width: number;
  /** Левый край View — body-строка (для inline-tail после подписи). */
  anchorX?: number;
  anchorWidth?: number;
};

function isPregnancyWeeklyFeelingsGroup(
  lineGuideId: string | undefined,
  continuationGroup: number | undefined,
): boolean {
  return continuationGroup === (lineGuideId === 'pregnancy_a5' ? 6 : 5);
}

function isPregnancyWeeklyMultilineGroup(
  lineGuideId: string | undefined,
  continuationGroup: number | undefined,
): boolean {
  return continuationGroup === 3 || isPregnancyWeeklyFeelingsGroup(lineGuideId, continuationGroup);
}

/** Горизонтальные inset/width для inline-tail (перенос + preview/export). */
export function getPregnancyWeeklyInlineTailTextInsets(
  slot: TextLineSlot,
  lineGuideId?: string,
  allSlots?: readonly TextLineSlot[],
): TemplateTextInsets {
  if (
    !slot.inlineLabelTail ||
    !lineGuideId ||
    !isPregnancyWeeklyStructuredPage(lineGuideId, slot.page)
  ) {
    return { left: 0, width: slot.width };
  }

  const calibGeometry = getPregnancyWeeklyFieldLineGeometry(slot, lineGuideId, allSlots);
  if (calibGeometry) {
    const pad = Math.max(4, slot.width * 0.03);
    return {
      left: calibGeometry.textLeft + pad,
      width: Math.max(0, calibGeometry.textWidth - pad),
      anchorX: calibGeometry.viewLeft,
      anchorWidth: calibGeometry.viewWidth,
    };
  }

  // OCR already returns the exact line tail: x starts after the printed label.
  // Small extra pad so user text does not hug the printed design.
  const pad = Math.max(4, slot.width * 0.035);
  return { left: pad, width: Math.max(0, slot.width - pad) };
}

/** Абсолютная геометрия Text-контейнера из slot + insets (body-anchor для weekly inline-tail). */
export function resolveTemplateTextRenderBox(
  slot: Pick<TextLineSlot, 'x' | 'width'>,
  insets: TemplateTextInsets,
): { viewLeft: number; viewWidth: number; textLeft: number; textWidth: number } {
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

/** Геометрия рендера weekly-поля: textWidth ≥ ширины сегмента (без клипа). */
export function resolvePregnancyWeeklyFieldRowLayout(
  slot: TextLineSlot,
  _segmentContent: string,
  lineGuideId: string | undefined,
  allSlots: readonly TextLineSlot[] | undefined,
  _fontSize: number,
  _fontId?: string,
  _measureTextWidth?: TextWidthMeasure,
): PregnancyWeeklyFieldLineGeometry {
  const calibGeometry = getPregnancyWeeklyFieldLineGeometry(slot, lineGuideId, allSlots);
  if (calibGeometry) {
    return calibGeometry;
  }

  const insets = getTemplateBlockTextInsets(slot, lineGuideId, allSlots);
  return resolveTemplateTextRenderBox(slot, insets);
}

function isPregnancyWeeklyFieldLineSlot(
  slot: Pick<TextLineSlot, 'page' | 'inputKind' | 'index'>,
  lineGuideId?: string,
): boolean {
  return (
    isPregnancyWeeklyStructuredPage(lineGuideId, slot.page) &&
    (slot.inputKind ?? 'line') === 'line' &&
    !isPregnancy60WeeklyValueSlot(lineGuideId, slot)
  );
}

/** Многострочные поля «Планы» и «Ощущения» — не дата/вес. */
export function isPregnancyWeeklyMultilineTextFieldSlot(
  slot: Pick<TextLineSlot, 'page' | 'inputKind' | 'index' | 'continuationGroup'>,
  lineGuideId?: string,
): boolean {
  if (!isPregnancyWeeklyFieldLineSlot(slot, lineGuideId)) return false;
  return isPregnancyWeeklyMultilineGroup(lineGuideId, slot.continuationGroup);
}

export function shouldClipPregnancyWeeklyFieldRow(
  slot: Pick<TextLineSlot, 'page' | 'index'> &
    Partial<
      Pick<
        TextLineSlot,
        | 'inputKind'
        | 'continuationGroup'
        | 'inlineLabelTail'
        | 'hasLabel'
        | 'x'
        | 'normHeight'
      >
    >,
  lineGuideId?: string,
  allSlots?: readonly TextLineSlot[],
): boolean {
  if (!isPregnancyWeeklyStructuredPage(lineGuideId, slot.page)) return false;
  if ((slot.inputKind ?? 'line') !== 'line') return false;
  if (isPregnancy60WeeklyValueSlot(lineGuideId, slot)) return false;

  if (slot.inlineLabelTail === true) return true;

  if (
    allSlots?.length &&
    typeof slot.x === 'number' &&
    typeof slot.continuationGroup === 'number'
  ) {
    return isPregnancyWeeklyInlineTailLabelSlot(
      lineGuideId,
      {
        page: slot.page,
        index: slot.index,
        x: slot.x,
        hasLabel: slot.hasLabel ?? false,
        continuationGroup: slot.continuationGroup,
        normHeight: slot.normHeight,
        inlineLabelTail: slot.inlineLabelTail,
      },
      allSlots,
    );
  }

  if (lineGuideId === 'pregnancy_60') {
    return (
      (slot.continuationGroup === 3 && slot.index === 2 && slot.hasLabel === true) ||
      (slot.continuationGroup === 5 && slot.index === 7 && slot.hasLabel === true)
    );
  }

  return false;
}

/** Высота View для weekly-поля: хватает и для baseline на штрихе, и для глифов (без клипа). */
export function getPregnancyWeeklyFieldRowViewHeight(
  rowViewTop: number,
  slot: Pick<TextLineSlot, 'strokeY' | 'y' | 'lineHeight'>,
  fontSize: number,
): number {
  const strokeY =
    typeof slot.strokeY === 'number' ? slot.strokeY : slot.y + slot.lineHeight;
  const textTopInView = getPregnancyWeeklyFieldTextTopInView(rowViewTop, slot, fontSize);
  const fromStroke = strokeY - rowViewTop + fontSize * TEMPLATE_LINE_STROKE_CLEARANCE_RATIO;
  const fromGlyphs =
    textTopInView + fontSize + fontSize * TEMPLATE_LINE_STROKE_CLEARANCE_RATIO;
  return Math.max(fontSize + 2, fromStroke, fromGlyphs);
}

/** Baseline на штрихе внутри clipped View (не top:0 — иначе строка 1 обрезается). */
export function getPregnancyWeeklyFieldTextTopInView(
  rowViewTop: number,
  slot: Pick<TextLineSlot, 'strokeY' | 'y' | 'lineHeight'>,
  fontSize: number,
): number {
  const strokeY =
    typeof slot.strokeY === 'number' ? slot.strokeY : slot.y + slot.lineHeight;
  return Math.max(0, strokeY - rowViewTop - fontSize * PREGNANCY_WEEKLY_GUIDE_STROKE_FONT_OFFSET);
}

function getEffectiveLineWidth(
  slot: TextLineSlot,
  lineGuideId?: string,
  allSlots?: readonly TextLineSlot[],
): number {
  const calibGeometry = getPregnancyWeeklyFieldLineGeometry(slot, lineGuideId, allSlots);
  if (calibGeometry) {
    return calibGeometry.textWidth;
  }
  if (
    slot.inlineLabelTail &&
    lineGuideId &&
    isPregnancyWeeklyStructuredPage(lineGuideId, slot.page)
  ) {
    return getPregnancyWeeklyInlineTailTextInsets(slot, lineGuideId, allSlots).width;
  }
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
  measureTextWidth?: TextWidthMeasure,
  allSlots?: readonly TextLineSlot[],
): boolean {
  if (!text) return true;
  // kids_48 p1/p10: меряем при том же кегле, которым рисуем (shrink),
  // иначе distribute обрезает «ДД.ММ.ГГГГ» до «ДД.ММ.ГГ».
  const fitted =
    lineGuideId === 'kids_48' && (slot.page === 10 || slot.page === 1)
      ? getEffectiveTemplateFontSize(lineGuideId, slot, fontSize, {
          textContent: text,
          fontId,
        })
      : fitFontSizeToSlot(fontSize, slot.lineHeight, slot.inputKind, lineGuideId);
  return (
    measureTextLineWidth(text, fitted, lineGuideId, fontId, measureTextWidth) <=
    getEffectiveLineWidth(slot, lineGuideId, allSlots)
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
  const fitted = fitFontSizeToSlot(fontSize, slot.lineHeight, slot.inputKind, lineGuideId);
  const charWidthRatio = getEffectiveCharWidthRatio(lineGuideId, fontId);

  let line = '';
  for (const ch of word) {
    const candidate = line + ch;
    const width = measureTextWidth
      ? measureTextWidth(candidate, fitted)
      : estimateTextWidth(candidate, fitted, charWidthRatio);
    if (width <= getEffectiveLineWidth(slot, lineGuideId, allSlots)) {
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
  lineGuideId?: string,
  maxFontSizeOverride?: number,
): number {
  const profile = getTemplateTypographyProfile(lineGuideId);
  const USER_MIN = 10;
  const USER_MAX = 28;

  // Birthday: слоты на телефоне часто ~10–14 px — без отдельного диапазона A+/A− «мёртвые».
  if (lineGuideId === 'holidays_birthday_60' && Number.isFinite(fontSize)) {
    return Math.min(Math.max(fontSize, USER_MIN), USER_MAX);
  }

  // Альбомы с калиброванным дефолтом (16): A+/A− только при явном размере ≠ lock.
  // Не клампим к lineHeight — иначе превью остаётся 16, а тулбар показывает 17+.
  // Базовая линия (stroke) не прыгает: растём от baseline вверх (как iOS e24a739).
  if (profile.fixedLineFontSize != null) {
    const locked = profile.fixedLineFontSize;
    if (Number.isFinite(fontSize) && fontSize !== locked) {
      const upper =
        maxFontSizeOverride != null
          ? Math.min(USER_MAX, maxFontSizeOverride)
          : USER_MAX;
      return Math.min(Math.max(fontSize, USER_MIN), upper);
    }
    if (maxFontSizeOverride != null && maxFontSizeOverride < locked) {
      return maxFontSizeOverride;
    }
    return locked;
  }

  if (inputKind === 'block') {
    if (Number.isFinite(fontSize) && fontSize !== 16) {
      return Math.min(
        Math.max(fontSize, USER_MIN),
        Math.min(USER_MAX, profile.blockMaxFontSize),
      );
    }
    return Math.min(fontSize, Math.max(13, lineHeight * 0.78), profile.blockMaxFontSize);
  }

  if (Number.isFinite(fontSize) && fontSize > 16) {
    return Math.min(Math.max(fontSize, USER_MIN), USER_MAX);
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

function isBirthQuestionnairePage(lineGuideId: string | undefined, page?: number): boolean {
  return (
    (lineGuideId === 'pregnancy_a5' && page === 44) ||
    (lineGuideId === 'pregnancy_60' && page === 52)
  );
}

function isBirthQuestionnaireLineSlot(
  lineGuideId: string | undefined,
  slot: Pick<TextLineSlot, 'page' | 'inputKind'>,
): boolean {
  return (
    isBirthQuestionnairePage(lineGuideId, slot.page) &&
    (slot.inputKind ?? 'line') === 'line'
  );
}

/** Узкий хвост после подписи «Роддом» — единственная строка, где нужен shrink. */
const BIRTH_QUESTIONNAIRE_AUTO_SHRINK_SLOT_INDICES = new Set([6]);

function isBirthQuestionnaireAutoShrinkSlot(
  lineGuideId: string | undefined,
  slot: Pick<TextLineSlot, 'page' | 'index' | 'inputKind'>,
): boolean {
  return (
    isBirthQuestionnaireLineSlot(lineGuideId, slot) &&
    typeof slot.index === 'number' &&
    BIRTH_QUESTIONNAIRE_AUTO_SHRINK_SLOT_INDICES.has(slot.index)
  );
}

/** White input blocks on pregnancy_60 p52 (weight, height, weekday, time, delivery). */
const PREGNANCY_60_P52_BLOCK_SLOT_INDICES = new Set([9, 10, 13, 14, 15]);

export function isPregnancy60Page52WhiteBlockSlot(
  slot: Pick<TextLineSlot, 'page' | 'inputKind'> & Partial<Pick<TextLineSlot, 'index'>>,
  lineGuideId?: string,
): boolean {
  return (
    lineGuideId === 'pregnancy_60' &&
    slot.page === 52 &&
    (slot.inputKind ?? 'line') === 'block' &&
    typeof slot.index === 'number' &&
    PREGNANCY_60_P52_BLOCK_SLOT_INDICES.has(slot.index)
  );
}

function isBirthdayFreeCaptionPage(page: number): boolean {
  if (page === 3 || page === 5) return true;
  if (page >= 7 && page <= 39 && page % 2 === 1) return true;
  return false;
}

export function resolveBirthQuestionnaireBlockTextAlign(
  slot: Pick<TextLineSlot, 'page' | 'index' | 'inputKind'> &
    Partial<Pick<TextLineSlot, 'normWidth' | 'width'>>,
  lineGuideId?: string,
): 'left' | 'center' {
  if (lineGuideId === 'holidays_birthday_60') {
    if ((slot.inputKind ?? 'line') !== 'block') return 'left';
    // Free-page caption pills (incl. wrap line) start at the left of each white block.
    if (isBirthdayFreeCaptionPage(slot.page)) return 'left';
    // Wide travel / multi-line caption bands — same left edge rule.
    const normW = slot.normWidth ?? 0;
    if (normW >= 0.35) return 'left';
    return 'center';
  }
  if (isPregnancy60Page52WhiteBlockSlot(slot, lineGuideId)) {
    return 'center';
  }
  return 'left';
}

export function getSlotTemplateTextAlign(
  slot: Pick<TextLineSlot, 'page' | 'index' | 'inputKind'>,
  lineGuideId: string | undefined,
  userAlign: 'left' | 'center' | 'right' = 'left',
): 'left' | 'center' | 'right' {
  if (userAlign) return userAlign;
  return resolveBirthQuestionnaireBlockTextAlign(slot, lineGuideId);
}

export function resolveTemplateLineFontSize(
  lineText: string,
  slot: Pick<TextLineSlot, 'lineHeight' | 'inputKind' | 'width' | 'page' | 'index'> | undefined,
  fontSize: number,
  lineGuideId?: string,
  fontId?: string,
): number {
  return getEffectiveTemplateFontSize(lineGuideId, slot, fontSize, {
    textContent: lineText,
    fontId,
  });
}

function isAlreadyMomPage(lineGuideId: string | undefined, page?: number): boolean {
  return (
    (lineGuideId === 'pregnancy_60' && page === 54) ||
    (lineGuideId === 'pregnancy_a5' && page === 46)
  );
}

/** RN Text top offset for stroke-baseline rows (lineHeight === fontSize in preview). */
function resolveStrokeBaselinePreviewFontOffset(
  fontId: string | null | undefined,
  slot: Pick<TextLineSlot, 'page'> &
    Partial<
      Pick<TextLineSlot, 'normY' | 'hasLabel' | 'inputKind' | 'index' | 'textAnchorTop'>
    >,
  lineGuideId?: string,
): number {
  // Diary / birthday Amatic: rnAscent≈1 sits visually high above the stroke.
  if (isDiaryInteriorLineGuide(lineGuideId) || lineGuideId === 'holidays_birthday_60') {
    return getStrokeBaselineFontOffset(slot, lineGuideId);
  }
  const ascent = getRnAscentRatioAt16(fontId);
  // pregnancy_60 «Постановка на учёт»: Amatic floats above printed underlines.
  if (lineGuideId === 'pregnancy_60' && slot.page === 4 && ascent != null) {
    return applyDiaryAmaticVisualSink(Math.min(ascent, 0.96));
  }
  return ascent ?? getStrokeBaselineFontOffset(slot, lineGuideId);
}

function getStrokeBaselineFontOffset(
  slot: Pick<TextLineSlot, 'page'> &
    Partial<
      Pick<TextLineSlot, 'normY' | 'hasLabel' | 'inputKind' | 'index' | 'textAnchorTop'>
    >,
  lineGuideId?: string,
): number {
  if (isBirthQuestionnairePage(lineGuideId, slot.page)) {
    return PREGNANCY_WEEKLY_CAP_HEIGHT_RATIO;
  }
  if (isAlreadyMomPage(lineGuideId, slot.page)) {
    return PREGNANCY_WEEKLY_CAP_HEIGHT_RATIO;
  }
  if (isDiaryInteriorLineGuide(lineGuideId)) {
    const diarySlot = {
      page: slot.page,
      normY: slot.normY,
      hasLabel: slot.hasLabel ?? false,
    };
    // Style/Pets: единый template offset (как анкета мамы). Иначе нижние строки
    // ложно попадают в isBrownWishSlot / cover-band → текст прыгает по линии.
    if (lineGuideId === 'diary_interior_brown') {
      const brownTemplate = getDiaryBrownPageTemplate(slot.page);
      if (brownTemplate === 'StyleTemplate' || brownTemplate === 'PetsTemplate') {
        const pageTuned = resolveDiaryBrownLineFontOffset({
          page: slot.page,
          normY: slot.normY,
          hasLabel: slot.hasLabel ?? false,
          inputKind: slot.inputKind,
        });
        if (pageTuned != null) return pageTuned;
      }
    }
    // Фиолетовое расписание (пн–вс): cover-band ловит отдельные строки → прыжки.
    // Один offset на все линии, как на анкете мамы / Style / Pets.
    if (
      lineGuideId === 'diary_interior_purple' &&
      typeof slot.page === 'number' &&
      slot.page >= 24 &&
      slot.page <= 27
    ) {
      return applyDiaryAmaticVisualSink(0.93, { androidDiaryLift: true });
    }
    // Фиолетовый «Хобби» (p8): cover-band ловит избранное (y≈0.47–0.62) → прыжки.
    if (lineGuideId === 'diary_interior_purple' && slot.page === 8) {
      return applyDiaryAmaticVisualSink(0.93, { androidDiaryLift: true });
    }
    // Фиолетовый «Твои питомцы» (p10): единый baseline, без cover-band прыжков.
    if (lineGuideId === 'diary_interior_purple' && slot.page === 10) {
      return applyDiaryAmaticVisualSink(0.93, { androidDiaryLift: true });
    }
    // Фиолетовый «Социальные сети» (p12): единый baseline.
    if (lineGuideId === 'diary_interior_purple' && slot.page === 12) {
      return applyDiaryAmaticVisualSink(0.93, { androidDiaryLift: true });
    }
    // Фиолетовый «Твое настроение» (p14): единый baseline.
    if (lineGuideId === 'diary_interior_purple' && slot.page === 14) {
      return applyDiaryAmaticVisualSink(0.93, { androidDiaryLift: true });
    }
    // Фиолетовый «Одежда и стиль» (p16): единый baseline.
    if (lineGuideId === 'diary_interior_purple' && slot.page === 16) {
      return applyDiaryAmaticVisualSink(0.93, { androidDiaryLift: true });
    }
    // Фиолетовый «Первая любовь» (p18): единый baseline.
    if (lineGuideId === 'diary_interior_purple' && slot.page === 18) {
      return applyDiaryAmaticVisualSink(0.93, { androidDiaryLift: true });
    }
    // Фиолетовый «Школьная жизнь» (p22): единый baseline.
    if (lineGuideId === 'diary_interior_purple' && slot.page === 22) {
      return applyDiaryAmaticVisualSink(0.93, { androidDiaryLift: true });
    }
    // Фиолетовый «Твой день»: единый baseline на линиях дня/улыбки.
    if (
      lineGuideId === 'diary_interior_purple' &&
      typeof slot.page === 'number' &&
      (PURPLE_MY_DAY_PAGES as readonly number[]).includes(slot.page)
    ) {
      return applyDiaryAmaticVisualSink(0.93, { androidDiaryLift: true });
    }
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
    if (
      isBrownWishSlot(diarySlot, lineGuideId) ||
      isBrownCareerAnswerSlot(diarySlot, lineGuideId)
    ) {
      return applyDiaryAmaticVisualSink(0.9, { androidDiaryLift: true });
    }
    if (lineGuideId === 'diary_interior_brown') {
      const tuned = resolveDiaryBrownLineFontOffset({
        page: slot.page,
        normY: slot.normY,
        hasLabel: slot.hasLabel ?? false,
        inputKind: slot.inputKind,
      });
      if (tuned != null) return tuned;
    }
    if (lineGuideId === 'diary_interior_purple') {
      return applyDiaryAmaticVisualSink(0.9, { androidDiaryLift: true });
    }
    return applyDiaryAmaticVisualSink(DIARY_LINE_FONT_OFFSET, {
      androidDiaryLift: true,
    });
  }
  if (lineGuideId === 'holidays_birthday_60') {
    return applyDiaryAmaticVisualSink(0.98);
  }
  return KIDS_MONTH_LINE_FONT_OFFSET;
}

/** Baseline прямо на штрихе линии — kids_48, pregnancy A5 p44, дневники. */
export function usesStrokeBaselineLayout(
  slot: Pick<TextLineSlot, 'page' | 'index'> &
    Partial<
      Pick<
        TextLineSlot,
        'lineStrokeAtBottom' | 'normY' | 'hasLabel' | 'inputKind' | 'textAnchorTop'
      >
    >,
  lineGuideId?: string,
): boolean {
  if (
    typeof slot.page === 'number' &&
    typeof slot.index === 'number' &&
    isPregnancyWeeklyTextLineSlot(lineGuideId, slot)
  ) {
    return true;
  }
  if (!Boolean(slot.lineStrokeAtBottom)) return false;
  if (lineGuideId === 'kids_48') return true;
  if (lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5') {
    return (slot.inputKind ?? 'line') === 'line';
  }
  if (isDiaryInteriorLineGuide(lineGuideId)) {
    return !isDiaryPeachCellField(slot);
  }
  if (lineGuideId === 'holidays_birthday_60') {
    return (slot.inputKind ?? 'line') === 'line';
  }
  return false;
}

/** @deprecated Use usesStrokeBaselineLayout */
export function usesKidsMonthStrokeBaselineLayout(
  slot: Pick<
    TextLineSlot,
    'lineStrokeAtBottom' | 'page' | 'normY' | 'hasLabel' | 'inputKind' | 'index'
  >,
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
  if (usesStrokeBaselineLayout(slot, lineGuideId)) {
    return { viewportTopInset: 0, textTopInset: 0 };
  }
  const ascenderPadding = getTemplateLineAscenderPadding(fontSize, inputKind);
  return { viewportTopInset: ascenderPadding, textTopInset: ascenderPadding };
}

function shrinkFontSizeToFitSlotText(
  fontSize: number,
  slot: Pick<TextLineSlot, 'width'>,
  textContent: string,
  lineGuideId?: string,
  fontId?: string,
  minFontSize = 9,
): number {
  if (!textContent || slot.width <= 0) return fontSize;
  const profile = getTemplateTypographyProfile(lineGuideId);
  const charWidth =
    fontSize * profile.charWidthRatio * getAlbumFontCharWidthMultiplier(fontId);
  const slackWidth = slot.width * profile.lineWidthSlackRatio;
  const neededWidth = textContent.length * charWidth;
  if (neededWidth <= slackWidth) return fontSize;
  return Math.max(
    minFontSize,
    Math.floor(fontSize * (slackWidth / neededWidth) * 0.94),
  );
}

export function getEffectiveTemplateFontSize(
  lineGuideId: string | undefined,
  slot:
    | Pick<TextLineSlot, 'lineHeight' | 'inputKind' | 'width' | 'page' | 'index'>
    | undefined,
  annotationFontSize = 16,
  options?: { textContent?: string; fontId?: string },
): number {
  const preferredSize =
    lineGuideId === 'kids_48' && slot?.page === 11
      ? Math.min(annotationFontSize, KIDS_GROWTH_FIXED_LINE_FONT_SIZE)
      : lineGuideId === 'kids_48' && slot?.page === 10
        ? Math.min(annotationFontSize, KIDS_TEETH_FIXED_LINE_FONT_SIZE)
        : annotationFontSize;
  const teethMax =
    lineGuideId === 'kids_48' && slot?.page === 10
      ? KIDS_TEETH_FIXED_LINE_FONT_SIZE
      : undefined;
  const base = fitFontSizeToSlot(
    preferredSize,
    slot?.lineHeight ?? 24,
    slot?.inputKind ?? 'line',
    lineGuideId,
    teethMax,
  );
  if (!slot || !options?.textContent) return base;
  if (
    isKidsStrokeBaselineDateLineSlot(lineGuideId, slot) ||
    isKidsEventDateLineSlot(lineGuideId, slot) ||
    (lineGuideId === 'kids_48' && slot.page === 10) ||
    (lineGuideId === 'kids_48' && slot.page === 1 && (slot.index == null || slot.index >= 1))
  ) {
    return shrinkFontSizeToFitSlotText(
      base,
      slot,
      options.textContent,
      lineGuideId,
      options.fontId,
      8,
    );
  }
  if (isBirthQuestionnaireAutoShrinkSlot(lineGuideId, slot)) {
    return shrinkFontSizeToFitSlotText(
      base,
      slot,
      options.textContent,
      lineGuideId,
      options.fontId,
      10,
    );
  }
  return base;
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
    lineHeight <= fittedSize * 1.8;

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
  'inputKind' | 'normY' | 'normHeight' | 'page'
> &
  Partial<Pick<TextLineSlot, 'x' | 'width' | 'hasLabel'>>;

function resolveDiaryBrownBlockRatios(
  slot: DiaryBrownSlotGeometry,
): { centerRatio: number; fontOffsetRatio: number } | null {
  if (slot.page == null) return null;
  const template = getDiaryBrownPageTemplate(slot.page);
  if (!template) return null;

  if (template === 'FriendQuestionnaireTemplate') {
    // Чуть ниже к штриху: на скрине рукопись висела над линией.
    const isWide = (slot.width ?? 0) >= 0.62;
    return {
      centerRatio: isWide ? 0.52 : 0.5,
      fontOffsetRatio: isWide ? 0.97 : 0.95,
    };
  }

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

/**
 * Visual sink Amatic → штрих. На Android для дневников — доп. lift
 * (иначе значения чуть садятся на линию при той же формуле, что iOS).
 */
function applyDiaryAmaticVisualSink(
  fontOffsetRatio: number,
  options?: { androidDiaryLift?: boolean },
): number {
  const androidLift =
    Platform.OS === 'android' && options?.androidDiaryLift
      ? DIARY_ANDROID_AMATIC_LIFT_RATIO
      : 0;
  return Math.max(
    0.68,
    fontOffsetRatio - DIARY_AMATIC_VISUAL_SINK_RATIO + androidLift,
  );
}

function resolveDiaryBrownLineFontOffset(slot: DiaryBrownSlotGeometry): number | null {
  if (slot.page == null) return null;
  const template = getDiaryBrownPageTemplate(slot.page);
  if (!template) return null;

  let offset = 0.92;
  if (template === 'PetsTemplate' || template === 'StyleTemplate') {
    // Как ParentProfile (анкета мамы): ровно на штрихе, единый offset на все строки.
    offset = 0.93;
  } else if (template === 'FriendQuestionnaireTemplate') {
    offset = 0.95;
  } else if (DIARY_BROWN_QUESTIONNAIRE_TEMPLATES.has(template)) {
    offset = 0.93;
  } else if (template === DIARY_BROWN_MY_DAY_TEMPLATE) {
    // Date sits on printed «(ДАТА)» — lower Amatic so digits cover the placeholder.
    const isDateSlot = slot.normY != null && slot.normY <= 0.22;
    offset = isDateSlot ? 0.86 : 0.94;
  } else if (template === 'MoodTemplate' || template === 'TravelTemplate') {
    offset = 0.96;
  } else if (template === DIARY_BROWN_SCHOOL_LIFE_TEMPLATE) {
    offset = 0.96;
  } else if (DIARY_BROWN_WEEKLY_SCHEDULE_TEMPLATES.has(template)) {
    offset = 0.96;
  } else if (slot.page != null && slot.page >= 45 && slot.page <= 56) {
    offset = 0.92;
  }
  return applyDiaryAmaticVisualSink(offset, { androidDiaryLift: true });
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

      if (isBrownCoverField || isPurpleCoverField) {
        return { centerRatio: 0.44, fontOffsetRatio: 0.92 };
      }
      return {
        centerRatio: 1,
        fontOffsetRatio: applyDiaryAmaticVisualSink(
          lineGuideId === 'diary_interior_purple' ? 0.92 : DIARY_LINE_FONT_OFFSET,
          { androidDiaryLift: true },
        ),
      };
    }

    return {
      centerRatio: profile.lineCenterRatio,
      fontOffsetRatio: profile.lineFontOffsetRatio,
    };
  }

  if (lineGuideId === 'holidays_birthday_60') {
    const normHeight = slot.normHeight ?? 0;

    // Белые pill-блоки — визуальный центр по вертикали (preview = export).
    if (normHeight >= 0.055) {
      return { centerRatio: 0.5, fontOffsetRatio: 0.55 };
    }
    return { centerRatio: 0.5, fontOffsetRatio: 0.55 };
  }

  if (isBirthQuestionnairePage(lineGuideId, slot.page) && inputKind === 'block') {
    if (isPregnancy60Page52WhiteBlockSlot(slot, lineGuideId)) {
      return { centerRatio: 0.5, fontOffsetRatio: 0.5 };
    }
    const normHeight = slot.normHeight ?? 0;
    const normY = slot.normY ?? 0;
    if (normHeight <= 0.032) {
      if (normY >= 0.49 && normY <= 0.52) {
        return { centerRatio: 0.34, fontOffsetRatio: 0.78 };
      }
      if (normY >= 0.54 && normY <= 0.57) {
        return { centerRatio: 0.36, fontOffsetRatio: 0.78 };
      }
      return { centerRatio: 0.34, fontOffsetRatio: 0.78 };
    }
    if (lineGuideId === 'pregnancy_60' && slot.page === 52 && normY >= 0.51 && normY <= 0.56) {
      return { centerRatio: 0.56, fontOffsetRatio: 0.66 };
    }
    return { centerRatio: 0.5, fontOffsetRatio: 0.72 };
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
    slot.normY >= 0.762 &&
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
  slot: Pick<
    TextLineSlot,
    | 'inputKind'
    | 'width'
    | 'page'
    | 'hasLabel'
    | 'index'
    | 'inlineLabelTail'
    | 'x'
    | 'continuationGroup'
    | 'normWidth'
  >,
  lineGuideId?: string,
  allSlots?: readonly TextLineSlot[],
): TemplateTextInsets {
  if (
    slot.inlineLabelTail &&
    lineGuideId &&
    isPregnancyWeeklyStructuredPage(lineGuideId, slot.page) &&
    'x' in slot &&
    typeof slot.x === 'number'
  ) {
    return getPregnancyWeeklyInlineTailTextInsets(
      slot as TextLineSlot,
      lineGuideId,
      allSlots,
    );
  }
  if (lineGuideId === 'holidays_birthday_60' && slot.inputKind === 'block') {
    const pad = slot.width * 0.06;
    return { left: pad, width: Math.max(0, slot.width - pad * 2) };
  }
  if (isBirthQuestionnairePage(lineGuideId, slot.page) &&
    (slot.inputKind ?? 'line') === 'line'
  ) {
    // Единый отступ от начала печатной линии на всех строках анкеты.
    const pad = Math.min(0.012, Math.max(0.008, slot.width * 0.035));
    return { left: pad, width: Math.max(0, slot.width - pad) };
  }
  if (isPregnancy60Page52WhiteBlockSlot(slot, lineGuideId)) {
    const pad = slot.width * 0.06;
    return { left: pad, width: Math.max(0, slot.width - pad * 2) };
  }
  if (
    isBirthQuestionnairePage(lineGuideId, slot.page) &&
    slot.inputKind === 'block' &&
    slot.hasLabel
  ) {
    const pad = slot.width * 0.06;
    return { left: pad, width: Math.max(0, slot.width - pad) };
  }
  if (
    isBirthQuestionnairePage(lineGuideId, slot.page) &&
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
  | 'strokeY'
  | 'inlineLabelTail'
>;


function resolveAlreadyMomLineStrokeY(
  slot: Pick<PregnancyWeeklyStrokeSlot, 'y' | 'lineHeight' | 'strokeY'>,
): number {
  if (typeof slot.strokeY === 'number') return slot.strokeY;
  return slot.y + slot.lineHeight;
}

/** Top Text для «Уже мама» — weekly EXTRA_LIFT + RN ascent + небольшой зазор над штрихом. */
export function getAlreadyMomLineTextTop(
  slot: PregnancyWeeklyStrokeSlot,
  fittedSize: number,
  lineGuideId?: string,
  _allSlots?: readonly PregnancyWeeklyStrokeSlot[],
  fontId?: string | null,
): number {
  const strokeY = resolveAlreadyMomLineStrokeY(slot);
  const offset = resolveStrokeBaselinePreviewFontOffset(
    fontId,
    slot,
    lineGuideId,
  );
  const lift = slot.lineHeight * PREGNANCY_WEEKLY_EXTRA_LIFT_BAND_RATIO;
  const clearance = fittedSize * PREGNANCY_ALREADY_MOM_STROKE_CLEARANCE_RATIO;
  return strokeY - fittedSize * offset - lift - clearance;
}

/** Top Text для «Анкета родов» — baseline на штрихе, font-aware (без weekly EXTRA_LIFT). */
export function getBirthQuestionnaireLineTextTop(
  slot: PregnancyWeeklyStrokeSlot,
  fittedSize: number,
  fontId?: string | null,
  lineGuideId?: string,
): number {
  const strokeY =
    typeof slot.strokeY === 'number' ? slot.strokeY : slot.y + slot.lineHeight;
  const offset = resolveStrokeBaselinePreviewFontOffset(
    fontId,
    slot,
    lineGuideId,
  );
  return strokeY - fittedSize * offset;
}

function usesPregnancyWeeklyGuideStrokeBaseline(
  slot: Pick<PregnancyWeeklyStrokeSlot, 'strokeY' | 'page' | 'continuationGroup'>,
  lineGuideId?: string,
): boolean {
  if (typeof slot.strokeY !== 'number') return false;
  if (!isPregnancyWeeklyStructuredPage(lineGuideId, slot.page)) return false;
  return isPregnancyWeeklyMultilineGroup(lineGuideId, slot.continuationGroup);
}

function resolvePregnancyWeeklyStrokeTextMetrics(
  slot: Pick<
    PregnancyWeeklyStrokeSlot,
    'strokeY' | 'lineHeight' | 'inlineLabelTail' | 'normHeight' | 'page' | 'continuationGroup'
  >,
  lineGuideId?: string,
  fontId?: string | null,
): { capRatio: number; lift: number } {
  const rnRatio = getRnAscentRatioAt16(fontId);

  // Guide-stroke (планы/ощущения) и single-line (дата): RN ascent на штрихе.
  if (usesPregnancyWeeklyGuideStrokeBaseline(slot, lineGuideId)) {
    return {
      capRatio: rnRatio ?? PREGNANCY_WEEKLY_GUIDE_STROKE_FONT_OFFSET,
      lift: 0,
    };
  }

  if (rnRatio != null) {
    return { capRatio: rnRatio, lift: 0 };
  }

  let lift = slot.lineHeight * PREGNANCY_WEEKLY_EXTRA_LIFT_BAND_RATIO;
  const normH = slot.normHeight ?? 0;
  if (
    slot.inlineLabelTail === true &&
    normH > PREGNANCY_WEEKLY_LINE_PITCH * 1.15
  ) {
    lift += slot.lineHeight * PREGNANCY_WEEKLY_INLINE_TAIL_EXTRA_LIFT_BAND_RATIO;
  }
  return { capRatio: PREGNANCY_WEEKLY_CAP_HEIGHT_RATIO, lift };
}

/** Top Text для недельной строки — baseline на штрихе (RN ascent ↔ PDF). */
export function getPregnancyWeeklyLineTextTop(
  slot: PregnancyWeeklyStrokeSlot,
  fittedSize: number,
  lineGuideId?: string,
  allSlots?: readonly PregnancyWeeklyStrokeSlot[],
  fieldStartIndex?: number,
  fontId?: string | null,
): number {
  const strokeY = getPregnancyWeeklyLineStrokeY(
    slot,
    allSlots,
    lineGuideId,
    fieldStartIndex,
  );
  const { capRatio, lift } = resolvePregnancyWeeklyStrokeTextMetrics(
    slot,
    lineGuideId,
    fontId,
  );
  return strokeY - fittedSize * capRatio - lift;
}

/** Top Text для линованных страниц «История родов» / «Письмо малышу». */
export function getPregnancyRuledNotebookLineTextTop(
  slot: PregnancyWeeklyStrokeSlot,
  fittedSize: number,
  lineGuideId?: string,
  allSlots?: readonly PregnancyWeeklyStrokeSlot[],
  fieldStartIndex?: number,
): number {
  const strokeY = getPregnancyWeeklyLineStrokeY(
    slot,
    allSlots,
    lineGuideId,
    fieldStartIndex,
  );
  const lift = slot.lineHeight * PREGNANCY_RULED_NOTEBOOK_LIFT_BAND_RATIO;
  return strokeY - fittedSize * PREGNANCY_RULED_NOTEBOOK_CAP_HEIGHT_RATIO - lift;
}


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
  _allSlots?: readonly PregnancyWeeklyStrokeSlot[],
  lineGuideId?: string,
  _fieldStartIndex?: number,
): number {
  if (typeof slot.strokeY === 'number') {
    return slot.strokeY;
  }

  if (lineGuideId && slot.page != null) {
    const guideNorm = getPregnancyWeeklyGuideStrokeNormY(
      lineGuideId,
      slot.page,
      slot.index,
      slot.normHeight ?? 0,
    );
    if (guideNorm != null) {
      return mapPregnancyWeeklyStrokeNormYToViewport(slot, guideNorm);
    }
  }

  return slot.y + slot.lineHeight;
}

/** Высота полосы для типографики — OCR иногда даёт 0.08 вместо ~0.041 между линиями. */
export function getPregnancyWeeklyTypographyBandHeight(
  slot: Pick<TextLineSlot, 'lineHeight' | 'normHeight' | 'page'>,
  lineGuideId?: string,
): number {
  if (
    !isPregnancyWeeklyStructuredPage(lineGuideId, slot.page) &&
    !isPregnancyRuledNotebookPage(lineGuideId, slot.page)
  ) {
    return slot.lineHeight;
  }
  const normH = slot.normHeight ?? 0;
  if (normH <= PREGNANCY_WEEKLY_LINE_PITCH * 1.15) {
    return slot.lineHeight;
  }
  return slot.lineHeight * (PREGNANCY_WEEKLY_LINE_PITCH / normH);
}

/** @deprecated Используйте getPregnancyWeeklyLineStrokeY */
export function getPregnancyWeeklyLineStrokeRatio(normHeight: number): number {
  if (normHeight <= PREGNANCY_WEEKLY_COMPACT_LINE_HEIGHT) return 0.5;
  return 1;
}

/** p16 верхнее «(ДАТА)» у заголовка. */
function isKidsP16DreamsTopDateLineSlot(
  lineGuideId: string | undefined,
  slot: { page?: number; index?: number },
): boolean {
  return lineGuideId === 'kids_48' && slot.page === 16 && slot.index === 0;
}

/** p20 «Таинство крещения» — дата на штрихе под заголовком. */
function isKidsP20BaptismDateLineSlot(
  lineGuideId: string | undefined,
  slot: { page?: number; index?: number },
): boolean {
  return lineGuideId === 'kids_48' && slot.page === 20 && slot.index === 0;
}

function isKids48P8DateLineSlot(
  lineGuideId: string | undefined,
  slot: Pick<TextLineSlot, 'page' | 'index'>,
): boolean {
  return lineGuideId === 'kids_48' && slot.page === 8 && slot.index === 0;
}

function isKids48P9DateLineSlot(
  lineGuideId: string | undefined,
  slot: Pick<TextLineSlot, 'page' | 'index'>,
): boolean {
  return lineGuideId === 'kids_48' && slot.page === 9 && slot.index === 0;
}

function isKidsEventDateLineSlot(
  lineGuideId: string | undefined,
  slot: Pick<TextLineSlot, 'page' | 'index'>,
): boolean {
  return isKids48P8DateLineSlot(lineGuideId, slot) || isKids48P9DateLineSlot(lineGuideId, slot);
}

function isKidsStrokeBaselineDateLineSlot(
  lineGuideId: string | undefined,
  slot: Pick<TextLineSlot, 'page' | 'index'>,
): boolean {
  return (
    isKidsBottomDateLineSlot(lineGuideId, slot) ||
    isKidsP16DreamsTopDateLineSlot(lineGuideId, slot) ||
    isKidsP20BaptismDateLineSlot(lineGuideId, slot)
  );
}

/** Нижняя «ДАТА» — sync с KIDS_BOTTOM_DATE_* в textLineSlots.ts. */
function isKidsBottomDateLineSlot(
  lineGuideId: string | undefined,
  slot: { page?: number; index?: number },
): boolean {
  if (lineGuideId !== 'kids_48' || slot.page == null || slot.index == null) {
    return false;
  }
  const bottomSlot0 = new Set([12, 14, 15, 17, 18, 19]);
  return slot.index === 0 && bottomSlot0.has(slot.page);
}

function isKidsP12DateLineSlot(
  lineGuideId: string | undefined,
  slot: Pick<TextLineSlot, 'page' | 'index'>,
): boolean {
  return isKidsBottomDateLineSlot(lineGuideId, slot);
}

export function getKidsP12DateLineTextTop(
  slot: Pick<
    TextLineSlot,
    'y' | 'lineHeight' | 'page' | 'index' | 'lineStrokeAtBottom' | 'textAnchorTop'
  >,
  fontSize: number,
  lineGuideId?: string,
  fontId?: string | null,
): number {
  const lineFitted = fitFontSizeToSlot(fontSize, slot.lineHeight, 'line', lineGuideId);
  const strokeY = resolveKids48LineStrokeY(slot);
  const gapAboveStroke = slot.lineHeight * KIDS_P12_DATE_LINE_GAP_BAND_RATIO;
  return getKidsStrokeBaselineTextTop(
    strokeY,
    lineFitted,
    fontId,
    slot,
    lineGuideId,
    gapAboveStroke,
  );
}

/** kids_48 p8 — дата чуть выше штриха «ДАТА» (доп. lift vs p9). */
export function getKids48P8DateLineTextTop(
  slot: Pick<TextLineSlot, 'y' | 'lineHeight' | 'page' | 'index' | 'lineStrokeAtBottom'>,
  fontSize: number,
  lineGuideId?: string,
  fontId?: string | null,
): number {
  const lineFitted = fitFontSizeToSlot(fontSize, slot.lineHeight, 'line', lineGuideId);
  const strokeY = resolveKids48LineStrokeY(slot);
  const gapAboveLine =
    slot.lineHeight *
    (KIDS_48_EVENT_DATE_TEXT_ABOVE_LINE_BAND_RATIO +
      KIDS_48_P8_EVENT_DATE_TEXT_LIFT_BAND_RATIO);
  return getKidsStrokeBaselineTextTop(
    strokeY,
    lineFitted,
    fontId,
    slot,
    lineGuideId,
    gapAboveLine,
  );
}

/** @see getKids48P8DateLineTextTop */
export function getKids48P9DateLineTextTop(
  slot: Pick<TextLineSlot, 'y' | 'lineHeight' | 'page' | 'index' | 'lineStrokeAtBottom'>,
  fontSize: number,
  lineGuideId?: string,
  fontId?: string | null,
): number {
  const lineFitted = fitFontSizeToSlot(fontSize, slot.lineHeight, 'line', lineGuideId);
  const strokeY = resolveKids48LineStrokeY(slot);
  const gapAboveLine = slot.lineHeight * KIDS_48_EVENT_DATE_TEXT_ABOVE_LINE_BAND_RATIO;
  return getKidsStrokeBaselineTextTop(
    strokeY,
    lineFitted,
    fontId,
    slot,
    lineGuideId,
    gapAboveLine,
  );
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
  allSlots?: readonly PregnancyWeeklyStrokeSlot[],
  fieldStartIndex?: number,
  fontId?: string | null,
): number {
  if (isPregnancy60WeeklyValueSlot(lineGuideId, slot)) {
    const inputKind = slot.inputKind ?? 'block';
    const fittedSize = fitFontSizeToSlot(
      fontSize,
      slot.lineHeight,
      inputKind,
      lineGuideId,
    );
    // Центр в бежевой ячейке (раньше вес = top, обхват = 0.38 — текст «уезжал» вверх).
    return slot.y + slot.lineHeight * 0.56 - fittedSize * 0.72;
  }

  const inputKind = slot.inputKind ?? 'line';
  const { fontSize: fittedSize } = getTemplateLineTypography(
    fontSize,
    slot.lineHeight,
    inputKind,
    lineGuideId
  );
  let top: number;

  if (isKids48P8DateLineSlot(lineGuideId, slot) && inputKind === 'line') {
    return getKids48P8DateLineTextTop(slot, fontSize, lineGuideId, fontId);
  }

  if (isKids48P9DateLineSlot(lineGuideId, slot) && inputKind === 'line') {
    return getKids48P9DateLineTextTop(slot, fontSize, lineGuideId, fontId);
  }

  if (isKidsStrokeBaselineDateLineSlot(lineGuideId, slot) && inputKind === 'line') {
    return getKidsP12DateLineTextTop(slot, fontSize, lineGuideId, fontId);
  }

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
    isPregnancyRuledNotebookPage(lineGuideId, slot.page) &&
    inputKind === 'line'
  ) {
    const strokeY = getPregnancyWeeklyLineStrokeY(
      slot,
      allSlots,
      lineGuideId,
      fieldStartIndex,
    );
    return getPregnancyRuledNotebookLineTextTop(
      { ...slot, strokeY },
      fittedSize,
      lineGuideId,
      allSlots,
      fieldStartIndex,
    );
  } else   if (
    isPregnancyWeeklyStructuredPage(lineGuideId, slot.page) &&
    inputKind === 'line' &&
    !isPregnancy60WeeklyValueSlot(lineGuideId, slot)
  ) {
    const strokeY = getPregnancyWeeklyLineStrokeY(
      slot,
      allSlots,
      lineGuideId,
      fieldStartIndex,
    );
    return getPregnancyWeeklyLineTextTop(
      { ...slot, strokeY },
      fittedSize,
      lineGuideId,
      allSlots,
      fieldStartIndex,
      fontId,
    );
  } else if (isAlreadyMomPage(lineGuideId, slot.page) && inputKind === 'line') {
    return getAlreadyMomLineTextTop(slot, fittedSize, lineGuideId, allSlots, fontId);
  } else if (
    isBirthQuestionnairePage(lineGuideId, slot.page) &&
    inputKind === 'line' &&
    slot.lineStrokeAtBottom
  ) {
    return getBirthQuestionnaireLineTextTop(slot, fittedSize, fontId, lineGuideId);
  } else if (usesStrokeBaselineLayout(slot, lineGuideId)) {
    const lineY =
      lineGuideId === 'kids_48'
        ? resolveKids48LineStrokeY(slot)
        : slot.y + slot.lineHeight;
    const preferredSize =
      lineGuideId === 'kids_48' && slot.page === 11
        ? Math.min(fontSize, KIDS_GROWTH_FIXED_LINE_FONT_SIZE)
        : lineGuideId === 'kids_48' && slot.page === 10
          ? Math.min(fontSize, KIDS_TEETH_FIXED_LINE_FONT_SIZE)
          : fontSize;
    const teethMax =
      lineGuideId === 'kids_48' && slot.page === 10
        ? KIDS_TEETH_FIXED_LINE_FONT_SIZE
        : undefined;
    const lineFitted = fitFontSizeToSlot(
      preferredSize,
      slot.lineHeight,
      inputKind,
      lineGuideId,
      teethMax,
    );
    if (lineGuideId === 'kids_48') {
      return getKidsStrokeBaselineTextTop(lineY, lineFitted, fontId, slot, lineGuideId);
    }
    top =
      lineY -
      lineFitted * resolveStrokeBaselinePreviewFontOffset(fontId, slot, lineGuideId);
    return top;
  } else if (lineGuideId === 'kids_48' && inputKind === 'line') {
    const lineY = resolveKids48LineStrokeY(slot);
    const preferredSize =
      slot.page === 11
        ? Math.min(fontSize, KIDS_GROWTH_FIXED_LINE_FONT_SIZE)
        : slot.page === 10
          ? Math.min(fontSize, KIDS_TEETH_FIXED_LINE_FONT_SIZE)
          : fontSize;
    const teethMax = slot.page === 10 ? KIDS_TEETH_FIXED_LINE_FONT_SIZE : undefined;
    const lineFitted = fitFontSizeToSlot(
      preferredSize,
      slot.lineHeight,
      'line',
      lineGuideId,
      teethMax,
    );
    return getKidsStrokeBaselineTextTop(lineY, lineFitted, fontId, slot, lineGuideId);
  } else {
    const { centerRatio, fontOffsetRatio } = resolveTemplateTextVerticalRatios(slot, lineGuideId);

    if (inputKind === 'block') {
      top = slot.y + slot.lineHeight * centerRatio - fittedSize * fontOffsetRatio;
    } else {
      const lineY = slot.y + slot.lineHeight * centerRatio;
      top = lineY - fittedSize * fontOffsetRatio;
    }
  }

  const isBirthQuestionnaireStrokeBaseline =
    isBirthQuestionnairePage(lineGuideId, slot.page) &&
    inputKind === 'line' &&
    slot.lineStrokeAtBottom;

  if (isBirthQuestionnaireStrokeBaseline || usesStrokeBaselineLayout(slot, lineGuideId)) {
    return top;
  }

  return applyTemplateLineStrokeClearance(top, fittedSize, inputKind);
}

/** Y штриха подчёркивания в viewport px. */
export function getTemplateLineStrokeY(
  slot: PregnancyWeeklyStrokeSlot & Partial<Pick<TextLineSlot, 'lineStrokeAtBottom'>>,
  _fontSize: number,
  lineGuideId?: string,
  allSlots?: readonly PregnancyWeeklyStrokeSlot[],
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

  if (isAlreadyMomPage(lineGuideId, slot.page) && inputKind === 'line') {
    return resolveAlreadyMomLineStrokeY(slot as PregnancyWeeklyStrokeSlot);
  }

  if (usesStrokeBaselineLayout(slot, lineGuideId)) {
    if (lineGuideId === 'kids_48') {
      return resolveKids48LineStrokeY(slot);
    }
    return slot.y + slot.lineHeight;
  }

  if (
    isPregnancyWeeklyStructuredPage(lineGuideId, slot.page) &&
    inputKind === 'line' &&
    !isPregnancy60WeeklyValueSlot(lineGuideId, slot)
  ) {
    return getPregnancyWeeklyLineStrokeY(slot, allSlots, lineGuideId, fieldStartIndex);
  }

  if (
    isPregnancyRuledNotebookPage(lineGuideId, slot.page) &&
    inputKind === 'line'
  ) {
    return getPregnancyWeeklyLineStrokeY(slot, allSlots, lineGuideId, fieldStartIndex);
  }

  if (lineGuideId === 'kids_48' && inputKind === 'line') {
    return resolveKids48LineStrokeY(slot);
  }

  if (
    isBirthQuestionnairePage(lineGuideId, slot.page) &&
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
    | 'strokeY'
    | 'inlineLabelTail'
  >,
  fontSize: number,
  lineGuideId?: string,
): number {
  return getTemplateLineStrokeY(slot, fontSize, lineGuideId);
}

/** Absolute Text `top` in viewport px — matches read-only preview row layout. */
export function getTemplateLinePreviewAbsoluteTextTop(
  slot: Pick<
    TextLineSlot,
    | 'y'
    | 'lineHeight'
    | 'inputKind'
    | 'page'
    | 'index'
    | 'continuationGroup'
    | 'lineStrokeAtBottom'
    | 'textAnchorTop'
    | 'hasLabel'
    | 'strokeY'
  >,
  fontSize: number,
  lineGuideId?: string,
  allSlots?: TextLineSlot[],
  fieldStartIndex?: number,
  fontId?: string | null,
): number {
  const inputKind = slot.inputKind ?? 'line';
  const fittedSize = fitFontSizeToSlot(
    fontSize,
    slot.lineHeight,
    inputKind,
    lineGuideId,
  );
  const { viewportTopInset, textTopInset } = getTemplateLineRowInsets(
    slot,
    fittedSize,
    inputKind,
    lineGuideId,
  );
  return (
    getTemplateLineTextTop(
      slot,
      fontSize,
      lineGuideId,
      allSlots,
      fieldStartIndex,
      fontId,
    ) -
    viewportTopInset +
    textTopInset
  );
}

function usesPregnancyAlbumRnLineHeightAscent(
  slot: Pick<TextLineSlot, 'page' | 'index'> &
    Partial<
      Pick<
        TextLineSlot,
        | 'inputKind'
        | 'continuationGroup'
        | 'inlineLabelTail'
        | 'hasLabel'
        | 'x'
        | 'normHeight'
      >
    >,
  lineGuideId?: string,
  allSlots?: readonly TextLineSlot[],
): boolean {
  if (lineGuideId !== 'pregnancy_60' && lineGuideId !== 'pregnancy_a5') return false;
  if ((slot.inputKind ?? 'line') !== 'line') return false;
  if (isPregnancyRuledNotebookPage(lineGuideId, slot.page)) return false;
  if (shouldClipPregnancyWeeklyFieldRow(slot, lineGuideId, allSlots)) return false;
  // «Постановка на учёт»: preview топит Amatic (diary sink). PDF ascent must match
  // resolveStrokeBaselinePreviewFontOffset — иначе baseline уезжает под штрих.
  if (lineGuideId === 'pregnancy_60' && slot.page === 4) return false;
  return true;
}

/** Ascent ratio: preview Text top + fittedSize * ratio → pdf-lib baseline. */
function resolveTemplateLinePdfAscentRatio(
  slot: Pick<
    TextLineSlot,
    | 'y'
    | 'lineHeight'
    | 'inputKind'
    | 'page'
    | 'index'
    | 'continuationGroup'
    | 'lineStrokeAtBottom'
    | 'textAnchorTop'
    | 'hasLabel'
    | 'inlineLabelTail'
    | 'strokeY'
  >,
  fittedSize: number,
  lineGuideId?: string,
  fontId?: string | null,
  allSlots?: readonly TextLineSlot[],
): number {
  const inputKind = slot.inputKind ?? 'line';

  if (
    isPregnancyRuledNotebookPage(lineGuideId, slot.page) &&
    inputKind === 'line'
  ) {
    return PREGNANCY_RULED_NOTEBOOK_CAP_HEIGHT_RATIO;
  }

  if (
    isPregnancyWeeklyTextLineSlot(lineGuideId, slot, allSlots) &&
    !isPregnancyRuledNotebookPage(lineGuideId, slot.page)
  ) {
    const { capRatio, lift } = resolvePregnancyWeeklyStrokeTextMetrics(
      slot as PregnancyWeeklyStrokeSlot,
      lineGuideId,
      fontId,
    );
    return capRatio + (fittedSize > 0 ? lift / fittedSize : 0);
  }

  const rnRatio = getRnAscentRatioAt16(fontId);
  if (rnRatio != null) {
    if (usesPregnancyAlbumRnLineHeightAscent(slot, lineGuideId, allSlots)) {
      return rnRatio;
    }
    if (
      isAlreadyMomPage(lineGuideId, slot.page) ||
      (isBirthQuestionnairePage(lineGuideId, slot.page) &&
        inputKind === 'line' &&
        slot.lineStrokeAtBottom)
    ) {
      return rnRatio;
    }
  }

  if (isAlreadyMomPage(lineGuideId, slot.page) && inputKind === 'line') {
    // EXTRA_LIFT + clearance в getAlreadyMomLineTextTop; ascent = preview font offset.
    return resolveStrokeBaselinePreviewFontOffset(fontId, slot, lineGuideId);
  }

  if (
    isBirthQuestionnairePage(lineGuideId, slot.page) &&
    inputKind === 'line' &&
    slot.lineStrokeAtBottom
  ) {
    return resolveStrokeBaselinePreviewFontOffset(fontId, slot, lineGuideId);
  }

  if (usesStrokeBaselineLayout(slot, lineGuideId)) {
    return resolveStrokeBaselinePreviewFontOffset(fontId, slot, lineGuideId);
  }

  return TEMPLATE_LINE_CAP_HEIGHT_RATIO;
}

export type TemplateLineRowLayout = {
  rowViewTop: number;
  rowTextTop: number;
  rowViewHeight: number;
  overflowVisible: boolean;
  lineHeight: number;
};

/** Shared preview row geometry for read-only and editor annotations. */
export function resolveTemplateLineRowLayout(params: {
  lineSlot: TextLineSlot;
  fontSize: number;
  lineGuideId?: string;
  lineSlots?: readonly TextLineSlot[];
  fieldStartIndex?: number;
  isKidsTeethOverlayLine?: boolean;
  fontId?: string | null;
}): TemplateLineRowLayout {
  const {
    lineSlot,
    fontSize,
    lineGuideId,
    lineSlots,
    fieldStartIndex,
    isKidsTeethOverlayLine = false,
    fontId,
  } = params;

  const rowStrokeTop = getTemplateLineTextTop(
    lineSlot,
    fontSize,
    lineGuideId,
    lineSlots,
    fieldStartIndex,
    fontId,
  );
  const rowTypography = getTemplateLineTypography(
    fontSize,
    lineSlot.lineHeight,
    getWishSlotInputKind(lineSlot, lineGuideId),
    lineGuideId,
  );
  const usesStrokeBaseline = usesStrokeBaselineLayout(lineSlot, lineGuideId);
  const { viewportTopInset, textTopInset } = getTemplateLineRowInsets(
    lineSlot,
    rowTypography.fontSize,
    getWishSlotInputKind(lineSlot, lineGuideId),
    lineGuideId,
  );

  const rowViewTop = rowStrokeTop - viewportTopInset;
  const rowViewHeight = isKidsTeethOverlayLine
    ? rowTypography.fontSize + 2
    : rowTypography.lineHeight + viewportTopInset;
  const rowTextTop = textTopInset;

  return {
    rowViewTop,
    rowTextTop,
    rowViewHeight,
    overflowVisible: isKidsTeethOverlayLine || usesStrokeBaseline,
    lineHeight: usesStrokeBaseline
      ? rowTypography.fontSize
      : rowTypography.lineHeight,
  };
}

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
    | 'textAnchorTop'
    | 'hasLabel'
    | 'inlineLabelTail'
    | 'strokeY'
    | 'continuationGroup'
  >,
  fontSize: number,
  lineGuideId?: string,
  allSlots?: TextLineSlot[],
  fontId?: string | null,
): number {
  const inputKind = slot.inputKind ?? 'line';
  // Same fitted size as getTemplateLineTextTop (kids p10/p11 caps). Using raw
  // fitFontSizeToSlot here pushed PDF baseline below the stroke while preview
  // stayed correct — text looked glued to the underline on export.
  const fittedSize = getEffectiveTemplateFontSize(lineGuideId, {
    lineHeight: slot.lineHeight,
    inputKind,
    width: 1,
    page: slot.page,
    index: slot.index,
  }, fontSize, { fontId: fontId ?? undefined });

  const previewTextTop = getTemplateLinePreviewAbsoluteTextTop(
    slot,
    fontSize,
    lineGuideId,
    allSlots,
    undefined,
    fontId,
  );
  const ascentRatio = resolveTemplateLinePdfAscentRatio(
    slot,
    fittedSize,
    lineGuideId,
    fontId,
    allSlots,
  );

  let baseline = previewTextTop + fittedSize * ascentRatio;
  if (isAlreadyMomPage(lineGuideId, slot.page) && inputKind === 'line') {
    baseline -= fittedSize * PREGNANCY_ALREADY_MOM_PDF_BASELINE_LIFT_RATIO;
  }
  if (
    lineGuideId === 'kids_48' &&
    slot.page === 1 &&
    inputKind === 'line' &&
    (slot.index == null || slot.index >= 1)
  ) {
    baseline -= fittedSize * KIDS_P1_PDF_BASELINE_LIFT_RATIO;
  }
  if (
    lineGuideId === 'kids_48' &&
    slot.page === 10 &&
    inputKind === 'line' &&
    (slot.index === 20 || slot.index === 21)
  ) {
    baseline -= fittedSize * KIDS_TEETH_BOTTOM_PDF_BASELINE_LIFT_RATIO;
  }
  if (
    lineGuideId === 'kids_48' &&
    slot.page === 10 &&
    inputKind === 'line' &&
    typeof slot.index === 'number' &&
    slot.index >= 0 &&
    slot.index <= 19
  ) {
    baseline -= fittedSize * KIDS_TEETH_DATE_PDF_BASELINE_LIFT_RATIO;
  }
  if (lineGuideId === 'kids_48' && slot.page === 11 && inputKind === 'line') {
    baseline -= fittedSize * KIDS_GROWTH_PDF_BASELINE_LIFT_RATIO;
  }
  return baseline;
}

/** Baseline в viewport px — единый путь preview ↔ PDF export. */
export function resolveTemplateLineViewportBaseline(params: {
  slot: Parameters<typeof getTemplateLinePdfBaselineY>[0];
  fontSize: number;
  lineGuideId?: string;
  allSlots?: TextLineSlot[];
  fontId?: string | null;
}): number {
  return getTemplateLinePdfBaselineY(
    params.slot,
    params.fontSize,
    params.lineGuideId,
    params.allSlots,
    params.fontId,
  );
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
  slotCount?: number;
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
    slotCount,
  } = params;

  const { segments } = distributeTextWithinContinuationGroup({
    text: previousText,
    startSlotIndex,
    slots,
    fontSize,
    lineGuideId,
    fontId,
    slotCount,
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

  if (
    slotCount != null &&
    slotCount > 1
  ) {
    // Любое многострочное поле (дневник style/pets и т.д.) — по templateLineCount,
    // а не по OCR continuationGroup (хвост и полная строка часто в разных группах).
    return distributeTextWithinFieldLines({
      text,
      startSlotIndex,
      lineCount: slotCount,
      slots,
      fontSize,
      lineGuideId,
      fontId,
      measureTextWidth,
    });
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
  let text = normalizeTemplateMultilineText(rawText, lineCount);

  if (lineCount > 1) {
    const startSlot = slots[startSlotIndex];
    if (
      lineGuideId &&
      startSlot &&
      isPregnancyWeeklyStructuredPage(lineGuideId, startSlot.page) &&
      isPregnancyWeeklyMultilineGroup(lineGuideId, startSlot.continuationGroup)
    ) {
      text = clampTextToFieldLines({
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
  const fieldSlots = resolveWeeklyFieldLineSlots(
    slots,
    startSlotIndex,
    lineCount,
    lineGuideId,
  );

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
  measureTextWidth?: TextWidthMeasure;
}): string {
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
  if (!text) return text;

  const distribute = (value: string) =>
    distributeTextWithinFieldLines({
      text: value,
      startSlotIndex,
      lineCount,
      slots,
      fontSize,
      lineGuideId,
      fontId,
      measureTextWidth,
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
