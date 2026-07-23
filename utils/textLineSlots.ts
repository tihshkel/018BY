import {
    getAlbumTextMargins,
    getKidsMonthAnswerLineLayout,
    getKidsMonthAnswerStrokeY,
    getKidsMonthAnswerWritableBounds,
    getTemplateTypographyProfile,
    isBlankLineGuideAlbum,
    isKidsMonthPage,
    DESIGNED_LABELED_LINE_TEXT_INSET_NORM,
    DESIGNED_LINE_EDGE_INSET_NORM,
    KIDS_FAMILY_TREE_NAME_LAYOUT_BY_INDEX,
    KIDS_FAMILY_TREE_NAME_Y_NUDGE_NORM,
    KIDS_MONTH_LINE_BAND_HEIGHT,
    KIDS_MONTH_LINE_X_INSET,
    PREGNANCY_WEEKLY_COMPACT_LINE_HEIGHT,
    PREGNANCY_WEEKLY_LINE_PITCH,
} from "@/constants/album-text-margins";
import { getKids48EventDateLineNorm } from "@/constants/kids-48-event-date-slots";
import { LINE_GUIDES } from "@/constants/line-guides";
import { LINE_SLOTS, type NormalizedLineSlot } from "@/constants/line-slots";
import type { NormalizedPhotoSlot } from "@/constants/photo-slots";
import type { Annotation } from "@/types/annotation";
import { resolveLineGuideId } from "@/utils/albumImages";
import { refineFamilyTreeSlotForViewport } from "@/utils/familyTreeSlots";
import {
    getContentRect,
    mapSourceNormToViewport,
    type ContentRect,
} from "@/utils/imageContentRect";
import { getPdfCirclePageData } from "@/utils/pdfCircleSlots";
import {
    getEffectiveTemplateFontSize,
    getPregnancyWeeklyTypographyBandHeight,
    getTemplateLineTextTop,
    getTemplateLineTypography,
} from "@/utils/templateLineText";
import { wrapTextToLines } from "@/utils/textWrap";

export type TextLineSlot = {
  index: number;
  page: number;
  y: number;
  x: number;
  width: number;
  lineHeight: number;
  hasLabel: boolean;
  continuationGroup: number;
  inputKind?: "line" | "block";
  /** Нормализованный центр слота по Y (0–1), для типографики */
  normY?: number;
  /** Нормализованная высота слота (0–1), для типографики */
  normHeight?: number;
  /** Нормализованная ширина слота (0–1) — для переносов независимо от viewport. */
  normWidth?: number;
  /** norm.y = штрих линии; полоса лежит над линией (как diary_interior) */
  lineStrokeAtBottom?: boolean;
  /** Y слота = верх полосы (калибровка «Вес» / «Обхват» на неделях pregnancy_60). */
  textAnchorTop?: boolean;
  /** Y штриха линии в viewport px (из LINE_GUIDES, без интерполяции OCR-полосы). */
  strokeY?: number;
  /** Хвост строки с печатной подписью — ввод сразу после «ПЛАНЫ НА НЕДЕЛЮ:» и т.п. */
  inlineLabelTail?: boolean;
};

export type GetLineSlotsParams = {
  lineGuideId: string;
  page: number;
  viewportWidth: number;
  viewportHeight: number;
  sourceWidth?: number;
  sourceHeight?: number;
  contentRect?: ContentRect;
};

function getNormalizedSlotsForPage(
  lineGuideId: string,
  page: number,
): readonly NormalizedLineSlot[] {
  const slotSet = (
    LINE_SLOTS as Record<string, Record<string, readonly NormalizedLineSlot[]>>
  )[lineGuideId];
  const fromSlots = slotSet?.[String(page)];
  if (fromSlots?.length) {
    return fromSlots.filter(
      (slot) =>
        !isBrownPage13AloneQuestionSpuriousSlot(lineGuideId, page, slot) &&
        !isBrownPage16PeachTitleSpuriousSlot(lineGuideId, page, slot) &&
        !isBrownPage17QuestionRowSpuriousSlot(lineGuideId, page, slot) &&
        !isBrownPage31ClassQuestionSpuriousSlot(lineGuideId, page, slot) &&
        !isBrownJournalTemplateSpuriousSlot(lineGuideId, page, slot) &&
        !isBrownJournalFirstInstructionSpuriousSlot(lineGuideId, page, slot) &&
        !isBrownJournalInstructionSpuriousSlot(lineGuideId, page, slot) &&
        !isPurpleJournalTemplateSpuriousSlot(lineGuideId, page, slot) &&
        !isPurpleJournalFirstInstructionSpuriousSlot(lineGuideId, page, slot) &&
        !isBrownDaySpreadTitleSpuriousSlot(lineGuideId, page, slot) &&
        !isPurpleDaySpreadTitleSpuriousSlot(lineGuideId, page, slot) &&
        !isBrownPeachBottomTitleSpuriousSlot(lineGuideId, page, slot) &&
        !isBrownGirlProfileSpuriousSlot(lineGuideId, page, slot) &&
        !isPurpleGirlProfileSpuriousSlot(lineGuideId, page, slot) &&
        !isBrownPage24FooterSpuriousSlot(lineGuideId, page, slot) &&
        !(
          lineGuideId === "diary_interior_brown" &&
          isBrownSpuriousQuestionRowSlot(page, slot, fromSlots)
        ),
    );
  }

  const guideSet = (
    LINE_GUIDES as Record<string, Record<string, readonly number[]>>
  )[lineGuideId];
  const normalizedLines = guideSet?.[String(page)];
  if (!normalizedLines?.length) return [];

  const margins = getAlbumTextMargins(lineGuideId);
  return normalizedLines.map((normY, index) => {
    const prev = index > 0 ? normalizedLines[index - 1] : null;
    const next =
      index < normalizedLines.length - 1 ? normalizedLines[index + 1] : null;
    let band = 0.028;
    if (prev !== null && next !== null) band = (next - prev) / 2;
    else if (next !== null) band = next - normY;
    else if (prev !== null) band = normY - prev;
    band = Math.min(Math.max(band, 0.012), 0.12);

    return {
      x: margins.x,
      y: normY,
      width: margins.width,
      height: band,
      hasLabel: true,
      continuationGroup: index + 1,
    };
  });
}

export function hasLineGuides(
  lineGuideId?: string,
  category?: string | null,
): boolean {
  const resolved = resolveLineGuideId(lineGuideId, category);
  if (!resolved || isBlankLineGuideAlbum(resolved)) return false;
  const slotSet = (
    LINE_SLOTS as Record<string, Record<string, readonly unknown[]>>
  )[resolved];
  if (slotSet && Object.keys(slotSet).length > 0) return true;
  const guideSet = (
    LINE_GUIDES as Record<string, Record<string, readonly number[]>>
  )[resolved];
  return !!guideSet && Object.keys(guideSet).length > 0;
}

export function resolveContentRectForPage(
  params: GetLineSlotsParams,
): ContentRect {
  const {
    viewportWidth,
    viewportHeight,
    sourceWidth,
    sourceHeight,
    contentRect,
  } = params;
  if (contentRect) return contentRect;
  return getContentRect(
    viewportWidth,
    viewportHeight,
    sourceWidth ?? viewportWidth,
    sourceHeight ?? viewportHeight,
  );
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 0.98);
}

function isDiaryInteriorLineGuide(lineGuideId: string): boolean {
  return (
    lineGuideId === "diary_interior_brown" ||
    lineGuideId === "diary_interior_purple"
  );
}

/** В PDF norm.y — координата штриха; полоса слота лежит над линией. */
function getDiarySlotTopNormY(norm: NormalizedLineSlot): number {
  return norm.y - norm.height;
}

/** Стр. 6 «Твоя анкета»: лишние линии над первым вопросом и peach-блоки внизу. */
function isBrownGirlProfileSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot,
): boolean {
  if (lineGuideId !== "diary_interior_brown" || page !== 6 || slot.hasLabel) {
    return false;
  }
  if (slot.y < 0.22) {
    return true;
  }
  return slot.y > 0.85;
}

/** Стр. 5 «Твоя анкета» (фиолетовый): декоративные линии слева и подвал. */
function isPurpleGirlProfileSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot,
): boolean {
  if (lineGuideId !== "diary_interior_purple" || page !== 5 || slot.hasLabel) {
    return false;
  }
  if (slot.y < 0.28) {
    return true;
  }
  return slot.y > 0.85;
}

/** Стр. 15: слот на заголовке «САМОЕ СОКРОВЕННОЕ» (не линии ввода в peach-блоке). */
function isBrownPeachBottomTitleSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot,
): boolean {
  if (lineGuideId !== "diary_interior_brown" || page !== 15 || slot.hasLabel) {
    return false;
  }
  // Title sits above the peach block (~0.83); answer lines start ~0.85+.
  return slot.y >= 0.82 && slot.y < 0.85 && slot.x < 0.35 && slot.width >= 0.35;
}

/** Стр. 16: линия под заголовком розового блока — не поле ввода. */
function isBrownPage16PeachTitleSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot,
): boolean {
  if (lineGuideId !== "diary_interior_brown" || page !== 16 || slot.hasLabel) {
    return false;
  }
  return (
    slot.y >= 0.695 && slot.y <= 0.715 && slot.x >= 0.08 && slot.width >= 0.65
  );
}

/** Стр. 31: ложная широкая линия на тексте «Сколько человек в классе?» — отключено для макета 09.06.26. */
function isBrownPage31ClassQuestionSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot,
): boolean {
  return false;
}

const BROWN_JOURNAL_TEMPLATE_PAGES = new Set([
  16, 20, 23, 25, 28, 33, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
]);

const PURPLE_JOURNAL_TEMPLATE_PAGES = new Set([
  9, 11, 13, 15, 17, 19, 23, 34, 35, 36, 37, 38, 39,
]);

const PURPLE_DAY_SPREAD_PAGES = new Set([24, 25, 26, 27]);
const PURPLE_FRIEND_QUESTIONNAIRE_PAGES = new Set([28, 29, 30, 31, 32, 33]);

function getDiaryCareerQuestionPage(lineGuideId: string): number {
  return lineGuideId === "diary_interior_purple" ? 5 : 6;
}

/** Первый розовый блок «НАПИШИ ИЛИ НАРИСУЙ!» — не поле ввода. */
function isBrownJournalFirstInstructionSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot,
): boolean {
  if (lineGuideId !== "diary_interior_brown" || slot.hasLabel) return false;
  if (!BROWN_JOURNAL_TEMPLATE_PAGES.has(page)) return false;
  return slot.y >= 0.25 && slot.y <= 0.3 && slot.x < 0.15 && slot.width >= 0.65;
}

function isBrownJournalInstructionSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot,
): boolean {
  if (lineGuideId !== "diary_interior_brown" || slot.hasLabel) return false;
  if (!BROWN_JOURNAL_TEMPLATE_PAGES.has(page)) return false;
  return false;
}

function isPurpleJournalFirstInstructionSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot,
): boolean {
  if (lineGuideId !== "diary_interior_purple" || slot.hasLabel) return false;
  if (!PURPLE_JOURNAL_TEMPLATE_PAGES.has(page)) return false;
  return slot.y >= 0.25 && slot.y <= 0.3 && slot.x < 0.15 && slot.width >= 0.65;
}

function isPurpleJournalTemplateSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot,
): boolean {
  if (lineGuideId !== "diary_interior_purple" || slot.hasLabel) return false;
  if (!PURPLE_JOURNAL_TEMPLATE_PAGES.has(page)) return false;
  if (
    slot.y >= 0.57 &&
    slot.y <= 0.64 &&
    slot.width >= 0.35 &&
    slot.width <= 0.55
  ) {
    return true;
  }
  if (
    slot.y >= 0.68 &&
    slot.y <= 0.715 &&
    slot.x < 0.15 &&
    slot.width >= 0.65
  ) {
    return true;
  }
  return false;
}

/** Журнальные блоки: подпись, смайлы, заголовок нижней секции — не поля ввода. */
function isBrownJournalTemplateSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot,
): boolean {
  if (lineGuideId !== "diary_interior_brown" || slot.hasLabel) return false;
  if (!BROWN_JOURNAL_TEMPLATE_PAGES.has(page)) return false;
  if (
    slot.y >= 0.57 &&
    slot.y <= 0.64 &&
    slot.width >= 0.35 &&
    slot.width <= 0.55
  ) {
    return true;
  }
  if (
    slot.y >= 0.68 &&
    slot.y <= 0.715 &&
    slot.x < 0.15 &&
    slot.width >= 0.65
  ) {
    return true;
  }
  return false;
}

/** Двойные дневные страницы: слоты на названии дня недели. */
function isBrownDaySpreadTitleSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot,
): boolean {
  if (lineGuideId !== "diary_interior_brown" || slot.hasLabel) return false;
  if (page < 34 || page > 40) return false;
  // Day titles are short centered fills (e.g. «Вторник» x≈0.38 w≈0.21) —
  // never full-width writing lines (w≥0.55) under the title.
  if (
    slot.y >= 0.20 &&
    slot.y <= 0.26 &&
    slot.x >= 0.28 &&
    slot.x <= 0.55 &&
    slot.width <= 0.4
  ) {
    return true;
  }
  if (
    slot.y >= 0.55 &&
    slot.y <= 0.64 &&
    slot.x >= 0.28 &&
    slot.x <= 0.55 &&
    slot.width <= 0.4
  ) {
    return true;
  }
  return false;
}

function isPurpleDaySpreadTitleSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot,
): boolean {
  if (lineGuideId !== "diary_interior_purple" || slot.hasLabel) return false;
  if (!PURPLE_DAY_SPREAD_PAGES.has(page)) return false;
  if (slot.y >= 0.14 && slot.y <= 0.22 && slot.x < 0.15 && slot.width >= 0.55) {
    return true;
  }
  if (slot.y >= 0.48 && slot.y <= 0.58 && slot.x < 0.15 && slot.width >= 0.65) {
    return true;
  }
  if (
    slot.y >= 0.55 &&
    slot.y <= 0.67 &&
    slot.x >= 0.35 &&
    slot.width <= 0.28
  ) {
    return true;
  }
  return false;
}

/** Стр. 24: нижняя декоративная линия под пунктом 5. */
function isBrownPage24FooterSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot,
): boolean {
  if (lineGuideId !== "diary_interior_brown" || page !== 24 || slot.hasLabel) {
    return false;
  }
  return slot.y >= 0.915 && slot.x < 0.2 && slot.width >= 0.65;
}

const BROWN_DAY_SPREAD_ILLUSTRATION_MAX_WIDTH = 0.55;

function refineBrownDaySpreadIllustrationNorm(
  page: number,
  norm: NormalizedLineSlot,
  allNorms: readonly NormalizedLineSlot[],
): NormalizedLineSlot {
  const isBrownDaySpread = page >= 34 && page <= 40;
  const isPurpleDaySpread = PURPLE_DAY_SPREAD_PAGES.has(page);
  if ((!isBrownDaySpread && !isPurpleDaySpread) || norm.hasLabel) return norm;

  const band =
    norm.y < 0.52
      ? allNorms.filter((slot) => slot.y >= 0.16 && slot.y < 0.52)
      : allNorms.filter((slot) => slot.y >= 0.6 && slot.y < 0.95);
  if (band.length < 2) return norm;

  const sortedBand = [...band].sort((a, b) => a.y - b.y || a.x - b.x);
  const normIndex = sortedBand.findIndex(
    (slot) =>
      Math.abs(slot.y - norm.y) < 0.001 && Math.abs(slot.x - norm.x) < 0.001,
  );
  if (normIndex < 0) return norm;

  const widths = sortedBand.map((slot) => slot.width);
  const maxWidth = Math.max(...widths);
  const shortLineWidth = widths
    .filter((width) => width < maxWidth - 0.03)
    .sort((a, b) => a - b)[0];
  const bottomStartIndex = Math.max(1, Math.floor(sortedBand.length * 0.5));
  if (normIndex < bottomStartIndex) return norm;

  const targetWidth =
    shortLineWidth != null
      ? Math.min(shortLineWidth, BROWN_DAY_SPREAD_ILLUSTRATION_MAX_WIDTH)
      : BROWN_DAY_SPREAD_ILLUSTRATION_MAX_WIDTH;
  if (norm.width <= targetWidth + 0.01) return norm;
  return { ...norm, width: targetWidth };
}

/** Анкета для друзей: Instagram / VK / TikTok — ответ справа от подписи. */
function refinePurpleFriendSocialRowNorm(
  page: number,
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  if (!PURPLE_FRIEND_QUESTIONNAIRE_PAGES.has(page) || norm.hasLabel)
    return norm;
  if (norm.y < 0.76 || norm.y > 0.94) return norm;

  const minAnswerLeft = 0.28;
  if (norm.x >= minAnswerLeft || norm.width <= 0.45) return norm;

  const right = norm.x + norm.width;
  const x = minAnswerLeft;
  const width = Math.max(0.15, Math.min(right - x, 0.98 - x));
  return { ...norm, x, width };
}

/** Стр. 17: ложный слот на строке вопроса «Ты любишь животных?». */
function isBrownPage17QuestionRowSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot,
): boolean {
  if (lineGuideId !== "diary_interior_brown" || page !== 17 || slot.hasLabel) {
    return false;
  }
  return false;
}

function refineBrownPage16PeachBlockNorm(
  page: number,
  norm: NormalizedLineSlot,
  allNorms: readonly NormalizedLineSlot[],
): NormalizedLineSlot {
  if (page !== 16 || norm.inputKind !== "block" || norm.y < 0.74) {
    return norm;
  }

  const index = allNorms.indexOf(norm);
  const prev = index > 0 ? allNorms[index - 1] : null;
  const gap = prev ? norm.y - prev.y : norm.height;
  const cellHeight = Math.min(Math.max(gap * 0.94, 0.038), 0.05);

  return { ...norm, height: cellHeight };
}

/** Стр. 21 «Путешествия»: хвосты после подписей — не залезать на печатный вопрос. */
function refineBrownPage21LabeledRowNorm(
  page: number,
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  if (page !== 21 || norm.hasLabel) return norm;

  const rowMinX: Array<{ minY: number; maxY: number; minX: number }> = [
    { minY: 0.165, maxY: 0.19, minX: 0.45 },
    { minY: 0.31, maxY: 0.34, minX: 0.52 },
    { minY: 0.385, maxY: 0.412, minX: 0.39 },
    { minY: 0.42, maxY: 0.45, minX: 0.46 },
    { minY: 0.46, maxY: 0.49, minX: 0.78 },
    { minY: 0.54, maxY: 0.57, minX: 0.69 },
    { minY: 0.615, maxY: 0.65, minX: 0.58 },
    { minY: 0.655, maxY: 0.69, minX: 0.58 },
    { minY: 0.74, maxY: 0.77, minX: 0.69 },
  ];

  for (const row of rowMinX) {
    if (norm.y < row.minY || norm.y > row.maxY) continue;
    if (norm.x >= row.minX) {
      return { ...norm, inlineLabelTail: true };
    }
    const right = norm.x + norm.width;
    const x = row.minX;
    return {
      ...norm,
      x,
      width: Math.max(0.05, Math.min(right - x, 0.98 - x)),
      inlineLabelTail: true,
    };
  }

  return norm;
}

/** Стр. 24: хвосты вопросов и список — не перекрывать подписи и кружки. */
function refineBrownPage24ListRowNorm(
  page: number,
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  if (page !== 24 || norm.hasLabel) return norm;

  const rowMinX: Array<{ minY: number; maxY: number; minX: number }> = [
    { minY: 0.285, maxY: 0.305, minX: 0.47 },
    { minY: 0.325, maxY: 0.35, minX: 0.37 },
    { minY: 0.37, maxY: 0.395, minX: 0.5 },
    { minY: 0.415, maxY: 0.44, minX: 0.51 },
    { minY: 0.46, maxY: 0.485, minX: 0.59 },
    { minY: 0.5, maxY: 0.525, minX: 0.56 },
  ];

  for (const row of rowMinX) {
    if (norm.y < row.minY || norm.y > row.maxY) continue;
    if (norm.x >= row.minX) return norm;
    const right = norm.x + norm.width;
    // Never shrink past a usable answer width — prefer the real stroke end.
    const x = row.minX;
    const width = Math.max(0.2, Math.min(right - x, 0.98 - x));
    if (width < 0.15) return norm;
    return { ...norm, x, width, inlineLabelTail: true };
  }

  // Numbered list: sit just after the pink circles (cx≈0.124, radius≈0.033).
  if (norm.y < 0.63) return norm;

  const listMinX = 0.155;
  if (Math.abs(norm.x - listMinX) < 0.005) return norm;
  const right = norm.x + norm.width;
  const x = listMinX;
  return {
    ...norm,
    x,
    width: Math.max(0.2, Math.min(right - x, 0.98 - x)),
  };
}

/** Стр. 17: единая высота полос на линиях. */
function refineBrownPage17UniformHeightNorm(
  page: number,
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  if (page !== 17 || norm.hasLabel) return norm;
  if (norm.y < 0.24 || norm.y > 0.9) return norm;
  return { ...norm, height: 0.032 };
}

/** Стр. 17: нижний блок — только левая колонка, без иллюстрации кота. */
function refineBrownPage17BottomBlockNorm(
  page: number,
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  if (page !== 17 || norm.y < 0.75) return norm;

  const maxWidth = 0.59;
  if (norm.width <= maxWidth) return norm;
  return { ...norm, width: maxWidth };
}

function applyBrownLabeledRowMinX(
  norm: NormalizedLineSlot,
  rows: Array<{ minY: number; maxY: number; minX: number }>,
): NormalizedLineSlot {
  for (const row of rows) {
    if (norm.y < row.minY || norm.y > row.maxY) continue;
    if (norm.x >= row.minX) return norm;
    const right = norm.x + norm.width;
    const x = row.minX;
    return { ...norm, x, width: Math.max(0.05, Math.min(right - x, 0.98 - x)) };
  }
  return norm;
}

function applyLabeledRowMinX(
  norm: NormalizedLineSlot,
  rows: { minY: number; maxY: number; minX: number }[],
): NormalizedLineSlot {
  for (const row of rows) {
    if (norm.y < row.minY || norm.y > row.maxY) continue;
    if (norm.x >= row.minX) return norm;
    const right = norm.x + norm.width;
    const x = row.minX;
    return { ...norm, x, width: Math.max(0.05, Math.min(right - x, 0.98 - x)) };
  }
  return norm;
}

function refinePurplePage5LabeledRowNorm(
  page: number,
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  if (page !== 5 || norm.hasLabel) return norm;
  return applyLabeledRowMinX(norm, [
    { minY: 0.478, maxY: 0.508, minX: 0.52 },
    { minY: 0.728, maxY: 0.758, minX: 0.52 },
  ]);
}

function refinePurplePage16LabeledRowNorm(
  page: number,
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  if (page !== 16 || norm.hasLabel) return norm;
  return applyLabeledRowMinX(norm, [
    { minY: 0.488, maxY: 0.508, minX: 0.58 },
    { minY: 0.552, maxY: 0.572, minX: 0.56 },
  ]);
}

function refinePurplePage22LabeledRowNorm(
  page: number,
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  if (page !== 22 || norm.hasLabel) return norm;
  return applyLabeledRowMinX(norm, [
    { minY: 0.338, maxY: 0.368, minX: 0.52 },
    { minY: 0.598, maxY: 0.628, minX: 0.58 },
    { minY: 0.818, maxY: 0.848, minX: 0.52 },
  ]);
}

/** Стр. 26 «Одежда и стиль»: хвосты подписей — не на текст вопроса. */
function refineBrownPage26LabeledRowNorm(
  page: number,
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  if (page !== 26 || norm.hasLabel) return norm;
  return applyBrownLabeledRowMinX(norm, [
    { minY: 0.498, maxY: 0.518, minX: 0.58 },
    { minY: 0.572, maxY: 0.592, minX: 0.58 },
    { minY: 0.752, maxY: 0.772, minX: 0.52 },
  ]);
}

/** Стр. 31 «Школьная жизнь»: выравнивание хвостов и единая высота строк. */
function refineBrownPage31LabeledRowNorm(
  page: number,
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  if (page !== 31 || norm.hasLabel) return norm;

  let refined = applyBrownLabeledRowMinX(norm, [
    { minY: 0.31, maxY: 0.335, minX: 0.61 },
    { minY: 0.405, maxY: 0.43, minX: 0.53 },
    { minY: 0.47, maxY: 0.495, minX: 0.39 },
    { minY: 0.535, maxY: 0.56, minX: 0.6 },
    { minY: 0.61, maxY: 0.635, minX: 0.64 },
    { minY: 0.685, maxY: 0.715, minX: 0.82 },
    { minY: 0.86, maxY: 0.885, minX: 0.51 },
  ]);

  if (refined.inputKind !== "block" && refined.y >= 0.32 && refined.y <= 0.94) {
    refined = { ...refined, height: 0.032 };
  }

  return refined;
}

/** Стр. 15 «Мечты»: единая высота полос на белых линиях. */
function refineBrownPage15PeachLineNorm(
  page: number,
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  if (page !== 15 || norm.hasLabel) return norm;
  if (norm.y < 0.16 || norm.y > 0.95) return norm;
  return { ...norm, height: 0.028 };
}

/** Стр. 26: единая высота строк ввода. */
function refineBrownPage26UniformHeightNorm(
  page: number,
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  if (page !== 26 || norm.hasLabel || norm.inputKind === "block") return norm;
  if (norm.y < 0.28 || norm.y > 0.94) return norm;
  return { ...norm, height: 0.032 };
}

function isBrownWideBlockAnswerSlot(slot: NormalizedLineSlot): boolean {
  return !slot.hasLabel && slot.x < 0.15 && slot.width >= 0.72;
}

/** Стр. 13: хвост «Любимый мультфильм» (stroke ny≈0.429, left≈0.388). */
function isBrownPage13CartoonTailNorm(
  lineGuideId: string,
  page: number,
  norm: NormalizedLineSlot,
): boolean {
  if (lineGuideId !== "diary_interior_brown" || page !== 13 || norm.hasLabel) {
    return false;
  }
  return (
    norm.y >= 0.420 &&
    norm.y <= 0.440 &&
    norm.x >= 0.36 &&
    norm.width >= 0.38 &&
    norm.width <= 0.55
  );
}

/** Стр. 13: хвосты «Любимый мультфильм» / «…сериал» / «…игрушка». */
function isBrownPage13FavoritesLabelTailSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot,
): boolean {
  if (lineGuideId !== "diary_interior_brown" || page !== 13 || slot.hasLabel) {
    return false;
  }
  return (
    slot.y >= 0.420 &&
    slot.y <= 0.555 &&
    slot.x >= 0.28 &&
    slot.width >= 0.38 &&
    slot.width <= 0.62
  );
}

