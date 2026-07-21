import {
  getAlbumTextMargins,
  getKids48BottomDateLineStrokeY,
  getKidsMonthAnswerLineLayout,
  getKidsMonthAnswerStrokeY,
  getKidsMonthAnswerWritableBounds,
  isBlankLineGuideAlbum,
  isKids48BottomDateLineSlot,
  isKidsMonthPage,
  KIDS48_BOTTOM_DATE_LINE,
  KIDS48_P1_BIRTH_DATE_LINE,
  KIDS48_P1_VALUE_LINE_X_INSET,
  KIDS48_P13_CRAWLS_LINE,
  KIDS48_P16_DREAMS_DATE_LINE,
  KIDS48_P10_FIRST_BRUSHING_LINE,
  KIDS48_P10_TEETH_COUNT_LINE,
  KIDS48_FAMILY_TREE_NAME_SLOT_WIDTH,
  KIDS48_TEETH_TOOTH_DATE_SLOT_WIDTH,
  KIDS_MONTH_LINE_BAND_HEIGHT,
  KIDS_MONTH_LINE_X_INSET,
  DIARY_UNIFORM_LINE_X_INSET,
  DIARY_BROWN_P15_DREAM_LINE_YS,
  BROWN_MY_DAY_DATE_UNDER_TITLE,
  PURPLE_MY_DAY_DATE_AFTER_TODAY,
  isPurpleMyDayPage,
  isBrownMyDayPage,
} from '@/constants/album-text-margins';
import {
  getKids48EventDateLineNorm,
  isKids48EventDateLineSlot,
} from '@/constants/kids-48-event-date-slots';
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
  resolveTemplateLineFontSizeForText,
  usesStrokeBaselineLayout,
  usesPregnancyGuideRuledTextLayout,
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
  /** Нормализованная ширина слота (0–1), для подбора шрифта */
  normWidth?: number;
  /** norm.y = штрих линии; полоса лежит над линией (как diary_interior) */
  lineStrokeAtBottom?: boolean;
  /** Y слота = верх полосы (калибровка «Вес» / «Обхват» на неделях pregnancy_60). */
  textAnchorTop?: boolean;
  /** kids_48: исходный norm.y был штрихом (strokeAtNormY bake). */
  strokeAtNormY?: boolean;
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
    const filtered = fromSlots.filter(
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
    if (lineGuideId === 'diary_interior_purple' && page === 5) {
      return refinePurplePage5CareerSlots(page, filtered);
    }
    if (lineGuideId === 'diary_interior_brown' && page === 6) {
      return refineBrownPage6CareerSlots(page, filtered);
    }
    if (lineGuideId === 'diary_interior_purple' && (page === 6 || page === 7)) {
      return refinePurpleParentWishSlots(page, filtered);
    }
    if (lineGuideId === 'diary_interior_brown' && (page === 7 || page === 8 || page === 11 || page === 12)) {
      return refineBrownParentWishSlots(page, filtered);
    }
    if (
      (lineGuideId === 'diary_interior_purple' && page === 8) ||
      (lineGuideId === 'diary_interior_brown' && page === 13)
    ) {
      return refineDiaryHobbySlots(lineGuideId, page, filtered);
    }
    if (lineGuideId === 'diary_interior_brown' && page === 15) {
      return refineDiaryDreamsSlots(lineGuideId, page, filtered);
    }
    if (lineGuideId === 'diary_interior_brown' && page === 26) {
      return refineBrownPage26JewelryContinuation(filtered);
    }
    if (lineGuideId === 'diary_interior_brown' && page === 38) {
      return refineBrownPage38FoodContinuation(filtered);
    }
    if (
      lineGuideId === 'diary_interior_brown' &&
      page >= 39 &&
      page <= 44
    ) {
      return refineBrownFriendQuestionnaireNameSlot(filtered);
    }
    if (isPurpleMyDayPage(lineGuideId, page)) {
      return refinePurpleMyDaySlots(filtered);
    }
    if (isBrownMyDayPage(lineGuideId, page)) {
      return refineBrownMyDaySlots(filtered);
    }
    if (
      lineGuideId === 'diary_interior_purple' &&
      (page === 24 || page === 25 || page === 26)
    ) {
      return refinePurpleWeeklyTwoDaySlots(filtered);
    }
    if (
      lineGuideId === 'diary_interior_purple' &&
      PURPLE_FRIEND_QUESTIONNAIRE_PAGES.has(page)
    ) {
      return refinePurpleFriendWishSlots(page, filtered);
    }
    return filtered;
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

/** В PDF norm.y — координата штриха; слот якорится на штрихе (baseline = y). */
function getDiarySlotTopNormY(norm: NormalizedLineSlot): number {
  return norm.y;
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
const BROWN_DAY_SPREAD_PAGES = new Set([34, 35, 36, 37]);

function isBrownDaySpreadTitleSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot
): boolean {
  if (lineGuideId !== 'diary_interior_brown' || slot.hasLabel) return false;
  // Только пн–чт недельного разворота — НЕ «Еда» (38) и НЕ анкеты друзей (39–44).
  if (!BROWN_DAY_SPREAD_PAGES.has(page)) return false;
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
  // Декор над первой линейкой письма (письмо с ≈0.178–0.184).
  if (slot.y >= 0.14 && slot.y < 0.175 && slot.x < 0.15 && slot.width >= 0.55) {
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
  const isBrownDaySpread = BROWN_DAY_SPREAD_PAGES.has(page);
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
/**
 * «Пожелания хозяйке анкеты:» — 2 линии сразу под подписью.
 * Instagram начинается с ≈0.7887 (под «Ники…»), эту линию не удаляем.
 */
function refinePurpleFriendWishSlots(
  page: number,
  norms: readonly NormalizedLineSlot[],
): NormalizedLineSlot[] {
  if (!PURPLE_FRIEND_QUESTIONNAIRE_PAGES.has(page) || norms.length < 17) {
    return [...norms];
  }

  const sorted = [...norms].sort((a, b) => a.y - b.y || a.x - b.x);
  // Только декоративная линия над «Пожелания…».
  const withoutSpurious = sorted.filter(
    (s) => !(s.y >= 0.7 && s.y <= 0.735 && s.x < 0.15 && s.width >= 0.7),
  );

  const head = withoutSpurious.find(
    (s) =>
      s.y >= 0.74 &&
      s.y <= 0.77 &&
      s.x >= 0.35 &&
      s.x <= 0.55 &&
      s.width >= 0.35 &&
      s.width <= 0.55,
  );
  if (!head) return withoutSpurious;

  const contY = Math.round(Math.min(head.y + 0.034, 0.805) * 10000) / 10000;
  const hasCont = withoutSpurious.some(
    (s) => s !== head && Math.abs(s.y - contY) < 0.012 && s.y < 0.81,
  );
  if (hasCont) {
    return pinPurpleFriendBottomSlots(
      withoutSpurious.map((slot) => ({
        ...slot,
        height: slot.height > 0.01 ? slot.height : 0.028,
        inputKind: 'line' as const,
        lineStrokeAtBottom: true,
      })),
    );
  }

  const wishCont: NormalizedLineSlot = {
    ...head,
    x: 0.0886,
    y: contY,
    width: 0.55,
    height: 0.028,
    hasLabel: false,
    inputKind: 'line',
    lineStrokeAtBottom: true,
    continuationGroup: 17,
  };
  const headIndex = withoutSpurious.indexOf(head);
  const next = [...withoutSpurious];
  next.splice(headIndex + 1, 0, wishCont);
  return pinPurpleFriendBottomSlots(
    next.map((slot) => ({
      ...slot,
      height: slot.height > 0.01 ? slot.height : 0.028,
      inputKind: 'line' as const,
      lineStrokeAtBottom: true,
    })),
  );
}

/** Instagram / VK / TikTok — у иконок (ниже «Ники…»); 2-я линия пожеланий не трогаем. */
function pinPurpleFriendBottomSlots(
  norms: readonly NormalizedLineSlot[],
): NormalizedLineSlot[] {
  if (norms.length < 21) return [...norms];
  const sorted = [...norms].sort((a, b) => a.y - b.y || a.x - b.x);
  return sorted.map((slot, index) => {
    // IG / VK / TT: 0.8568 / 0.8925 / 0.9253 (не 0.8219 — слишком высоко к «Ники…»).
    if (index === 18) {
      return {
        ...slot,
        x: 0.28,
        y: 0.8568,
        width: 0.55,
        height: 0.028,
        inputKind: 'line' as const,
        lineStrokeAtBottom: true,
      };
    }
    if (index === 19) {
      return {
        ...slot,
        x: 0.28,
        y: 0.8925,
        width: 0.55,
        height: 0.028,
        inputKind: 'line' as const,
        lineStrokeAtBottom: true,
      };
    }
    if (index === 20) {
      return {
        ...slot,
        x: 0.28,
        y: 0.9253,
        width: 0.55,
        height: 0.028,
        inputKind: 'line' as const,
        lineStrokeAtBottom: true,
      };
    }
    if (index === 17) {
      // 2-я линия пожеланий — сразу под хвостом после «:», не на Instagram.
      const head = sorted[16];
      const contY = Math.round(Math.min((head?.y ?? 0.7532) + 0.034, 0.805) * 10000) / 10000;
      return {
        ...slot,
        x: 0.0886,
        y: contY,
        width: 0.55,
        height: 0.028,
        inputKind: 'line' as const,
        lineStrokeAtBottom: true,
        continuationGroup: 17,
      };
    }
    return {
      ...slot,
      height: slot.height > 0.01 ? slot.height : 0.028,
      inputKind: 'line' as const,
      lineStrokeAtBottom: true,
    };
  });
}

function refinePurpleFriendSocialRowNorm(
  page: number,
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  if (!PURPLE_FRIEND_QUESTIONNAIRE_PAGES.has(page) || norm.hasLabel) return norm;
  // Instagram / VK / TikTok — строго у иконок (не линия «Ники…» ≈0.788).
  if (norm.y < 0.84 || norm.y > 0.94) return norm;

  const minAnswerLeft = 0.28;
  if (norm.x >= minAnswerLeft) return norm;

  const right = norm.x + norm.width;
  const x = minAnswerLeft;
  const width = Math.max(0.15, Math.min(right - x, 0.98 - x));
  return { ...norm, x, width };
}

/** Стр. 17: ложный микро-хвост справа на строке вопроса (не поле ответа). */
function isBrownPage17QuestionRowSpuriousSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot
): boolean {
  if (lineGuideId !== 'diary_interior_brown' || page !== 17 || slot.hasLabel) {
    return false;
  }
  // Хвостики ~0.11–0.12 после «появились:» / «питомцами?» — лимит в форме падает до 3 символов.
  return slot.x >= 0.55 && slot.width > 0 && slot.width < 0.22;
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

/**
 * Стр. 21: слоты уже из PDF thin-strokes (хвосты + полные линии).
 * Раньше minX сдвигал «Ты летала…» вправо и обрезал ширину.
 */
function refineBrownPage21LabeledRowNorm(
  page: number,
  norm: NormalizedLineSlot
): NormalizedLineSlot {
  if (page !== 21 || norm.hasLabel) return norm;
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
  ]);
}

/** Стр. 5: ответ «Кем ты хочешь стать» — хвост после «?» и продолжение на следующей линии. */
function refinePurplePage5CareerSlots(
  page: number,
  norms: readonly NormalizedLineSlot[],
): NormalizedLineSlot[] {
  if (page !== 5 || norms.length < 12) return [...norms];

  const result = norms.map((slot) => ({ ...slot }));
  result[11] = {
    ...result[11],
    x: PURPLE_PAGE5_CAREER_HEAD_LEFT_NORM,
    y: PURPLE_PAGE5_CAREER_HEAD_Y,
    width: PURPLE_PAGE5_CAREER_HEAD_WIDTH_NORM,
    height: 0.028,
    hasLabel: false,
    inputKind: 'line',
    continuationGroup: 12,
  };

  if (result.length === 12) {
    result.push({
      x: PURPLE_PAGE5_CAREER_CONTINUATION.x,
      y: PURPLE_PAGE5_CAREER_CONTINUATION.y,
      width: PURPLE_PAGE5_CAREER_CONTINUATION.width,
      height: 0.028,
      hasLabel: false,
      inputKind: 'line',
      continuationGroup: 12,
    });
  } else {
    result[12] = {
      ...result[12],
      x: PURPLE_PAGE5_CAREER_CONTINUATION.x,
      y: PURPLE_PAGE5_CAREER_CONTINUATION.y,
      width: PURPLE_PAGE5_CAREER_CONTINUATION.width,
      height: 0.028,
      hasLabel: false,
      inputKind: 'line',
      continuationGroup: 12,
    };
  }

  return result;
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

/**
 * Расписание на два дня (стр. 24–26): ровно 6 линий сверху + 6 снизу.
 * Иначе лишняя линия у заголовка «Среда» съедает индекс, и день/четверг
 * сдвигаются (текст среды со 2-й линии, первая линия четверга — хвост среды).
 */
function refinePurpleWeeklyTwoDaySlots(
  norms: readonly NormalizedLineSlot[],
): NormalizedLineSlot[] {
  if (norms.length < 8) return [...norms];

  const sorted = [...norms].sort((a, b) => a.y - b.y || a.x - b.x);
  let splitAt = -1;
  let maxGap = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = sorted[i]!.y - sorted[i - 1]!.y;
    if (gap > maxGap) {
      maxGap = gap;
      splitAt = i;
    }
  }
  if (splitAt < 1 || maxGap < 0.08) return [...norms];

  const top = sorted.slice(0, splitAt).slice(0, 6);
  const bottom = sorted.slice(splitAt).slice(0, 6);
  const merged = [...top, ...bottom];

  return merged.map((slot, index) => ({
    ...slot,
    height: slot.height > 0.01 ? slot.height : KIDS_MONTH_LINE_BAND_HEIGHT,
    hasLabel: false,
    inputKind: 'line' as const,
    lineStrokeAtBottom: true,
    continuationGroup: index + 1,
  }));
}

/**
 * Фиолетовый «Твой день»:
 * - линии письма 0..14 (день 0..7, улыбка 8..14);
 * - дата после «ЗА СЕГОДНЯ:» — слот в конце (index 15), без сдвига индексов письма.
 *
 * Y обеих текстовых зон поднимаем на шаг между линиями — текст иначе
 * визуально оказывается на второй линейке (пустая первая).
 */
function refinePurpleMyDaySlots(
  norms: readonly NormalizedLineSlot[],
): NormalizedLineSlot[] {
  const band = KIDS_MONTH_LINE_BAND_HEIGHT;
  const raw = norms.slice(0, 15);
  const dayGap = raw.length >= 2 ? raw[1]!.y - raw[0]!.y : band;
  const smileGap = raw.length >= 10 ? raw[9]!.y - raw[8]!.y : band;

  const writing = raw.map((slot, index) => {
    const lift = index < 8 ? dayGap : smileGap;
    return {
      ...slot,
      y: slot.y - lift,
      height: band,
      hasLabel: false,
      inputKind: 'line' as const,
      lineStrokeAtBottom: true,
      continuationGroup: index < 8 ? 1 : 2,
    };
  });

  const dateSlot: NormalizedLineSlot = {
    x: PURPLE_MY_DAY_DATE_AFTER_TODAY.writableX,
    y: PURPLE_MY_DAY_DATE_AFTER_TODAY.strokeY,
    width: PURPLE_MY_DAY_DATE_AFTER_TODAY.writableWidth,
    height: band,
    hasLabel: false,
    inputKind: 'line',
    continuationGroup: 99,
    lineStrokeAtBottom: true,
  };

  return [...writing, dateSlot];
}

/**
 * Коричневый «Твой день»:
 * - линии письма 0..10 (день 0..5, улыбка 6..10);
 * - дата под заголовком — слот в конце (index 11), без сдвига индексов письма.
 */
function refineBrownMyDaySlots(
  norms: readonly NormalizedLineSlot[],
): NormalizedLineSlot[] {
  const writing = norms.slice(0, 11).map((slot, index) => ({
    ...slot,
    height: 0.028,
    hasLabel: false,
    inputKind: 'line' as const,
    lineStrokeAtBottom: true,
    continuationGroup: index < 6 ? 1 : 2,
  }));

  const dateSlot: NormalizedLineSlot = {
    x: BROWN_MY_DAY_DATE_UNDER_TITLE.writableX,
    y: BROWN_MY_DAY_DATE_UNDER_TITLE.strokeY,
    width: BROWN_MY_DAY_DATE_UNDER_TITLE.writableWidth,
    height: 0.028,
    hasLabel: false,
    inputKind: 'line',
    continuationGroup: 99,
    lineStrokeAtBottom: true,
  };

  return [...writing, dateSlot];
}

/**
 * «Хобби»: purple p8 / brown p13.
 * Координаты X/Y — из PDF-штрихов; все слоты line + единый inset 0.008 ниже.
 * У purple первое поле (хобби) — 2 линии с общим continuationGroup.
 */
function refineDiaryHobbySlots(
  lineGuideId: string,
  page: number,
  norms: readonly NormalizedLineSlot[],
): NormalizedLineSlot[] {
  const isPurple = lineGuideId === 'diary_interior_purple' && page === 8;
  const isBrown = lineGuideId === 'diary_interior_brown' && page === 13;
  if (!isPurple && !isBrown) return [...norms];

  return norms.map((slot, index) => {
    let continuationGroup = index + 1;
    if (isPurple) {
      // 0–1 hobbies; 2–3 sports; 4–5 alone; дальше по одному полю.
      if (index <= 1) continuationGroup = 1;
      else if (index <= 3) continuationGroup = 2;
      else if (index <= 5) continuationGroup = 3;
      else continuationGroup = index - 2;
    } else if (isBrown) {
      // 0–1 hobbies; 2 sports; 3 alone; 4–10 singles; 11–12 music; 13–14 company; 15–17 recess.
      // Важно: слот 4 = «Любимый мультфильм» (не 2-я строка alone).
      if (index <= 1) continuationGroup = 1;
      else if (index === 2) continuationGroup = 2;
      else if (index === 3) continuationGroup = 3;
      else if (index <= 10) continuationGroup = index;
      else if (index <= 12) continuationGroup = 11;
      else if (index <= 14) continuationGroup = 12;
      else continuationGroup = 13;
    }
    return {
      ...slot,
      height: 0.028,
      hasLabel: false,
      inputKind: 'line' as const,
      continuationGroup,
    };
  });
}

/**
 * «Мечты» brown p15: Y белых линий с PNG (page_015).
 * 3+3+3+12+1 = 22 слота (у dream3 в макете 3 линии, лишний PDF-слот отбрасываем).
 */
function refineDiaryDreamsSlots(
  lineGuideId: string,
  page: number,
  norms: readonly NormalizedLineSlot[],
): NormalizedLineSlot[] {
  if (lineGuideId !== 'diary_interior_brown' || page !== 15) return [...norms];

  const left = norms.find((s) => (s.x ?? 0) < 0.4) ?? norms[0];
  const right = norms.find((s) => (s.x ?? 0) >= 0.5) ?? norms[Math.min(10, norms.length - 1)];
  const bottom = norms[norms.length - 1] ?? left;

  const leftX = left?.x ?? 0.14785;
  const leftW = left?.width ?? 0.34319;
  const rightX = right?.x ?? 0.5932;
  const rightW = right?.width ?? 0.27072;
  const bottomX = bottom?.x ?? 0.1418;
  const bottomW = bottom?.width ?? 0.4862;

  const groups: Array<{ y: number; x: number; width: number; group: number }> = [];
  DIARY_BROWN_P15_DREAM_LINE_YS.forEach((y, index) => {
    if (index < 9) {
      groups.push({ y, x: leftX, width: leftW, group: index < 3 ? 1 : index < 6 ? 2 : 3 });
    } else if (index < 21) {
      groups.push({ y, x: rightX, width: rightW, group: 4 });
    } else {
      groups.push({ y, x: bottomX, width: bottomW, group: 5 });
    }
  });

  return groups.map((g) => ({
    x: g.x,
    y: g.y,
    width: g.width,
    height: 0.028,
    hasLabel: false,
    inputKind: 'line' as const,
    continuationGroup: g.group,
    lineStrokeAtBottom: true,
  }));
}

/**
 * «Школьная жизнь» p22: хвосты после длинных вопросов.
 * Нижние 4 строки воспоминаний (y≥0.82, x≈0.09) не трогаем.
 */
function refinePurplePage22LabeledRowNorm(
  page: number,
  norm: NormalizedLineSlot
): NormalizedLineSlot {
  if (page !== 22 || norm.hasLabel) return norm;
  return applyLabeledRowMinX(norm, [
    { minY: 0.338, maxY: 0.368, minX: 0.52 },
    { minY: 0.598, maxY: 0.628, minX: 0.66 },
    { minY: 0.678, maxY: 0.708, minX: 0.68 },
  ]);
}

/** Стр. 26 «Одежда и стиль»: хвосты после подписей (PDF x уже почти верный). */
function refineBrownPage26LabeledRowNorm(
  page: number,
  norm: NormalizedLineSlot
): NormalizedLineSlot {
  if (page !== 26 || norm.hasLabel) return norm;
  return applyBrownLabeledRowMinX(norm, [
    { minY: 0.268, maxY: 0.288, minX: 0.64 },
    { minY: 0.338, maxY: 0.358, minX: 0.68 },
    { minY: 0.492, maxY: 0.512, minX: 0.56 },
    { minY: 0.566, maxY: 0.586, minX: 0.56 },
    { minY: 0.648, maxY: 0.668, minX: 0.72 },
    { minY: 0.746, maxY: 0.766, minX: 0.51 },
    { minY: 0.844, maxY: 0.864, minX: 0.72 },
  ]);
}

/** Стр. 31 «Школьная жизнь»: хвосты после длинных вопросов; полные строки не трогаем. */
function refineBrownPage31LabeledRowNorm(
  page: number,
  norm: NormalizedLineSlot
): NormalizedLineSlot {
  if (page !== 31 || norm.hasLabel) return norm;

  let refined = applyBrownLabeledRowMinX(norm, [
    { minY: 0.310, maxY: 0.335, minX: 0.62 },
    { minY: 0.405, maxY: 0.430, minX: 0.53 },
    { minY: 0.470, maxY: 0.495, minX: 0.39 },
    { minY: 0.538, maxY: 0.560, minX: 0.60 },
    { minY: 0.610, maxY: 0.635, minX: 0.64 },
    { minY: 0.688, maxY: 0.712, minX: 0.82 },
    { minY: 0.860, maxY: 0.885, minX: 0.51 },
  ]);

  if (refined.inputKind !== 'block' && refined.y >= 0.32 && refined.y <= 0.94) {
    refined = { ...refined, height: 0.028 };
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

/** Стр. 26 «украшения»: слоты 13–15 — одна группа продолжения (хвост + 2 полные строки). */
function refineBrownPage26JewelryContinuation(
  slots: readonly NormalizedLineSlot[],
): NormalizedLineSlot[] {
  if (slots.length < 16) return [...slots];
  return slots.map((slot, index) => {
    if (index < 13 || index > 15) return slot;
    return {
      ...slot,
      continuationGroup: 14,
      hasLabel: false,
      inputKind: 'line' as const,
    };
  });
}

/**
 * Стр. 38 «Еда»: tip+full и рецепт/планы — общие continuationGroup,
 * чтобы не резать текст на «первое/последнее слово» по разным слотам.
 */
function refineBrownPage38FoodContinuation(
  slots: readonly NormalizedLineSlot[],
): NormalizedLineSlot[] {
  if (slots.length < 13) return [...slots];
  const groupByIndex = [
    1, 1, // favoriteFood tip+full
    3, 3, // favoriteSweet tip+full
    5, // sweetTooth tip
    6, 6, // recipeStory 2 fulls
    8, // cafe tip
    9, 9, 9, 9, 9, // futureCookingPlans
  ];
  return slots.map((slot, index) => {
    const group = groupByIndex[index];
    if (group == null) return slot;
    return {
      ...slot,
      continuationGroup: group,
      hasLabel: false,
      inputKind: 'line' as const,
    };
  });
}

/**
 * Постановка на учёт (p4): телефон — только слот после подписи.
 * Нижняя OCR-линия (бывший continuation) в отдельной группе, без переноса.
 */

/**
 * Анкета друзей (39–44): линии после подписей; без синтетического слота над title.
 */
function refineBrownFriendQuestionnaireNameSlot(
  slots: readonly NormalizedLineSlot[],
): NormalizedLineSlot[] {
  return slots.map((slot, index) => ({
    ...slot,
    continuationGroup: slot.continuationGroup ?? index + 1,
    inputKind: 'line' as const,
    hasLabel: false,
  }));
}

/** Стр. 26: полные линии ответа — слева и на всю ширину (в т.ч. «украшения»). */
function refineBrownPage26FullAnswerWidthNorm(
  page: number,
  norm: NormalizedLineSlot
): NormalizedLineSlot {
  if (page !== 26 || norm.hasLabel) return norm;
  const isComfortableFull = norm.y >= 0.368 && norm.y <= 0.388;
  const isColorFull = norm.y >= 0.438 && norm.y <= 0.458;
  // Две полные строки под «украшения» (и любые широкие линии внизу страницы).
  const isJewelryFull =
    norm.y >= 0.888 && norm.y <= 0.96 && norm.x < 0.2 && norm.width >= 0.7;
  if (!isComfortableFull && !isColorFull && !isJewelryFull) return norm;
  return {
    ...norm,
    x: 0.07,
    width: 0.85,
    height: Math.max(norm.height, 0.032),
    inputKind: 'line',
  };
}

function isBrownWideBlockAnswerSlot(slot: NormalizedLineSlot): boolean {
  return !slot.hasLabel && slot.x < 0.15 && slot.width >= 0.72;
}

/** Стр. 13: хвост «Любимый мультфильм» (PNG ny≈0.4293, left≈0.387). */
function isBrownPage13CartoonTailNorm(
  lineGuideId: string,
  page: number,
  norm: NormalizedLineSlot
): boolean {
  if (lineGuideId !== 'diary_interior_brown' || page !== 13 || norm.hasLabel) {
    return false;
  }
  return (
    norm.y >= 0.418 &&
    norm.y <= 0.442 &&
    norm.x >= 0.36 &&
    norm.width >= 0.38 &&
    norm.width <= 0.56
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
    slot.y >= 0.418 &&
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
/** Стр. 5 фиолетовый / стр. 6 коричневый: короткая строка ответа справа от «?». */
const BROWN_PAGE6_CAREER_HEAD_LEFT_NORM = 0.768;
const BROWN_PAGE6_CAREER_HEAD_WIDTH_NORM = 0.127;
/** Фиолетовая анкета: хвост после длинной подписи шире, чем у коричневой. */
const PURPLE_PAGE5_CAREER_HEAD_LEFT_NORM = 0.6604;
const PURPLE_PAGE5_CAREER_HEAD_WIDTH_NORM = 0.2527;
const PURPLE_PAGE5_CAREER_HEAD_Y = 0.7309;
const PURPLE_PAGE5_CAREER_CONTINUATION = {
  x: 0.0954,
  y: 0.7701,
  width: 0.8176,
} as const;

/** Коричневая «Твоя анкета» p6: полная строка продолжения «Кем я хочу стать». */
const BROWN_PAGE6_CAREER_CONTINUATION = {
  x: BROWN_WISH_CONTINUATION_LEFT_NORM,
  y: 0.822,
  width: 0.826,
} as const;

/**
 * «Кем я хочу стать» (brown p6): короткий хвост + полная строка продолжения
 * (как purple p5 refinePurplePage5CareerSlots).
 */
function refineBrownPage6CareerSlots(
  page: number,
  norms: readonly NormalizedLineSlot[],
): NormalizedLineSlot[] {
  if (page !== 6 || norms.length < 12) return [...norms];

  const result = norms.map((slot) => ({ ...slot }));
  result[11] = {
    ...result[11],
    x: BROWN_PAGE6_CAREER_HEAD_LEFT_NORM,
    width: BROWN_PAGE6_CAREER_HEAD_WIDTH_NORM,
    height: 0.028,
    hasLabel: false,
    inputKind: 'line',
    continuationGroup: 12,
  };

  if (result.length === 12) {
    result.push({
      x: BROWN_PAGE6_CAREER_CONTINUATION.x,
      y: BROWN_PAGE6_CAREER_CONTINUATION.y,
      width: BROWN_PAGE6_CAREER_CONTINUATION.width,
      height: 0.028,
      hasLabel: false,
      inputKind: 'line',
      continuationGroup: 12,
    });
  } else {
    result[12] = {
      ...result[12],
      x: BROWN_PAGE6_CAREER_CONTINUATION.x,
      y: BROWN_PAGE6_CAREER_CONTINUATION.y,
      width: BROWN_PAGE6_CAREER_CONTINUATION.width,
      height: 0.028,
      hasLabel: false,
      inputKind: 'line',
      continuationGroup: 12,
    };
  }

  return result;
}

export function isBrownPage6CareerShortHeadNorm(
  lineGuideId: string,
  page: number,
  norm: Pick<NormalizedLineSlot, 'y' | 'x' | 'width' | 'hasLabel'>
): boolean {
  const careerPage = getDiaryCareerQuestionPage(lineGuideId);
  const minY = lineGuideId === 'diary_interior_purple' ? 0.72 : 0.755;
  const maxY = lineGuideId === 'diary_interior_purple' ? 0.76 : 0.782;
  return (
    (lineGuideId === 'diary_interior_brown' || lineGuideId === 'diary_interior_purple') &&
    page === careerPage &&
    !norm.hasLabel &&
    norm.y >= minY &&
    norm.y <= maxY &&
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
  const minY = lineGuideId === 'diary_interior_purple' ? 0.755 : 0.788;
  return (
    (lineGuideId === 'diary_interior_brown' || lineGuideId === 'diary_interior_purple') &&
    page === careerPage &&
    !norm.hasLabel &&
    norm.y >= minY &&
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

/** Стр. 6 «Твоя анкета»: зона ответа справа от печатной подписи (норм. координаты). */
const BROWN_PAGE6_ANSWER_ROWS: Readonly<Record<number, { x: number; width: number }>> = {
  4: { x: 0.455, width: 0.457 },
  5: { x: 0.655, width: 0.257 },
  6: { x: 0.535, width: 0.377 },
  7: { x: 0.475, width: 0.437 },
};

function refineBrownPage6GirlProfileAnswerNorm(
  page: number,
  slotIndex: number,
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  if (page !== 6 || norm.hasLabel || norm.inputKind === 'block') return norm;
  const row = BROWN_PAGE6_ANSWER_ROWS[slotIndex];
  if (!row) return norm;
  return { ...norm, x: row.x, width: row.width };
}

function refineBrownParentQuestionnaireRowNorm(
  lineGuideId: string,
  page: number,
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  const isParentPage =
    (lineGuideId === 'diary_interior_brown' &&
      (page === 7 || page === 8 || page === 11 || page === 12)) ||
    (lineGuideId === 'diary_interior_purple' && (page === 6 || page === 7));
  const isGirlProfilePage = lineGuideId === 'diary_interior_brown' && page === 6;
  if (!isParentPage && !isGirlProfilePage) return norm;
  // Анкеты мамы/папы/бабушки/дедушки: x уже у хвоста после «:» в PDF.
  // Не тянуть к 0.32 — иначе у коротких подписей (Имя, Хобби…) огромный зазор.
  // Единый пробел 0.008 даёт applyDiaryUniformLineInset.
  if (
    lineGuideId === 'diary_interior_brown' &&
    (page === 7 || page === 8 || page === 11 || page === 12)
  ) {
    return norm;
  }
  if (lineGuideId === 'diary_interior_purple' && (page === 6 || page === 7)) {
    return norm;
  }
  if (norm.inputKind === 'block') return norm;
  if (norm.y >= 0.76) return norm;
  if (norm.y < 0.22 || norm.y > 0.82) return norm;

  const minAnswerLeft = 0.32;
  if (norm.x >= minAnswerLeft || norm.width <= 0.45) return norm;

  const right = norm.x + norm.width;
  const x = minAnswerLeft;
  const width = Math.max(0.15, Math.min(right - x, 0.98 - x));
  return { ...norm, x, width };
}

/**
 * Анкеты мамы/папы (p6/p7): фиксированный левый край сразу после «:».
 * Дальше applyDiaryUniformLineInset (+0.008) — один пробел, как в остальных альбомах.
 * Фиксируем (не Math.max с OCR), иначе «цвет» у папы остаётся на 0.50 с огромным зазором.
 */
const PURPLE_PARENT_ANSWER_FIXED_X: Readonly<Partial<Record<number, number>>> = {
  0: 0.1622, // Имя
  7: 0.2997, // Любимый цвет (OCR мамы сразу после подписи)
};

function refinePurpleParentAnswerSlots(
  page: number,
  norms: readonly NormalizedLineSlot[],
): NormalizedLineSlot[] {
  if ((page !== 6 && page !== 7) || norms.length < 12) return [...norms];

  return norms.map((slot, index) => {
    if (index >= 12) return { ...slot };
    const right = slot.x + slot.width;
    const fixedX = PURPLE_PARENT_ANSWER_FIXED_X[index];
    const x = fixedX != null ? fixedX : slot.x;
    const width = Math.max(0.15, Math.min(right - x, 0.98 - x));
    return { ...slot, x, width, inputKind: 'line' as const };
  });
}

/**
 * «Пожелания хозяйке дневника:» — хвост PDF после «:» (x≈0.50).
 * Отступ 0.008 даёт applyDiaryUniformLineInset (не закладывать сюда повторно).
 */
const PURPLE_PARENT_WISH_AFTER_LABEL_X = 0.508;
const PURPLE_PARENT_WISH_HEAD = {
  x: PURPLE_PARENT_WISH_AFTER_LABEL_X,
  y: 0.7709,
  width: 0.917 - PURPLE_PARENT_WISH_AFTER_LABEL_X,
} as const;
const PURPLE_PARENT_WISH_CONTINUATION_YS = [0.8069, 0.8429, 0.8789] as const;

function isPurpleParentWishHeadNorm(
  page: number,
  norm: Pick<NormalizedLineSlot, 'y' | 'x' | 'width'>,
): boolean {
  return (
    (page === 6 || page === 7) &&
    norm.y >= 0.76 &&
    norm.y <= 0.785 &&
    norm.x >= 0.45 &&
    norm.width <= 0.5
  );
}

function refinePurpleParentWishSlots(
  page: number,
  norms: readonly NormalizedLineSlot[],
): NormalizedLineSlot[] {
  if ((page !== 6 && page !== 7) || norms.length < 12) return [...norms];

  const withAnswers = refinePurpleParentAnswerSlots(page, norms);
  const head = withAnswers.slice(0, 12);
  const template = withAnswers[12] ?? withAnswers[11]!;
  const wishes: NormalizedLineSlot[] = [
    {
      ...template,
      x: PURPLE_PARENT_WISH_HEAD.x,
      y: PURPLE_PARENT_WISH_HEAD.y,
      width: PURPLE_PARENT_WISH_HEAD.width,
      height: 0.028,
      hasLabel: false,
      inputKind: 'line',
      continuationGroup: 13,
    },
    ...PURPLE_PARENT_WISH_CONTINUATION_YS.map((y) => ({
      ...template,
      x: 0.0863,
      y,
      width: 0.8307,
      height: 0.028,
      hasLabel: false,
      inputKind: 'line' as const,
      continuationGroup: 13,
    })),
  ];
  return [...head, ...wishes];
}

/** Коричневый дневник: анкеты мамы/папы (7–8) и бабушки/дедушки (11–12). */
const BROWN_PARENT_WISH_PAGES = new Set([7, 8, 11, 12]);
/** Начало печатного хвоста после «:» (штрих PDF); +0.008 — в applyDiaryUniformLineInset. */
const BROWN_PARENT_WISH_AFTER_LABEL_X = 0.5381;
const BROWN_PARENT_WISH_BY_PAGE: Readonly<
  Record<number, { headY: number; contYs: readonly number[] }>
> = {
  7: { headY: 0.7698, contYs: [0.8065, 0.8448, 0.8821] },
  8: { headY: 0.7698, contYs: [0.8065, 0.8448, 0.8821] },
  11: { headY: 0.7689, contYs: [0.8056, 0.8439, 0.8811] },
  12: { headY: 0.7689, contYs: [0.8056, 0.8439, 0.8811] },
};

function refineBrownParentWishSlots(
  page: number,
  norms: readonly NormalizedLineSlot[],
): NormalizedLineSlot[] {
  if (!BROWN_PARENT_WISH_PAGES.has(page) || norms.length < 12) return [...norms];

  const layout = BROWN_PARENT_WISH_BY_PAGE[page] ?? BROWN_PARENT_WISH_BY_PAGE[7]!;
  const headX = BROWN_PARENT_WISH_AFTER_LABEL_X;
  const head = norms.slice(0, 12).map((slot) => ({ ...slot }));
  const template = norms[12] ?? norms[11]!;
  const wishes: NormalizedLineSlot[] = [
    {
      ...template,
      x: headX,
      y: layout.headY,
      width: 0.91 - headX,
      height: 0.028,
      hasLabel: false,
      inputKind: 'line',
      continuationGroup: 13,
    },
    ...layout.contYs.map((y) => ({
      ...template,
      x: 0.0901,
      y,
      width: 0.8201,
      height: 0.028,
      hasLabel: false,
      inputKind: 'line' as const,
      continuationGroup: 13,
    })),
  ];
  return [...head, ...wishes];
}

/** В PDF norm.y — штрих; полоса «Я люблю/умею» лежит над линией. */
function getKidsMonthAnswerSlotTopNormY(norm: NormalizedLineSlot): number {
  return norm.y - norm.height;
}

/** p1 значения (дата/время/вес/рост) + имя — как iOS refineKids48StandardRuledLineSlot. */
function refineKids48Page1ValueSlotNorm(
  page: number,
  norm: NormalizedLineSlot,
  slotIndex: number,
): NormalizedLineSlot {
  if (page !== 1) return norm;

  const band = KIDS_MONTH_LINE_BAND_HEIGHT;
  // Имя на верхней линии (слот 0): bake y = штрих, высокая OCR-полоса → тонкая LINE.
  if (slotIndex === 0) {
    const strokeY =
      norm.textAnchorTop === true ? norm.y + norm.height : norm.y;
    return {
      ...norm,
      y: strokeY - band,
      height: band,
      inputKind: 'line',
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    };
  }

  if (slotIndex < 1 || slotIndex > 4) return norm;

  if (slotIndex === 1) {
    return {
      ...norm,
      x: KIDS48_P1_BIRTH_DATE_LINE.writableX,
      width: KIDS48_P1_BIRTH_DATE_LINE.writableWidth,
      y: KIDS48_P1_BIRTH_DATE_LINE.strokeY - band,
      height: band,
      hasLabel: false,
      inputKind: 'line',
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    };
  }

  const strokeY = norm.y;
  return {
    ...applyUniformLineXInset(norm, KIDS48_P1_VALUE_LINE_X_INSET),
    y: strokeY - band,
    height: band,
    inputKind: 'line',
    lineStrokeAtBottom: true,
    textAnchorTop: true,
  };
}

/** Нижняя линия «ДАТА» на event-страницах kids_48 (p12, p14…) — iOS e24a739. */
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
    x: KIDS48_BOTTOM_DATE_LINE.writableX,
    width: KIDS48_BOTTOM_DATE_LINE.writableWidth,
    y: strokeY,
    height: KIDS_MONTH_LINE_BAND_HEIGHT,
    hasLabel: false,
    inputKind: 'line',
    lineStrokeAtBottom: true,
    textAnchorTop: true,
    strokeAtNormY: true,
  };
}

/** p8/p9 «ДАТА» — калибровка iOS e24a739 (kids-48-event-date-slots). */
function refineKids48EventDateLineSlotNorm(
  page: number,
  norm: NormalizedLineSlot,
  slotIndex: number,
): NormalizedLineSlot {
  if (!isKids48EventDateLineSlot('kids_48', page, slotIndex)) return norm;
  const custom = getKids48EventDateLineNorm(page, slotIndex);
  if (!custom) return norm;
  return {
    ...norm,
    x: custom.x,
    y: custom.y,
    width: custom.width,
    height: custom.height,
    hasLabel: false,
    inputKind: 'line',
    lineStrokeAtBottom: true,
    textAnchorTop: true,
    strokeAtNormY: false,
  };
}

function refineKids48Page16DreamsDateLineSlotNorm(
  page: number,
  norm: NormalizedLineSlot,
  slotIndex: number,
): NormalizedLineSlot {
  if (page !== 16 || slotIndex !== 0) return norm;
  // iOS: y = штрих + strokeAtNormY.
  return {
    ...norm,
    x: KIDS48_P16_DREAMS_DATE_LINE.writableX,
    width: KIDS48_P16_DREAMS_DATE_LINE.writableWidth,
    y: KIDS48_P16_DREAMS_DATE_LINE.strokeY,
    height: KIDS_MONTH_LINE_BAND_HEIGHT,
    hasLabel: false,
    inputKind: 'line',
    lineStrokeAtBottom: true,
    textAnchorTop: true,
    strokeAtNormY: true,
  };
}

/** p13 «Ползаю» — сдвиг зоны ввода вправо, как у «Держу голову». */
function refineKids48Page13CrawlsSlotNorm(
  page: number,
  norm: NormalizedLineSlot,
  slotIndex: number,
): NormalizedLineSlot {
  if (page !== 13 || slotIndex !== 3) return norm;
  return {
    ...norm,
    x: KIDS48_P13_CRAWLS_LINE.writableX,
    width: KIDS48_P13_CRAWLS_LINE.writableWidth,
  };
}

function refineKids48Page10FirstBrushingSlotNorm(
  page: number,
  norm: NormalizedLineSlot,
  slotIndex: number,
): NormalizedLineSlot {
  if (page !== 10 || slotIndex !== 20) return norm;
  const band = KIDS_MONTH_LINE_BAND_HEIGHT;
  return {
    ...norm,
    x: KIDS48_P10_FIRST_BRUSHING_LINE.writableX,
    width: KIDS48_P10_FIRST_BRUSHING_LINE.writableWidth,
    y: KIDS48_P10_FIRST_BRUSHING_LINE.strokeY - band,
    height: band,
    hasLabel: false,
    inputKind: 'line',
    lineStrokeAtBottom: true,
    textAnchorTop: true,
  };
}

/** Семейное дерево p5 — расширяем слоты имён, чтобы 7 символов всегда влезали. */
function refineKids48FamilyTreeNameSlotNorm(
  page: number,
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  if (page !== 5) return norm;
  const targetWidth = KIDS48_FAMILY_TREE_NAME_SLOT_WIDTH;
  const centerX = norm.x + norm.width / 2;
  const width = Math.max(norm.width, targetWidth);
  const x = clamp01(centerX - width / 2);
  return {
    ...norm,
    x,
    width: Math.min(width, 0.98 - x),
    height: KIDS_MONTH_LINE_BAND_HEIGHT,
    inputKind: 'line',
    lineStrokeAtBottom: true,
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
  // Левый край = начало печатной линии; расширяем только вправо.
  const x = clamp01(norm.x);
  const width = Math.max(norm.width, Math.min(targetWidth, 0.98 - x));
  return {
    ...norm,
    x,
    width,
    textAnchorTop: norm.textAnchorTop ?? true,
    lineStrokeAtBottom: true,
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

  // iOS e24a739: inset + y=штрих + textAnchorTop; mapping month → y−height.
  return {
    ...norm,
    x: writable.x + KIDS_MONTH_LINE_X_INSET,
    width: Math.max(0.05, writable.width - KIDS_MONTH_LINE_X_INSET),
    y: strokeY,
    height: KIDS_MONTH_LINE_BAND_HEIGHT,
    continuationGroup: slotIndex,
    inputKind: 'line',
    lineStrokeAtBottom: true,
    textAnchorTop: true,
  };
}

/** p11 «Рост и вес» — iOS refineKids48GrowthWeightSlot: bake y = штрих. */
function refineKids48GrowthWeightSlot(
  page: number,
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  if (page !== 11) return norm;
  const strokeY = norm.y;
  return {
    ...norm,
    y: strokeY - KIDS_MONTH_LINE_BAND_HEIGHT,
    height: KIDS_MONTH_LINE_BAND_HEIGHT,
    inputKind: 'line',
    lineStrokeAtBottom: true,
    textAnchorTop: true,
    strokeAtNormY: false,
  };
}

/** OCR высокие полосы → тонкая LINE (iOS refineKids48StandardRuledLineSlot). */
function refineKids48StandardRuledLineSlot(
  norm: NormalizedLineSlot,
): NormalizedLineSlot {
  if (norm.inputKind === 'block') return norm;
  if (
    norm.height <= KIDS_MONTH_LINE_BAND_HEIGHT &&
    norm.lineStrokeAtBottom === true
  ) {
    return norm;
  }
  const strokeY = norm.strokeAtNormY
    ? norm.y
    : norm.textAnchorTop
      ? norm.y + norm.height
      : norm.y;
  return {
    ...norm,
    y: strokeY - KIDS_MONTH_LINE_BAND_HEIGHT,
    height: KIDS_MONTH_LINE_BAND_HEIGHT,
    inputKind: 'line',
    lineStrokeAtBottom: true,
    textAnchorTop: true,
    strokeAtNormY: false,
  };
}

function shouldRefineKids48StandardRuledLineSlot(
  page: number,
  slotIndex: number,
  norm: NormalizedLineSlot,
): boolean {
  if (norm.inputKind === 'block') return false;
  if (isKidsMonthPage(page)) return false;
  if (page === 1 || page === 5 || page === 10 || page === 11 || page === 13) {
    return false;
  }
  if (page === 8 || page === 9) return false;
  if (getKids48BottomDateLineStrokeY(page) != null) return false;
  if (page === 16 || page === 20) return false;
  return norm.height > KIDS_MONTH_LINE_BAND_HEIGHT || !norm.lineStrokeAtBottom;
}

function refineKids48Page20BaptismDateSlotNorm(
  page: number,
  norm: NormalizedLineSlot,
  slotIndex: number,
): NormalizedLineSlot {
  if (page !== 20 || slotIndex !== 0) return norm;
  return {
    ...norm,
    x: KIDS48_BOTTOM_DATE_LINE.writableX,
    width: KIDS48_BOTTOM_DATE_LINE.writableWidth,
    y: 0.2368,
    height: KIDS_MONTH_LINE_BAND_HEIGHT,
    inputKind: 'line',
    lineStrokeAtBottom: true,
    textAnchorTop: true,
    strokeAtNormY: true,
  };
}

function refineKids48Page13AchievementSlotNorm(
  page: number,
  norm: NormalizedLineSlot,
  slotIndex: number,
): NormalizedLineSlot {
  if (page !== 13) return norm;
  if (slotIndex === 0) {
    // Дата слева от «(ДАТА)» — bake уже band-top.
    return {
      ...norm,
      x: 0.24,
      width: 0.17,
      y: 0.18585 - KIDS_MONTH_LINE_BAND_HEIGHT,
      height: KIDS_MONTH_LINE_BAND_HEIGHT,
      inputKind: 'line',
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    };
  }
  if (slotIndex < 1 || slotIndex > 7) return norm;
  if (slotIndex === 3) {
    return {
      ...norm,
      x: KIDS48_P13_CRAWLS_LINE.writableX,
      width: KIDS48_P13_CRAWLS_LINE.writableWidth,
      height: KIDS_MONTH_LINE_BAND_HEIGHT,
      inputKind: 'line',
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    };
  }
  // iOS: inset после подписи на achievement lines.
  const inset = 0.018;
  const x = clamp01(norm.x + inset);
  return {
    ...norm,
    x,
    width: Math.max(0.05, Math.min(norm.width - inset, 0.98 - x)),
    height: KIDS_MONTH_LINE_BAND_HEIGHT,
    inputKind: 'line',
    lineStrokeAtBottom: true,
    textAnchorTop: true,
  };
}

/** Один визуальный пробел от начала линии (kids_48 / pregnancy / diary). */
function applyUniformLineXInset(
  norm: NormalizedLineSlot,
  inset: number,
): NormalizedLineSlot {
  if (norm.textAnchorTop) return norm;
  // Крупные peach/box-блоки без подписи слева — без inset.
  // Компактные «block»-ответы на линейках (высота ~строки) — как line.
  if (norm.inputKind === 'block' && (norm.height ?? 0) > 0.04) return norm;

  const x = clamp01(norm.x + inset);
  const width = Math.max(0.03, Math.min(norm.width - inset, 0.98 - x));
  return { ...norm, x, width };
}

function applyDiaryUniformLineInset(norm: NormalizedLineSlot): NormalizedLineSlot {
  return applyUniformLineXInset(norm, DIARY_UNIFORM_LINE_X_INSET);
}

/** Тонкая подстройка PDF-слотов под отрисовку текста (координаты из вектора, не margins). */
function refineNormalizedSlotForTextLayout(
  lineGuideId: string,
  page: number,
  norm: NormalizedLineSlot,
  allNorms: readonly NormalizedLineSlot[] = [],
  slotIndex = 0,
): NormalizedLineSlot {
  if (lineGuideId === 'kids_48' && page === 1) {
    return refineKids48Page1ValueSlotNorm(page, norm, slotIndex);
  }

  if (lineGuideId === 'kids_48' && page === 5) {
    return refineKids48FamilyTreeNameSlotNorm(page, norm);
  }

  if (lineGuideId === 'kids_48' && isKidsMonthPage(page)) {
    return refineKidsMonthLineSlotNorm(page, norm, slotIndex);
  }

  if (lineGuideId === 'kids_48' && page === 11) {
    return refineKids48GrowthWeightSlot(page, norm);
  }

  if (lineGuideId === 'kids_48' && page === 20) {
    return refineKids48Page20BaptismDateSlotNorm(page, norm, slotIndex);
  }

  if (lineGuideId === 'kids_48' && isKids48EventDateLineSlot(lineGuideId, page, slotIndex)) {
    return refineKids48EventDateLineSlotNorm(page, norm, slotIndex);
  }

  if (lineGuideId === 'kids_48' && getKids48BottomDateLineStrokeY(page) != null) {
    return refineKids48BottomDateLineSlotNorm(page, norm, slotIndex);
  }

  if (lineGuideId === 'kids_48' && page === 16) {
    return refineKids48Page16DreamsDateLineSlotNorm(page, norm, slotIndex);
  }

  if (lineGuideId === 'kids_48' && page === 13) {
    return refineKids48Page13AchievementSlotNorm(page, norm, slotIndex);
  }

  if (lineGuideId === 'kids_48' && page === 10) {
    let refined = refineKids48Page10ToothDateSlotNorm(lineGuideId, page, norm, slotIndex);
    refined = refineKids48Page10FirstBrushingSlotNorm(page, refined, slotIndex);
    if (slotIndex === 21) {
      const band = KIDS_MONTH_LINE_BAND_HEIGHT;
      return {
        ...refined,
        x: KIDS48_P10_TEETH_COUNT_LINE.writableX,
        width: KIDS48_P10_TEETH_COUNT_LINE.writableWidth,
        y: KIDS48_P10_TEETH_COUNT_LINE.strokeY - band,
        height: band,
        hasLabel: false,
        inputKind: 'line',
        lineStrokeAtBottom: true,
        textAnchorTop: true,
      };
    }
    return refined;
  }

  if (
    lineGuideId === 'kids_48' &&
    shouldRefineKids48StandardRuledLineSlot(page, slotIndex, norm)
  ) {
    return refineKids48StandardRuledLineSlot(norm);
  }

  // Единый левый inset от статического текста для pregnancy / kids (спец-страницы уже return выше).
  if (
    lineGuideId === 'pregnancy_60' ||
    lineGuideId === 'pregnancy_a5' ||
    lineGuideId === 'kids_48'
  ) {
    return applyUniformLineXInset(norm, DIARY_UNIFORM_LINE_X_INSET);
  }

  if (!lineGuideId?.startsWith('diary_interior_')) {
    return norm;
  }

  let refined = refineBrownParentQuestionnaireRowNorm(lineGuideId, page, norm);
  if (lineGuideId === 'diary_interior_brown') {
    refined = refineBrownPage6GirlProfileAnswerNorm(page, slotIndex, refined);
    refined = refineBrownPage16PeachBlockNorm(page, refined, allNorms);
    refined = refineBrownPage15PeachLineNorm(page, refined);
    refined = refineBrownPage17UniformHeightNorm(page, refined);
    refined = refineBrownPage21LabeledRowNorm(page, refined);
    refined = refineBrownPage24ListRowNorm(page, refined);
    refined = refineBrownDaySpreadIllustrationNorm(page, refined, allNorms);
    refined = refineBrownPage26LabeledRowNorm(page, refined);
    refined = refineBrownPage26UniformHeightNorm(page, refined);
    refined = refineBrownPage26FullAnswerWidthNorm(page, refined);
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
    // Доп. сдвиг хвоста + единый пробел 0.008.
    return applyDiaryUniformLineInset({ ...refined, x, width });
  }

  if (isBrownPage13CartoonTailNorm(lineGuideId, page, refined)) {
    const textInset = 0.006;
    const x = clamp01(refined.x + textInset);
    const width = Math.max(0.05, Math.min(refined.width - textInset, 0.98 - x));
    return applyDiaryUniformLineInset({ ...refined, x, width });
  }

  if (isBrownPage6CareerShortHeadNorm(lineGuideId, page, refined)) {
    const isPurpleCareer = lineGuideId === 'diary_interior_purple';
    const baseLeft = isPurpleCareer
      ? Math.max(refined.x, PURPLE_PAGE5_CAREER_HEAD_LEFT_NORM)
      : refined.x >= 0.55
        ? refined.x
        : BROWN_PAGE6_CAREER_HEAD_LEFT_NORM;
    const baseWidth = isPurpleCareer
      ? Math.max(refined.width, PURPLE_PAGE5_CAREER_HEAD_WIDTH_NORM)
      : refined.width <= 0.22
        ? refined.width
        : BROWN_PAGE6_CAREER_HEAD_WIDTH_NORM;
    const { inputKind: _drop, ...rest } = refined;
    return applyDiaryUniformLineInset({
      ...rest,
      x: clamp01(baseLeft),
      width: Math.max(0.05, Math.min(baseWidth, 0.98 - clamp01(baseLeft))),
      y: isPurpleCareer ? PURPLE_PAGE5_CAREER_HEAD_Y : rest.y,
    });
  }

  if (isBrownPage6CareerContinuationNorm(lineGuideId, page, refined)) {
    const right = Math.max(refined.x + refined.width, BROWN_WISH_CONTINUATION_LEFT_NORM + 0.72);
    const x = BROWN_WISH_CONTINUATION_LEFT_NORM;
    const width = Math.max(0.05, Math.min(right - x, 0.98 - x));
    return applyDiaryUniformLineInset({ ...refined, x, width, inputKind: 'line' as const });
  }

  if (isBrownWishShortHeadNorm(lineGuideId, refined)) {
    // Единый пробел 0.008 (не BROWN 0.012).
    return applyDiaryUniformLineInset(refined);
  }

  if (isBrownWishContinuationNorm(lineGuideId, refined)) {
    const right = refined.x + refined.width;
    const x = BROWN_WISH_CONTINUATION_LEFT_NORM;
    const width = Math.max(0.05, Math.min(right - x, 0.98 - x));
    return applyDiaryUniformLineInset({ ...refined, x, width });
  }

  // Единый отступ слева 0.008 для всех полей дневников 60/40.
  return applyDiaryUniformLineInset(refined);
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
  // topY как на iOS e24a739 — значения на одной линии со статическими «Вес:» / «Обхват».
  pregnancy_60: {
    pageWidth: 2126,
    pageHeight: 2835,
    boxRight: 2126,
    lineHeightNorm: 0.038,
    weight: { valueX: 1419, topY: 528 },
    belly: { valueX: 1809, topY: 655 },
  },
  pregnancy_a5: {
    pageWidth: 1796,
    pageHeight: 2528,
    boxRight: 1673,
    lineHeightNorm: 0.042,
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
 * Статические страницы pregnancy_60 / pregnancy_a5 (не недельные) —
 * штрих из LINE_GUIDES, как на недельных.
 */
export function isPregnancy60GuideRuledLineSlot(
  lineGuideId: string | undefined,
  slot: Pick<TextLineSlot, 'page' | 'index' | 'inputKind'>,
): boolean {
  if (lineGuideId !== 'pregnancy_60' && lineGuideId !== 'pregnancy_a5') return false;
  if (isPregnancyWeeklyStructuredPage(lineGuideId, slot.page)) return false;
  if ((slot.inputKind ?? 'line') !== 'line') return false;
  const guides = (LINE_GUIDES as Record<string, Record<string, readonly number[]>>)[
    lineGuideId
  ]?.[String(slot.page)];
  return !!guides && guides.length > 0 && slot.index >= 0 && slot.index < guides.length;
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
const LINE_SLOTS_CACHE_MAX = 120;

function rememberLineSlots(cacheKey: string, slots: TextLineSlot[]): void {
  if (lineSlotsResultCache.has(cacheKey)) {
    lineSlotsResultCache.delete(cacheKey);
  } else if (lineSlotsResultCache.size >= LINE_SLOTS_CACHE_MAX) {
    // LRU: вытесняем самый старый ключ, не очищаем весь кэш.
    const oldest = lineSlotsResultCache.keys().next().value;
    if (oldest != null) lineSlotsResultCache.delete(oldest);
  }
  lineSlotsResultCache.set(cacheKey, slots);
}

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
    'weekly-stroke-v74-kids48-full-ios-refine',
  ].join('|');
}

export function getLineSlotsForPage(params: GetLineSlotsParams): TextLineSlot[] {
  const cacheKey = lineSlotsCacheKey(params);
  const cached = lineSlotsResultCache.get(cacheKey);
  if (cached) {
    // touch LRU
    lineSlotsResultCache.delete(cacheKey);
    lineSlotsResultCache.set(cacheKey, cached);
    return cached;
  }

  const { lineGuideId, page, viewportWidth, viewportHeight } = params;
  if (!hasLineGuides(lineGuideId) || viewportWidth <= 0 || viewportHeight <= 0) {
    rememberLineSlots(cacheKey, []);
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
    rememberLineSlots(cacheKey, []);
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
    const inputKind = layoutNorm.inputKind ?? norm.inputKind ?? 'line';
    /** kids_48: LINE с textAnchorTop (iOS bake) — y уже верх полосы; иначе y = штрих. */
    const isKids48RuledLine = lineGuideId === 'kids_48' && inputKind !== 'block';
    /** iOS: month answers — y = штрих даже при textAnchorTop. */
    const isKidsMonthAnswerLine =
      isKids48RuledLine && isKidsMonthPage(page) && index >= 1;
    /** iOS isKidsStrokeDateLineInputSlot: y в bake = штрих, полоса над ним. */
    const kids48StrokeAtNormY =
      isKids48RuledLine && layoutNorm.strokeAtNormY === true;
    const kids48BandTopIsY =
      isKids48RuledLine &&
      layoutNorm.textAnchorTop === true &&
      !kids48StrokeAtNormY &&
      !isKidsMonthAnswerLine;
    const anchorTop =
      isWeeklyValueSlot ||
      layoutNorm.textAnchorTop === true ||
      layoutNorm.lineStrokeAtBottom === true ||
      isKids48RuledLine;
    const topNormY =
      isDiaryInteriorLineGuide(lineGuideId)
        ? getDiarySlotTopNormY(layoutNorm)
        : isKidsMonthAnswerLine
          ? getKidsMonthAnswerSlotTopNormY(layoutNorm)
          : kids48StrokeAtNormY
            ? layoutNorm.y - layoutNorm.height
            : kids48BandTopIsY
              ? layoutNorm.y
              : isKids48RuledLine
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
      isKids48RuledLine ||
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
      normWidth: layoutNorm.width,
      lineStrokeAtBottom,
      textAnchorTop: anchorTop,
      strokeAtNormY: layoutNorm.strokeAtNormY === true,
    };
  });

  const patchedJewelry = patchBrownPage26JewelrySlotGeometry(lineGuideId, page, slots, rect);
  const patched = patchBrownPage38FoodSlotGeometry(
    lineGuideId,
    page,
    patchedJewelry,
    rect,
  );
  rememberLineSlots(cacheKey, patched);
  return patched;
}

/** Стр. 26: «украшения» — хвост после «?» + 2 полные строки на всю ширину. */
function patchBrownPage26JewelrySlotGeometry(
  lineGuideId: string,
  page: number,
  slots: TextLineSlot[],
  rect: ContentRect,
): TextLineSlot[] {
  if (lineGuideId !== 'diary_interior_brown' || page !== 26 || slots.length < 16) {
    return slots;
  }

  // Жёсткие норм. координаты по PDF (не брать эталон слота 12 — на части сборок он узкий).
  const tipX = rect.offsetX + rect.width * 0.735;
  const tipW = rect.width * 0.185;
  const fullX = rect.offsetX + rect.width * 0.07;
  const fullW = rect.width * 0.85;

  return slots.map((slot, index) => {
    if (index === 13) {
      return {
        ...slot,
        x: tipX,
        width: tipW,
        normWidth: 0.185,
        continuationGroup: 13,
        inputKind: 'line',
        lineStrokeAtBottom: true,
      };
    }
    if (index !== 14 && index !== 15) return slot;
    return {
      ...slot,
      x: fullX,
      width: fullW,
      normWidth: 0.85,
      inputKind: 'line',
      continuationGroup: 13,
      lineHeight: Math.max(slot.lineHeight, rect.height * 0.028),
      lineStrokeAtBottom: true,
    };
  });
}

/** Стр. 38 «Еда»: полные строки (рецепт / планы) на всю ширину — иначе clip съедает середину. */
function patchBrownPage38FoodSlotGeometry(
  lineGuideId: string,
  page: number,
  slots: TextLineSlot[],
  rect: ContentRect,
): TextLineSlot[] {
  if (lineGuideId !== 'diary_interior_brown' || page !== 38 || slots.length < 13) {
    return slots;
  }

  const fullX = rect.offsetX + rect.width * 0.096;
  const fullW = rect.width * 0.765;

  return slots.map((slot, index) => {
    // Полные линии: 1,3,5–6,8–12 (не tip 0/2/4/7).
    const isFull =
      index === 1 ||
      index === 3 ||
      index === 5 ||
      index === 6 ||
      (index >= 8 && index <= 12);
    if (!isFull) return slot;
    return {
      ...slot,
      x: fullX,
      width: fullW,
      normWidth: 0.765,
      inputKind: 'line',
      lineHeight: Math.max(slot.lineHeight, rect.height * 0.028),
      lineStrokeAtBottom: true,
    };
  });
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
  fontId?: string,
): Pick<Annotation, 'x' | 'y' | 'width' | 'height' | 'fontSize'> {
  const layout = layoutAnnotationFromSlot(slot);
  const inputKind = slot.inputKind ?? 'line';
  const effectiveFontSize = resolveTemplateLineFontSizeForText({
    fontSize,
    slot,
    lineGuideId,
    fontId,
    textContent,
  });
  const textTop = getTemplateLineTextTop(
    slot,
    effectiveFontSize,
    lineGuideId,
    undefined,
    undefined,
    fontId,
  );
  const typography = getTemplateLineTypography(
    effectiveFontSize,
    slot.lineHeight,
    inputKind,
    lineGuideId,
    slot,
  );
  const usesStroke =
    usesStrokeBaselineLayout(slot, lineGuideId) ||
    usesPregnancyGuideRuledTextLayout(lineGuideId, slot);
  const rowHeight = Math.max(
    usesStroke ? Math.ceil(effectiveFontSize * 1.18) : typography.lineHeight,
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
