import type { Annotation } from '@/components/pdf-annotations';
import type { PDFDocument, PDFPage } from 'pdf-lib';
import {
  appendBezierCurve,
  clip,
  endPath,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  rgb,
} from 'pdf-lib';

import { getContentRect, mapViewportAnnotationToPdf } from '@/utils/imageContentRect';
import { computeObjectFitCover } from '@/utils/imageCoverDraw';

const ELLIPSE_KAPPA = 4.0 * ((Math.sqrt(2) - 1.0) / 3.0);

function hexToRgb(hex: string) {
  const r = parseInt(hex.substring(1, 3), 16) / 255;
  const g = parseInt(hex.substring(3, 5), 16) / 255;
  const b = parseInt(hex.substring(5, 7), 16) / 255;
  return rgb(r, g, b);
}

function pushCircleClip(page: PDFPage, mapped: { x: number; y: number; width: number; height: number }) {
  const xScale = mapped.width / 2;
  const yScale = mapped.height / 2;
  const x = mapped.x;
  const y = mapped.y;
  const ox = xScale * ELLIPSE_KAPPA;
  const oy = yScale * ELLIPSE_KAPPA;
  const xe = x + xScale * 2;
  const ye = y + yScale * 2;
  const xm = x + xScale;
  const ym = y + yScale;

  page.pushOperators(
    pushGraphicsState(),
    moveTo(x, ym),
    appendBezierCurve(x, ym - oy, xm - ox, y, xm, y),
    appendBezierCurve(xm + ox, y, xe, ym - oy, xe, ym),
    appendBezierCurve(xe, ym + oy, xm + ox, ye, xm, ye),
    appendBezierCurve(xm - ox, ye, x, ym + oy, x, ym),
    clip(),
    endPath(),
  );
}

type DrawImageAnnotationsParams = {
  page: PDFPage;
  pdfDoc: PDFDocument;
  pageAnnotations: Annotation[];
  annotationImageMap: Map<string, Uint8Array | null>;
  embeddedImagesCache: Map<string, unknown>;
  /** Уникальный ключ кэша встраивания — отдельный XObject на каждую страницу PDF. */
  embedCacheScope: string;
  pagesViewport: { width: number; height: number };
  sourceWidth: number;
  sourceHeight: number;
  pdfImageX: number;
  pdfImageY: number;
  pdfImageWidth: number;
  pdfImageHeight: number;
};

export async function drawImageAnnotationsOnPdfPage(
  params: DrawImageAnnotationsParams,
): Promise<void> {
  const imageAnnotations = params.pageAnnotations
    .filter((ann) => ann.type === 'image')
    .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  if (imageAnnotations.length === 0) return;

  const editorContentRect = getContentRect(
    params.pagesViewport.width,
    params.pagesViewport.height,
    params.sourceWidth,
    params.sourceHeight,
  );

  for (const ann of imageAnnotations) {
    const mapped = mapViewportAnnotationToPdf({
      x: ann.x,
      y: ann.y,
      width: ann.width,
      height: ann.height,
      editorContentRect,
      pdfImageX: params.pdfImageX,
      pdfImageY: params.pdfImageY,
      pdfImageWidth: params.pdfImageWidth,
      pdfImageHeight: params.pdfImageHeight,
    });

    if (!ann.imageUri && ann.fillColor) {
      try {
        if (ann.clipShape === 'circle') {
          pushCircleClip(params.page, mapped);
          const cx = mapped.x + mapped.width / 2;
          const cy = mapped.y + mapped.height / 2;
          params.page.drawEllipse({
            x: cx,
            y: cy,
            xScale: mapped.width / 2,
            yScale: mapped.height / 2,
            color: hexToRgb(ann.fillColor),
            borderWidth: 0,
          });
          params.page.pushOperators(popGraphicsState());
        } else {
          params.page.drawRectangle({
            x: mapped.x,
            y: mapped.y,
            width: mapped.width,
            height: mapped.height,
            color: hexToRgb(ann.fillColor),
            borderWidth: 0,
          });
        }
      } catch {
        // ignore single annotation failures
      }
      continue;
    }

    if (!ann.imageUri) continue;

    const annImageBytes = params.annotationImageMap.get(ann.imageUri);
    if (!annImageBytes) continue;

    const photoBleed = Math.max(2, mapped.width * 0.015);
    try {
      params.page.drawRectangle({
        x: mapped.x - photoBleed,
        y: mapped.y - photoBleed,
        width: mapped.width + photoBleed * 2,
        height: mapped.height + photoBleed * 2,
        color: rgb(1, 1, 1),
        borderWidth: 0,
      });
    } catch {
      // ignore mask failures
    }

    try {
      const embedCacheKey = `${params.embedCacheScope}:${ann.imageUri}`;
      let embeddedAnnImage = params.embeddedImagesCache.get(embedCacheKey);
      if (!embeddedAnnImage) {
        const isJpg = annImageBytes[0] === 0xff && annImageBytes[1] === 0xd8;
        embeddedAnnImage = isJpg
          ? await params.pdfDoc.embedJpg(annImageBytes)
          : await params.pdfDoc.embedPng(annImageBytes);
        params.embeddedImagesCache.set(embedCacheKey, embeddedAnnImage);
      }

      const embedded = embeddedAnnImage as Awaited<ReturnType<PDFDocument['embedJpg']>>;

      if (ann.clipShape === 'circle') {
        pushCircleClip(params.page, mapped);
      }

      if (ann.imageContentFit === 'cover') {
        const cover = computeObjectFitCover(
          embedded.width,
          embedded.height,
          mapped.x,
          mapped.y,
          mapped.width,
          mapped.height,
        );
        params.page.drawImage(embedded, {
          x: cover.drawX,
          y: cover.drawY,
          width: cover.drawWidth,
          height: cover.drawHeight,
        });
      } else {
        params.page.drawImage(embedded, {
          x: mapped.x,
          y: mapped.y,
          width: mapped.width,
          height: mapped.height,
        });
      }

      if (ann.clipShape === 'circle') {
        params.page.pushOperators(popGraphicsState());
      }
    } catch {
      // ignore single annotation failures
    }
  }
}
