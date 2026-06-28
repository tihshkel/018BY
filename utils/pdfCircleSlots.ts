import type { PhotoPageLayouts } from '@/constants/photo-slots';

type CircleFillTarget = {
  id: string;
  fieldId: string;
  option: string;
  fillColor: string;
  cx: number;
  cy: number;
  diameter: number;
};

type RectFillTarget = {
  id: string;
  fieldId: string;
  option: string;
  fillColor: string;
  shape: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
};

type OptionFillTarget = CircleFillTarget | RectFillTarget;

type CirclePageData = {
  genderFills?: CircleFillTarget[];
  optionFills?: OptionFillTarget[];
  slots?: Array<{
    slotId: string;
    branch: 'child' | 'mother' | 'father';
    x: number;
    y: number;
    width: number;
    height: number;
    shape: 'circle';
  }>;
  variants?: PhotoPageLayouts['variants'];
};

type PdfCircleSlotsManifest = Record<string, Record<string, CirclePageData>>;

const pdfCircleSlotsManifest = require('../constants/generated/pdf-circle-slots.json') as PdfCircleSlotsManifest;

export type { CircleFillTarget as GenderFillTarget, OptionFillTarget, RectFillTarget };

export function getPdfCirclePageData(
  lineGuideId: string,
  page: number,
): CirclePageData | undefined {
  return pdfCircleSlotsManifest[lineGuideId]?.[String(page)];
}

export function getPdfCirclePhotoPageLayouts(
  lineGuideId: string,
  page: number,
): PhotoPageLayouts | undefined {
  const pageData = getPdfCirclePageData(lineGuideId, page);
  if (!pageData?.variants?.length) return undefined;
  return { variants: pageData.variants };
}

export function getGenderFillTargets(
  lineGuideId: string,
  page: number,
): CircleFillTarget[] {
  return getPdfCirclePageData(lineGuideId, page)?.genderFills ?? [];
}

export function getOptionFillTargets(
  lineGuideId: string,
  page: number,
): OptionFillTarget[] {
  const pageData = getPdfCirclePageData(lineGuideId, page);
  if (!pageData) return [];
  const circleFills = (pageData.genderFills ?? []).map((target) => ({ ...target }));
  const rectFills = pageData.optionFills ?? [];
  return [...circleFills, ...rectFills];
}

export function hasCirclePhotoLayout(lineGuideId: string, page: number): boolean {
  return Boolean(getPdfCirclePhotoPageLayouts(lineGuideId, page)?.variants?.length);
}