function isBrownPage13AloneQuestionSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot,
): boolean {
  if (lineGuideId !== "diary_interior_brown" || page !== 13 || slot.hasLabel) {
    return false;
  }
  if (isBrownPage13FavoritesLabelTailSlot(lineGuideId, page, slot)) {
    return false;
  }

  // «…остаёшься одна?» — микро-хвост справа на строке вопроса (ny≈0.36–0.39), не строка ответа ниже.
  if (
    slot.y >= 0.34 &&
    slot.y <= 0.39 &&
    slot.x >= 0.65 &&
    slot.width >= 0.08 &&
    slot.width <= 0.25
  ) {
    return true;
  }

  return false;
}

/** Стр. 17 и др.: дубль на той же строке, не хвост+продолжение в одной группе. */
function isBrownSpuriousQuestionRowSlot(
  page: number,
  slot: NormalizedLineSlot,
  allSlots: readonly NormalizedLineSlot[],
): boolean {
  if (page === 17) return false;
  if (slot.hasLabel || isBrownWideBlockAnswerSlot(slot)) return false;

  const continuationPartner = allSlots.find(
    (candidate) =>
      candidate !== slot &&
      candidate.continuationGroup === slot.continuationGroup &&
      Math.abs(candidate.y - slot.y) > 0.015,
  );
  if (continuationPartner) return false;

  const sameRowDuplicate = allSlots.some(
    (candidate) =>
      candidate !== slot &&
      Math.abs(candidate.y - slot.y) < 0.005 &&
      brownSlotHorizontalOverlapRatio(slot, candidate) > 0.8,
  );
  if (sameRowDuplicate) return true;

  return false;
}

function brownSlotHorizontalOverlapRatio(
  a: Pick<NormalizedLineSlot, "x" | "width">,
  b: Pick<NormalizedLineSlot, "x" | "width">,
): number {
  const aRight = a.x + a.width;
  const bRight = b.x + b.width;
  const overlap = Math.min(aRight, bRight) - Math.max(a.x, b.x);
  if (overlap <= 0) return 0;
  return overlap / Math.min(a.width, b.width);
}

/** Стр. 13: хвост «…заниматься?» — текст чуть правее «?». */
function isBrownPage13SportQuestionTailNorm(
  lineGuideId: string,
  page: number,
  norm: NormalizedLineSlot,
): boolean {
  if (lineGuideId !== "diary_interior_brown" || page !== 13 || norm.hasLabel) {
    return false;
  }
  return (
    norm.y >= 0.285 &&
    norm.y <= 0.295 &&
    norm.x >= 0.77 &&
    norm.width >= 0.08 &&
    norm.width <= 0.2
  );
}

/** Левый край широких строк (Пожелания, продолжение «Кем хочешь стать») — PDF wide-block. */
const BROWN_WISH_CONTINUATION_LEFT_NORM = 0.08479;
/** Первая короткая строка справа от подписи — чуть правее слота. */
const BROWN_WISH_HEAD_TEXT_INSET_NORM = 0.012;
/** Стр. 6: короткая строка ответа справа от «?» (~75–80% ширины макета). */
const BROWN_PAGE6_CAREER_HEAD_LEFT_NORM = 0.768;
const BROWN_PAGE6_CAREER_HEAD_WIDTH_NORM = 0.127;
/**
 * Стр. 6 «Твоя анкета»: длинные вопросы — ответ только в хвосте справа от подписи
 * (PNG: season labelEnd≈0.63, pets≈0.51).
 */
const BROWN_PAGE6_SEASON_ANSWER_LEFT_NORM = 0.645;
const BROWN_PAGE6_SEASON_ANSWER_WIDTH_NORM = 0.265;
const BROWN_PAGE6_PETS_ANSWER_LEFT_NORM = 0.52;
const BROWN_PAGE6_PETS_ANSWER_WIDTH_NORM = 0.39;
/**
 * Анкета мамы/папы: первая строка «Пожелания…» — короткий хвост на линии подписи
 * (PNG: labelEnd≈0.534, strokeY≈0.77), далее 3 wide-продолжения.
 */
const BROWN_WISH_LABEL_HEAD_Y_NORM = 0.77;
const BROWN_WISH_LABEL_HEAD_LEFT_NORM = 0.545;
const BROWN_WISH_LABEL_HEAD_WIDTH_NORM = 0.35;

export function isBrownPage6CareerShortHeadNorm(
  lineGuideId: string,
  page: number,
  norm: Pick<NormalizedLineSlot, "y" | "x" | "width" | "hasLabel">,
): boolean {
  const careerPage = getDiaryCareerQuestionPage(lineGuideId);
  const minY = lineGuideId === "diary_interior_purple" ? 0.728 : 0.755;
  return (
    (lineGuideId === "diary_interior_brown" ||
      lineGuideId === "diary_interior_purple") &&
    page === careerPage &&
    !norm.hasLabel &&
    norm.y >= minY &&
    norm.y <= 0.782 &&
    norm.x >= 0.52 &&
    norm.width >= 0.06 &&
    norm.width <= 0.42
  );
}

export function isBrownPage6CareerContinuationNorm(
  lineGuideId: string,
  page: number,
  norm: Pick<NormalizedLineSlot, "y" | "x" | "hasLabel" | "width">,
): boolean {
  const careerPage = getDiaryCareerQuestionPage(lineGuideId);
  return (
    (lineGuideId === "diary_interior_brown" ||
      lineGuideId === "diary_interior_purple") &&
    page === careerPage &&
    !norm.hasLabel &&
    norm.y >= 0.788 &&
    norm.y <= 0.845 &&
    norm.width >= 0.45 &&
    norm.x < 0.2
  );
}

export function isBrownWishShortHeadNorm(
  lineGuideId: string,
  norm: Pick<NormalizedLineSlot, "y" | "x" | "width" | "hasLabel">,
): boolean {
  return (
    (lineGuideId === "diary_interior_brown" ||
      lineGuideId === "diary_interior_purple") &&
    !norm.hasLabel &&
    norm.y >= 0.762 &&
    norm.y <= 0.79 &&
    norm.x >= 0.27 &&
    norm.width >= 0.25 &&
    norm.width < 0.66
  );
}

export function isBrownWishContinuationNorm(
  lineGuideId: string,
  norm: Pick<NormalizedLineSlot, "y" | "inputKind" | "hasLabel" | "width">,
): boolean {
  return (
    (lineGuideId === "diary_interior_brown" ||
      lineGuideId === "diary_interior_purple") &&
    norm.inputKind === "block" &&
    !norm.hasLabel &&
    norm.y >= 0.798 &&
    norm.width >= 0.65
  );
}

function isDiaryParentQuestionnairePage(
  lineGuideId: string,
  page: number,
): boolean {
  return (
    (lineGuideId === "diary_interior_brown" && (page === 7 || page === 8)) ||
    (lineGuideId === "diary_interior_purple" && (page === 6 || page === 7))
  );
}

/** Стр. 6: «время года» / «питомцы» — слоты OCR начинались под текстом вопроса. */
function refineBrownGirlProfileLongQuestionTailNorm(
  lineGuideId: string,
  page: number,
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  if (lineGuideId !== "diary_interior_brown" || page !== 6 || norm.hasLabel) {
    return norm;
  }

  if (norm.y >= 0.47 && norm.y <= 0.51 && norm.x < 0.55) {
    return {
      ...norm,
      x: BROWN_PAGE6_SEASON_ANSWER_LEFT_NORM,
      width: BROWN_PAGE6_SEASON_ANSWER_WIDTH_NORM,
    };
  }

  if (norm.y >= 0.525 && norm.y <= 0.56 && norm.x < 0.48) {
    return {
      ...norm,
      x: BROWN_PAGE6_PETS_ANSWER_LEFT_NORM,
      width: BROWN_PAGE6_PETS_ANSWER_WIDTH_NORM,
    };
  }

  return norm;
}

/**
 * «Пожелания хозяйке…»: первая строка — хвост на линии подписи, далее wide-линии.
 * PDF/overrides часто отдавали только 4 blank-линии ниже подписи.
 */
function refineBrownParentWishFieldNorm(
  lineGuideId: string,
  page: number,
  norm: NormalizedLineSlot,
  allNorms: readonly NormalizedLineSlot[],
  slotIndex: number,
): NormalizedLineSlot {
  if (!isDiaryParentQuestionnairePage(lineGuideId, page) || norm.hasLabel) {
    return norm;
  }

  const continuationWidth = Math.max(
    0.5,
    Math.min(0.91 - BROWN_WISH_CONTINUATION_LEFT_NORM, 0.98 - BROWN_WISH_CONTINUATION_LEFT_NORM),
  );

  const hasCalibratedHead = allNorms.some(
    (slot) =>
      !slot.hasLabel &&
      slot.y >= 0.762 &&
      slot.y <= 0.79 &&
      slot.x >= 0.4 &&
      slot.width > 0.2 &&
      slot.width < 0.55,
  );

  if (hasCalibratedHead) {
    if (
      norm.y >= 0.798 &&
      norm.y <= 0.94 &&
      norm.width >= 0.6
    ) {
      return {
        ...norm,
        x: BROWN_WISH_CONTINUATION_LEFT_NORM,
        width: continuationWidth,
        inputKind: "block",
      };
    }
    return norm;
  }

  const wishIndexes = allNorms
    .map((slot, index) => ({ slot, index }))
    .filter(
      ({ slot }) =>
        !slot.hasLabel &&
        slot.y >= 0.76 &&
        slot.y <= 0.94 &&
        slot.width >= 0.6,
    )
    .sort((a, b) => a.slot.y - b.slot.y || a.index - b.index)
    .map(({ index }) => index);

  if (wishIndexes.length < 3) return norm;

  const idxs =
    wishIndexes.length > 4 ? wishIndexes.slice(0, 4) : wishIndexes;
  const rank = idxs.indexOf(slotIndex);
  if (rank < 0) return norm;

  if (rank === 0) {
    const { inputKind: _drop, ...rest } = norm;
    return {
      ...rest,
      y: BROWN_WISH_LABEL_HEAD_Y_NORM,
      x: BROWN_WISH_LABEL_HEAD_LEFT_NORM,
      width: BROWN_WISH_LABEL_HEAD_WIDTH_NORM,
      height: norm.height || 0.028,
    };
  }

  // Сдвигаем продолжения на исходные Y предыдущих blank-линий (head занял линию подписи).
  const source = allNorms[idxs[rank - 1]] ?? norm;
  return {
    ...norm,
    y: source.y,
    x: BROWN_WISH_CONTINUATION_LEFT_NORM,
    width: continuationWidth,
    inputKind: "block",
  };
}

function refineBrownParentQuestionnaireRowNorm(
  lineGuideId: string,
  page: number,
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  const isParentPage = isDiaryParentQuestionnairePage(lineGuideId, page);
  const isGirlProfilePage =
    lineGuideId === "diary_interior_brown" && page === 6;
  if (!isParentPage && !isGirlProfilePage) return norm;
  if (norm.inputKind === "block") return norm;
  if (norm.y < 0.22 || norm.y > 0.82) return norm;
  // Длинные вопросы стр. 6 правятся отдельно (хвост после подписи).
  if (
    isGirlProfilePage &&
    ((norm.y >= 0.47 && norm.y <= 0.51) || (norm.y >= 0.525 && norm.y <= 0.56))
  ) {
    return norm;
  }

  const minAnswerLeft = 0.32;
  if (norm.x >= minAnswerLeft || norm.width <= 0.45) return norm;

  const right = norm.x + norm.width;
  const x = minAnswerLeft;
  const width = Math.max(0.15, Math.min(right - x, 0.98 - x));
  return { ...norm, x, width };
}

/** В PDF norm.y — штрих; полоса «Я люблю/умею» лежит над линией. */
function getKidsMonthAnswerSlotTopNormY(norm: NormalizedLineSlot): number {
  return norm.y - norm.height;
}

function refineKidsMonthLineSlotNorm(
  page: number,
  norm: NormalizedLineSlot,
  slotIndex: number,
): NormalizedLineSlot {
  if (slotIndex < 1) {
    return { ...norm, continuationGroup: slotIndex };
  }

  const layout = getKidsMonthAnswerLineLayout(page);
  const strokeY = getKidsMonthAnswerStrokeY(page, slotIndex) ?? norm.y;
  const writable = getKidsMonthAnswerWritableBounds(page, slotIndex) ?? {
    x: layout.canX,
    width: layout.canWidth,
  };

  return {
    ...norm,
    x: writable.x + KIDS_MONTH_LINE_X_INSET,
    width: Math.max(0.05, writable.width - KIDS_MONTH_LINE_X_INSET),
    y: strokeY,
    height: KIDS_MONTH_LINE_BAND_HEIGHT,
    continuationGroup: slotIndex,
    inputKind: "line",
    lineStrokeAtBottom: true,
    textAnchorTop: true,
  };
}

/**
 * «Рост и вес до года» — PDF даёт высокую ячейку; печатная линия = norm.y
 * (низ подписи возраста / низ заголовка ряда), полоса ввода над штрихом.
 */
function refineKids48GrowthWeightSlot(
  page: number,
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  if (page !== 11) {
    return norm;
  }
  const strokeY = norm.y;
  return {
    ...norm,
    y: strokeY - KIDS_MONTH_LINE_BAND_HEIGHT,
    height: KIDS_MONTH_LINE_BAND_HEIGHT,
    inputKind: "line",
    lineStrokeAtBottom: true,
    textAnchorTop: true,
  };
}

