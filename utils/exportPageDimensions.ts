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

/** Электронный экспорт — full-bleed без белых полей (как в превью). */
export function shouldUseFullBleedDiaryExport(
  formatType: ExportFormatType,
  lineGuideId?: string | null,
): boolean {
  if (formatType !== 'electronic') return false;
  return (
    isDiaryPortraitLineGuide(lineGuideId) ||
    lineGuideId === 'holidays_birthday_60' ||
    lineGuideId === 'family_blank' ||
    lineGuideId === 'family_blank_21x21' ||
    lineGuideId === 'holidays_blank'
  );
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
  const isKids = category === 'kids' || lineGuideId === 'kids_48';
  const isBirthday = lineGuideId === 'holidays_birthday_60';
  const isSquareBlank =
    lineGuideId === 'family_blank_21x21' || isBirthday;
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
    // Birthday / family 21×21 electronic: edge-to-edge (10mm gutters look like white frames).
    const margin =
      formatType === 'electronic' &&
      (isBirthday || lineGuideId === 'family_blank_21x21')
        ? 0
        : A5_MARGIN_PT;
    return {
      pageWidth: SQUARE_PAGE_PT,
      pageHeight: SQUARE_PAGE_PT,
      margin,
      contentWidth: SQUARE_PAGE_PT - margin * 2,
      contentHeight: SQUARE_PAGE_PT - margin * 2,
    };
  }

  if (isPortraitBlank) {
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
 * Экспорт PDF: растр ~300 DPI (экран + печать soft/hard).
 * Раньше large-doc (48–60 стр.) резался до 1100px / JPEG 0.72 — дизайн выглядел мыльным.
 */
export const EXPORT_RASTER_DPI = 300;
/** @deprecated use EXPORT_RASTER_DPI */
export const ELECTRONIC_EXPORT_DPI = EXPORT_RASTER_DPI;

export const EXPORT_JPEG_QUALITY_PAGE = 0.93;
export const EXPORT_JPEG_QUALITY_COVER = 0.92;
/** Large albums: чуть мягче сжатие, без просадки разрешения. */
export const EXPORT_JPEG_QUALITY_PAGE_LARGE = 0.9;

/** @deprecated use EXPORT_JPEG_QUALITY_* */
export const ELECTRONIC_JPEG_QUALITY_PAGE = EXPORT_JPEG_QUALITY_PAGE;
/** @deprecated use EXPORT_JPEG_QUALITY_* */
export const ELECTRONIC_JPEG_QUALITY_COVER = EXPORT_JPEG_QUALITY_COVER;

export const ELECTRONIC_CAPTURE_SCALE = 1.5;
export const ELECTRONIC_CAPTURE_QUALITY = 0.92;
export const EXPORT_CAPTURE_SCALE = 1.5;
export const EXPORT_CAPTURE_QUALITY = 0.92;
export const EXPORT_CAPTURE_SCALE_LARGE = 1.35;
export const EXPORT_CAPTURE_QUALITY_LARGE = 0.9;

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

/** Целевой max(side) растра страницы/обложки для любого формата экспорта. */
export function getExportRasterMaxSide(
  kind: 'page' | 'cover',
  pageWidthPt: number,
  pageHeightPt: number,
  contentWidthPt: number,
  contentHeightPt: number,
  dpi: number = EXPORT_RASTER_DPI,
): number {
  return kind === 'cover'
    ? exportLongSidePx(pageWidthPt, pageHeightPt, dpi)
    : exportContentLongSidePx(contentWidthPt, contentHeightPt, dpi);
}

/** @deprecated use getExportRasterMaxSide */
export function getElectronicRasterMaxSide(
  kind: 'page' | 'cover',
  pageWidthPt: number,
  pageHeightPt: number,
  contentWidthPt: number,
  contentHeightPt: number
): number {
  return getExportRasterMaxSide(
    kind,
    pageWidthPt,
    pageHeightPt,
    contentWidthPt,
    contentHeightPt,
  );
}

export function getExportJpegQuality(
  kind: 'page' | 'cover',
  options?: { isLargeDoc?: boolean; isElectronic?: boolean },
): number {
  if (kind === 'cover') return EXPORT_JPEG_QUALITY_COVER;
  if (options?.isLargeDoc) return EXPORT_JPEG_QUALITY_PAGE_LARGE;
  return EXPORT_JPEG_QUALITY_PAGE;
}

/** @deprecated use getExportJpegQuality */
export function getElectronicJpegQuality(kind: 'page' | 'cover'): number {
  return getExportJpegQuality(kind, { isElectronic: true });
}
