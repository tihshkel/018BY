/**
 * Горизонтальные поля текста на страницах (нормализованные 0–1).
 * Y-координаты строк — из LINE_GUIDES (generate-line-guides.js).
 */

import {
  resolveLineGuideId,
  usesTemplateLineTextEditing as usesTemplateLineTextEditingFromAlbum,
} from '@/utils/albumImages';

export type AlbumTextMargins = {
  x: number;
  width: number;
};

const DEFAULT_MARGINS: AlbumTextMargins = { x: 0.12, width: 0.76 };

const ALBUM_TEXT_MARGINS: Record<string, AlbumTextMargins> = {
  pregnancy_60: { x: 0.1, width: 0.8 },
  pregnancy_a5: { x: 0.1, width: 0.8 },
  kids_48: { x: 0.08, width: 0.84 },
  holidays_birthday_60: { x: 0.1, width: 0.8 },
  diary_interior_brown: { x: 0.12, width: 0.76 },
  diary_interior_purple: { x: 0.12, width: 0.76 },
};

export function getAlbumTextMargins(lineGuideId: string): AlbumTextMargins {
  return ALBUM_TEXT_MARGINS[lineGuideId] ?? DEFAULT_MARGINS;
}

/** «Мне N месяцев» — поля «Я люблю» / «Я умею» (kids_48 p22–p33). */
export const KIDS_MONTH_PAGE_RANGE = { first: 22, last: 33 } as const;

/** Высота строки как на остальных страницах kids_48 (PDF даёт ~0.053 — слишком широкую полосу). */
export const KIDS_MONTH_LINE_BAND_HEIGHT = 0.028;

/** Небольшой отступ от левого края PDF-слота (после печатной подписи). */
export const KIDS_MONTH_LINE_X_INSET = 0.008;

/** Единый отступ line-полей (pregnancy / kids / diary). */
export const DIARY_UNIFORM_LINE_X_INSET = 0.008;

/**
 * Единый просвет текста до штриха для ruled-строк всех шаблонных альбомов
 * (pregnancy_60/a5, kids_48, diary brown/purple).
 * Минимум = CAP_HEIGHT PDF (0.85). Runtime берёт max(это, previewCap шрифта) + CLEARANCE,
 * иначе рукописные шрифты (cap 0.92+) тонут в линии.
 */
export const DIARY_UNIFORM_LINE_FONT_OFFSET = 0.85;

/** Baseline на штрихе подчёркивания (≈ доля fontSize от top до baseline). */
export const KIDS_MONTH_LINE_FONT_OFFSET = DIARY_UNIFORM_LINE_FONT_OFFSET;

/** kids_48 p13 «Мои достижения» — строка «Ползаю» (PDF-слот слишком влево). */
export const KIDS48_P13_CRAWLS_LINE = {
  writableX: 0.3258,
  writableWidth: 0.53767,
} as const;

/** kids_48 p1: значения после подписей — единый левый зазор + дата целиком. */
export const KIDS48_P1_VALUE_LINE_X_INSET = 0.028;

/** kids_48 p1 «Дата рождения» — после «ДАТА РОЖДЕНИЯ», ширина под «ДД.ММ.ГГГГ». */
export const KIDS48_P1_BIRTH_DATE_LINE = {
  writableX: 0.518,
  writableWidth: 0.26,
  strokeY: 0.76114,
} as const;

/** kids_48 p8 «Первый день дома» — нижняя строка «ДАТА» (левый край writable, не уезжает вправо). */
export const KIDS48_P8_DATE_LINE = {
  writableX: 0.4,
  /** Достаточно для «ДД.ММ.ГГГГ» без обрезки на превью и в PDF. */
  writableWidth: 0.38,
  strokeY: 0.8956,
} as const;

/** Семейное дерево (p5): ширина имени под кругом — 7 символов при любом шрифте. */
export const KIDS48_FAMILY_TREE_NAME_SLOT_WIDTH = 0.2;

/** Зазор между низом даты и штрихом линии — тот же единый offset. */
export const KIDS48_P8_DATE_LINE_FONT_OFFSET = DIARY_UNIFORM_LINE_FONT_OFFSET;

/**
 * Фиолетовый «Твой день»: дата сразу после «ЗА СЕГОДНЯ:».
 */
export const PURPLE_MY_DAY_DATE_AFTER_TODAY = {
  writableX: 0.422,
  writableWidth: 0.28,
  strokeY: 0.238,
} as const;

/**
 * Коричневый «Твой день»: дата на линии под заголовком (вместо «(ДАТА)»).
 */
export const BROWN_MY_DAY_DATE_UNDER_TITLE = {
  writableX: 0.3376,
  writableWidth: 0.3252,
  strokeY: 0.1416,
} as const;