/** OCR даёт широкие полосы на structured-страницах (p1, p4 и др.) — приводим к штрих-baseline. */
function refineKids48StandardRuledLineSlot(
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  if (norm.inputKind === "block") {
    return norm;
  }
  if (
    norm.height <= KIDS_MONTH_LINE_BAND_HEIGHT &&
    norm.lineStrokeAtBottom === true
  ) {
    return norm;
  }
  const strokeY = norm.y;
  return {
    ...norm,
    y: strokeY - KIDS_MONTH_LINE_BAND_HEIGHT,
    height: KIDS_MONTH_LINE_BAND_HEIGHT,
    inputKind: "line",
    lineStrokeAtBottom: true,
    textAnchorTop: true,
  };
}

function shouldRefineKids48StandardRuledLineSlot(
  page: number,
  slotIndex: number,
  norm: NormalizedLineSlot,
): boolean {
  if (norm.inputKind === "block") return false;
  if (isKidsMonthPage(page)) return false;
  if (page === 11) return false;
  if (isKidsTeethPage(page)) return false;
  if (isKidsEventDateLineSlot("kids_48", page, slotIndex)) return false;
  if (isKidsBottomDateLineSlot(page, slotIndex)) return false;
  if (isKidsP16DreamsTopDateLineSlot(page, slotIndex)) return false;
  if (isKidsP20BaptismDateLineSlot(page, slotIndex)) return false;
  // p13: stroke-baseline задаётся override (PAGE_13_SLOTS) + inset ниже.
  if (page === 5) return false;
  return norm.height > KIDS_MONTH_LINE_BAND_HEIGHT || !norm.lineStrokeAtBottom;
}

/** kids_48 p8 «Первый день дома» — дата справа от статической подписи «ДАТА». */

/**
 * Нижняя дата «ДАТА» — slot 0.
 * Sync с EVENT_DATE_PAGES / bottomDateLine в kids-48-line-slot-overrides.js.
 */
const KIDS_BOTTOM_DATE_PAGES: readonly number[] = [12, 14, 15, 17, 18, 19];
/** Слот уже на underline сразу после «ДАТА» (x≈0.418, w≈0.232). */
const KIDS_BOTTOM_DATE_LINE_X = 0.418;
const KIDS_BOTTOM_DATE_LINE_WIDTH = 0.232;
const KIDS_BOTTOM_DATE_STROKE_Y = 0.9135;

/** kids_48 p16 «Мои сновидения» — дата после «(ДАТА)» вверху (design page_016). */
const KIDS_DREAMS_PAGE = 16;
/** Отступ от печатного «(ДАТА)» — sync с PAGE_16_* в kids-48-line-slot-overrides.js. */
const KIDS_P16_DATE_LINE_X = 0.7152;
const KIDS_P16_DATE_LINE_WIDTH = 0.1421;
const KIDS_P16_DATE_STROKE_Y = 0.2116;

/** kids_48 p20 «Таинство крещения» — дата после «ДАТА» под заголовком. */
const KIDS_BAPTISM_PAGE = 20;
const KIDS_P20_DATE_LINE_X = 0.418;
const KIDS_P20_DATE_LINE_WIDTH = 0.232;
const KIDS_P20_DATE_STROKE_Y = 0.2368;

const KIDS_ACHIEVEMENTS_PAGE = 13;
/** kids_48 p13 «Мои достижения» — отступ вводимого текста от статической подписи. */
/** Дата слева от «(ДАТА)» — sync с PAGE_13_SLOTS в kids-48-line-slot-overrides.js. */
const KIDS_P13_DATE_LINE_X = 0.24;
const KIDS_P13_DATE_LINE_WIDTH = 0.17;
const KIDS_P13_DATE_STROKE_Y = 0.18585;
const KIDS_P13_ACHIEVEMENT_LINE_TEXT_INSET_NORM = 0.018;

const KIDS_TEETH_PAGE = 10;
/** Калибровка design_previews/page_010_design.png — не OCR-guide. */
const KIDS_TEETH_BRUSHING_WRITABLE_X = 0.5584;
const KIDS_TEETH_BRUSHING_WRITABLE_WIDTH = 0.1738;
const KIDS_TEETH_BRUSHING_STROKE_Y = 0.838;
const KIDS_TEETH_COUNT_WRITABLE_X = 0.5248;
const KIDS_TEETH_COUNT_WRITABLE_WIDTH = 0.052;
const KIDS_TEETH_COUNT_STROKE_Y = 0.8975;

function isKidsTeethPage(page: number): boolean {
  return page === KIDS_TEETH_PAGE;
}

function isKidsTeethBottomInputSlot(page: number, slotIndex: number): boolean {
  return isKidsTeethPage(page) && (slotIndex === 20 || slotIndex === 21);
}

/** Нижние даты p12+ — norm.y это штрих, не верх полосы. */
function isKidsTeethStrokeLineInputSlot(
  _page: number,
  _slotIndex: number,
  _inputKind?: string,
): boolean {
  return false;
}

/** Как на month pages: norm.y — штрих, writable-полоса над линией. */
function getKidsTeethLineSlotTopNormY(
  norm: Pick<NormalizedLineSlot, "y" | "height">,
): number {
  return norm.y - norm.height;
}

function refineKidsTeethPageSlotNorm(
  lineGuideId: string,
  page: number,
  norm: NormalizedLineSlot,
  slotIndex: number,
): NormalizedLineSlot {
  if (lineGuideId !== "kids_48" || !isKidsTeethPage(page)) return norm;

  // Слоты 0–19: x/width уже = начало/длина underline (kids-48-line-slot-overrides).
  if (slotIndex <= 19) {
    return {
      ...norm,
      inputKind: "line",
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    };
  }

  if (slotIndex === 20) {
    return {
      ...norm,
      x: KIDS_TEETH_BRUSHING_WRITABLE_X,
      width: KIDS_TEETH_BRUSHING_WRITABLE_WIDTH,
      y: KIDS_TEETH_BRUSHING_STROKE_Y - KIDS_MONTH_LINE_BAND_HEIGHT,
      height: KIDS_MONTH_LINE_BAND_HEIGHT,
      inputKind: "line",
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    };
  }

  if (slotIndex === 21) {
    return {
      ...norm,
      x: KIDS_TEETH_COUNT_WRITABLE_X,
      width: KIDS_TEETH_COUNT_WRITABLE_WIDTH,
      y: KIDS_TEETH_COUNT_STROKE_Y - KIDS_MONTH_LINE_BAND_HEIGHT,
      height: KIDS_MONTH_LINE_BAND_HEIGHT,
      inputKind: "line",
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    };
  }

  return norm;
}

/** kids_48 p8/p9 — дата на штрихе «ДАТА» (event_photo). */
function isKidsEventDateLineSlot(
  lineGuideId: string,
  page: number,
  slotIndex: number,
): boolean {
  if (lineGuideId !== "kids_48") return false;
  return (page === 8 && slotIndex === 0) || (page === 9 && slotIndex === 0);
}

function isKidsBottomDateLineSlot(page: number, slotIndex: number): boolean {
  return slotIndex === 0 && KIDS_BOTTOM_DATE_PAGES.includes(page);
}

function isKidsP12DateLineSlot(page: number, slotIndex: number): boolean {
  return isKidsBottomDateLineSlot(page, slotIndex);
}

function isKidsBottomDateStrokeLineInputSlot(
  page: number,
  slotIndex: number,
): boolean {
  return isKidsBottomDateLineSlot(page, slotIndex);
}

function isKidsP12StrokeLineInputSlot(
  page: number,
  slotIndex: number,
): boolean {
  return isKidsBottomDateStrokeLineInputSlot(page, slotIndex);
}

/** p16 верхнее поле «(ДАТА)» у заголовка — не путать с нижней датой. */
function isKidsP16DreamsTopDateLineSlot(
  page: number,
  slotIndex: number,
): boolean {
  return page === KIDS_DREAMS_PAGE && slotIndex === 0;
}

/** p20 «Таинство крещения» — дата на штрихе под заголовком. */
function isKidsP20BaptismDateLineSlot(
  page: number,
  slotIndex: number,
): boolean {
  return page === KIDS_BAPTISM_PAGE && slotIndex === 0;
}

function isKidsStrokeDateLineInputSlot(
  page: number,
  slotIndex: number,
): boolean {
  if (isKidsEventDateLineSlot("kids_48", page, slotIndex)) return false;
  return (
    isKidsBottomDateStrokeLineInputSlot(page, slotIndex) ||
    isKidsP16DreamsTopDateLineSlot(page, slotIndex) ||
    isKidsP20BaptismDateLineSlot(page, slotIndex)
  );
}

function isKidsP13DateLineSlot(page: number, slotIndex: number): boolean {
  return page === KIDS_ACHIEVEMENTS_PAGE && slotIndex === 0;
}

function isKidsP13AchievementLineSlot(
  page: number,
  slotIndex: number,
): boolean {
  return page === KIDS_ACHIEVEMENTS_PAGE && slotIndex >= 1 && slotIndex <= 7;
}

function applyLabeledLineTextInset(
  norm: NormalizedLineSlot,
  inset: number,
): NormalizedLineSlot {
  const x = clamp01(norm.x + inset);
  const width = Math.max(0.05, Math.min(norm.width - inset, 0.98 - x));
  return { ...norm, x, width };
}

function isDesignedAlbumWithInteriorBreathingRoom(lineGuideId: string): boolean {
  return (
    lineGuideId === "kids_48" ||
    lineGuideId === "pregnancy_60" ||
    lineGuideId === "pregnancy_a5"
  );
}

/**
 * Имена «Семейное дерево»: центр полосы = центр фото-круга (PDF x,y + калибровка).
 * Старые LINE_SLOTS ошибочно сдвигали имена вправо (~+0.07), как будто x,y — left/top.
 */
function alignKidsFamilyTreeNameToCircle(
  norm: NormalizedLineSlot,
  slotIndex: number,
): NormalizedLineSlot {
  const pageData = getPdfCirclePageData("kids_48", 5);
  const raw = pageData?.slots?.[slotIndex];
  if (!raw) return norm;

  const refined = refineFamilyTreeSlotForViewport("kids_48", 5, {
    ...raw,
    shape: "circle",
  } as NormalizedPhotoSlot);

  const BAND = 0.028;
  /** ≥ BAND, иначе текст заезжает в круг (полоса от stroke−BAND). */
  const GAP_BELOW_CIRCLE = 0.034;
  const NAME_WIDTH_BY_ID: Record<string, number> = {
    child: 0.124,
    mother_great_grandmother: 0.14,
    mother_great_grandfather: 0.14,
    mother_grandmother: 0.14,
    mother_grandfather: 0.136,
    father_great_grandmother: 0.14,
    father_great_grandfather: 0.14,
    father_grandmother: 0.14,
    father_grandfather: 0.14,
    extra_01: 0.125,
    extra_02: 0.115,
    extra_03: 0.13,
    extra_04: 0.14,
    extra_05: 0.136,
    extra_06: 0.131,
  };
  const diameter = Math.max(refined.width, refined.height);
  const circleBottom = refined.y + diameter / 2;
  const strokeY = Math.min(0.992, circleBottom + GAP_BELOW_CIRCLE);
  const height = Math.min(BAND, Math.max(0.02, strokeY - 0.01));
  const baseWidth =
    (raw.slotId ? NAME_WIDTH_BY_ID[raw.slotId] : undefined) ?? 0.14;
  const layoutNudge = KIDS_FAMILY_TREE_NAME_LAYOUT_BY_INDEX[slotIndex];
  const width = layoutNudge?.width ?? baseWidth;
  const cx = refined.x + (layoutNudge?.dx ?? 0);
  const y =
    strokeY - height + (layoutNudge?.dy ?? KIDS_FAMILY_TREE_NAME_Y_NUDGE_NORM);
  const x = Math.max(0.02, Math.min(0.98 - width, cx - width / 2));

  return {
    ...norm,
    x: clamp01(x),
    y: clamp01(y),
    width: Math.min(width, Math.max(0.04, 1 - x)),
    height,
    lineStrokeAtBottom: true,
    textAnchorTop: true,
  };
}

/**
 * Отступ пользовательского текста от печатной внутрянки (подписи, края макета).
 * Не трогает block-ячейки — у них свои insets.
 */
function applyDesignedAlbumBreathingRoom(
  lineGuideId: string,
  page: number,
  norm: NormalizedLineSlot,
  slotIndex: number,
): NormalizedLineSlot {
  if (!isDesignedAlbumWithInteriorBreathingRoom(lineGuideId)) {
    return norm;
  }

  let next = norm;

  if (lineGuideId === "kids_48" && page === 5) {
    next = alignKidsFamilyTreeNameToCircle(next, slotIndex);
  }

  if ((next.inputKind ?? "line") === "block") {
    return next;
  }

  if (next.hasLabel || next.inlineLabelTail) {
    return applyLabeledLineTextInset(next, DESIGNED_LABELED_LINE_TEXT_INSET_NORM);
  }

  // Широкие строки у левого края — чуть отодвинуть от декоративных точек/рамки.
  if (next.x < 0.18 && next.width >= 0.5) {
    return applyLabeledLineTextInset(next, DESIGNED_LINE_EDGE_INSET_NORM);
  }

  // Короткие ответы после печатной подписи без флага hasLabel (даты kids и т.п.).
  if (
    lineGuideId === "kids_48" &&
    next.x >= 0.25 &&
    next.x <= 0.55 &&
    next.width > 0.12 &&
    next.width < 0.4
  ) {
    return applyLabeledLineTextInset(next, DESIGNED_LINE_EDGE_INSET_NORM);
  }

  void slotIndex;
  return next;
}

