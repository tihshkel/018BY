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
    lineFontOffsetRatio: 0.8,
    blockCenterRatio: 0.58,
    blockFontOffsetRatio: 0.66,
    blockMaxFontSize: 20,
  },
  kids_48: {
    fixedLineFontSize: 16,
    charWidthRatio: 0.54,
    lineWidthSlackRatio: 0.98,
    lineCenterRatio: 0.5,
    lineFontOffsetRatio: 0.82,
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
    lineFontOffsetRatio: 0.98,
    blockCenterRatio: 0.58,
    blockFontOffsetRatio: 0.92,
    blockMaxFontSize: 17,
  },
  diary_interior_purple: {
    fixedLineFontSize: 16,
    charWidthRatio: 0.5,
    lineWidthSlackRatio: 0.98,
    lineCenterRatio: 1,
    lineFontOffsetRatio: 0.98,
    blockCenterRatio: 0.58,
    blockFontOffsetRatio: 0.92,
    blockMaxFontSize: 17,
  },
};

export function getTemplateTypographyProfile(lineGuideId?: string): TemplateTypographyProfile {
  if (!lineGuideId) return DEFAULT_TYPOGRAPHY;
  return ALBUM_TYPOGRAPHY[lineGuideId] ?? DEFAULT_TYPOGRAPHY;
}
