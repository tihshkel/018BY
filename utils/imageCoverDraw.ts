/**
 * object-fit: cover placement for fixed-size image boxes.
 */

export type CoverPlacement = {
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
  clipX: number;
  clipY: number;
  clipWidth: number;
  clipHeight: number;
};

export function computeObjectFitCover(
  imageWidth: number,
  imageHeight: number,
  boxX: number,
  boxY: number,
  boxWidth: number,
  boxHeight: number,
): CoverPlacement {
  if (
    imageWidth <= 0 ||
    imageHeight <= 0 ||
    boxWidth <= 0 ||
    boxHeight <= 0
  ) {
    return {
      drawX: boxX,
      drawY: boxY,
      drawWidth: boxWidth,
      drawHeight: boxHeight,
      clipX: boxX,
      clipY: boxY,
      clipWidth: boxWidth,
      clipHeight: boxHeight,
    };
  }

  const imageAspect = imageWidth / imageHeight;
  const boxAspect = boxWidth / boxHeight;

  let drawWidth: number;
  let drawHeight: number;

  if (imageAspect > boxAspect) {
    drawHeight = boxHeight;
    drawWidth = boxHeight * imageAspect;
  } else {
    drawWidth = boxWidth;
    drawHeight = boxWidth / imageAspect;
  }

  const drawX = boxX + (boxWidth - drawWidth) / 2;
  const drawY = boxY + (boxHeight - drawHeight) / 2;

  return {
    drawX,
    drawY,
    drawWidth,
    drawHeight,
    clipX: boxX,
    clipY: boxY,
    clipWidth: boxWidth,
    clipHeight: boxHeight,
  };
}
