import fontCharWidthsJson from '@/constants/generated/font-char-widths.json';

type FontCharWidthEntry = {
  fontId: string;
  fontSize: number;
  avgCharWidthAt16: number;
  /** Baseline offset from RN Text top when lineHeight === fontSize (preview parity). */
  rnAscentRatioAt16?: number;
  chars?: Record<string, number>;
};

type FontCharWidthsFile = {
  fonts: Record<string, FontCharWidthEntry>;
};

const fontTable = fontCharWidthsJson as FontCharWidthsFile;

export function measureTextWithFontTable(
  text: string,
  fontSize: number,
  fontId: string,
): number | null {
  const entry = fontTable.fonts?.[fontId];
  if (!entry?.avgCharWidthAt16) return null;

  const scale = fontSize / (entry.fontSize || 16);
  let width = 0;
  for (const ch of text) {
    const perChar = entry.chars?.[ch];
    width += (perChar ?? entry.avgCharWidthAt16) * scale;
  }
  return width;
}

/** RN-compatible ascent ratio for preview top → pdf-lib baseline conversion. */
export function getRnAscentRatioAt16(fontId?: string | null): number | null {
  if (!fontId) return null;
  const entry = fontTable.fonts?.[fontId];
  if (typeof entry?.rnAscentRatioAt16 === 'number' && entry.rnAscentRatioAt16 > 0) {
    return entry.rnAscentRatioAt16;
  }
  return null;
}
