import { normalizeAlbumFontId } from '@/constants/album-fonts';
import type { ContentRect } from '@/utils/imageContentRect';
import { mapSourceNormToViewport } from '@/utils/imageContentRect';
import type { TemplateFrame } from '@/utils/photoPageTemplateManifest';
import { maxLinesForBoxHeight, wrapTextToLines } from '@/utils/textWrap';

export function mapTemplateFrameToViewport(
  frame: TemplateFrame,
  contentRect: ContentRect,
): { x: number; y: number; width: number; height: number } {
  return mapSourceNormToViewport(frame.x, frame.y, frame.w, frame.h, contentRect);
}

export function estimateTemplateFontSize(frameHeight: number, viewportHeight: number): number {
  const pxHeight = frameHeight * viewportHeight;
  return Math.max(12, Math.min(22, Math.round(pxHeight * 0.55)));
}

/**
 * Avg glyph width / fontSize for blank-template wrapping (pdf-lib measured, +~12% slack).
 * Do not reuse designed-album multipliers — those stay intentionally conservative for line slots.
 */
const TEMPLATE_BLOCK_CHAR_WIDTH_BY_FONT: Record<string, number> = {
  'AmaticSC-Bold': 0.37,
  'AmaticSC-Regular': 0.36,
  SvyaznoyRF: 0.63,
  'Nefelibata-Sans': 0.55,
  'Nefelibata-PenSans': 0.47,
};
const TEMPLATE_BLOCK_CHAR_WIDTH_FALLBACK = 0.55;
const TEMPLATE_BLOCK_LINE_HEIGHT = 1.15;

/** Char-width ratio for blank template text blocks (preview + export parity). */
export function getTemplateBlockCharWidthRatio(fontId?: string | null): number {
  const id = normalizeAlbumFontId(fontId);
  return TEMPLATE_BLOCK_CHAR_WIDTH_BY_FONT[id] ?? TEMPLATE_BLOCK_CHAR_WIDTH_FALLBACK;
}

/** Подбирает размер шрифта и строки, чтобы текст поместился в блок шаблона (хронология, подписи). */
export function fitTextToTemplateBlock(params: {
  text: string;
  boxWidth: number;
  boxHeight: number;
  fontId?: string | null;
  preferredFontSize?: number;
  minFontSize?: number;
  /** Сначала пытаться уместить в одну строку (крупнее), иначе — до maxLines. */
  preferSingleLine?: boolean;
  maxFontSize?: number;
}): { fontSize: number; lines: string[] } {
  const trimmed = params.text.trim();
  if (!trimmed || params.boxWidth <= 0 || params.boxHeight <= 0) {
    return { fontSize: params.preferredFontSize ?? 14, lines: [] };
  }

  const minFontSize = params.minFontSize ?? 9;
  const maxFontSize = params.maxFontSize ?? 28;
  const charWidthRatio = getTemplateBlockCharWidthRatio(params.fontId);
  const startFont = Math.min(
    params.preferredFontSize ?? Math.max(12, Math.min(22, Math.round(params.boxHeight * 0.55))),
    maxFontSize,
  );

  const wrapOpts = { charWidthRatio, paddingPx: 4 };

  if (params.preferSingleLine) {
    for (let fontSize = startFont; fontSize >= minFontSize; fontSize -= 1) {
      const lines = wrapTextToLines(trimmed, params.boxWidth, fontSize, wrapOpts);
      if (lines.length <= 1) {
        return { fontSize, lines };
      }
    }
  }

  for (let fontSize = startFont; fontSize >= minFontSize; fontSize -= 1) {
    const maxLines = maxLinesForBoxHeight(
      params.boxHeight,
      fontSize,
      TEMPLATE_BLOCK_LINE_HEIGHT,
    );
    const lines = wrapTextToLines(trimmed, params.boxWidth, fontSize, wrapOpts);
    if (lines.length <= maxLines) {
      return { fontSize, lines };
    }
  }

  const fontSize = minFontSize;
  const maxLines = maxLinesForBoxHeight(params.boxHeight, fontSize, TEMPLATE_BLOCK_LINE_HEIGHT);
  const lines = wrapTextToLines(trimmed, params.boxWidth, fontSize, wrapOpts);
  return { fontSize, lines: lines.slice(0, maxLines) };
}