export const PURPLE_MY_DAY_DATE_FONT_OFFSET = DIARY_UNIFORM_LINE_FONT_OFFSET;

export const PURPLE_MY_DAY_PAGES = [
  9, 11, 13, 15, 17, 19, 23, 34, 35, 36, 37, 38, 39,
] as const;

export const BROWN_MY_DAY_PAGES = [
  16, 20, 23, 25, 28, 33, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
] as const;

const PURPLE_MY_DAY_PAGE_SET = new Set<number>(PURPLE_MY_DAY_PAGES);
const BROWN_MY_DAY_PAGE_SET = new Set<number>(BROWN_MY_DAY_PAGES);

export function isPurpleMyDayPage(lineGuideId: string, page: number): boolean {
  return lineGuideId === 'diary_interior_purple' && PURPLE_MY_DAY_PAGE_SET.has(Number(page));
}

export function isBrownMyDayPage(lineGuideId: string, page: number): boolean {
  return lineGuideId === 'diary_interior_brown' && BROWN_MY_DAY_PAGE_SET.has(Number(page));
}

/** Y штриха нижней линии «ДАТА» по номеру страницы kids_48. */
const KIDS48_BOTTOM_DATE_STROKE_Y: Record<number, number> = {
  8: 0.8956,
  14: 0.91383,
  15: 0.91383,
  17: 0.91383,
  18: 0.91383,
  19: 0.91383,
};

export function getKids48BottomDateLineStrokeY(page: number): number | null {
  return KIDS48_BOTTOM_DATE_STROKE_Y[page] ?? null;
}

/** Индекс слота нижней линии «ДАТА» (p8/p18/p19 — вторая линия, остальные — единственная). */
export function getKids48BottomDateLineSlotIndex(page: number): number | null {
  if (page === 8 || page === 18 || page === 19) return 1;
  if (page === 14 || page === 15 || page === 17) return 0;
  return null;
}

export function isKids48BottomDateLineSlot(
  lineGuideId: string,
  page: number,
  slotIndex: number,
): boolean {
  const dateSlotIndex = getKids48BottomDateLineSlotIndex(page);
  return lineGuideId === 'kids_48' && dateSlotIndex !== null && slotIndex === dateSlotIndex;
}

/** p16 «Мои сновидения» — дата на верхней линии (не внизу страницы). */
export function isKids48DreamsDateLineSlot(
  lineGuideId: string,
  page: number,
  slotIndex: number,
): boolean {
  return lineGuideId === 'kids_48' && page === 16 && slotIndex === 0;
}

export function isKids48CalibratedDateLineSlot(
  lineGuideId: string,
  page: number,
  slotIndex: number,
): boolean {
  return (
    isKids48BottomDateLineSlot(lineGuideId, page, slotIndex) ||
    isKids48DreamsDateLineSlot(lineGuideId, page, slotIndex)
  );
}

/** «Мои сновидения» (p16): дата у заголовка «Первая ночь…» — линия вверху справа. */
export const KIDS48_P16_DREAMS_DATE_LINE = {
  writableX: 0.715,
  writableWidth: 0.27,
  strokeY: 0.21164,
} as const;

/** «Мои зубки» (p10): узкие линии у зубов — компактный шрифт для полной даты «ДД.ММ.ГГГГ». */
export const KIDS48_TEETH_TOOTH_DATE_FONT_SIZE = 9;

/** Ширина линии даты у зуба — под «ДД.ММ.ГГГГ» (10 символов) при компактном шрифте. */
export const KIDS48_TEETH_TOOTH_DATE_SLOT_WIDTH = 0.22;

/** «Мои зубки» (p10): линия «Первая чистка зубов» — полная дата «ДД.ММ.ГГГГ». */
export const KIDS48_P10_FIRST_BRUSHING_LINE = {
  writableX: 0.555,
  writableWidth: 0.28,
  strokeY: 0.8349,
} as const;

/** «Мои зубки» (p10): «В годик было ___ зубов» — число в пропуске. */
export const KIDS48_P10_TEETH_COUNT_LINE = {
  writableX: 0.48,
  writableWidth: 0.12,
  strokeY: 0.895,
} as const;

/** Коричневый/фиолетовый дневник — baseline на штрихе линии. */
export const DIARY_LINE_FONT_OFFSET = DIARY_UNIFORM_LINE_FONT_OFFSET;

/**
 * «Мечты» (brown p15): baseline на белом штрихе.
 * Координаты линий сняты с page_015.png — offset = previewCap шрифта (без CLEARANCE).
 */
export const DIARY_DREAMS_LINE_FONT_OFFSET = DIARY_UNIFORM_LINE_FONT_OFFSET;

/**
 * Точные Y белых линий «Мечты» (norm 0–1), детект с PNG 2174×2882.
 * Порядок: dream1×3, dream2×3, dream3×3, dream4×12, secret×1.
 */
