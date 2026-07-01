/**
 * Перенос текста по ширине (приближение по ширине символа).
 */

export function wrapTextToLines(
  text: string,
  width: number,
  fontSize: number,
  paddingPxOrOptions: number | { paddingPx?: number; charWidthRatio?: number } = 8,
): string[] {
  if (!text || text.length === 0) return [];

  const paddingPx =
    typeof paddingPxOrOptions === 'number'
      ? paddingPxOrOptions
      : (paddingPxOrOptions.paddingPx ?? 8);
  const charWidthRatio =
    typeof paddingPxOrOptions === 'number'
      ? 0.62
      : (paddingPxOrOptions.charWidthRatio ?? 0.62);

  const charWidth = fontSize * charWidthRatio;
  const maxCharsPerLine = Math.floor((width - paddingPx * 2) / charWidth);
  if (maxCharsPerLine <= 0) return [text];

  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      lines.push('');
      continue;
    }

    const words = paragraph.split(/\s+/).filter(Boolean);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          let rest = word;
          while (rest.length > maxCharsPerLine) {
            lines.push(rest.substring(0, maxCharsPerLine));
            rest = rest.substring(maxCharsPerLine);
          }
          currentLine = rest;
        }
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  return lines;
}

/** Сколько строк помещается в блок фиксированной высоты. */
export function maxLinesForBoxHeight(boxHeight: number, fontSize: number, lineHeightFactor = 1.2): number {
  if (boxHeight <= 0 || fontSize <= 0) return 1;
  return Math.max(1, Math.floor(boxHeight / (fontSize * lineHeightFactor)));
}