function resolveKidsP13AchievementLineInset(_slotIndex: number): number {
  // Writable X уже откалиброван в PAGE_13_SLOTS (после подписи).
  return KIDS_P13_ACHIEVEMENT_LINE_TEXT_INSET_NORM;
}

/** Тонкая подстройка PDF-слотов под отрисовку текста (координаты из вектора, не margins). */
function refineNormalizedSlotForTextLayout(
  lineGuideId: string,
  page: number,
  norm: NormalizedLineSlot,
  allNorms: readonly NormalizedLineSlot[] = [],
  slotIndex = 0,
): NormalizedLineSlot {
  if (lineGuideId === "kids_48" && isKidsMonthPage(page)) {
    return refineKidsMonthLineSlotNorm(page, norm, slotIndex);
  }

  if (isKidsEventDateLineSlot(lineGuideId, page, slotIndex)) {
    const custom = getKids48EventDateLineNorm(page, slotIndex);
    if (custom) {
      return {
        ...norm,
        x: custom.x,
        y: custom.y,
        width: custom.width,
        height: custom.height,
        inputKind: "line",
        lineStrokeAtBottom: true,
        textAnchorTop: true,
      };
    }
  }

  if (
    lineGuideId === "kids_48" &&
    isKidsP16DreamsTopDateLineSlot(page, slotIndex)
  ) {
    return {
      ...norm,
      x: KIDS_P16_DATE_LINE_X,
      width: KIDS_P16_DATE_LINE_WIDTH,
      y: KIDS_P16_DATE_STROKE_Y,
      height: KIDS_MONTH_LINE_BAND_HEIGHT,
      inputKind: "line",
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    };
  }

  if (
    lineGuideId === "kids_48" &&
    isKidsP20BaptismDateLineSlot(page, slotIndex)
  ) {
    return {
      ...norm,
      x: KIDS_P20_DATE_LINE_X,
      width: KIDS_P20_DATE_LINE_WIDTH,
      y: KIDS_P20_DATE_STROKE_Y,
      height: KIDS_MONTH_LINE_BAND_HEIGHT,
      inputKind: "line",
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    };
  }

  if (lineGuideId === "kids_48" && isKidsBottomDateLineSlot(page, slotIndex)) {
    return {
      ...norm,
      x: KIDS_BOTTOM_DATE_LINE_X,
      width: KIDS_BOTTOM_DATE_LINE_WIDTH,
      y: KIDS_BOTTOM_DATE_STROKE_Y,
      height: KIDS_MONTH_LINE_BAND_HEIGHT,
      inputKind: "line",
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    };
  }

  if (lineGuideId === "kids_48" && isKidsTeethPage(page)) {
    return refineKidsTeethPageSlotNorm(lineGuideId, page, norm, slotIndex);
  }

  if (lineGuideId === "kids_48" && isKidsP13DateLineSlot(page, slotIndex)) {
    return {
      ...norm,
      x: KIDS_P13_DATE_LINE_X,
      width: KIDS_P13_DATE_LINE_WIDTH,
      y: KIDS_P13_DATE_STROKE_Y - KIDS_MONTH_LINE_BAND_HEIGHT,
      height: KIDS_MONTH_LINE_BAND_HEIGHT,
      inputKind: "line",
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    };
  }

  if (
    lineGuideId === "kids_48" &&
    isKidsP13AchievementLineSlot(page, slotIndex)
  ) {
    return applyLabeledLineTextInset(
      {
        ...norm,
        height: KIDS_MONTH_LINE_BAND_HEIGHT,
        inputKind: "line",
        lineStrokeAtBottom: true,
        textAnchorTop: true,
      },
      resolveKidsP13AchievementLineInset(slotIndex),
    );
  }

  if (lineGuideId === "kids_48" && page === 11) {
    return refineKids48GrowthWeightSlot(page, norm);
  }

  if (
    lineGuideId === "kids_48" &&
    shouldRefineKids48StandardRuledLineSlot(page, slotIndex, norm)
  ) {
    const refined = refineKids48StandardRuledLineSlot(norm);
    // p1 «Дата рождения» — writable правее конца печатной подписи.
    if (page === 1 && slotIndex === 1) {
      return applyLabeledLineTextInset(refined, 0.03);
    }
    return refined;
  }

  if (isPregnancyRuledNotebookPage(lineGuideId, page)) {
    return norm;
  }

  if (lineGuideId === "pregnancy_60" && page === 52) {
    if (slotIndex === 6) {
      return applyLabeledLineTextInset(norm, 0.065);
    }
    if (slotIndex === 20) {
      return applyLabeledLineTextInset(norm, 0.024);
    }
    if (slotIndex === 21) {
      return applyLabeledLineTextInset(norm, 0.028);
    }
    if (slotIndex === 22) {
      return applyLabeledLineTextInset(norm, 0.034);
    }
    if (slotIndex === 23) {
      return applyLabeledLineTextInset(norm, 0.042);
    }
    return norm;
  }

  if (!lineGuideId?.startsWith("diary_interior_")) {
    return norm;
  }

  let refined = refineBrownParentQuestionnaireRowNorm(lineGuideId, page, norm);
  refined = refineBrownGirlProfileLongQuestionTailNorm(
    lineGuideId,
    page,
    refined,
  );
  refined = refineBrownParentWishFieldNorm(
    lineGuideId,
    page,
    refined,
    allNorms,
    slotIndex,
  );
  if (lineGuideId === "diary_interior_brown") {
    refined = refineBrownPage16PeachBlockNorm(page, refined, allNorms);
    refined = refineBrownPage15PeachLineNorm(page, refined);
    refined = refineBrownPage17UniformHeightNorm(page, refined);
    refined = refineBrownPage17BottomBlockNorm(page, refined);
    refined = refineBrownPage21LabeledRowNorm(page, refined);
    refined = refineBrownPage24ListRowNorm(page, refined);
    refined = refineBrownDaySpreadIllustrationNorm(page, refined, allNorms);
    refined = refineBrownPage26LabeledRowNorm(page, refined);
    refined = refineBrownPage26UniformHeightNorm(page, refined);
    refined = refineBrownPage31LabeledRowNorm(page, refined);
  }

  if (lineGuideId === "diary_interior_purple") {
    refined = refineBrownDaySpreadIllustrationNorm(page, refined, allNorms);
    refined = refinePurplePage5LabeledRowNorm(page, refined);
    refined = refinePurplePage16LabeledRowNorm(page, refined);
    refined = refinePurplePage22LabeledRowNorm(page, refined);
    refined = refinePurpleFriendSocialRowNorm(page, refined);
  }

  if (isBrownPage13SportQuestionTailNorm(lineGuideId, page, refined)) {
    const textInset = 0.014;
    const x = clamp01(refined.x + textInset);
    const width = Math.max(0.05, Math.min(refined.width - textInset, 0.98 - x));
    return { ...refined, x, width };
  }

  if (isBrownPage13CartoonTailNorm(lineGuideId, page, refined)) {
    const textInset = 0.006;
    const x = clamp01(refined.x + textInset);
    const width = Math.max(0.05, Math.min(refined.width - textInset, 0.98 - x));
    return { ...refined, x, width };
  }

  if (isBrownPage6CareerShortHeadNorm(lineGuideId, page, refined)) {
    const baseLeft =
      refined.x >= 0.55 ? refined.x : BROWN_PAGE6_CAREER_HEAD_LEFT_NORM;
    const baseWidth =
      refined.width <= 0.22
        ? refined.width
        : BROWN_PAGE6_CAREER_HEAD_WIDTH_NORM;
    const x = clamp01(baseLeft + BROWN_WISH_HEAD_TEXT_INSET_NORM);
    const width = Math.max(
      0.05,
      Math.min(baseWidth - BROWN_WISH_HEAD_TEXT_INSET_NORM, 0.98 - x),
    );
    const { inputKind: _drop, ...rest } = refined;
    return { ...rest, x, width };
  }

  if (isBrownPage6CareerContinuationNorm(lineGuideId, page, refined)) {
    const right = Math.max(
      refined.x + refined.width,
      BROWN_WISH_CONTINUATION_LEFT_NORM + 0.72,
    );
    const x = BROWN_WISH_CONTINUATION_LEFT_NORM;
    const width = Math.max(0.05, Math.min(right - x, 0.98 - x));
    return { ...refined, x, width, inputKind: "block" as const };
  }

  if (isBrownWishShortHeadNorm(lineGuideId, refined)) {
    const x = clamp01(refined.x + BROWN_WISH_HEAD_TEXT_INSET_NORM);
    const width = Math.max(
      0.05,
      Math.min(refined.width - BROWN_WISH_HEAD_TEXT_INSET_NORM, 0.98 - x),
    );
    return { ...refined, x, width };
  }

  if (isBrownWishContinuationNorm(lineGuideId, refined)) {
    const right = refined.x + refined.width;
    const x = BROWN_WISH_CONTINUATION_LEFT_NORM;
    const width = Math.max(0.05, Math.min(right - x, 0.98 - x));
    return { ...refined, x, width };
  }

  const isBlock = refined.inputKind === "block";
  const xInset = isBlock ? 0 : refined.hasLabel ? 0.003 : 0.006;
  const widthTrim = isBlock ? 0 : refined.hasLabel ? 0.004 : 0.01;
  const x = clamp01(refined.x + xInset);
  const width = Math.max(0.05, Math.min(refined.width - widthTrim, 0.98 - x));

  return { ...refined, x, width };
}

const PREGNANCY_LINE_GAP_NORM = 4 / 210;
const PREGNANCY_STANDARD_LINE_HEIGHT = 0.038;

type PregnancyWeeklyCalib = {
  pageWidth: number;
  pageHeight: number;
  boxRight: number;
  lineHeightNorm: number;
  weight: { valueX: number; topY: number };
  belly: { valueX: number; topY: number };
};

/** PNG 300 DPI — калибровка «Вес» / «Обхват животика» на недельных стр. pregnancy_60 и pregnancy_a5. */
const PREGNANCY_WEEKLY_CALIB: Readonly<
  Record<"pregnancy_60" | "pregnancy_a5", PregnancyWeeklyCalib>
> = {
  pregnancy_60: {
    pageWidth: 2126,
    pageHeight: 2835,
    boxRight: 2126,
    // Выше — покрывает ряд бежевого блока; текст центрируется внутри.
    lineHeightNorm: 0.05,
    weight: { valueX: 1419, topY: 528 },
    belly: { valueX: 1809, topY: 655 },
  },
  pregnancy_a5: {
    pageWidth: 1796,
    pageHeight: 2528,
    boxRight: 1673,
    lineHeightNorm: 0.055,
    weight: { valueX: 1210, topY: 500 },
    belly: { valueX: 1527, topY: 600 },
  },
};

function isPregnancyA5WeeklyPage(page: number): boolean {
  return (
    (page >= 5 && page <= 13) ||
    (page >= 15 && page <= 28) ||
    (page >= 30 && page <= 43)
  );
}

/** Недельные страницы беременности (60 стр. и A5). */
export function isPregnancyWeeklyStructuredPage(
  lineGuideId: string | undefined,
  page: number,
): boolean {
  if (lineGuideId === "pregnancy_60") return isPregnancy60WeeklyPage(page);
  if (lineGuideId === "pregnancy_a5") return isPregnancyA5WeeklyPage(page);
  return false;
}

/** Мин. зазор между левым краем body-строки и хвостом после печатной подписи (norm X). */
const PREGNANCY_WEEKLY_INLINE_TAIL_MIN_X_GAP = 0.015;

function getWeeklySlotViewportNormScale(
  slot: Pick<TextLineSlot, "width" | "normWidth">,
): number {
  const normWidth = slot.normWidth ?? 0;
  if (normWidth <= 0 || slot.width <= 0) return 1;
  return slot.width / normWidth;
}

function pregnancyWeeklyInlineTailGapNorm(
  labelSlot: Pick<TextLineSlot, "x">,
  bodySlot: Pick<TextLineSlot, "x" | "width" | "normWidth">,
): number {
  const scale = getWeeklySlotViewportNormScale(bodySlot);
  return (labelSlot.x - bodySlot.x) / scale;
}

function findPregnancyWeeklyBodyLineInGroup(
  slots: readonly TextLineSlot[],
  groupId: number,
  afterIndex: number,
  bellyIndex: number,
): TextLineSlot | undefined {
  return slots
    .filter(
      (s) =>
        s.continuationGroup === groupId &&
        !s.hasLabel &&
        (s.inputKind ?? "line") === "line" &&
        s.index > afterIndex &&
        s.index !== 1 &&
        s.index !== bellyIndex,
    )
    .sort((a, b) => a.index - b.index)[0];
}

