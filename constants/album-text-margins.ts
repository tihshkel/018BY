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

/**
 * Общий зазор пользовательского текста от печатного дизайна
 * (подписи, декоративные края) на kids_48 / pregnancy_*.
 * Preview = export через refineNormalizedSlotForTextLayout.
 */
export const DESIGNED_LABELED_LINE_TEXT_INSET_NORM = 0.014;

/** Лёгкий отступ у широких строк без hasLabel, начинающихся у левого края макета. */
export const DESIGNED_LINE_EDGE_INSET_NORM = 0.008;

/**
 * Имена семейного дерева: Y уже в buildPage5FamilyTreeSlots (baseline под кругом).
 * Доп. nudge не нужен — раньше dx/dy уводили «ИВАН» вправо и с линии.
 */
export const KIDS_FAMILY_TREE_NAME_Y_NUDGE_NORM = 0;

/**
 * Точечная подгонка имён (индекс = templateLineStart). Пусто = слоты как в LINE_SLOTS.
 * Попадает в cache-key getLineSlotsForPage.
 */
export const KIDS_FAMILY_TREE_NAME_LAYOUT_BY_INDEX: Readonly<
  Record<number, { dx?: number; dy?: number; width?: number }>
> = {};

/** Baseline на штрихе подчёркивания (≈ доля fontSize от top до baseline). */
export const KIDS_MONTH_LINE_FONT_OFFSET = 0.86;

/**
 * Зазор над штрихом для kids_48 (preview = export).
 * Amatic при baseline == stroke визуально врезается в линию.
 */
export const KIDS_STROKE_CLEARANCE_RATIO = 0.1;

/**
 * Month pages («Мне N месяцев») — чуть больший зазор: при экспорте Amatic
 * иначе садится на печатную линию (~2–3 px на эталоне 2480).
 */
export const KIDS_MONTH_STROKE_CLEARANCE_RATIO = 0.22;

/**
 * p1 «Этот альбом принадлежит» — дата/время/вес/рост: Amatic с rnAscent=1
 * визуально «висит» над штрихом; clearance минимальный, sink опускает baseline в RN.
 */
export const KIDS_P1_STROKE_CLEARANCE_RATIO = 0.02;

/** Доп. опускание Text top к штриху на p1 в превью (доля fontSize). */
export const KIDS_P1_BASELINE_SINK_RATIO = 0.16;

/**
 * p1 экспорт: Amatic в pdf-lib при том же Text top садится ниже RN
 * (линия режет цифры пополам). Подъём только PDF baseline — превью не трогаем.
 */
export const KIDS_P1_PDF_BASELINE_LIFT_RATIO = 0.3;

/** @deprecated Зазор убран — baseline через getStrokeBaselineFontOffset. */
export const KIDS_TEETH_BOTTOM_LINE_GAP_BAND_RATIO = 0;

/** @deprecated Зазор убран — baseline через getStrokeBaselineFontOffset. */
export const KIDS_TEETH_DATE_LINE_GAP_BAND_RATIO = 0;

/**
 * p10 «Мои зубки» — дата плотно на штрихе («дата и сразу подчёркивание»).
 * Чуть меньше общего kids clearance, без врезания Amatic в линию.
 */
export const KIDS_TEETH_STROKE_CLEARANCE_RATIO = 0.02;

/** p10 даты у кругов — лёгкий sink Amatic к штриху (доля fontSize). */
export const KIDS_TEETH_DATE_BASELINE_SINK_RATIO = 0.04;

/**
 * p10 «первая чистка» / «в годик» — текст врезался в линию (preview+export).
 * Отрицательный sink = подъём к штриху.
 */
export const KIDS_TEETH_BOTTOM_BASELINE_LIFT_RATIO = 0.22;

/**
 * p10 нижние строки: Amatic в pdf-lib при том же text top садится ниже RN
 * (штрих режет цифры). Подъём только PDF baseline — превью не трогаем.
 */
export const KIDS_TEETH_BOTTOM_PDF_BASELINE_LIFT_RATIO = 0.3;

/**
 * p10 даты у кругов зубов — та же PDF-осадка Amatic, что у нижних строк.
 */
export const KIDS_TEETH_DATE_PDF_BASELINE_LIFT_RATIO = 0.3;

