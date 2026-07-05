import { normalizeAlbumFontId } from '@/constants/album-fonts';
import { measureTextWithFontTable } from '@/utils/fontCharWidths';
import type { TextWidthMeasure } from '@/utils/templateLineText';

/** Font-table width measure for preview/editor/export when PDF font is unavailable. */
export function resolveMeasureTextWidth(
  fontId?: string | null,
): TextWidthMeasure | undefined {
  const normalized = normalizeAlbumFontId(fontId);
  if (measureTextWithFontTable('А', 16, normalized) == null) {
    return undefined;
  }
  return (text, fittedFontSize) =>
    measureTextWithFontTable(text, fittedFontSize, normalized) ?? 0;
}
