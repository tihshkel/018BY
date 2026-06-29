import { getAlbumFontCharWidthMultiplier } from '@/constants/album-fonts';
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

const TEMPLATE_BLOCK_CHAR_WIDTH_RATIO = 0.62;
const TEMPLATE_BLOCK_LINE_HEIGHT = 1.15;

/** Подбирает размер шрифта и строки, чтобы текст поместился в блок шаблона (хронология, подписи). */
export function fitTextToTemplateBlock(params: {
  text: string;
  boxWidth: number;
  boxHeight: number;
  fontId?: string | null;
  preferredFontSize?: number;
  minFontSize?: number;
}): { fontSize: number; lines: string[] } {
  const trimmed = params.text.trim();
  if (!trimmed || params.boxWidth <= 0 || params.boxHeight <= 0) {
    return { fontSize: params.preferredFontSize ?? 14, lines: [] };
  }

  const minFontSize = params.minFontSize ?? 9;
  const charWidthRatio =
    TEMPLATE_BLOCK_CHAR_WIDTH_RATIO * getAlbumFontCharWidthMultiplier(params.fontId) * 1.04;
  const startFont = Math.min(
    params.preferredFontSize ?? Math.max(12, Math.min(22, Math.round(params.boxHeight * 0.55))),
    22,
  );

  for (let fontSize = startFont; fontSize >= minFontSize; fontSize -= 1) {
    const maxLines = maxLinesForBoxHeight(
      params.boxHeight,
      fontSize,
      TEMPLATE_BLOCK_LINE_HEIGHT,
    );
    const lines = wrapTextToLines(trimmed, params.boxWidth, fontSize, { charWidthRatio });
    if (lines.length <= maxLines) {
      return { fontSize, lines };
    }
  }

  const fontSize = minFontSize;
  const maxLines = maxLinesForBoxHeight(params.boxHeight, fontSize, TEMPLATE_BLOCK_LINE_HEIGHT);
  const lines = wrapTextToLines(trimmed, params.boxWidth, fontSize, { charWidthRatio });
  return { fontSize, lines: lines.slice(0, maxLines) };
}
