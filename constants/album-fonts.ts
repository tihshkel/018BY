/**
 * Шрифты для текста в альбомах.
 * Оставлены только варианты с полной кириллицей и предсказуемыми метриками в строках макета.
 */

export interface FontOption {
  id: string;
  /** Имя для React Native / expo-font */
  name: string;
  file: number | null;
  displayName: string;
  /** Множитель ширины символа относительно профиля альбома (кириллица шире латиницы). */
  charWidthMultiplier?: number;
}

export const DEFAULT_ALBUM_TEXT_FONT_ID = 'Nefelibata-Sans';

export const AVAILABLE_FONTS: FontOption[] = [
  {
    id: 'SvyaznoyRF',
    name: 'SvyaznoyRF',
    file: require('@/assets/fonts/SvyaznoyRF.ttf'),
    displayName: 'Связной',
    charWidthMultiplier: 1.02,
  },
  {
    id: 'AmaticSC-Regular',
    name: 'AmaticSC-Regular',
    file: require('@/assets/fonts/AmaticSC-Regular.ttf'),
    displayName: 'Amatic SC',
    charWidthMultiplier: 1.08,
  },
  {
    id: 'AmaticSC-Bold',
    name: 'AmaticSC-Bold',
    file: require('@/assets/fonts/AmaticSC-Bold.ttf'),
    displayName: 'Amatic SC Bold',
    charWidthMultiplier: 1.1,
  },
  {
    id: 'Nefelibata-Sans',
    name: 'Nefelibata-Sans',
    file: require('@/assets/fonts/Nefelibata-Sans.otf'),
    displayName: 'Nefelibata Sans',
    charWidthMultiplier: 1.04,
  },
  {
    id: 'Nefelibata-PenSans',
    name: 'Nefelibata-PenSans',
    file: require('@/assets/fonts/Nefelibata-PenSans.otf'),
    displayName: 'Nefelibata Pen',
    charWidthMultiplier: 1.06,
  },
];

/** Старые id, убранные из списка — откатываем на читаемый альбомный шрифт. */
const LEGACY_FONT_ALIASES: Record<string, string> = {
  default: DEFAULT_ALBUM_TEXT_FONT_ID,
  inspiration: DEFAULT_ALBUM_TEXT_FONT_ID,
  'Nefelibata-Brush': 'Nefelibata-Sans',
  'Nefelibata-BrushCanvas': 'Nefelibata-Sans',
  'Nefelibata-Extras': 'Nefelibata-Sans',
  'Nefelibata-SansCanvas': 'Nefelibata-Sans',
  'Nefelibata-SansCd': 'Nefelibata-Sans',
  'Nefelibata-SansCdCanvas': 'Nefelibata-Sans',
  'Nefelibata-Script': 'Nefelibata-Sans',
};

const fontById = new Map(AVAILABLE_FONTS.map((font) => [font.id, font]));

export function normalizeAlbumFontId(fontId?: string | null): string {
  if (!fontId || fontId === 'default') return DEFAULT_ALBUM_TEXT_FONT_ID;
  if (fontById.has(fontId)) return fontId;
  return LEGACY_FONT_ALIASES[fontId] ?? DEFAULT_ALBUM_TEXT_FONT_ID;
}

export function getAlbumFontById(fontId?: string | null): FontOption | undefined {
  return fontById.get(normalizeAlbumFontId(fontId));
}

export function getAlbumFontCharWidthMultiplier(fontId?: string | null): number {
  return getAlbumFontById(fontId)?.charWidthMultiplier ?? 1;
}

export function getAlbumFontFamilyName(fontId?: string | null): string | undefined {
  const font = getAlbumFontById(fontId);
  return font?.name;
}
