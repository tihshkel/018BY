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

/** Baseline на штрихе подчёркивания (≈ доля fontSize от top до baseline). */
export const KIDS_MONTH_LINE_FONT_OFFSET = 0.86;

/** kids_48 p13 «Мои достижения» — строка «Ползаю» (PDF-слот слишком влево). */
export const KIDS48_P13_CRAWLS_LINE = {
  writableX: 0.3258,
  writableWidth: 0.53767,
} as const;

/** kids_48 p8 «Первый день дома» — нижняя строка «ДАТА». */
export const KIDS48_P8_DATE_LINE = {
  writableX: 0.438,
  /** Достаточно для «ДД.ММ.ГГГГ» без обрезки на превью и в PDF. */
  writableWidth: 0.36,
  strokeY: 0.8956,
} as const;

/** Зазор между низом даты и штрихом линии. */
export const KIDS48_P8_DATE_LINE_FONT_OFFSET = 1.07;

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

/** «Мои зубки» (p10): узкие линии у зубов — компактный шрифт для «ДД.ММ». */
export const KIDS48_TEETH_TOOTH_DATE_FONT_SIZE = 12;

/** Ширина линии даты у зуба — ровно «ДД.ММ» (5 символов). */
export const KIDS48_TEETH_TOOTH_DATE_SLOT_WIDTH = 0.118;

/** «Мои зубки» (p10): линия «Первая чистка зубов» — полная дата «ДД.ММ.ГГГГ». */
export const KIDS48_P10_FIRST_BRUSHING_LINE = {
  writableX: 0.555,
  writableWidth: 0.28,
  strokeY: 0.8349,
} as const;

/** Коричневый/фиолетовый дневник — тот же принцип, что kids_48 month pages. */
export const DIARY_LINE_FONT_OFFSET = 0.86;

/** Baseline на штрихе для недельных строк (доля fontSize от top Text до baseline). */
export const PREGNANCY_WEEKLY_CAP_HEIGHT_RATIO = 0.85;

/** Компактные поля (дата): штрих через центр слота. */
export const PREGNANCY_WEEKLY_COMPACT_LINE_HEIGHT = 0.035;

/** Обычная строка: штрих у нижнего края полосы. */
export const PREGNANCY_WEEKLY_STANDARD_LINE_HEIGHT = 0.045;

/** Межстрочный шаг на недельных стр. (норм. Y центров соседних строк, page 9). */
export const PREGNANCY_WEEKLY_LINE_PITCH = 0.0412;

/**
 * Доп. зазор между низом текста и штрихом линии (доля fontSize).
 * Применяется к полям inputKind=line в preview и PDF.
 */
export const TEMPLATE_LINE_STROKE_CLEARANCE_RATIO = 0.06;

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
  lineFontOffsetRatio: 0.84,
  blockCenterRatio: 0.58,
  blockFontOffsetRatio: 0.66,
  blockMaxFontSize: 20,
};

const ALBUM_TYPOGRAPHY: Record<string, TemplateTypographyProfile> = {
  pregnancy_60: {
    fixedLineFontSize: 15,
    charWidthRatio: 0.54,
    lineWidthSlackRatio: 0.98,
    lineCenterRatio: 0.5,
    lineFontOffsetRatio: 0.8,
    blockCenterRatio: 0.58,
    blockFontOffsetRatio: 0.66,
    blockMaxFontSize: 20,
  },
  pregnancy_a5: {
    fixedLineFontSize: 16,
    charWidthRatio: 0.54,
    lineWidthSlackRatio: 0.98,
    lineCenterRatio: 0.5,
    lineFontOffsetRatio: 0.96,
    blockCenterRatio: 0.58,
    blockFontOffsetRatio: 0.66,
    blockMaxFontSize: 20,
  },
  kids_48: {
    fixedLineFontSize: 16,
    charWidthRatio: 0.54,
    lineWidthSlackRatio: 0.98,
    lineCenterRatio: 0.5,
    lineFontOffsetRatio: 0.98,
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
    blockCenterRatio: 0.56,
    blockFontOffsetRatio: 0.66,
    blockMaxFontSize: 20,
  },
  diary_interior_brown: {
    fixedLineFontSize: 16,
    charWidthRatio: 0.5,
    lineWidthSlackRatio: 0.98,
    lineCenterRatio: 1,
    lineFontOffsetRatio: 0.86,
    blockCenterRatio: 0.58,
    blockFontOffsetRatio: 0.86,
    blockMaxFontSize: 16,
  },
  diary_interior_purple: {
    fixedLineFontSize: 16,
    charWidthRatio: 0.5,
    lineWidthSlackRatio: 0.98,
    lineCenterRatio: 1,
    lineFontOffsetRatio: 0.86,
    blockCenterRatio: 0.58,
    blockFontOffsetRatio: 0.86,
    blockMaxFontSize: 16,
  },
};

export function getTemplateTypographyProfile(lineGuideId?: string): TemplateTypographyProfile {
  if (!lineGuideId) return DEFAULT_TYPOGRAPHY;
  return ALBUM_TYPOGRAPHY[lineGuideId] ?? DEFAULT_TYPOGRAPHY;
}