export const DIARY_BROWN_P15_DREAM_LINE_YS = [
  // dream1 (лево верх)
  0.22346, 0.26787, 0.31228,
  // dream2 (лево середина)
  0.43754, 0.4823, 0.52672,
  // dream3 (лево низ) — в макете 3 линии, не 4
  0.65146, 0.69604, 0.74046,
  // dream4 (право, 12 линий)
  0.22346, 0.26787, 0.31228, 0.35496, 0.39938, 0.44414,
  0.49167, 0.53609, 0.5805, 0.62908, 0.67349, 0.7179,
  // самое сокровенное
  0.89452,
] as const;

/** Baseline на штрихе для недельных строк (доля fontSize от top Text до baseline). */
export const PREGNANCY_WEEKLY_CAP_HEIGHT_RATIO = DIARY_UNIFORM_LINE_FONT_OFFSET;

/** Компактные поля (дата): штрих через центр слота. */
export const PREGNANCY_WEEKLY_COMPACT_LINE_HEIGHT = 0.035;

/** Обычная строка: штрих у нижнего края полосы. */
export const PREGNANCY_WEEKLY_STANDARD_LINE_HEIGHT = 0.045;

/** Межстрочный шаг на недельных стр. (норм. Y центров соседних строк, page 9). */
export const PREGNANCY_WEEKLY_LINE_PITCH = 0.0412;

/**
 * Доп. зазор между низом текста и штрихом линии (доля fontSize).
 * Как на iOS (e24a739 kids month ~0.22): заметный просвет «текст → отступ → линия».
 * Доля fontSize + нормализованные слоты + page font scale → одинаково на разных
 * диагоналях Android без Platform/PixelRatio/fontScale.
 */
export const TEMPLATE_LINE_STROKE_CLEARANCE_RATIO = 0.2;

/**
 * @deprecated Больше не поднимаем kids отдельно — один offset для pregnancy/kids/diary,
 * иначе на разных Android текст «плавал» относительно линии.
 */
export const KIDS48_EXTRA_STROKE_CLEARANCE_RATIO = 0;

export type KidsMonthAnswerLineLayout = {
  loveX: number;
  loveWidth: number;
  canX: number;
  canWidth: number;
  loveY: number;
  canY: number;
};

/**
 * PNG-калибровка штриха «Я люблю / Я умею».
 * «Я ЛЮБЛЮ» длиннее «Я УМЕЮ» — линия ответа начинается правее (p32 PNG).
 */
export const KIDS_MONTH_STANDARD_ANSWER_LINES: KidsMonthAnswerLineLayout = {
  loveX: 0.278,
  loveWidth: 0.56,
  canX: 0.262,
  canWidth: 0.576,
  loveY: 0.1677,
  canY: 0.2195,
};

export const KIDS_MONTH_P33_ANSWER_LINES: KidsMonthAnswerLineLayout = {
  loveX: 0.281,
  loveWidth: 0.56,
  canX: 0.265,
  canWidth: 0.576,
  loveY: 0.2559,
  canY: 0.3078,
};

export function getKidsMonthAnswerLineLayout(page: number): KidsMonthAnswerLineLayout {
  return page === 33 ? KIDS_MONTH_P33_ANSWER_LINES : KIDS_MONTH_STANDARD_ANSWER_LINES;
}

export function getKidsMonthAnswerStrokeY(page: number, slotIndex: number): number | null {
  const layout = getKidsMonthAnswerLineLayout(page);
  if (slotIndex === 1) return layout.loveY;
  if (slotIndex === 2) return layout.canY;
  return null;
}

export function getKidsMonthAnswerWritableBounds(
  page: number,
  slotIndex: number,
): { x: number; width: number } | null {
  const layout = getKidsMonthAnswerLineLayout(page);
  if (slotIndex === 1) return { x: layout.loveX, width: layout.loveWidth };
  if (slotIndex === 2) return { x: layout.canX, width: layout.canWidth };
  return null;
}

export function isKidsMonthPage(page: number): boolean {
  return page >= KIDS_MONTH_PAGE_RANGE.first && page <= KIDS_MONTH_PAGE_RANGE.last;
}

/** Альбомы без линованной сетки — свободный ввод текста */
export const BLANK_LINE_GUIDE_IDS = new Set([
  'family_blank',
  'family_blank_21x21',
  'holidays_blank',
]);

export function isBlankLineGuideAlbum(lineGuideId?: string): boolean {
  if (!lineGuideId) return false;
  return BLANK_LINE_GUIDE_IDS.has(lineGuideId);
}

export type EditorTool = 'text' | 'floatingText' | 'image' | 'drawing' | null;