/** OCR-слот справа от подписи на той же строке — сюда продолжается текст пользователя. */
export function isPregnancyWeeklyInlineTailLabelSlot(
  lineGuideId: string | undefined,
  slot: Pick<
    TextLineSlot,
    | "page"
    | "index"
    | "hasLabel"
    | "continuationGroup"
    | "x"
    | "normHeight"
    | "inlineLabelTail"
  >,
  slots: readonly TextLineSlot[],
): boolean {
  if (slot.inlineLabelTail) return true;
  if (!lineGuideId || !isPregnancyWeeklyStructuredPage(lineGuideId, slot.page))
    return false;
  if (!slot.hasLabel) return false;

  const bellyIndex = lineGuideId === "pregnancy_60" ? 6 : 5;
  const bodySlot = findPregnancyWeeklyBodyLineInGroup(
    slots,
    slot.continuationGroup,
    slot.index,
    bellyIndex,
  );
  if (!bodySlot) return false;

  return (
    pregnancyWeeklyInlineTailGapNorm(slot, bodySlot) >
    PREGNANCY_WEEKLY_INLINE_TAIL_MIN_X_GAP
  );
}

function markPregnancyWeeklyInlineTailSlots(
  slots: TextLineSlot[],
  lineGuideId: string,
  page: number,
): TextLineSlot[] {
  if (!isPregnancyWeeklyStructuredPage(lineGuideId, page)) return slots;

  const bellyIndex = lineGuideId === "pregnancy_60" ? 6 : 5;
  return slots.map((slot) => {
    if (!slot.hasLabel || slot.inlineLabelTail) return slot;
    const bodySlot = findPregnancyWeeklyBodyLineInGroup(
      slots,
      slot.continuationGroup,
      slot.index,
      bellyIndex,
    );
    if (
      !bodySlot ||
      pregnancyWeeklyInlineTailGapNorm(slot, bodySlot) <=
        PREGNANCY_WEEKLY_INLINE_TAIL_MIN_X_GAP
    ) {
      return slot;
    }
    return { ...slot, inlineLabelTail: true };
  });
}

function findPregnancyWeeklyInlineLabelTailSlot(
  slots: readonly TextLineSlot[],
  bodyStartIndex: number,
  groupId: number,
  lineGuideId: string,
): TextLineSlot | null {
  const bellyIndex = lineGuideId === "pregnancy_60" ? 6 : 5;
  const labelSlot = slots
    .filter(
      (s) =>
        s.continuationGroup === groupId &&
        s.hasLabel &&
        s.index < bodyStartIndex &&
        (s.inputKind ?? "line") === "line" &&
        s.index !== 1 &&
        s.index !== bellyIndex,
    )
    .sort((a, b) => b.index - a.index)[0];

  if (
    !labelSlot ||
    !isPregnancyWeeklyInlineTailLabelSlot(lineGuideId, labelSlot, slots)
  ) {
    return null;
  }
  return labelSlot;
}

/** Страницы с линованным блокнотом (история родов, письмо малышу). */
export function isPregnancyRuledNotebookPage(
  lineGuideId: string | undefined,
  page?: number,
): boolean {
  return lineGuideId === "pregnancy_60" && (page === 53 || page === 60);
}

/**
 * Текстовые строки n-недели (дата, планы, ощущения) — единый stroke-baseline layout.
 */
export function isPregnancyWeeklyTextLineSlot(
  lineGuideId: string | undefined,
  slot: Pick<TextLineSlot, "page" | "index"> &
    Partial<
      Pick<
        TextLineSlot,
        | "inputKind"
        | "textAnchorTop"
        | "hasLabel"
        | "normHeight"
        | "inlineLabelTail"
        | "x"
        | "continuationGroup"
      >
    >,
  allSlots?: readonly TextLineSlot[],
): boolean {
  if (
    isPregnancyRuledNotebookPage(lineGuideId, slot.page) &&
    (slot.inputKind ?? "line") === "line"
  ) {
    return true;
  }
  if (!isPregnancyWeeklyStructuredPage(lineGuideId, slot.page)) return false;
  if (isPregnancy60WeeklyValueSlot(lineGuideId, slot)) return false;
  if ((slot.inputKind ?? "line") !== "line") return false;
  if (slot.inlineLabelTail) return true;
  if (
    allSlots &&
    typeof slot.x === "number" &&
    typeof slot.continuationGroup === "number" &&
    isPregnancyWeeklyInlineTailLabelSlot(
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
    )
  ) {
    return true;
  }
  if (slot.hasLabel) {
    const normH = slot.normHeight ?? 0;
    if (normH > PREGNANCY_WEEKLY_COMPACT_LINE_HEIGHT) return false;
  }
  return true;
}

/** @deprecated Используйте isPregnancyWeeklyTextLineSlot */
export function isPregnancyWeeklyRuledLineSlot(
  lineGuideId: string | undefined,
  slot: Pick<
    TextLineSlot,
    | "page"
    | "index"
    | "inputKind"
    | "textAnchorTop"
    | "hasLabel"
    | "normHeight"
    | "inlineLabelTail"
    | "x"
    | "continuationGroup"
  >,
): boolean {
  return isPregnancyWeeklyTextLineSlot(lineGuideId, slot);
}

/**
 * Начало поля в continuation group.
 * После split каждая строка — отдельная аннотация; для штриха нужен старт поля, не индекс строки.
 */
export function getPregnancyWeeklyFieldStartIndex(
  slotIndex: number,
  slots: readonly Pick<
    TextLineSlot,
    | "index"
    | "continuationGroup"
    | "hasLabel"
    | "inputKind"
    | "normHeight"
    | "x"
    | "inlineLabelTail"
  >[],
): number {
  const slot = slots[slotIndex];
  if (!slot) return slotIndex;

  const groupSlots = slots
    .filter((s) => s.continuationGroup === slot.continuationGroup)
    .sort((a, b) => a.index - b.index);
  if (groupSlots.length === 0) return slotIndex;

  const first = groupSlots[0]!;
  const bellyIndex = groupSlots.some((s) => s.index === 6) ? 6 : 5;
  const unlabeled = groupSlots.filter(
    (s) =>
      !s.hasLabel &&
      (s.inputKind ?? "line") === "line" &&
      s.index !== 1 &&
      s.index !== bellyIndex,
  );

  const inlineTail = groupSlots
    .filter(
      (s) =>
        (s.inlineLabelTail || s.hasLabel) &&
        (s.inputKind ?? "line") === "line" &&
        s.index !== 1 &&
        s.index !== bellyIndex,
    )
    .sort((a, b) => b.index - a.index)
    .find((labelSlot) => {
      if (labelSlot.inlineLabelTail) return true;
      const bodySlot = groupSlots.find(
        (s) =>
          !s.hasLabel &&
          (s.inputKind ?? "line") === "line" &&
          s.index > labelSlot.index &&
          s.index !== 1 &&
          s.index !== bellyIndex,
      );
      return (
        bodySlot != null &&
        labelSlot.x > bodySlot.x + PREGNANCY_WEEKLY_INLINE_TAIL_MIN_X_GAP
      );
    });

  if (inlineTail && slotIndex >= inlineTail.index) {
    return inlineTail.index;
  }

  const labelOnlyHead =
    first.hasLabel && unlabeled.length > 0 && unlabeled[0]!.index > first.index;

  if (labelOnlyHead) {
    return unlabeled[0]!.index;
  }

  return first.index;
}

/**
 * pregnancy_60 weekly: insertThirdPlanLine ошибочно добавляет слот 5 (stroke ~0.454 в пустой зоне);
 * настоящая 3-я печатная линия планов — слот 4 (stroke ~0.366).
 */
function filterPregnancyWeeklyPlanSpuriousBodySlots(
  bodySlots: readonly TextLineSlot[],
  lineGuideId?: string,
): TextLineSlot[] {
  if (lineGuideId !== "pregnancy_60" || bodySlots.length < 3) {
    return [...bodySlots];
  }
  const indices = new Set(bodySlots.map((slot) => slot.index));
  if (indices.has(3) && indices.has(4) && indices.has(5)) {
    return bodySlots.filter((slot) => slot.index !== 5);
  }
  return [...bodySlots];
}

