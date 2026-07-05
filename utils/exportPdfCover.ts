import type { PDFImage, PDFPage } from 'pdf-lib';

/** Рисует обложку/форзац на весь лист PDF без letterbox-полос. */
export function drawExportCoverFullBleed(
  page: PDFPage,
  embeddedImage: PDFImage,
  pageWidth: number,
  pageHeight: number,
): { x: number; y: number; width: number; height: number } {
  page.drawImage(embeddedImage, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
  });
  return { x: 0, y: 0, width: pageWidth, height: pageHeight };
}
