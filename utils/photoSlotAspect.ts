import { resolvePageSourceSizeByLineGuide } from '@/utils/pageSourceDimensions';

/** Высота / ширина страницы в физических единицах (A5 ≈ 1.41, квадрат = 1). */
export function getPageAspectRatio(lineGuideId?: string | null): number {
  const size = resolvePageSourceSizeByLineGuide(lineGuideId);
  if (!size || size.width <= 0) return 1;
  return size.height / size.width;
}

/** Вписывает слот в ячейку с сохранением физического aspectRatio на странице. */
export function fitNormalizedSlotToAspect(
  maxWidth: number,
  maxHeight: number,
  pageAspect: number,
  aspectRatio?: [number, number],
): { width: number; height: number } {
  if (!aspectRatio?.[0] || !aspectRatio?.[1] || maxWidth <= 0 || maxHeight <= 0) {
    return { width: maxWidth, height: maxHeight };
  }

  const targetPhysicalRatio = aspectRatio[0] / aspectRatio[1];
  const maxPhysW = maxWidth;
  const maxPhysH = maxHeight * pageAspect;

  let physW = maxPhysW;
  let physH = physW / targetPhysicalRatio;
  if (physH > maxPhysH) {
    physH = maxPhysH;
    physW = physH * targetPhysicalRatio;
  }

  return {
    width: physW,
    height: physH / pageAspect,
  };
}
