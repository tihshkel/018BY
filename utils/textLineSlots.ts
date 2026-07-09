import {
  getAlbumTextMargins,
  getKids48BottomDateLineStrokeY,
  getKidsMonthAnswerLineLayout,
  getKidsMonthAnswerStrokeY,
  getKidsMonthAnswerWritableBounds,
  getTemplateTypographyProfile,
  isBlankLineGuideAlbum,
  isKids48BottomDateLineSlot,
  isKids48CalibratedDateLineSlot,
  isKidsMonthPage,
  KIDS48_P8_DATE_LINE,
  KIDS48_P16_DREAMS_DATE_LINE,
  KIDS48_P10_FIRST_BRUSHING_LINE,
  KIDS48_TEETH_TOOTH_DATE_SLOT_WIDTH,
  KIDS_MONTH_LINE_BAND_HEIGHT,
} from '@/constants/album-text-margins';
import { resolveLineGuideId } from '@/utils/albumImages';
import { LINE_GUIDES } from '@/constants/line-guides';
import {
  LINE_SLOTS,
  type NormalizedLineSlot,
} from '@/constants/line-slots';
import type { Annotation } from '@/types/annotation';
import {
  getContentRect,
  mapSourceNormToViewport,
  type ContentRect,
} from '@/utils/imageContentRect';
import { wrapTextToLines } from '@/utils/textWrap';
import {
  getTemplateLineTextTop,
  getTemplateLineTypography,
} from '@/utils/templateLineText';
import { isKids48TeethToothDateSlot } from '@/utils/kids48TeethDates';

export type TextLineSlot = {
  index: number;
  page: number;
  y: number;
  x: number;
  width: number;
  lineHeight: number;
  hasLabel: boolean;
  continuationGroup: number;
  inputKind?: 'line' | 'block';
  /** Нормализованный центр слота по Y (0–1), для типографики */
  normY?: number;
  /** Нормализованная высота слота (0–1), для типографики */
  normHeight?: number;
  /** norm.y = штрих линии; полоса лежит над линией (как diary_interior) */
  lineStrokeAtBottom?: boolean;
  /** Y слота = верх полосы (калибровка «Вес» / «Обхват» на неделях pregnancy_60). */
  textAnchorTop?: boolean;
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
  page: number
): readonly NormalizedLineSlot[] {
  const slotSet = (LINE_SLOTS as Record<string, Record<string, readonly NormalizedLineSlot[]>>)[
    lineGuideId
  ];
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
          lineGuideId === 'diary_interior_brown' &&
          isBrownSpuriousQuestionRowSlot(page, slot, fromSlots)
        )
    );
  }

  const guideSet = (LINE_GUIDES as Record<string, Record<string, readonly number[]>>)[lineGuideId];
  const normalizedLines = guideSet?.[String(page)];
  if (!normalizedLines?.length) return [];

  const margins = getAlbumTextMargins(lineGuideId);
  return normalizedLines.map((normY, index) => {
    const prev = index > 0 ? normalizedLines[index - 1] : null;
    const next = index < normalizedLines.length - 1 ? normalizedLines[index + 1] : null;
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

export function hasLineGuides(lineGuideId?: string, category?: string | null): boolean {
  const resolved = resolveLineGuideId(lineGuideId, category);
  if (!resolved || isBlankLineGuideAlbum(resolved)) return false;
  const slotSet = (LINE_SLOTS as Record<string, Record<string, readonly unknown[]>>)[resolved];
  if (slotSet && Object.keys(slotSet).length > 0) return true;
  const guideSet = (LINE_GUIDES as Record<string, Record<string, readonly number[]>>)[resolved];
  return !!guideSet && Object.keys(guideSet).length > 0;
}

export function resolveContentRectForPage(params: GetLineSlotsParams): ContentRect {
  const { viewportWidth, viewportHeight, sourceWidth, sourceHeight, contentRect } = params;
  if (contentRect) return contentRect;
  return getContentRect(
    viewportWidth,
    viewportHeight,
    sourceWidth ?? viewportWidth,
    sourceHeight ?? viewportHeight
  );
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 0.98);
}

function isDiaryInteriorLineGuide(lineGuideId: string): boolean {
  return (
    lineGuideId === 'diary_interior_brown' || lineGuideId === 'diary_interior_purple'
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
  if (lineGuideId !== 'diary_interior_brown' || page !== 6 || slot.hasLabel) {
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
  if (lineGuideId !== 'diary_interior_purple' || page !== 5 || slot.hasLabel) {
    return false;
  }
  if (slot.y < 0.28) {
    return true;
  }
  return slot.y > 0.85;
}

/** Стр. 15: слот на заголовке «САМОЕ СОКРОВЕННОЕ». */
function isBrownPeachBottomTitleSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot
): boolean {
  if (lineGuideId !== 'diary_interior_brown' || page !== 15 || slot.hasLabel) {
    return false;
  }
  return (
    slot.y >= 0.82 &&
    slot.y <= 0.86 &&
    slot.x < 0.2 &&
    slot.width >= 0.4
  );
}

/** Стр. 16: линия под заголовком розового блока — не поле ввода. */
function isBrownPage16PeachTitleSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot
): boolean {
  if (lineGuideId !== 'diary_interior_brown' || page !== 16 || slot.hasLabel) {
    return false;
  }
  return (
    slot.y >= 0.695 &&
    slot.y <= 0.715 &&
    slot.x >= 0.08 &&
    slot.width >= 0.65
  );
}

/** Стр. 31: ложная широкая линия на тексте «Сколько человек в классе?» — отключено для макета 09.06.26. */
function isBrownPage31ClassQuestionSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot
): boolean {
  return false;
}

