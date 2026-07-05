import type { Annotation } from '@/components/pdf-annotations';
import type { PDFDocument, PDFPage } from 'pdf-lib';
import {
  appendBezierCurve,
  clip,
  endPath,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  rgb,
} from 'pdf-lib';

import { BLANK_ALBUM_PHOTO_RADIUS } from '@/constants/design-tokens';
import { resolveRectFillBorderRadius } from '@/utils/circleSlotColors';
import { getContentRect, mapViewportAnnotationToPdf } from '@/utils/imageContentRect';
import { computeObjectFitCover } from '@/utils/imageCoverDraw';
import { applyPhotoSlotTransform } from '@/utils/photoSlotTransform';
import { resolvePhotoSlotTransformForDisplay } from '@/utils/photoSlotInitialTransform';

const ELLIPSE_KAPPA = 4.0 * ((Math.sqrt(2) - 1.0) / 3.0);

function hexToRgb(hex: string) {
  const r = parseInt(hex.substring(1, 3), 16) / 255;
  const g = parseInt(hex.substring(3, 5), 16) / 255;
  const b = parseInt(hex.substring(5, 7), 16) / 255;
  return rgb(r, g, b);
}

function pushRectClip(page: PDFPage, mapped: { x: number; y: number; width: number; height: number }) {
  const x = mapped.x;
  const y = mapped.y;
  const xe = x + mapped.width;
  const ye = y + mapped.height;

  page.pushOperators(
    pushGraphicsState(),
    moveTo(x, y),
    lineTo(xe, y),
    lineTo(xe, ye),
    lineTo(x, ye),
    clip(),
    endPath(),
  );
}

