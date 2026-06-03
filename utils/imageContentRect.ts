/**
 * Область вписанного изображения (contentFit: contain, center) внутри viewport.
 * Единая математика для редактора, PageRenderer и PDF fallback.
 */

export type ContentRect = {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

export function getContentRect(
  viewportWidth: number,
  viewportHeight: number,
  sourceWidth: number,
  sourceHeight: number
): ContentRect {
  if (
    !Number.isFinite(viewportWidth) ||
    !Number.isFinite(viewportHeight) ||
    viewportWidth <= 0 ||
    viewportHeight <= 0
  ) {
    return { offsetX: 0, offsetY: 0, width: 0, height: 0 };
  }

  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    return { offsetX: 0, offsetY: 0, width: viewportWidth, height: viewportHeight };
  }

  const sourceAspect = sourceWidth / sourceHeight;
  const viewportAspect = viewportWidth / viewportHeight;

  if (sourceAspect > viewportAspect) {
    const width = viewportWidth;
    const height = viewportWidth / sourceAspect;
    return {
      offsetX: 0,
      offsetY: (viewportHeight - height) / 2,
      width,
      height,
    };
  }

  const height = viewportHeight;
  const width = viewportHeight * sourceAspect;
  return {
    offsetX: (viewportWidth - width) / 2,
    offsetY: 0,
    width,
    height,
  };
}

/** Нормализованные координаты [0..1] относительно исходного PNG → viewport px */
export function mapSourceNormToViewport(
  nx: number,
  ny: number,
  nw: number,
  nh: number,
  contentRect: ContentRect
): { x: number; y: number; width: number; height: number } {
  return {
    x: contentRect.offsetX + nx * contentRect.width,
    y: contentRect.offsetY + ny * contentRect.height,
    width: nw * contentRect.width,
    height: nh * contentRect.height,
  };
}

/** Viewport px → нормализованные [0..1] в исходном PNG */
export function mapViewportToSourceNorm(
  vx: number,
  vy: number,
  contentRect: ContentRect
): { nx: number; ny: number } {
  if (contentRect.width <= 0 || contentRect.height <= 0) {
    return { nx: 0, ny: 0 };
  }
  return {
    nx: (vx - contentRect.offsetX) / contentRect.width,
    ny: (vy - contentRect.offsetY) / contentRect.height,
  };
}

/** Viewport-координаты аннотации → PDF (нижний левый угол, Y вверх) */
export function mapViewportAnnotationToPdf(params: {
  x: number;
  y: number;
  width: number;
  height: number;
  editorContentRect: ContentRect;
  pdfImageX: number;
  pdfImageY: number;
  pdfImageWidth: number;
  pdfImageHeight: number;
}): { x: number; y: number; width: number; height: number } {
  const {
    x,
    y,
    width,
    height,
    editorContentRect,
    pdfImageX,
    pdfImageY,
    pdfImageWidth,
    pdfImageHeight,
  } = params;

  const scaleX = pdfImageWidth / editorContentRect.width;
  const scaleY = pdfImageHeight / editorContentRect.height;

  const relX = x - editorContentRect.offsetX;
  const relY = y - editorContentRect.offsetY;

  const pdfX = pdfImageX + relX * scaleX;
  const pdfTopY = pdfImageY + pdfImageHeight - relY * scaleY;

  return {
    x: pdfX,
    y: pdfTopY - height * scaleY,
    width: width * scaleX,
    height: height * scaleY,
  };
}

export function getViewportToPdfScale(
  editorContentRect: ContentRect,
  pdfImageWidth: number,
  pdfImageHeight: number
): { scaleX: number; scaleY: number } {
  if (editorContentRect.width <= 0 || editorContentRect.height <= 0) {
    return { scaleX: 1, scaleY: 1 };
  }
  return {
    scaleX: pdfImageWidth / editorContentRect.width,
    scaleY: pdfImageHeight / editorContentRect.height,
  };
}