const BROWN_JOURNAL_TEMPLATE_PAGES = new Set([
  16, 20, 23, 25, 28, 33,
  45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
]);

const PURPLE_JOURNAL_TEMPLATE_PAGES = new Set([
  9, 11, 13, 15, 17, 19, 23, 34, 35, 36, 37, 38, 39,
]);

const PURPLE_DAY_SPREAD_PAGES = new Set([24, 25, 26, 27]);
const PURPLE_FRIEND_QUESTIONNAIRE_PAGES = new Set([28, 29, 30, 31, 32, 33]);

function getDiaryCareerQuestionPage(lineGuideId: string): number {
  return lineGuideId === 'diary_interior_purple' ? 5 : 6;
}

/** Первый розовый блок «НАПИШИ ИЛИ НАРИСУЙ!» — не поле ввода. */
function isBrownJournalFirstInstructionSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot
): boolean {
  if (lineGuideId !== 'diary_interior_brown' || slot.hasLabel) return false;
  if (!BROWN_JOURNAL_TEMPLATE_PAGES.has(page)) return false;
  return (
    slot.y >= 0.25 &&
    slot.y <= 0.3 &&
    slot.x < 0.15 &&
    slot.width >= 0.65
  );
}

function isBrownJournalInstructionSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot
): boolean {
  if (lineGuideId !== 'diary_interior_brown' || slot.hasLabel) return false;
  if (!BROWN_JOURNAL_TEMPLATE_PAGES.has(page)) return false;
  return false;
}

function isPurpleJournalFirstInstructionSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot
): boolean {
  if (lineGuideId !== 'diary_interior_purple' || slot.hasLabel) return false;
  if (!PURPLE_JOURNAL_TEMPLATE_PAGES.has(page)) return false;
  return (
    slot.y >= 0.25 &&
    slot.y <= 0.3 &&
    slot.x < 0.15 &&
    slot.width >= 0.65
  );
}

function isPurpleJournalTemplateSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot
): boolean {
  if (lineGuideId !== 'diary_interior_purple' || slot.hasLabel) return false;
  if (!PURPLE_JOURNAL_TEMPLATE_PAGES.has(page)) return false;
  if (slot.y >= 0.57 && slot.y <= 0.64 && slot.width >= 0.35 && slot.width <= 0.55) {
    return true;
  }
  if (slot.y >= 0.68 && slot.y <= 0.715 && slot.x < 0.15 && slot.width >= 0.65) {
    return true;
  }
  return false;
}

/** Журнальные блоки: подпись, смайлы, заголовок нижней секции — не поля ввода. */
function isBrownJournalTemplateSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot
): boolean {
  if (lineGuideId !== 'diary_interior_brown' || slot.hasLabel) return false;
  if (!BROWN_JOURNAL_TEMPLATE_PAGES.has(page)) return false;
  if (slot.y >= 0.57 && slot.y <= 0.64 && slot.width >= 0.35 && slot.width <= 0.55) {
    return true;
  }
  if (slot.y >= 0.68 && slot.y <= 0.715 && slot.x < 0.15 && slot.width >= 0.65) {
    return true;
  }
  return false;
}

/** Двойные дневные страницы: слоты на названии дня недели. */
function isBrownDaySpreadTitleSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot
): boolean {
  if (lineGuideId !== 'diary_interior_brown' || slot.hasLabel) return false;
  if (page < 34 || page > 40) return false;
  if (slot.y >= 0.14 && slot.y <= 0.22 && slot.x < 0.15 && slot.width >= 0.55) {
    return true;
  }
  if (slot.y >= 0.52 && slot.y <= 0.68 && slot.x < 0.15 && slot.width >= 0.55) {
    return true;
  }
  if (slot.y >= 0.55 && slot.y <= 0.67 && slot.x >= 0.35 && slot.width <= 0.28) {
    return true;
  }
  return false;
}

function isPurpleDaySpreadTitleSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot
): boolean {
  if (lineGuideId !== 'diary_interior_purple' || slot.hasLabel) return false;
  if (!PURPLE_DAY_SPREAD_PAGES.has(page)) return false;
  if (slot.y >= 0.14 && slot.y <= 0.22 && slot.x < 0.15 && slot.width >= 0.55) {
    return true;
  }
  if (slot.y >= 0.48 && slot.y <= 0.58 && slot.x < 0.15 && slot.width >= 0.65) {
    return true;
  }
  if (slot.y >= 0.55 && slot.y <= 0.67 && slot.x >= 0.35 && slot.width <= 0.28) {
    return true;
  }
  return false;
}

/** Стр. 24: нижняя декоративная линия под пунктом 5. */
function isBrownPage24FooterSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot
): boolean {
  if (lineGuideId !== 'diary_interior_brown' || page !== 24 || slot.hasLabel) {
    return false;
  }
  return slot.y >= 0.915 && slot.x < 0.2 && slot.width >= 0.65;
}

const BROWN_DAY_SPREAD_ILLUSTRATION_MAX_WIDTH = 0.55;

function refineBrownDaySpreadIllustrationNorm(
  page: number,
  norm: NormalizedLineSlot,
  allNorms: readonly NormalizedLineSlot[]
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
    (slot) => Math.abs(slot.y - norm.y) < 0.001 && Math.abs(slot.x - norm.x) < 0.001
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
  if (!PURPLE_FRIEND_QUESTIONNAIRE_PAGES.has(page) || norm.hasLabel) return norm;
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
  slot: NormalizedLineSlot
): boolean {
  if (lineGuideId !== 'diary_interior_brown' || page !== 17 || slot.hasLabel) {
    return false;
  }
  return false;
}