/**
 * p10 «Мои зубки» — короткий underline (~0.1) и плотный ряд линий.
 * Кегль меньше общего kids (16), иначе даты налезают друг на друга.
 */
export const KIDS_TEETH_FIXED_LINE_FONT_SIZE = 11;

/**
 * p11 «Рост и вес» — плотная сетка у заголовков; меньше clearance + меньший кегль.
 */
export const KIDS_GROWTH_STROKE_CLEARANCE_RATIO = 0.08;
export const KIDS_GROWTH_FIXED_LINE_FONT_SIZE = 13;

/**
 * p11: Amatic в pdf-lib чуть ниже RN — лёгкий PDF-only подъём.
 */
export const KIDS_GROWTH_PDF_BASELINE_LIFT_RATIO = 0.12;

/** Эталон PNG 300 dpi для ручной разметки p8/p9 (kids_48). */
export const KIDS_48_EVENT_DATE_LINE_REF_PX = 2481;

/** Дата чуть выше штриха — ~5 px на эталоне 2481×2481. */
export const KIDS_48_EVENT_DATE_TEXT_ABOVE_LINE_BAND_RATIO =
  5 / (KIDS_48_EVENT_DATE_LINE_REF_PX * KIDS_MONTH_LINE_BAND_HEIGHT);

/** p8 «Первый день дома» — доп. подъём даты (~8 px на эталоне). */
export const KIDS_48_P8_EVENT_DATE_TEXT_LIFT_BAND_RATIO =
  8 / (KIDS_48_EVENT_DATE_LINE_REF_PX * KIDS_MONTH_LINE_BAND_HEIGHT);

/**
 * kids_48 нижняя дата «ДАТА»: без доп. lift — только stroke clearance.
 */
export const KIDS_P12_DATE_LINE_GAP_BAND_RATIO = 0;

/** Нижняя «ДАТА» — плотно к штриху (Amatic), без «парения» над линией. */
export const KIDS_BOTTOM_DATE_STROKE_CLEARANCE_RATIO = 0.03;

/** Коричневый/фиолетовый дневник — тот же принцип, что kids_48 month pages. */
export const DIARY_LINE_FONT_OFFSET = 0.78;

/**
 * Доп. опускание Amatic на line-слотах дневника (доля fontSize).
 * Математический baseline ≈ штрих, но низ глифов визуально выше — sink выравнивает.
 */
export const DIARY_AMATIC_VISUAL_SINK_RATIO = 0.08;

/** Baseline на штрихе для недельных строк (доля fontSize от top Text до baseline). */
export const PREGNANCY_WEEKLY_CAP_HEIGHT_RATIO = 1.08;

/** Доп. подъём над штрихом — RN/Связной рисуют глифы ниже расчётного cap height (доля lineHeight слота). */
export const PREGNANCY_WEEKLY_EXTRA_LIFT_BAND_RATIO = 0.82;

/** «Уже мама» — доп. зазор в preview поверх EXTRA_LIFT. */
export const PREGNANCY_ALREADY_MOM_STROKE_CLEARANCE_RATIO = 0.12;

/**
 * «Уже мама» — доп. подъём только PDF baseline (Amatic в pdf-lib чуть ниже RN при том же top).
 * Не трогает preview Text top.
 */
export const PREGNANCY_ALREADY_MOM_PDF_BASELINE_LIFT_RATIO = 0.1;

/** «История родов» / «Письмо малышу» — Amatic SC на линованной странице (baseline на штрихе). */
export const PREGNANCY_RULED_NOTEBOOK_CAP_HEIGHT_RATIO = 0.88;

/** Минимальный подъём для RN на линованных страницах (не weekly Связной). */
export const PREGNANCY_RULED_NOTEBOOK_LIFT_BAND_RATIO = 0.06;

/**
 * Когда strokeY уже из LINE_GUIDES (slot.strokeY), старый lift 0.82 поднимает текст
 * на ~0.8×lineHeight выше штриха — используем линованный минимальный подъём.
 */
export const PREGNANCY_WEEKLY_GUIDE_STROKE_CAP_HEIGHT_RATIO =
  PREGNANCY_RULED_NOTEBOOK_CAP_HEIGHT_RATIO;

export const PREGNANCY_WEEKLY_GUIDE_STROKE_LIFT_BAND_RATIO =
  PREGNANCY_RULED_NOTEBOOK_LIFT_BAND_RATIO;

