import type { PhotoPageLayouts } from '@/constants/photo-slots';

type PdfPhotoSlotsManifest = Record<string, Record<string, PhotoPageLayouts>>;

const pdfPhotoSlotsManifest = require('../constants/generated/pdf-photo-slots.json') as PdfPhotoSlotsManifest;

export function getPdfPhotoPageLayouts(
  lineGuideId: string,
  page: number,
): PhotoPageLayouts | undefined {
  return pdfPhotoSlotsManifest[lineGuideId]?.[String(page)];
}

export function hasPdfPhotoSlot(lineGuideId: string, page: number): boolean {
  const layouts = getPdfPhotoPageLayouts(lineGuideId, page);
  return Boolean(layouts?.variants?.length);
}