function refineBrownPage16PeachBlockNorm(
  page: number,
  norm: NormalizedLineSlot,
  allNorms: readonly NormalizedLineSlot[]
): NormalizedLineSlot {
  if (page !== 16 || norm.inputKind !== 'block' || norm.y < 0.74) {
    return norm;
  }

  const index = allNorms.indexOf(norm);
  const prev = index > 0 ? allNorms[index - 1] : null;
  const gap = prev ? norm.y - prev.y : norm.height;
  const cellHeight = Math.min(Math.max(gap * 0.94, 0.038), 0.05);

  return { ...norm, height: cellHeight };
}

/** Стр. 21: хвосты вопросов — не залезать на текст подписи. */
function refineBrownPage21LabeledRowNorm(
  page: number,
  norm: NormalizedLineSlot
): NormalizedLineSlot {
  if (page !== 21 || norm.hasLabel) return norm;

  const rowMinX: Array<{ minY: number; maxY: number; minX: number }> = [
    { minY: 0.318, maxY: 0.338, minX: 0.52 },
    { minY: 0.398, maxY: 0.418, minX: 0.5 },
    { minY: 0.458, maxY: 0.478, minX: 0.56 },
    { minY: 0.628, maxY: 0.648, minX: 0.58 },
  ];

  for (const row of rowMinX) {
    if (norm.y < row.minY || norm.y > row.maxY) continue;
    if (norm.x >= row.minX) return norm;
    const right = norm.x + norm.width;
    const x = row.minX;
    return { ...norm, x, width: Math.max(0.05, Math.min(right - x, 0.98 - x)) };
  }

  return norm;
}

/** Стр. 24: хвосты вопросов и список — не перекрывать подписи и кружки. */
function refineBrownPage24ListRowNorm(
  page: number,
  norm: NormalizedLineSlot
): NormalizedLineSlot {
  if (page !== 24 || norm.hasLabel) return norm;

  const rowMinX: Array<{ minY: number; maxY: number; minX: number }> = [
    { minY: 0.288, maxY: 0.312, minX: 0.5 },
    { minY: 0.332, maxY: 0.356, minX: 0.4 },
    { minY: 0.378, maxY: 0.402, minX: 0.52 },
    { minY: 0.422, maxY: 0.446, minX: 0.53 },
    { minY: 0.466, maxY: 0.492, minX: 0.6 },
    { minY: 0.508, maxY: 0.534, minX: 0.58 },
  ];

  for (const row of rowMinX) {
    if (norm.y < row.minY || norm.y > row.maxY) continue;
    if (norm.x >= row.minX) return norm;
    const right = norm.x + norm.width;
    const x = row.minX;
    return { ...norm, x, width: Math.max(0.05, Math.min(right - x, 0.98 - x)) };
  }

  if (norm.y < 0.63) return norm;

  const minX = 0.22;
  if (norm.x >= minX) return norm;
  const right = norm.x + norm.width;
  const x = minX;
  return { ...norm, x, width: Math.max(0.05, Math.min(right - x, 0.98 - x)) };
}

/** Стр. 17: единая высота полос на линиях. */
function refineBrownPage17UniformHeightNorm(
  page: number,
  norm: NormalizedLineSlot
): NormalizedLineSlot {
  if (page !== 17 || norm.hasLabel) return norm;
  if (norm.y < 0.24 || norm.y > 0.9) return norm;
  return { ...norm, height: 0.032 };
}

/** Стр. 17: нижний блок — только левая колонка, без иллюстрации кота. */
function refineBrownPage17BottomBlockNorm(
  page: number,
  norm: NormalizedLineSlot
): NormalizedLineSlot {
  if (page !== 17 || norm.y < 0.75) return norm;

  const maxWidth = 0.59;
  if (norm.width <= maxWidth) return norm;
  return { ...norm, width: maxWidth };
}

function applyBrownLabeledRowMinX(
  norm: NormalizedLineSlot,
  rows: Array<{ minY: number; maxY: number; minX: number }>
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
  rows: { minY: number; maxY: number; minX: number }[]
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
  norm: NormalizedLineSlot
): NormalizedLineSlot {
  if (page !== 5 || norm.hasLabel) return norm;
  return applyLabeledRowMinX(norm, [
    { minY: 0.478, maxY: 0.508, minX: 0.52 },
    { minY: 0.728, maxY: 0.758, minX: 0.52 },
  ]);
}

function refinePurplePage16LabeledRowNorm(
  page: number,
  norm: NormalizedLineSlot
): NormalizedLineSlot {
  if (page !== 16 || norm.hasLabel) return norm;
  return applyLabeledRowMinX(norm, [
    { minY: 0.488, maxY: 0.508, minX: 0.58 },
    { minY: 0.552, maxY: 0.572, minX: 0.56 },
  ]);
}

function refinePurplePage22LabeledRowNorm(
  page: number,
  norm: NormalizedLineSlot
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
  norm: NormalizedLineSlot
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
  norm: NormalizedLineSlot
): NormalizedLineSlot {
  if (page !== 31 || norm.hasLabel) return norm;

  let refined = applyBrownLabeledRowMinX(norm, [
    { minY: 0.412, maxY: 0.432, minX: 0.55 },
    { minY: 0.478, maxY: 0.498, minX: 0.42 },
    { minY: 0.544, maxY: 0.564, minX: 0.62 },
    { minY: 0.618, maxY: 0.638, minX: 0.65 },
    { minY: 0.868, maxY: 0.888, minX: 0.52 },
  ]);

  if (refined.inputKind !== 'block' && refined.y >= 0.32 && refined.y <= 0.94) {
    refined = { ...refined, height: 0.032 };
  }

  return refined;
}

