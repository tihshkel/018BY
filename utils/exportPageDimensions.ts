/** A5: 148 × 210 мм в PDF points (1 pt = 1/72 inch) */
export const A5_WIDTH_PT = 420;
export const A5_HEIGHT_PT = 595;

/** Поля 10 мм ≈ 28.3 pt (мягкая обложка и электронная версия) */
export const A5_MARGIN_PT = 28.3;

/** 180 × 240 мм — твёрдый переплёт */
export const HARD_COVER_WIDTH_PT = 510;
export const HARD_COVER_HEIGHT_PT = 680;
export const HARD_COVER_MARGIN_PT = 42.5;

/** 210 × 210 мм — квадратные family blank и детские альбомы */
export const SQUARE_PAGE_PT = 595;
/** @deprecated use SQUARE_PAGE_PT */
export const KIDS_PAGE_PT = SQUARE_PAGE_PT;

export type ExportFormatType = 'electronic' | 'hard' | 'soft';

export const DIARY_BROWN_LINE_GUIDE = 'diary_interior_brown';
export const DIARY_PURPLE_LINE_GUIDE = 'diary_interior_purple';

export function isDiaryBrownLineGuide(lineGuideId?: string | null): boolean {
  return lineGuideId === DIARY_BROWN_LINE_GUIDE;
}

export function isDiaryPurpleLineGuide(lineGuideId?: string | null): boolean {
  return lineGuideId === DIARY_PURPLE_LINE_GUIDE;
}

/** Коричневый и фиолетовый дневники — блок 180×240 мм (не A5). */
export function isDiaryPortraitLineGuide(lineGuideId?: string | null): boolean {
  return isDiaryBrownLineGuide(lineGuideId) || isDiaryPurpleLineGuide(lineGuideId);
}

/** Беременность 180×240 мм (60 стр.) — не A5. */
export function isPregnancy60LineGuide(lineGuideId?: string | null): boolean {
  return lineGuideId === 'pregnancy_60';
}

/** Электронный экспорт дневников — full-bleed 180×240 без полей. */
export function shouldUseFullBleedDiaryExport(
  formatType: ExportFormatType,
  lineGuideId?: string | null,
): boolean {
  return formatType === 'electronic' && isDiaryPortraitLineGuide(lineGuideId);
}

export function getExportPageDimensions(
  formatType: ExportFormatType,
  category: string | null | undefined,
  lineGuideId?: string | null,
): {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
  contentHeight: number;
} {
  const isKids = category === 'kids';
  const isSquareBlank =
    lineGuideId === 'family_blank_21x21' || lineGuideId === 'holidays_birthday_60';
  const isPortraitBlank =
    lineGuideId === 'family_blank' || lineGuideId === 'holidays_blank';
  const isDiaryPortrait = isDiaryPortraitLineGuide(lineGuideId);
  const isPregnancy60 = isPregnancy60LineGuide(lineGuideId);

  if (isDiaryPortrait || isPregnancy60) {
    const margin =
      formatType === 'electronic'
        ? 0
        : formatType === 'hard'
          ? HARD_COVER_MARGIN_PT
          : A5_MARGIN_PT;
    return {
      pageWidth: HARD_COVER_WIDTH_PT,
      pageHeight: HARD_COVER_HEIGHT_PT,
      margin,
      contentWidth: HARD_COVER_WIDTH_PT - margin * 2,
      contentHeight: HARD_COVER_HEIGHT_PT - margin * 2,
    };
  }

  if (isKids || isSquareBlank) {
    return {
      pageWidth: SQUARE_PAGE_PT,
      pageHeight: SQUARE_PAGE_PT,
      margin: A5_MARGIN_PT,
      contentWidth: SQUARE_PAGE_PT - A5_MARGIN_PT * 2,
      contentHeight: SQUARE_PAGE_PT - A5_MARGIN_PT * 2,
    };
  }

  if (isPortraitBlank) {
    const margin = formatType === 'hard' ? HARD_COVER_MARGIN_PT : A5_MARGIN_PT;
    return {
      pageWidth: HARD_COVER_WIDTH_PT,
      pageHeight: HARD_COVER_HEIGHT_PT,
      margin,
      contentWidth: HARD_COVER_WIDTH_PT - margin * 2,
      contentHeight: HARD_COVER_HEIGHT_PT - margin * 2,
    };
  }

  if (formatType === 'hard') {
    return {
      pageWidth: HARD_COVER_WIDTH_PT,
      pageHeight: HARD_COVER_HEIGHT_PT,
      margin: HARD_COVER_MARGIN_PT,
      contentWidth: HARD_COVER_WIDTH_PT - HARD_COVER_MARGIN_PT * 2,
      contentHeight: HARD_COVER_HEIGHT_PT - HARD_COVER_MARGIN_PT * 2,
    };
  }

  // soft и electronic — один физический формат A5
  return {
    pageWidth: A5_WIDTH_PT,
    pageHeight: A5_HEIGHT_PT,
    margin: A5_MARGIN_PT,
    contentWidth: A5_WIDTH_PT - A5_MARGIN_PT * 2,
    contentHeight: A5_HEIGHT_PT - A5_MARGIN_PT * 2,
  };
}

/** DPI макета в Corel — эталон для ресэмплинга пользовательских фото при вставке. */
export const ALBUM_DESIGN_DPI = 72;

/**
 * Электронная версия: растр 300 DPI (достаточно для экрана и лёгкой печати).
 * В приложении фото хранятся в ~72 DPI эквиваленте по размеру слота; upsample — при electronic-экспорте.
 */
export const ELECTRONIC_EXPORT_DPI = 300;
export const ELECTRONIC_JPEG_QUALITY_PAGE = 0.85;
export const ELECTRONIC_JPEG_QUALITY_COVER = 0.82;
export const ELECTRONIC_CAPTURE_SCALE = 1.35;
export const ELECTRONIC_CAPTURE_QUALITY = 0.88;

/** Длинная сторона области страницы в пикселях при заданном DPI */
export function exportLongSidePx(
  pageWidthPt: number,
  pageHeightPt: number,
  dpi: number
): number {
  return Math.ceil((Math.max(pageWidthPt, pageHeightPt) * dpi) / 72);
}

/** Длинная сторона контентной области (с полями) в пикселях */
export function exportContentLongSidePx(
  contentWidthPt: number,
  contentHeightPt: number,
  dpi: number
): number {
  return Math.ceil((Math.max(contentWidthPt, contentHeightPt) * dpi) / 72);
}

export function getElectronicRasterMaxSide(
  kind: 'page' | 'cover',
  pageWidthPt: number,
  pageHeightPt: number,
  contentWidthPt: number,
  contentHeightPt: number
): number {
  return kind === 'cover'
    ? exportLongSidePx(pageWidthPt, pageHeightPt, ELECTRONIC_EXPORT_DPI)
    : exportContentLongSidePx(contentWidthPt, contentHeightPt, ELECTRONIC_EXPORT_DPI);
}

export function getElectronicJpegQuality(kind: 'page' | 'cover'): number {
  return kind === 'cover' ? ELECTRONIC_JPEG_QUALITY_COVER : ELECTRONIC_JPEG_QUALITY_PAGE;
}