/** Baseline на штрихе для полей «Планы» / «Ощущения».
 * Должен совпадать с RN ascent (Amatic/Связной ≈ 1.0), иначе глифы садятся ниже штриха.
 * Раньше 0.86 давал systematic overlap линии в preview/export. */
export const PREGNANCY_WEEKLY_GUIDE_STROKE_FONT_OFFSET = 1;

/**
 * Где заканчивается печатная подпись — доля body-anchor (не OCR-x).
 * p9 PNG: «Планы на неделю:» ~34%, «Мои ощущения…» ~53%.
 */
export const PREGNANCY_WEEKLY_PLANS_LABEL_BODY_END_RATIO = 0.34;

export const PREGNANCY_WEEKLY_FEELINGS_LABEL_BODY_END_RATIO = 0.53;

/**
 * @deprecated Используйте PREGNANCY_WEEKLY_*_LABEL_BODY_END_RATIO по continuationGroup.
 */
export const PREGNANCY_WEEKLY_LONG_LABEL_BODY_END_RATIO = 0.44;

/** @deprecated OCR gap больше не используется для groups 3/5. */
export const PREGNANCY_WEEKLY_LONG_LABEL_TAIL_GAP_THRESHOLD = 0.25;

/**
 * @deprecated Горизонталь берётся из OCR line-slots.json (p53/p60 различаются).
 * Оставлено для совместимости тестовых скриптов.
 */
export const PREGNANCY_RULED_NOTEBOOK_LINE_LEFT_NORM = 0.1173;
export const PREGNANCY_RULED_NOTEBOOK_LINE_WIDTH_NORM = 0.76691;

/** Хвост после длинной подписи (ощущения): OCR-полоса выше обычной строки — доп. подъём первой строки. */
export const PREGNANCY_WEEKLY_INLINE_TAIL_EXTRA_LIFT_BAND_RATIO = 0.1;

/**
 * Доля ширины inline-tail слота, доступная для текста пользователя после печатной подписи.
 * OCR-бокс label+tail шире реальной зоны ввода (короткая подпись «Планы на неделю»).
 */
export const PREGNANCY_WEEKLY_INLINE_TAIL_WIDTH_RATIO = 0.55;

/**
 * Длинная подпись на той же строке («Мои ощущения…») — хвост уже, иначе весь текст
 * остаётся в первом слоте и визуально «перепрыгивает» строки.
 */
export const PREGNANCY_WEEKLY_LONG_LABEL_INLINE_TAIL_WIDTH_RATIO = 0.15;

/**
 * OCR-бокс inline-tail начинается правее body-строки — подпись уже на PDF, не в слоте.
 */
export const PREGNANCY_WEEKLY_INLINE_TAIL_MIN_X_GAP = 0.015;

/**
 * @deprecated Используйте PREGNANCY_WEEKLY_INLINE_TAIL_MIN_X_GAP + ширину до правого края линии.
 */
export const PREGNANCY_WEEKLY_TAIL_ONLY_X_THRESHOLD = 0.35;

/** Компактные поля (дата): узкая OCR-полоса под одну строку. */
export const PREGNANCY_WEEKLY_COMPACT_LINE_HEIGHT = 0.035;

/** Обычная строка: штрих у нижнего края полосы. */
export const PREGNANCY_WEEKLY_STANDARD_LINE_HEIGHT = 0.045;

/** Межстрочный шаг на недельных стр. (норм. Y центров соседних строк, page 9). */
export const PREGNANCY_WEEKLY_LINE_PITCH = 0.0412;

/** Эталонная ширина viewport для переносов текста (preview = export). */
export const TEMPLATE_TEXT_DISTRIBUTE_REFERENCE_WIDTH = 2480;

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
    fixedLineFontSize: 16,
    charWidthRatio: 0.54,
    lineWidthSlackRatio: 0.99,
    lineCenterRatio: 0.5,
    lineFontOffsetRatio: 0.8,
    blockCenterRatio: 0.58,
    blockFontOffsetRatio: 0.66,
    blockMaxFontSize: 20,
  },
  pregnancy_a5: {
    fixedLineFontSize: 16,
    charWidthRatio: 0.54,
    lineWidthSlackRatio: 0.99,
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
    blockCenterRatio: 0.5,
    blockFontOffsetRatio: 0.55,
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