/** Стр. 15 «Мечты»: единая высота полос на белых линиях. */
function refineBrownPage15PeachLineNorm(
  page: number,
  norm: NormalizedLineSlot
): NormalizedLineSlot {
  if (page !== 15 || norm.hasLabel) return norm;
  if (norm.y < 0.16 || norm.y > 0.95) return norm;
  return { ...norm, height: 0.028 };
}

/** Стр. 26: единая высота строк ввода. */
function refineBrownPage26UniformHeightNorm(
  page: number,
  norm: NormalizedLineSlot
): NormalizedLineSlot {
  if (page !== 26 || norm.hasLabel || norm.inputKind === 'block') return norm;
  if (norm.y < 0.28 || norm.y > 0.94) return norm;
  return { ...norm, height: 0.032 };
}

function isBrownWideBlockAnswerSlot(slot: NormalizedLineSlot): boolean {
  return !slot.hasLabel && slot.x < 0.15 && slot.width >= 0.72;
}

/** Стр. 13: хвост «Любимый мультфильм» (PNG ny≈0.4663, left≈0.435). */
function isBrownPage13CartoonTailNorm(
  lineGuideId: string,
  page: number,
  norm: NormalizedLineSlot
): boolean {
  if (lineGuideId !== 'diary_interior_brown' || page !== 13 || norm.hasLabel) {
    return false;
  }
  return (
    norm.y >= 0.468 &&
    norm.y <= 0.482 &&
    norm.x >= 0.42 &&
    norm.width >= 0.38 &&
    norm.width <= 0.52
  );
}

/** Стр. 13: хвосты «Любимый мультфильм» / «…сериал» / «…игрушка». */
function isBrownPage13FavoritesLabelTailSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot
): boolean {
  if (lineGuideId !== 'diary_interior_brown' || page !== 13 || slot.hasLabel) {
    return false;
  }
  return (
    slot.y >= 0.455 &&
    slot.y <= 0.555 &&
    slot.x >= 0.28 &&
    slot.width >= 0.38 &&
    slot.width <= 0.62
  );
}

