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

/** Альбомы без линованной сетки — свободный ввод текста */
export const BLANK_LINE_GUIDE_IDS = new Set(['family_blank', 'holidays_blank']);

export function isBlankLineGuideAlbum(lineGuideId?: string): boolean {
  if (!lineGuideId) return false;
  return BLANK_LINE_GUIDE_IDS.has(lineGuideId);
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
  charWidthRatio: 0.52,
  lineWidthSlackRatio: 1.0,
  lineCenterRatio: 0.46,
  lineFontOffsetRatio: 0.92,
  blockCenterRatio: 0.66,
  blockFontOffsetRatio: 0.72,
  blockMaxFontSize: 21,
};

const ALBUM_TYPOGRAPHY: Record<string, TemplateTypographyProfile> = {
  pregnancy_60: {
    fixedLineFontSize: 16,
    charWidthRatio: 0.5,
    lineWidthSlackRatio: 1.02,
    lineCenterRatio: 0.48,
    lineFontOffsetRatio: 0.85,
    blockCenterRatio: 0.66,
    blockFontOffsetRatio: 0.72,
    blockMaxFontSize: 21,
  },
  pregnancy_a5: {
    fixedLineFontSize: 16,
    charWidthRatio: 0.5,
    lineWidthSlackRatio: 1.02,
    lineCenterRatio: 0.48,
    lineFontOffsetRatio: 0.85,
    blockCenterRatio: 0.66,
    blockFontOffsetRatio: 0.72,
    blockMaxFontSize: 21,
  },
  kids_48: {
    fixedLineFontSize: 16,
    charWidthRatio: 0.5,
    lineWidthSlackRatio: 1.02,
    lineCenterRatio: 0.45,
    lineFontOffsetRatio: 0.88,
    blockCenterRatio: 0.63,
    blockFontOffsetRatio: 0.75,
    blockMaxFontSize: 21,
  },
  holidays_birthday_60: {
    fixedLineFontSize: null,
    charWidthRatio: 0.52,
    lineWidthSlackRatio: 1.0,
    lineCenterRatio: 0.32,
    lineFontOffsetRatio: 1.02,
    blockCenterRatio: 0.66,
    blockFontOffsetRatio: 0.72,
    blockMaxFontSize: 21,
  },
  diary_interior_brown: {
    fixedLineFontSize: 16,
    charWidthRatio: 0.46,
    lineWidthSlackRatio: 1.06,
    lineCenterRatio: 1,
    lineFontOffsetRatio: 1.05,
    blockCenterRatio: 1,
    blockFontOffsetRatio: 1.04,
    blockMaxFontSize: 18,
  },
  diary_interior_purple: {
    fixedLineFontSize: 16,
    charWidthRatio: 0.46,
    lineWidthSlackRatio: 1.06,
    lineCenterRatio: 1,
    lineFontOffsetRatio: 1.05,
    blockCenterRatio: 1,
    blockFontOffsetRatio: 1.04,
    blockMaxFontSize: 18,
  },
};

export function getTemplateTypographyProfile(lineGuideId?: string): TemplateTypographyProfile {
  if (!lineGuideId) return DEFAULT_TYPOGRAPHY;
  return ALBUM_TYPOGRAPHY[lineGuideId] ?? DEFAULT_TYPOGRAPHY;
}