function pushRoundedRectClip(
  page: PDFPage,
  mapped: { x: number; y: number; width: number; height: number },
  radius: number,
) {
  const width = mapped.width;
  const height = mapped.height;
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (r <= 0) {
    pushRectClip(page, mapped);
    return;
  }

  const x = mapped.x;
  const y = mapped.y;
  const k = r * ELLIPSE_KAPPA;

  page.pushOperators(
    pushGraphicsState(),
    moveTo(x + r, y),
    lineTo(x + width - r, y),
    appendBezierCurve(x + width - r + k, y, x + width, y + r - k, x + width, y + r),
    lineTo(x + width, y + height - r),
    appendBezierCurve(
      x + width,
      y + height - r + k,
      x + width - r + k,
      y + height,
      x + width - r,
      y + height,
    ),
    lineTo(x + r, y + height),
    appendBezierCurve(x + r - k, y + height, x, y + height - r + k, x, y + height - r),
    lineTo(x, y + r),
    appendBezierCurve(x, y + r - k, x + r - k, y, x + r, y),
    clip(),
    endPath(),
  );
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
  pagesViewport: { width: number; height: number };
  sourceWidth: number;
  sourceHeight: number;
  pdfImageX: number;
  pdfImageY: number;
  pdfImageWidth: number;
  pdfImageHeight: number;
  lineGuideId?: string | null;
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
    const slotViewport = {
      x: ann.x,
      y: ann.y,
      width: ann.width,
      height: ann.height,
    };

    let drawViewport = slotViewport;

    const clipMapped = mapViewportAnnotationToPdf({
      x: slotViewport.x,
      y: slotViewport.y,
      width: slotViewport.width,
      height: slotViewport.height,
      editorContentRect,
      pdfImageX: params.pdfImageX,
      pdfImageY: params.pdfImageY,
      pdfImageWidth: params.pdfImageWidth,
      pdfImageHeight: params.pdfImageHeight,
    });

    if (!ann.imageUri && ann.fillColor) {
      try {
        if (ann.clipShape === 'circle') {
          const centerX = clipMapped.x + clipMapped.width / 2;
          const centerY = clipMapped.y + clipMapped.height / 2;
          pushCircleClip(params.page, clipMapped);
          params.page.drawEllipse({
            x: centerX,
            y: centerY,
            xScale: clipMapped.width / 2,
            yScale: clipMapped.height / 2,
            color: hexToRgb(ann.fillColor),
            opacity: ann.fillOpacity ?? 1,
            borderWidth: 0,
          });
          params.page.pushOperators(popGraphicsState());
        } else {
          const radius = resolveRectFillBorderRadius(
            clipMapped.width,
            clipMapped.height,
            ann.fillCornerRadiusRatio,
          );
          if (radius > 0.5) {
            pushRoundedRectClip(params.page, clipMapped, radius);
            params.page.drawRectangle({
              x: clipMapped.x,
              y: clipMapped.y,
              width: clipMapped.width,
              height: clipMapped.height,
              color: hexToRgb(ann.fillColor),
              opacity: ann.fillOpacity ?? 1,
              borderWidth: 0,
            });
            params.page.pushOperators(popGraphicsState());
          } else {
            params.page.drawRectangle({
              x: clipMapped.x,
              y: clipMapped.y,
              width: clipMapped.width,
              height: clipMapped.height,
              color: hexToRgb(ann.fillColor),
              opacity: ann.fillOpacity ?? 1,
              borderWidth: 0,
            });
          }
        }
      } catch {
        // ignore single annotation failures
      }
      continue;
    }

    if (!ann.imageUri) continue;

    const annImageBytes = params.annotationImageMap.get(ann.imageUri);
    if (!annImageBytes) continue;

    try {
      let embeddedAnnImage = params.embeddedImagesCache.get(ann.imageUri);
      if (!embeddedAnnImage) {
        const isJpg = annImageBytes[0] === 0xff && annImageBytes[1] === 0xd8;
        embeddedAnnImage = isJpg
          ? await params.pdfDoc.embedJpg(annImageBytes)
          : await params.pdfDoc.embedPng(annImageBytes);
        params.embeddedImagesCache.set(ann.imageUri, embeddedAnnImage);
      }

      const embedded = embeddedAnnImage as Awaited<ReturnType<PDFDocument['embedJpg']>>;
      const imageAspect =
        embedded.width > 0 && embedded.height > 0
          ? embedded.width / embedded.height
          : undefined;

      if (ann.imageSlotTransform && imageAspect) {
        const displayTransform = resolvePhotoSlotTransformForDisplay(
          ann.imageSlotTransform,
          slotViewport.width,
          slotViewport.height,
          imageAspect,
        );
        const inner = applyPhotoSlotTransform(
          { x: 0, y: 0, width: slotViewport.width, height: slotViewport.height },
          displayTransform,
          imageAspect,
        );
        drawViewport = {
          x: slotViewport.x + inner.x,
          y: slotViewport.y + inner.y,
          width: inner.width,
          height: inner.height,
        };
      } else if (ann.imageSlotTransform) {
        const inner = applyPhotoSlotTransform(
          { x: 0, y: 0, width: slotViewport.width, height: slotViewport.height },
          ann.imageSlotTransform,
        );
        drawViewport = {
          x: slotViewport.x + inner.x,
          y: slotViewport.y + inner.y,
          width: inner.width,
          height: inner.height,
        };
      }

      const mapped = mapViewportAnnotationToPdf({
        x: drawViewport.x,
        y: drawViewport.y,
        width: drawViewport.width,
        height: drawViewport.height,
        editorContentRect,
        pdfImageX: params.pdfImageX,
        pdfImageY: params.pdfImageY,
        pdfImageWidth: params.pdfImageWidth,
        pdfImageHeight: params.pdfImageHeight,
      });

      const needsRectClip = ann.clipShape !== 'circle' && ann.imageContentFit === 'cover';

      if (ann.clipShape === 'circle') {
        pushCircleClip(params.page, clipMapped);
      } else if (needsRectClip) {
        const pdfRadius =
          BLANK_ALBUM_PHOTO_RADIUS *
          (clipMapped.height / Math.max(slotViewport.height, 1));
        pushRoundedRectClip(params.page, clipMapped, pdfRadius);
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

      if (ann.clipShape === 'circle' || needsRectClip) {
        params.page.pushOperators(popGraphicsState());
      }
    } catch {
      // ignore single annotation failures
    }
  }
}