function isBrownPage13AloneQuestionSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot
): boolean {
  if (lineGuideId !== 'diary_interior_brown' || page !== 13 || slot.hasLabel) {
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
  allSlots: readonly NormalizedLineSlot[]
): boolean {
  if (page === 17) return false;
  if (slot.hasLabel || isBrownWideBlockAnswerSlot(slot)) return false;

  const continuationPartner = allSlots.find(
    (candidate) =>
      candidate !== slot &&
      candidate.continuationGroup === slot.continuationGroup &&
      Math.abs(candidate.y - slot.y) > 0.015
  );
  if (continuationPartner) return false;

  const sameRowDuplicate = allSlots.some(
    (candidate) =>
      candidate !== slot &&
      Math.abs(candidate.y - slot.y) < 0.005 &&
      brownSlotHorizontalOverlapRatio(slot, candidate) > 0.8
  );
  if (sameRowDuplicate) return true;

  return false;
}

function brownSlotHorizontalOverlapRatio(
  a: Pick<NormalizedLineSlot, 'x' | 'width'>,
  b: Pick<NormalizedLineSlot, 'x' | 'width'>
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
  norm: NormalizedLineSlot
): boolean {
  if (lineGuideId !== 'diary_interior_brown' || page !== 13 || norm.hasLabel) {
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

export function isBrownPage6CareerShortHeadNorm(
  lineGuideId: string,
  page: number,
  norm: Pick<NormalizedLineSlot, 'y' | 'x' | 'width' | 'hasLabel'>
): boolean {
  const careerPage = getDiaryCareerQuestionPage(lineGuideId);
  const minY = lineGuideId === 'diary_interior_purple' ? 0.728 : 0.755;
  return (
    (lineGuideId === 'diary_interior_brown' || lineGuideId === 'diary_interior_purple') &&
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
  norm: Pick<NormalizedLineSlot, 'y' | 'x' | 'hasLabel' | 'width'>
): boolean {
  const careerPage = getDiaryCareerQuestionPage(lineGuideId);
  return (
    (lineGuideId === 'diary_interior_brown' || lineGuideId === 'diary_interior_purple') &&
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
  norm: Pick<NormalizedLineSlot, 'y' | 'x' | 'width' | 'hasLabel'>
): boolean {
  return (
    (lineGuideId === 'diary_interior_brown' || lineGuideId === 'diary_interior_purple') &&
    !norm.hasLabel &&
    norm.y >= 0.772 &&
    norm.y <= 0.79 &&
    norm.x >= 0.27 &&
    norm.width >= 0.3 &&
    norm.width < 0.66
  );
}

export function isBrownWishContinuationNorm(
  lineGuideId: string,
  norm: Pick<NormalizedLineSlot, 'y' | 'inputKind' | 'hasLabel' | 'width'>
): boolean {
  return (
    (lineGuideId === 'diary_interior_brown' || lineGuideId === 'diary_interior_purple') &&
    norm.inputKind === 'block' &&
    !norm.hasLabel &&
    norm.y >= 0.815 &&
    norm.width >= 0.65
  );
}

function refineBrownParentQuestionnaireRowNorm(
  lineGuideId: string,
  page: number,
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  const isParentPage =
    (lineGuideId === 'diary_interior_brown' && (page === 7 || page === 8)) ||
    (lineGuideId === 'diary_interior_purple' && (page === 6 || page === 7));
  const isGirlProfilePage = lineGuideId === 'diary_interior_brown' && page === 6;
  if (!isParentPage && !isGirlProfilePage) return norm;
  if (norm.inputKind === 'block') return norm;
  if (norm.y < 0.22 || norm.y > 0.82) return norm;

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

/** Нижняя линия «ДАТА» на event-страницах kids_48 (p8, p14…). */
function refineKids48BottomDateLineSlotNorm(
  page: number,
  norm: NormalizedLineSlot,
  slotIndex: number,
): NormalizedLineSlot {
  if (!isKids48BottomDateLineSlot('kids_48', page, slotIndex)) return norm;
  const strokeY = getKids48BottomDateLineStrokeY(page);
  if (strokeY == null) return norm;
  return {
    ...norm,
    x: KIDS48_P8_DATE_LINE.writableX,
    width: KIDS48_P8_DATE_LINE.writableWidth,
    y: strokeY,
    height: KIDS_MONTH_LINE_BAND_HEIGHT,
    hasLabel: false,
    inputKind: 'line',
    lineStrokeAtBottom: true,
  };
}

function refineKids48Page16DreamsDateLineSlotNorm(
  page: number,
  norm: NormalizedLineSlot,
  slotIndex: number,
): NormalizedLineSlot {
  if (page !== 16 || slotIndex !== 0) return norm;
  return {
    ...norm,
    x: KIDS48_P16_DREAMS_DATE_LINE.writableX,
    width: KIDS48_P16_DREAMS_DATE_LINE.writableWidth,
    y: KIDS48_P16_DREAMS_DATE_LINE.strokeY,
    height: KIDS_MONTH_LINE_BAND_HEIGHT,
    hasLabel: false,
    inputKind: 'line',
    lineStrokeAtBottom: true,
  };
}

function refineKids48Page10FirstBrushingSlotNorm(
  page: number,
  norm: NormalizedLineSlot,
  slotIndex: number,
): NormalizedLineSlot {
  if (page !== 10 || slotIndex !== 20) return norm;
  return {
    ...norm,
    x: KIDS48_P10_FIRST_BRUSHING_LINE.writableX,
    width: KIDS48_P10_FIRST_BRUSHING_LINE.writableWidth,
    y: KIDS48_P10_FIRST_BRUSHING_LINE.strokeY,
    height: KIDS_MONTH_LINE_BAND_HEIGHT,
    hasLabel: false,
    inputKind: 'line',
  };
}

function refineKids48Page10ToothDateSlotNorm(
  lineGuideId: string,
  page: number,
  norm: NormalizedLineSlot,
  slotIndex: number,
): NormalizedLineSlot {
  if (!isKids48TeethToothDateSlot(lineGuideId, page, slotIndex)) return norm;
  const targetWidth = KIDS48_TEETH_TOOTH_DATE_SLOT_WIDTH;
  if (norm.width >= targetWidth) return norm;

  const widthDelta = targetWidth - norm.width;
  const slotCenterX = norm.x + norm.width / 2;
  let x = norm.x;
  if (slotCenterX < 0.5) {
    x = Math.max(0.06, norm.x - widthDelta);
  }

  return {
    ...norm,
    x,
    width: targetWidth,
  };
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
  const writable =
    getKidsMonthAnswerWritableBounds(page, slotIndex) ?? {
      x: layout.canX,
      width: layout.canWidth,
    };

  return {
    ...norm,
    x: writable.x,
    width: writable.width,
    y: strokeY,
    height: KIDS_MONTH_LINE_BAND_HEIGHT,
    continuationGroup: slotIndex,
    inputKind: 'line',
  };
}

/** Тонкая подстройка PDF-слотов под отрисовку текста (координаты из вектора, не margins). */
function refineNormalizedSlotForTextLayout(
  lineGuideId: string,
  page: number,
  norm: NormalizedLineSlot,
  allNorms: readonly NormalizedLineSlot[] = [],
  slotIndex = 0,
): NormalizedLineSlot {
  if (lineGuideId === 'kids_48' && isKidsMonthPage(page)) {
    return refineKidsMonthLineSlotNorm(page, norm, slotIndex);
  }

  if (lineGuideId === 'kids_48' && getKids48BottomDateLineStrokeY(page) != null) {
    return refineKids48BottomDateLineSlotNorm(page, norm, slotIndex);
  }

  if (lineGuideId === 'kids_48' && page === 16) {
    return refineKids48Page16DreamsDateLineSlotNorm(page, norm, slotIndex);
  }

  if (lineGuideId === 'kids_48' && page === 10) {
    const refined = refineKids48Page10ToothDateSlotNorm(lineGuideId, page, norm, slotIndex);
    return refineKids48Page10FirstBrushingSlotNorm(page, refined, slotIndex);
  }

  if (!lineGuideId?.startsWith('diary_interior_')) {
    return norm;
  }

  let refined = refineBrownParentQuestionnaireRowNorm(lineGuideId, page, norm);
  if (lineGuideId === 'diary_interior_brown') {
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

  if (lineGuideId === 'diary_interior_purple') {
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
      refined.width <= 0.22 ? refined.width : BROWN_PAGE6_CAREER_HEAD_WIDTH_NORM;
    const x = clamp01(baseLeft + BROWN_WISH_HEAD_TEXT_INSET_NORM);
    const width = Math.max(
      0.05,
      Math.min(baseWidth - BROWN_WISH_HEAD_TEXT_INSET_NORM, 0.98 - x)
    );
    const { inputKind: _drop, ...rest } = refined;
    return { ...rest, x, width };
  }

  if (isBrownPage6CareerContinuationNorm(lineGuideId, page, refined)) {
    const right = Math.max(refined.x + refined.width, BROWN_WISH_CONTINUATION_LEFT_NORM + 0.72);
    const x = BROWN_WISH_CONTINUATION_LEFT_NORM;
    const width = Math.max(0.05, Math.min(right - x, 0.98 - x));
    return { ...refined, x, width, inputKind: 'block' as const };
  }

  if (isBrownWishShortHeadNorm(lineGuideId, refined)) {
    const x = clamp01(refined.x + BROWN_WISH_HEAD_TEXT_INSET_NORM);
    const width = Math.max(0.05, Math.min(refined.width - BROWN_WISH_HEAD_TEXT_INSET_NORM, 0.98 - x));
    return { ...refined, x, width };
  }

  if (isBrownWishContinuationNorm(lineGuideId, refined)) {
    const right = refined.x + refined.width;
    const x = BROWN_WISH_CONTINUATION_LEFT_NORM;
    const width = Math.max(0.05, Math.min(right - x, 0.98 - x));
    return { ...refined, x, width };
  }

  const isBlock = refined.inputKind === 'block';
  const isPregnancyRuledLine =
    (lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5') &&
    !isBlock &&
    !refined.hasLabel;
  const xInset = isBlock ? 0 : refined.hasLabel ? 0.003 : isPregnancyRuledLine ? 0.003 : 0.006;
  const widthTrim = isBlock ? 0 : refined.hasLabel ? 0.004 : isPregnancyRuledLine ? 0.004 : 0.01;
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
  Record<'pregnancy_60' | 'pregnancy_a5', PregnancyWeeklyCalib>
> = {
  pregnancy_60: {
    pageWidth: 2126,
    pageHeight: 2835,
    boxRight: 2126,
    lineHeightNorm: 0.032,
    weight: { valueX: 1419, topY: 542 },
    belly: { valueX: 1809, topY: 672 },
  },
  pregnancy_a5: {
    pageWidth: 1796,
    pageHeight: 2528,
    boxRight: 1673,
    lineHeightNorm: 0.038,
    weight: { valueX: 1210, topY: 514 },
    belly: { valueX: 1527, topY: 618 },
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
  if (lineGuideId === 'pregnancy_60') return isPregnancy60WeeklyPage(page);
  if (lineGuideId === 'pregnancy_a5') return isPregnancyA5WeeklyPage(page);
  return false;
}

/**
 * Текстовые строки n-недели (дата, планы, ощущения) — единый stroke-baseline layout.
 */
export function isPregnancyWeeklyTextLineSlot(
  lineGuideId: string | undefined,
  slot: Pick<TextLineSlot, 'page' | 'index' | 'inputKind' | 'textAnchorTop'>,
): boolean {
  if (!isPregnancyWeeklyStructuredPage(lineGuideId, slot.page)) return false;
  if (isPregnancy60WeeklyValueSlot(lineGuideId, slot)) return false;
  return (slot.inputKind ?? 'line') === 'line';
}

/** @deprecated Используйте isPregnancyWeeklyTextLineSlot */
export function isPregnancyWeeklyRuledLineSlot(
  lineGuideId: string | undefined,
  slot: Pick<TextLineSlot, 'page' | 'index' | 'inputKind' | 'textAnchorTop'>,
): boolean {
  return isPregnancyWeeklyTextLineSlot(lineGuideId, slot);
}

/**
 * Статические страницы pregnancy_60 (не недельные) — штрих из LINE_GUIDES, как на недельных.
 * Постановка на учёт: «Моё самочувствие», рекомендации и т.п.
 */
export function isPregnancy60GuideRuledLineSlot(
  lineGuideId: string | undefined,
  slot: Pick<TextLineSlot, 'page' | 'index' | 'inputKind'>,
): boolean {
  if (lineGuideId !== 'pregnancy_60') return false;
  if (isPregnancy60WeeklyPage(slot.page)) return false;
  if ((slot.inputKind ?? 'line') !== 'line') return false;
  const guides = (LINE_GUIDES as Record<string, Record<string, readonly number[]>>)[
    lineGuideId
  ]?.[String(slot.page)];
  return !!guides && slot.index >= 0 && slot.index < guides.length;
}

/**
 * Начало поля в continuation group.
 * После split каждая строка — отдельная аннотация; для штриха нужен старт поля, не индекс строки.
 */
export function getPregnancyWeeklyFieldStartIndex(
  slotIndex: number,
  slots: readonly Pick<
    TextLineSlot,
    'index' | 'continuationGroup' | 'hasLabel' | 'inputKind' | 'normHeight'
  >[],
): number {
  const slot = slots[slotIndex];
  if (!slot) return slotIndex;

  const groupSlots = slots
    .filter((s) => s.continuationGroup === slot.continuationGroup)
    .sort((a, b) => a.index - b.index);
  if (groupSlots.length === 0) return slotIndex;

  const first = groupSlots[0]!;
  const unlabeled = groupSlots.filter(
    (s) =>
      !s.hasLabel &&
      (s.inputKind ?? 'line') === 'line' &&
      s.index !== 1 &&
      s.index !== 5,
  );

  const labelOnlyHead =
    first.hasLabel &&
    (first.normHeight ?? 0) < 0.038 &&
    unlabeled.length > 0 &&
    unlabeled[0]!.index > first.index;

  if (labelOnlyHead) {
    return unlabeled[0]!.index;
  }

  return first.index;
}

function getPregnancyWeeklyCalib(
  lineGuideId: string,
  page: number,
): PregnancyWeeklyCalib | null {
  if (lineGuideId === 'pregnancy_60' && isPregnancy60WeeklyPage(page)) {
    return PREGNANCY_WEEKLY_CALIB.pregnancy_60;
  }
  if (lineGuideId === 'pregnancy_a5' && isPregnancyA5WeeklyPage(page)) {
    return PREGNANCY_WEEKLY_CALIB.pregnancy_a5;
  }
  return null;
}

export function isPregnancy60WeeklyValueSlot(
  lineGuideId: string | undefined,
  slot: Pick<TextLineSlot, 'page' | 'index' | 'textAnchorTop'>,
): boolean {
  return (
    (lineGuideId === 'pregnancy_60' &&
      isPregnancy60WeeklyPage(slot.page) &&
      (slot.index === 1 || slot.index === 5)) ||
    (lineGuideId === 'pregnancy_a5' &&
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

  const { pageWidth, pageHeight, boxRight, lineHeightNorm, weight, belly } = calib;
  const result = norms.map((slot) => ({ ...slot }));

  const weightX = formatSlotNorm(weight.valueX / pageWidth);
  const bellyX = formatSlotNorm(belly.valueX / pageWidth);
  const weightTopY = formatSlotNorm(weight.topY / pageHeight);
  const bellyTopY = formatSlotNorm(belly.topY / pageHeight);

  result[1] = {
    ...result[1],
    x: weightX,
    y: weightTopY,
    width: formatSlotNorm(Math.max(0.05, (boxRight - weight.valueX) / pageWidth)),
    height: lineHeightNorm,
    hasLabel: false,
    inputKind: 'block',
    textAnchorTop: true,
  };

  result[5] = {
    ...result[5],
    x: bellyX,
    y: bellyTopY,
    width: formatSlotNorm(Math.max(0.05, (boxRight - belly.valueX) / pageWidth)),
    height: lineHeightNorm,
    hasLabel: false,
    inputKind: 'block',
    textAnchorTop: true,
  };

  return result;
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
  if (lineGuideId !== 'pregnancy_60' && lineGuideId !== 'pregnancy_a5') {
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
        ? result[nextIdx].y - result[nextIdx].height / 2 - PREGNANCY_LINE_GAP_NORM
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
    rect?.offsetX ?? '',
    rect?.offsetY ?? '',
    rect?.width ?? '',
    rect?.height ?? '',
    'weekly-stroke-v11',
  ].join('|');
}

export function getLineSlotsForPage(params: GetLineSlotsParams): TextLineSlot[] {
  const cacheKey = lineSlotsCacheKey(params);
  const cached = lineSlotsResultCache.get(cacheKey);
  if (cached) return cached;

  const { lineGuideId, page, viewportWidth, viewportHeight } = params;
  if (!hasLineGuides(lineGuideId) || viewportWidth <= 0 || viewportHeight <= 0) {
    lineSlotsResultCache.set(cacheKey, []);
    return [];
  }

  const normalized = refinePregnancy60WeeklyWeightBellySlots(
    lineGuideId,
    page,
    refineDenseContinuationGroupSpacing(
      lineGuideId,
      page,
      getNormalizedSlotsForPage(lineGuideId, page),
    ),
  );
  if (!normalized.length) {
    lineSlotsResultCache.set(cacheKey, []);
    return [];
  }

  const rect = resolveContentRectForPage(params);

  const slots = normalized.map((norm, index) => {
    const layoutNorm = refineNormalizedSlotForTextLayout(
      lineGuideId,
      page,
      norm,
      normalized,
      index,
    );
    const isWeeklyValueSlot =
      (lineGuideId === 'pregnancy_60' &&
        isPregnancy60WeeklyPage(page) &&
        (index === 1 || index === 5)) ||
      (lineGuideId === 'pregnancy_a5' &&
        isPregnancyA5WeeklyPage(page) &&
        (index === 1 || index === 5));
    const anchorTop =
      isWeeklyValueSlot ||
      layoutNorm.textAnchorTop === true ||
      layoutNorm.lineStrokeAtBottom === true;
    const topNormY =
      isDiaryInteriorLineGuide(lineGuideId)
        ? getDiarySlotTopNormY(layoutNorm)
        : lineGuideId === 'kids_48' &&
            isKidsMonthPage(page) &&
            index >= 1
          ? getKidsMonthAnswerSlotTopNormY(layoutNorm)
          : isKids48CalibratedDateLineSlot(lineGuideId, page, index)
            ? getKidsMonthAnswerSlotTopNormY(layoutNorm)
            : anchorTop
              ? layoutNorm.y
              : layoutNorm.y - layoutNorm.height / 2;
    const mapped = mapSourceNormToViewport(
      layoutNorm.x,
      topNormY,
      layoutNorm.width,
      layoutNorm.height,
      rect
    );

    const lineStrokeAtBottom =
      layoutNorm.lineStrokeAtBottom === true ||
      (lineGuideId === 'kids_48' && isKidsMonthPage(page) && index >= 1) ||
      isKids48CalibratedDateLineSlot(lineGuideId, page, index) ||
      isDiaryInteriorLineGuide(lineGuideId);

    return {
      index,
      page,
      x: mapped.x,
      y: mapped.y,
      width: mapped.width,
      lineHeight: mapped.height,
      hasLabel: norm.hasLabel ?? true,
      continuationGroup: layoutNorm.continuationGroup ?? norm.continuationGroup ?? index + 1,
      inputKind: layoutNorm.inputKind ?? norm.inputKind,
      normY: anchorTop ? layoutNorm.y + layoutNorm.height / 2 : layoutNorm.y,
      normHeight: layoutNorm.height,
      lineStrokeAtBottom,
      textAnchorTop: anchorTop,
    };
  });

  lineSlotsResultCache.set(cacheKey, slots);
  return slots;
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

  return [...map.values()].map((group) => group.sort((a, b) => a.index - b.index));
}

export function getLineSlotGroupBounds(groupSlots: TextLineSlot[]): LineSlotGroupBounds {
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
  minHitPx = 28
): { top: number; height: number } {
  if (slot.lineHeight >= minHitPx) {
    return { top: slot.y, height: slot.lineHeight };
  }

  const prev = slots[slot.index - 1];
  const next = slots[slot.index + 1];
  const slotBottom = slot.y + slot.lineHeight;

  const gapAbove = prev ? Math.max(0, slot.y - (prev.y + prev.lineHeight)) : Infinity;
  const gapBelow = next ? Math.max(0, next.y - slotBottom) : Infinity;

  const needExpand = minHitPx - slot.lineHeight;
  let expandUp = Math.min(needExpand / 2, gapAbove / 2);
  let expandDown = Math.min(needExpand - expandUp, gapBelow / 2);

  if (next) {
    expandDown = Math.min(expandDown, Math.max(0, next.y - slotBottom - 2));
  }
  if (prev) {
    const slotTop = slot.y;
    expandUp = Math.min(expandUp, Math.max(0, slotTop - (prev.y + prev.lineHeight) - 2));
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
  slotParams: GetLineSlotsParams
): { x: number; y: number; width: number; height: number } {
  const vertical = getSlotVerticalHitBounds(slot, slots);
  let left = slot.x;
  let width = slot.width;

  const isBrownWideAnswerRow =
    slotParams.lineGuideId === 'diary_interior_brown' &&
    !slot.hasLabel &&
    slot.normY != null &&
    slot.x < 0.16 &&
    slot.width >= 0.72;

  const isDiaryWishContinuation =
    (slotParams.lineGuideId === 'diary_interior_brown' ||
      slotParams.lineGuideId === 'diary_interior_purple') &&
    !slot.hasLabel &&
    slot.inputKind === 'block' &&
    slot.normY != null &&
    slot.normY >= 0.815 &&
    slot.width >= 0.65;

  const careerPage = getDiaryCareerQuestionPage(slotParams.lineGuideId ?? '');
  const isPage6CareerContinuation =
    (slotParams.lineGuideId === 'diary_interior_brown' ||
      slotParams.lineGuideId === 'diary_interior_purple') &&
    slotParams.page === careerPage &&
    !slot.hasLabel &&
    slot.normY != null &&
    slot.normY >= 0.788 &&
    slot.normY <= 0.845 &&
    slot.width >= 0.45 &&
    slot.x < 0.16;

  if (
    slotParams.lineGuideId === 'diary_interior_purple' ||
    slotParams.lineGuideId === 'diary_interior_brown'
  ) {
    if (isDiaryWishContinuation || isPage6CareerContinuation) {
      const rect = resolveContentRectForPage(slotParams);
      const minLeft = rect.offsetX + rect.width * BROWN_WISH_CONTINUATION_LEFT_NORM;
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
    const blockPriority = slot.inputKind === 'block' ? -1000 : 0;
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
  slotIndex: number
): Annotation | undefined {
  return annotations.find((ann) => {
    if (ann.type !== 'text' || ann.page !== page) return false;
    if (typeof ann.templateLineStart !== 'number') return false;
    const count = ann.templateLineCount ?? 1;
    if (count === 1) return ann.templateLineStart === slotIndex;
    return slotIndex >= ann.templateLineStart && slotIndex < ann.templateLineStart + count;
  });
}

/** Любая аннотация группы продолжения (тап по 2–3-й строке блока). */
export function findAnnotationForContinuationGroup(
  annotations: Annotation[],
  page: number,
  slots: TextLineSlot[],
  slotIndex: number
): Annotation | undefined {
  const tapped = slots[slotIndex];
  if (!tapped) return undefined;

  const groupId = tapped.continuationGroup;
  return annotations.find((ann) => {
    if (ann.type !== 'text' || ann.page !== page) return false;
    if (typeof ann.templateLineStart !== 'number') return false;
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
  const paragraphs = text.split('\n');
  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      allLines.push('');
      continue;
    }
    allLines.push(...wrapTextToLines(paragraph, slotWidth, fontSize));
  }

  const maxLines = availableSlots.length;
  const used = allLines.slice(0, maxLines);
  const truncated = allLines.length > maxLines;

  return {
    content: used.join('\n'),
    lineCount: Math.max(1, used.length),
    truncated,
  };
}

export function getSlotYForLineIndex(
  slots: TextLineSlot[],
  startIndex: number,
  lineOffset: number
): number {
  const slot = slots[startIndex + lineOffset];
  return slot?.y ?? slots[startIndex]?.y ?? 0;
}

export function layoutAnnotationFromSlot(slot: TextLineSlot): Pick<
  Annotation,
  'x' | 'y' | 'width' | 'height' | 'templateLineStart' | 'templateLineCount'
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
): Pick<Annotation, 'x' | 'y' | 'width' | 'height' | 'fontSize'> {
  const layout = layoutAnnotationFromSlot(slot);
  const inputKind = slot.inputKind ?? 'line';
  const textTop = getTemplateLineTextTop(slot, fontSize, lineGuideId);
  const typography = getTemplateLineTypography(
    fontSize,
    slot.lineHeight,
    inputKind,
    lineGuideId,
  );
  let effectiveFontSize = typography.fontSize;
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
  } else if (
    textContent &&
    slot.width > 0 &&
    (lineGuideId === 'diary_interior_purple' || lineGuideId === 'diary_interior_brown')
  ) {
    const profile = getTemplateTypographyProfile(lineGuideId);
    const charWidth = effectiveFontSize * profile.charWidthRatio;
    const slackWidth = slot.width * (profile.lineWidthSlackRatio ?? 0.98);
    const neededWidth = textContent.length * charWidth;
    if (neededWidth > slackWidth) {
      effectiveFontSize = Math.max(
        11,
        Math.floor(effectiveFontSize * (slackWidth / neededWidth)),
      );
    }
  }
  const rowHeight = Math.max(
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