/** Два инструмента текста: поля макета + плавающий (беременность, дети, ДР, дневники). */
export function usesDualTextTools(
  lineGuideId?: string,
  category?: string | null
): boolean {
  return usesTemplateLineTextEditing(lineGuideId, category);
}

/** Ввод по строкам макета (беременность, дети, ДР, дневники). */
export function usesTemplateLineTextEditing(
  lineGuideId?: string,
  category?: string | null
): boolean {
  return usesTemplateLineTextEditingFromAlbum(lineGuideId, category);
}

/** Свободный текст с перетаскиванием (семья, свадьба, праздники blank и пр.). */
export function usesFreeFormTextEditing(
  lineGuideId?: string,
  category?: string | null
): boolean {
  return !usesTemplateLineTextEditing(lineGuideId, category);
}

export function getResolvedLineGuideId(
  lineGuideId?: string,
  category?: string | null
): string {
  return resolveLineGuideId(lineGuideId, category);
}

export type TemplateTypographyProfile = {
  fixedLineFontSize: number | null;
  /** Доля fontSize на символ (кириллица ~0.5–0.55). */
  charWidthRatio: number;
  /** Запас к ширине слота (1.0 = без запаса). */
  lineWidthSlackRatio: number;
  lineCenterRatio: number;
  lineFontOffsetRatio: number;
  blockCenterRatio: number;
  blockFontOffsetRatio: number;
  blockMaxFontSize: number;
};

const DEFAULT_TYPOGRAPHY: TemplateTypographyProfile = {
  fixedLineFontSize: null,
  charWidthRatio: 0.56,
  lineWidthSlackRatio: 0.97,
  lineCenterRatio: 0.5,
  lineFontOffsetRatio: DIARY_UNIFORM_LINE_FONT_OFFSET,
  blockCenterRatio: 0.58,
  blockFontOffsetRatio: 0.66,
  blockMaxFontSize: 20,
};

const ALBUM_TYPOGRAPHY: Record<string, TemplateTypographyProfile> = {
  pregnancy_60: {
    fixedLineFontSize: 16,
    charWidthRatio: 0.54,
    lineWidthSlackRatio: 0.98,
    lineCenterRatio: 0.5,
    lineFontOffsetRatio: DIARY_UNIFORM_LINE_FONT_OFFSET,
    blockCenterRatio: 0.58,
    blockFontOffsetRatio: 0.66,
    blockMaxFontSize: 20,
  },
  pregnancy_a5: {
    fixedLineFontSize: 16,
    charWidthRatio: 0.54,
    lineWidthSlackRatio: 0.98,
    lineCenterRatio: 0.5,
    lineFontOffsetRatio: DIARY_UNIFORM_LINE_FONT_OFFSET,
    blockCenterRatio: 0.58,
    blockFontOffsetRatio: 0.66,
    blockMaxFontSize: 20,
  },
  kids_48: {
    fixedLineFontSize: 16,
    charWidthRatio: 0.54,
    lineWidthSlackRatio: 0.98,
    lineCenterRatio: 0.5,
    lineFontOffsetRatio: DIARY_UNIFORM_LINE_FONT_OFFSET,
    blockCenterRatio: 0.56,
    blockFontOffsetRatio: 0.68,
    blockMaxFontSize: 20,
  },
  holidays_birthday_60: {
    fixedLineFontSize: null,
    charWidthRatio: 0.56,
    lineWidthSlackRatio: 0.97,
    lineCenterRatio: 0.34,
    lineFontOffsetRatio: 0.96,
    /** Как на iOS (e24a739): вертикальный центр текста в белых pill. */
    blockCenterRatio: 0.5,
    blockFontOffsetRatio: 0.55,
    blockMaxFontSize: 20,
  },
  diary_interior_brown: {
    fixedLineFontSize: 16,
    charWidthRatio: 0.62,
    lineWidthSlackRatio: 0.96,
    lineCenterRatio: 1,
    lineFontOffsetRatio: DIARY_UNIFORM_LINE_FONT_OFFSET,
    blockCenterRatio: 0.58,
    blockFontOffsetRatio: 0.86,
    blockMaxFontSize: 16,
  },
  diary_interior_purple: {
    fixedLineFontSize: 16,
    charWidthRatio: 0.62,
    lineWidthSlackRatio: 0.96,
    lineCenterRatio: 1,
    lineFontOffsetRatio: DIARY_UNIFORM_LINE_FONT_OFFSET,
    blockCenterRatio: 0.58,
    blockFontOffsetRatio: 0.86,
    blockMaxFontSize: 16,
  },
};

export function getTemplateTypographyProfile(lineGuideId?: string): TemplateTypographyProfile {
  if (!lineGuideId) return DEFAULT_TYPOGRAPHY;
  return ALBUM_TYPOGRAPHY[lineGuideId] ?? DEFAULT_TYPOGRAPHY;
}