/** Слоты ввода для weekly-поля: хвост после подписи + body-строки ниже. */
export function resolveWeeklyFieldLineSlots(
  slots: readonly TextLineSlot[],
  startSlotIndex: number,
  lineCount: number,
  lineGuideId?: string,
): TextLineSlot[] {
  const startSlot = slots[startSlotIndex];
  if (!startSlot || lineCount <= 0) return [];

  if (
    lineGuideId &&
    isPregnancyWeeklyStructuredPage(lineGuideId, startSlot.page)
  ) {
    const groupId = startSlot.continuationGroup;
    const bellyIndex = lineGuideId === "pregnancy_60" ? 6 : 5;
    const bodySlots = filterPregnancyWeeklyPlanSpuriousBodySlots(
      slots
        .filter(
          (s) =>
            s.continuationGroup === groupId &&
            s.index >= startSlotIndex &&
            !s.hasLabel &&
            (s.inputKind ?? "line") === "line" &&
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
    if (!labelTail && lineGuideId === "pregnancy_60") {
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

  return slots.slice(
    startSlotIndex,
    startSlotIndex + lineCount,
  ) as TextLineSlot[];
}

function getPregnancyWeeklyCalib(
  lineGuideId: string,
  page: number,
): PregnancyWeeklyCalib | null {
  if (lineGuideId === "pregnancy_60" && isPregnancy60WeeklyPage(page)) {
    return PREGNANCY_WEEKLY_CALIB.pregnancy_60;
  }
  if (lineGuideId === "pregnancy_a5" && isPregnancyA5WeeklyPage(page)) {
    return PREGNANCY_WEEKLY_CALIB.pregnancy_a5;
  }
  return null;
}

export function isPregnancy60WeeklyValueSlot(
  lineGuideId: string | undefined,
  slot: Pick<TextLineSlot, "page" | "index" | "textAnchorTop">,
): boolean {
  return (
    (lineGuideId === "pregnancy_60" &&
      isPregnancy60WeeklyPage(slot.page) &&
      (slot.index === 1 || slot.index === 6)) ||
    (lineGuideId === "pregnancy_a5" &&
      isPregnancyA5WeeklyPage(slot.page) &&
      (slot.index === 1 || slot.index === 5))
  );
}

function isPregnancy60WeeklyPage(page: number): boolean {
  return (
    (page >= 9 && page <= 17) ||
    (page >= 19 && page <= 32) ||
    (page >= 34 && page <= 47)
  );
}

function formatSlotNorm(value: number): number {
  return Math.round(value * 100000) / 100000;
}

/** Слоты 1 (Вес) и 5 (Обхват животика) — значения в розовом блоке справа. */
function refinePregnancy60WeeklyWeightBellySlots(
  lineGuideId: string,
  page: number,
  norms: readonly NormalizedLineSlot[],
): NormalizedLineSlot[] {
  const calib = getPregnancyWeeklyCalib(lineGuideId, page);
  if (!calib || norms.length < 6) {
    return [...norms];
  }

  const { pageWidth, pageHeight, boxRight, lineHeightNorm, weight, belly } =
    calib;
  const result = norms.map((slot) => ({ ...slot }));

  const weightX = formatSlotNorm(weight.valueX / pageWidth);
  const bellyX = formatSlotNorm(belly.valueX / pageWidth);
  const weightTopY = formatSlotNorm(weight.topY / pageHeight);
  const bellyTopY = formatSlotNorm(belly.topY / pageHeight);

  result[1] = {
    ...result[1],
    x: weightX,
    y: weightTopY,
    width: formatSlotNorm(
      Math.max(0.05, (boxRight - weight.valueX) / pageWidth),
    ),
    height: lineHeightNorm,
    hasLabel: false,
    inputKind: "block",
    textAnchorTop: true,
  };

  const bellyIndex = lineGuideId === "pregnancy_60" ? 6 : 5;
  result[bellyIndex] = {
    ...result[bellyIndex],
    x: bellyX,
    y: bellyTopY,
    width: formatSlotNorm(
      Math.max(0.05, (boxRight - belly.valueX) / pageWidth),
    ),
    height: lineHeightNorm,
    hasLabel: false,
    inputKind: "block",
    textAnchorTop: true,
  };

  return result;
}

/** Схлопнутые штрихи в одной continuation group (inline-tail + body на одной Y). */
function refinePregnancyWeeklyCollapsedGuideStrokes(
  lineGuideId: string,
  page: number,
  norms: readonly NormalizedLineSlot[],
  guides: readonly number[],
): number[] {
  if (
    !isPregnancyWeeklyStructuredPage(lineGuideId, page) ||
    guides.length === 0
  ) {
    return [...guides];
  }

  const pitch = PREGNANCY_WEEKLY_LINE_PITCH;
  const minGap = pitch * 0.5;
  const bellyIndex = lineGuideId === "pregnancy_60" ? 6 : 5;
  const result = [...guides];

  let i = 0;
  while (i < result.length - 1) {
    const normA = norms[i];
    const normB = norms[i + 1];
    if (
      !normA ||
      !normB ||
      (normA.inputKind ?? "line") !== "line" ||
      (normB.inputKind ?? "line") !== "line" ||
      normA.continuationGroup !== normB.continuationGroup ||
      i === 1 ||
      i + 1 === bellyIndex ||
      typeof result[i] !== "number" ||
      typeof result[i + 1] !== "number"
    ) {
      i += 1;
      continue;
    }

    if (result[i + 1]! - result[i]! < minGap) {
      result[i + 1] = result[i]! + pitch;
      let j = i + 2;
      while (
        j < norms.length &&
        norms[j]?.continuationGroup === normA.continuationGroup
      ) {
        if (
          j === bellyIndex ||
          (norms[j]?.inputKind ?? "line") !== "line" ||
          typeof result[j] !== "number" ||
          typeof result[j - 1] !== "number"
        ) {
          j += 1;
          continue;
        }
        if (result[j]! - result[j - 1]! < minGap) {
          result[j] = result[j - 1]! + pitch;
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

function getWeeklyGuideStrokesForPage(
  lineGuideId: string,
  page: number,
  norms: readonly NormalizedLineSlot[],
): readonly number[] {
  const raw =
    (LINE_GUIDES as Record<string, Record<string, readonly number[]>>)[
      lineGuideId
    ]?.[String(page)] ?? [];
  return refinePregnancyWeeklyCollapsedGuideStrokes(
    lineGuideId,
    page,
    norms,
    raw,
  );
}

/** Недельные строки: штрих по LINE_GUIDES[i], высота полосы ≈ pitch (OCR часто раздувает до 0.08). */
function refinePregnancyWeeklyRuledLineNorms(
  lineGuideId: string,
  page: number,
  norms: readonly NormalizedLineSlot[],
  guidesOverride?: readonly number[],
): NormalizedLineSlot[] {
  if (!isPregnancyWeeklyStructuredPage(lineGuideId, page)) {
    return [...norms];
  }

  const guides =
    guidesOverride ??
    (LINE_GUIDES as Record<string, Record<string, readonly number[]>>)[
      lineGuideId
    ]?.[String(page)];
  if (!guides?.length) return [...norms];

  const bellyIndex = lineGuideId === "pregnancy_60" ? 6 : 5;

  return norms.map((norm, index) => {
    if (index === 1 || index === bellyIndex) return norm;
    if ((norm.inputKind ?? "line") !== "line") return norm;

    const guideStrokeY = guides[index];
    if (typeof guideStrokeY !== "number") return norm;

    const bandHeight =
      norm.hasLabel && norm.height <= PREGNANCY_WEEKLY_COMPACT_LINE_HEIGHT
        ? norm.height
        : PREGNANCY_WEEKLY_LINE_PITCH;
    const topY = guideStrokeY - bandHeight;

    return {
      ...norm,
      y: formatSlotNorm(topY),
      height: formatSlotNorm(bandHeight),
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    };
  });
}

/** История родов / письмо малышу — штрих по LINE_GUIDES, полоса = шаг до следующей линии. */
function refinePregnancyRuledNotebookLineNorms(
  lineGuideId: string,
  page: number,
  norms: readonly NormalizedLineSlot[],
): NormalizedLineSlot[] {
  if (!isPregnancyRuledNotebookPage(lineGuideId, page)) {
    return [...norms];
  }

  const guides = (
    LINE_GUIDES as Record<string, Record<string, readonly number[]>>
  )[lineGuideId]?.[String(page)];
  if (!guides?.length) return [...norms];

  return norms.map((norm, index) => {
    if ((norm.inputKind ?? "line") !== "line") return norm;

    const guideStrokeY = guides[index];
    if (typeof guideStrokeY !== "number") return norm;

    const nextGuide = guides[index + 1];
    const bandHeight =
      typeof nextGuide === "number"
        ? Math.max(
            PREGNANCY_WEEKLY_COMPACT_LINE_HEIGHT,
            nextGuide - guideStrokeY,
          )
        : PREGNANCY_WEEKLY_LINE_PITCH;
    const topY = guideStrokeY - bandHeight;

    return {
      ...norm,
      // OCR x/width совпадают с печатными линиями (p53 ≈ 0.09, p60 ≈ 0.117).
      y: formatSlotNorm(topY),
      height: formatSlotNorm(bandHeight),
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    };
  });
}

function slotsInGroupTooClose(slots: NormalizedLineSlot[]): boolean {
  for (let i = 0; i < slots.length - 1; i += 1) {
    const bottom = slots[i].y + slots[i].height / 2;
    const nextTop = slots[i + 1].y - slots[i + 1].height / 2;
    if (nextTop < bottom - 0.002) return true;
  }
  return false;
}

/** OCR иногда ставит строки одной группы слишком близко (p4 «Постановка на учёт»). */
function refineDenseContinuationGroupSpacing(
  lineGuideId: string,
  page: number,
  norms: readonly NormalizedLineSlot[],
): NormalizedLineSlot[] {
  if (lineGuideId !== "pregnancy_60" && lineGuideId !== "pregnancy_a5") {
    return [...norms];
  }

  // Weekly pages: OCR slots + LINE_GUIDES already aligned — do not redistribute.
  if (isPregnancyWeeklyStructuredPage(lineGuideId, page)) {
    return [...norms];
  }

  if (isPregnancyRuledNotebookPage(lineGuideId, page)) {
    return [...norms];
  }

  const result = norms.map((slot) => ({ ...slot }));
  const groupIndices = new Map<number, number[]>();

  result.forEach((slot, index) => {
    const groupId = slot.continuationGroup ?? index + 1;
    const list = groupIndices.get(groupId) ?? [];
    list.push(index);
    groupIndices.set(groupId, list);
  });

  for (const indices of groupIndices.values()) {
    if (indices.length < 2) continue;

    const groupSlots = indices.map((index) => result[index]);
    if (!slotsInGroupTooClose(groupSlots)) continue;

    const firstIdx = indices[0];
    const lastIdx = indices[indices.length - 1];
    const startY = result[firstIdx].y;
    const nextIdx = lastIdx + 1;
    const endY =
      nextIdx < result.length
        ? result[nextIdx].y -
          result[nextIdx].height / 2 -
          PREGNANCY_LINE_GAP_NORM
        : result[lastIdx].y;

    if (endY <= startY + PREGNANCY_STANDARD_LINE_HEIGHT) continue;

    const uniformHeight = Math.min(
      PREGNANCY_STANDARD_LINE_HEIGHT,
      ...groupSlots.map((slot) => slot.height),
    );

    indices.forEach((index, position) => {
      const t = indices.length === 1 ? 0 : position / (indices.length - 1);
      result[index] = {
        ...result[index],
        y: startY + t * (endY - startY),
        height: uniformHeight,
      };
    });
  }

  return result;
}

const lineSlotsResultCache = new Map<string, TextLineSlot[]>();

function lineSlotsCacheKey(params: GetLineSlotsParams): string {
  const rect = params.contentRect;
  return [
    params.lineGuideId,
    params.page,
    params.viewportWidth,
    params.viewportHeight,
    params.sourceWidth ?? 0,
    params.sourceHeight ?? 0,
    rect?.offsetX ?? "",
    rect?.offsetY ?? "",
    rect?.width ?? "",
    rect?.height ?? "",
    "kids-event-date-line-v2",
    "kids-bottom-date-line-v10",
    "kids-p48-caption-photo-v1",
    "kids-p16-dreams-date-v6",
    "kids-p20-baptism-date-v1",
    "kids-p13-stroke-baseline-v3",
    "kids-p13-date-left-of-label-v2",
    "kids-teeth-page-v24",
    "kids-growth-weight-v3",
    "kids-standard-ruled-line-v2",
    "kids-stroke-clearance-v1",
    "kids-p1-photo-middle-band-v1",
    "kids-p1-answer-baseline-sink-v3-android-lift",
    // Авто-инвалидация при правке layout имён / слотов p5
    `kids-family-tree-names-v4-under-circle:${JSON.stringify(KIDS_FAMILY_TREE_NAME_LAYOUT_BY_INDEX)}:${KIDS_FAMILY_TREE_NAME_Y_NUDGE_NORM}`,
    "kids-teeth-bottom-stroke-v6",
    "pregnancy-weekly-skip-dense-spacing-v1",
    "pregnancy-weekly-guide-stroke-v15",
    "pregnancy-stroke-at-norm-y-v1",
    "pregnancy-p52-pdf-strokes-v2",
    "pregnancy-p4-stroke-v2",
    "pregnancy-p4-recommendations-4lines-v3",
    "designed-interior-breathing-v1",
    "pregnancy-weekly-photo-band-v1",
    "pregnancy-weekly-value-center-v1",
    "pregnancy-ruled-notebook-v1",
    "pregnancy-p60-letter-18lines-v1",
    "pregnancy-already-mom-clearance-v3",
    "template-text-norm-width-v1",
    "diary-questionnaire-season-pets-wish-v1",
    "diary-android-amatic-lift-v1",
    "diary-full-semantic-slots-v1",
    "diary-brown-p21-travel-tails-v2",
    "diary-brown-p31-school-strokes-v1",
    "diary-brown-weekly-inset-v1",
    "diary-brown-p24-mood-strokes-v1",
    "diary-brown-p13-hobby-strokes-v1",
    "diary-brown-p15-dreams-groups-v2",
    "diary-brown-p38-food-strokes-v1",
    "diary-brown-myday-date-mood-v2",
    "diary-brown-myday-date-mood-v3",
    "diary-brown-friend-no-synthetic-name-v1",
    "birthday-pill-center-v1",
    "birthday-stroke-baseline-v1",
    "birthday-travel-pills-v1",

  ].join("|");
}

export function getLineSlotsForPage(
  params: GetLineSlotsParams,
): TextLineSlot[] {
  const cacheKey = lineSlotsCacheKey(params);
  const cached = lineSlotsResultCache.get(cacheKey);
  if (cached) return cached;

  const { lineGuideId, page, viewportWidth, viewportHeight } = params;
  if (
    !hasLineGuides(lineGuideId) ||
    viewportWidth <= 0 ||
    viewportHeight <= 0
  ) {
    lineSlotsResultCache.set(cacheKey, []);
    return [];
  }

  const weightNorms = refinePregnancy60WeeklyWeightBellySlots(
    lineGuideId,
    page,
    refineDenseContinuationGroupSpacing(
      lineGuideId,
      page,
      getNormalizedSlotsForPage(lineGuideId, page),
    ),
  );
  const weeklyGuides = isPregnancyWeeklyStructuredPage(lineGuideId, page)
    ? getWeeklyGuideStrokesForPage(lineGuideId, page, weightNorms)
    : undefined;

  const normalized = refinePregnancyRuledNotebookLineNorms(
    lineGuideId,
    page,
    refinePregnancyWeeklyRuledLineNorms(
      lineGuideId,
      page,
      weightNorms,
      weeklyGuides,
    ),
  );
  if (!normalized.length) {
    lineSlotsResultCache.set(cacheKey, []);
    return [];
  }

  const rect = resolveContentRectForPage(params);

  const slots = normalized.map((norm, index) => {
    const layoutNorm = applyDesignedAlbumBreathingRoom(
      lineGuideId,
      page,
      refineNormalizedSlotForTextLayout(
        lineGuideId,
        page,
        norm,
        normalized,
        index,
      ),
      index,
    );
    const isWeeklyValueSlot =
      (lineGuideId === "pregnancy_60" &&
        isPregnancy60WeeklyPage(page) &&
        (index === 1 || index === 6)) ||
      (lineGuideId === "pregnancy_a5" &&
        isPregnancyA5WeeklyPage(page) &&
        (index === 1 || index === 5));

    const pageGuideStrokesEarly =
      weeklyGuides ??
      (LINE_GUIDES as Record<string, Record<string, readonly number[]>>)[
        lineGuideId
      ]?.[String(page)];
    const guideNormEarly = pageGuideStrokesEarly?.[index];
    /** LINE_SLOTS.y совпадает с LINE_GUIDES — y это штрих, полоса над ним (анкеты, УЗИ…). */
    const pregnancyStrokeAtNormY =
      (lineGuideId === "pregnancy_60" || lineGuideId === "pregnancy_a5") &&
      (layoutNorm.inputKind ?? "line") === "line" &&
      !isWeeklyValueSlot &&
      layoutNorm.lineStrokeAtBottom !== true &&
      layoutNorm.textAnchorTop !== true &&
      typeof guideNormEarly === "number" &&
      Math.abs(guideNormEarly - layoutNorm.y) < 0.003;

    const anchorTop =
      isWeeklyValueSlot ||
      layoutNorm.textAnchorTop === true ||
      layoutNorm.lineStrokeAtBottom === true ||
      pregnancyStrokeAtNormY ||
      (lineGuideId === "kids_48" && isKidsMonthPage(page) && index >= 1);
    const topNormY = isDiaryInteriorLineGuide(lineGuideId)
      ? getDiarySlotTopNormY(layoutNorm)
      : lineGuideId === "kids_48" && isKidsMonthPage(page) && index >= 1
        ? getKidsMonthAnswerSlotTopNormY(layoutNorm)
        : lineGuideId === "kids_48" &&
            isKidsStrokeDateLineInputSlot(page, index)
          ? getKidsTeethLineSlotTopNormY(layoutNorm)
          : lineGuideId === "kids_48" &&
              isKidsTeethStrokeLineInputSlot(page, index, layoutNorm.inputKind)
            ? getKidsTeethLineSlotTopNormY(layoutNorm)
            : pregnancyStrokeAtNormY
              ? layoutNorm.y - layoutNorm.height
              : anchorTop
                ? layoutNorm.y
                : layoutNorm.y - layoutNorm.height / 2;
    const mapped = mapSourceNormToViewport(
      layoutNorm.x,
      topNormY,
      layoutNorm.width,
      layoutNorm.height,
      rect,
    );

    const lineStrokeAtBottom =
      layoutNorm.lineStrokeAtBottom === true ||
      pregnancyStrokeAtNormY ||
      (lineGuideId === "kids_48" && isKidsMonthPage(page) && index >= 1) ||
      (lineGuideId === "kids_48" &&
        isKidsStrokeDateLineInputSlot(page, index)) ||
      (lineGuideId === "kids_48" &&
        isKidsTeethPage(page) &&
        (index <= 19 || index === 20 || index === 21) &&
        (layoutNorm.inputKind ?? "line") === "line") ||
      isDiaryInteriorLineGuide(lineGuideId);

    const isAlreadyMomGuidePage =
      (lineGuideId === "pregnancy_60" && page === 54) ||
      (lineGuideId === "pregnancy_a5" && page === 46);
    const pageGuideStrokes = pageGuideStrokesEarly;
    const weeklyGuideNorm =
      (isPregnancyWeeklyStructuredPage(lineGuideId, page) ||
        isPregnancyRuledNotebookPage(lineGuideId, page) ||
        isAlreadyMomGuidePage) &&
      pageGuideStrokes?.[index];
    const strokeY =
      typeof weeklyGuideNorm === "number"
        ? rect.offsetY + weeklyGuideNorm * rect.height
        : pregnancyStrokeAtNormY
          ? rect.offsetY + layoutNorm.y * rect.height
          : mapped.y + mapped.height;

    return {
      index,
      page,
      x: mapped.x,
      y: mapped.y,
      width: mapped.width,
      lineHeight: mapped.height,
      hasLabel: norm.hasLabel ?? true,
      continuationGroup:
        layoutNorm.continuationGroup ?? norm.continuationGroup ?? index + 1,
      inputKind: layoutNorm.inputKind ?? norm.inputKind,
      normY: anchorTop ? layoutNorm.y + layoutNorm.height / 2 : layoutNorm.y,
      normHeight: layoutNorm.height,
      normWidth: layoutNorm.width,
      lineStrokeAtBottom,
      textAnchorTop: anchorTop,
      strokeY,
      inlineLabelTail:
        layoutNorm.inlineLabelTail === true || norm.inlineLabelTail === true
          ? true
          : undefined,
    };
  });

  const finalizedSlots = markPregnancyWeeklyInlineTailSlots(
    lineGuideId === "pregnancy_60" &&
      (page === 53 || page === 54 || page === 60)
      ? slots.map((slot) =>
          (slot.inputKind ?? "line") === "line"
            ? {
                ...slot,
                lineStrokeAtBottom: true,
                textAnchorTop: true,
              }
            : slot,
        )
      : slots,
    lineGuideId,
    page,
  );

  lineSlotsResultCache.set(cacheKey, finalizedSlots);
  return finalizedSlots;
}

export type LineSlotGroupBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  startSlotIndex: number;
};

function slotHorizontalOverlapRatio(a: TextLineSlot, b: TextLineSlot): number {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const overlap = Math.max(0, right - left);
  const minSpan = Math.min(a.width, b.width);
  if (minSpan <= 0) return 0;
  return overlap / minSpan;
}

export function getLineSlotGroups(slots: TextLineSlot[]): TextLineSlot[][] {
  const map = new Map<number, TextLineSlot[]>();
  for (const slot of slots) {
    if (!map.has(slot.continuationGroup)) {
      map.set(slot.continuationGroup, []);
    }
    map.get(slot.continuationGroup)!.push(slot);
  }

  return [...map.values()].map((group) =>
    group.sort((a, b) => a.index - b.index),
  );
}

export function getLineSlotGroupBounds(
  groupSlots: TextLineSlot[],
): LineSlotGroupBounds {
  const startSlot = groupSlots[0]!;
  let minX = startSlot.x;
  let maxX = startSlot.x + startSlot.width;
  let minY = startSlot.y;
  let maxY = startSlot.y + startSlot.lineHeight;

  for (const slot of groupSlots) {
    minX = Math.min(minX, slot.x);
    maxX = Math.max(maxX, slot.x + slot.width);
    minY = Math.min(minY, slot.y);
    maxY = Math.max(maxY, slot.y + slot.lineHeight);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    startSlotIndex: startSlot.index,
  };
}

function getSlotVerticalHitBounds(
  slot: TextLineSlot,
  slots: TextLineSlot[],
  minHitPx = 28,
): { top: number; height: number } {
  if (slot.lineHeight >= minHitPx) {
    return { top: slot.y, height: slot.lineHeight };
  }

  const prev = slots[slot.index - 1];
  const next = slots[slot.index + 1];
  const slotBottom = slot.y + slot.lineHeight;

  const gapAbove = prev
    ? Math.max(0, slot.y - (prev.y + prev.lineHeight))
    : Infinity;
  const gapBelow = next ? Math.max(0, next.y - slotBottom) : Infinity;

  const needExpand = minHitPx - slot.lineHeight;
  let expandUp = Math.min(needExpand / 2, gapAbove / 2);
  let expandDown = Math.min(needExpand - expandUp, gapBelow / 2);

  if (next) {
    expandDown = Math.min(expandDown, Math.max(0, next.y - slotBottom - 2));
  }
  if (prev) {
    const slotTop = slot.y;
    expandUp = Math.min(
      expandUp,
      Math.max(0, slotTop - (prev.y + prev.lineHeight) - 2),
    );
  }

  return {
    top: slot.y - expandUp,
    height: slot.lineHeight + expandUp + expandDown,
  };
}

/** Зона тапа: для дневников расширяем влево до начала видимой линии. */
export function getSlotInteractionRect(
  slot: TextLineSlot,
  slots: TextLineSlot[],
  slotParams: GetLineSlotsParams,
): { x: number; y: number; width: number; height: number } {
  const vertical = getSlotVerticalHitBounds(slot, slots);
  let left = slot.x;
  let width = slot.width;

  const isBrownWideAnswerRow =
    slotParams.lineGuideId === "diary_interior_brown" &&
    !slot.hasLabel &&
    slot.normY != null &&
    slot.x < 0.16 &&
    slot.width >= 0.72;

  const isDiaryWishContinuation =
    (slotParams.lineGuideId === "diary_interior_brown" ||
      slotParams.lineGuideId === "diary_interior_purple") &&
    !slot.hasLabel &&
    slot.inputKind === "block" &&
    slot.normY != null &&
    slot.normY >= 0.798 &&
    slot.width >= 0.65;

  const careerPage = getDiaryCareerQuestionPage(slotParams.lineGuideId ?? "");
  const isPage6CareerContinuation =
    (slotParams.lineGuideId === "diary_interior_brown" ||
      slotParams.lineGuideId === "diary_interior_purple") &&
    slotParams.page === careerPage &&
    !slot.hasLabel &&
    slot.normY != null &&
    slot.normY >= 0.788 &&
    slot.normY <= 0.845 &&
    slot.width >= 0.45 &&
    slot.x < 0.16;

  if (
    slotParams.lineGuideId === "diary_interior_purple" ||
    slotParams.lineGuideId === "diary_interior_brown"
  ) {
    if (isDiaryWishContinuation || isPage6CareerContinuation) {
      const rect = resolveContentRectForPage(slotParams);
      const minLeft =
        rect.offsetX + rect.width * BROWN_WISH_CONTINUATION_LEFT_NORM;
      if (left > minLeft + 2) {
        width += left - minLeft;
        left = minLeft;
      }
    } else if (
      !isBrownWideAnswerRow &&
      !slot.hasLabel &&
      slot.normY != null &&
      slot.normY < 0.45
    ) {
      const rect = resolveContentRectForPage(slotParams);
      const minLeft = rect.offsetX + rect.width * 0.12;
      if (left > minLeft + 2) {
        width += left - minLeft;
        left = minLeft;
      }
    }
  }

  return {
    x: left,
    y: vertical.top,
    width,
    height: vertical.height,
  };
}

export function hitTestLineSlot(params: {
  x: number;
  y: number;
  slots: TextLineSlot[];
  slotParams?: GetLineSlotsParams;
}): TextLineSlot | null {
  const { x, y, slots, slotParams } = params;

  let best: TextLineSlot | null = null;
  let bestScore = Infinity;

  for (const slot of slots) {
    const bounds = slotParams
      ? getSlotInteractionRect(slot, slots, slotParams)
      : {
          x: slot.x,
          y: slot.y,
          width: slot.width,
          height: slot.lineHeight,
        };

    const inX = x >= bounds.x && x <= bounds.x + bounds.width;
    const inY = y >= bounds.y && y <= bounds.y + bounds.height;
    if (!inX || !inY) continue;

    const centerY = bounds.y + bounds.height / 2;
    const centerDistance = Math.abs(y - centerY);
    const blockPriority = slot.inputKind === "block" ? -1000 : 0;
    const score = centerDistance + blockPriority;

    if (score < bestScore) {
      bestScore = score;
      best = slot;
    }
  }

  return best;
}

export function findAnnotationForSlot(
  annotations: Annotation[],
  page: number,
  slotIndex: number,
): Annotation | undefined {
  return annotations.find((ann) => {
    if (ann.type !== "text" || ann.page !== page) return false;
    if (typeof ann.templateLineStart !== "number") return false;
    const count = ann.templateLineCount ?? 1;
    if (count === 1) return ann.templateLineStart === slotIndex;
    return (
      slotIndex >= ann.templateLineStart &&
      slotIndex < ann.templateLineStart + count
    );
  });
}

/** Любая аннотация группы продолжения (тап по 2–3-й строке блока). */
export function findAnnotationForContinuationGroup(
  annotations: Annotation[],
  page: number,
  slots: TextLineSlot[],
  slotIndex: number,
): Annotation | undefined {
  const tapped = slots[slotIndex];
  if (!tapped) return undefined;

  const groupId = tapped.continuationGroup;
  return annotations.find((ann) => {
    if (ann.type !== "text" || ann.page !== page) return false;
    if (typeof ann.templateLineStart !== "number") return false;
    const start = slots[ann.templateLineStart];
    return start?.continuationGroup === groupId;
  });
}

export function distributeTextAcrossSlots(params: {
  text: string;
  startSlotIndex: number;
  slots: TextLineSlot[];
  fontSize: number;
}): { content: string; lineCount: number; truncated: boolean } {
  const { text, startSlotIndex, slots, fontSize } = params;
  const availableSlots = slots.slice(startSlotIndex);
  if (availableSlots.length === 0) {
    return { content: text, lineCount: 1, truncated: false };
  }

  const slotWidth = availableSlots[0]?.width ?? 200;
  const allLines: string[] = [];
  const paragraphs = text.split("\n");
  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      allLines.push("");
      continue;
    }
    allLines.push(...wrapTextToLines(paragraph, slotWidth, fontSize));
  }

  const maxLines = availableSlots.length;
  const used = allLines.slice(0, maxLines);
  const truncated = allLines.length > maxLines;

  return {
    content: used.join("\n"),
    lineCount: Math.max(1, used.length),
    truncated,
  };
}

export function getSlotYForLineIndex(
  slots: TextLineSlot[],
  startIndex: number,
  lineOffset: number,
): number {
  const slot = slots[startIndex + lineOffset];
  return slot?.y ?? slots[startIndex]?.y ?? 0;
}

export function layoutAnnotationFromSlot(
  slot: TextLineSlot,
): Pick<
  Annotation,
  "x" | "y" | "width" | "height" | "templateLineStart" | "templateLineCount"
> {
  return {
    x: slot.x,
    y: slot.y,
    width: slot.width,
    height: slot.lineHeight,
    templateLineStart: slot.index,
    templateLineCount: 1,
  };
}

/** Text overlay aligned to the printed rule (preview/export parity with PdfAnnotations). */
export function layoutTextAnnotationFromSlot(
  slot: TextLineSlot,
  fontSize: number,
  lineGuideId?: string,
  textContent?: string,
  fontId?: string,
): Pick<Annotation, "x" | "y" | "width" | "height" | "fontSize"> {
  const layout = layoutAnnotationFromSlot(slot);
  const inputKind = slot.inputKind ?? "line";
  const typographyBandHeight = getPregnancyWeeklyTypographyBandHeight(
    slot,
    lineGuideId,
  );
  const typography = getTemplateLineTypography(
    fontSize,
    typographyBandHeight,
    inputKind,
    lineGuideId,
  );
  let effectiveFontSize = getEffectiveTemplateFontSize(
    lineGuideId,
    slot,
    fontSize,
    {
      textContent,
      fontId,
    },
  );
  if (
    isPregnancy60WeeklyValueSlot(lineGuideId, slot) &&
    textContent &&
    slot.width > 0
  ) {
    const profile = getTemplateTypographyProfile(lineGuideId);
    const charWidth = effectiveFontSize * profile.charWidthRatio;
    const neededWidth = textContent.length * charWidth;
    if (neededWidth > slot.width) {
      effectiveFontSize = Math.max(
        9,
        Math.floor(effectiveFontSize * (slot.width / neededWidth)),
      );
    }
  }
  // Дневник: не ужимаем кегль под ширину слота — ломает baseline (текст уезжает с линии).
  const textTop = getTemplateLineTextTop(slot, effectiveFontSize, lineGuideId);
  const rowHeight = isPregnancyWeeklyTextLineSlot(lineGuideId, slot)
    ? typography.lineHeight
    : Math.max(
        typography.lineHeight,
        effectiveFontSize * 1.05,
        slot.lineHeight,
      );
  return {
    x: layout.x,
    y: textTop,
    width: layout.width,
    height: rowHeight,
    fontSize: effectiveFontSize,
  };
}

export function buildLineSlotsContext(params: GetLineSlotsParams): {
  contentRect: ContentRect;
  slots: TextLineSlot[];
} {
  const contentRect = resolveContentRectForPage(params);
  const slots = getLineSlotsForPage({ ...params, contentRect });
  return { contentRect, slots };
}
