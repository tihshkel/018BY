/**
 * PDF обложек экспорта не включаем в AAB (лимит Google Play).
 * Скачивание: utils/exportCoverPdfDownloader.ts (GitHub raw).
 */
export const EXPORT_COVER_PDFS: Record<string, never> = {};

export function getExportCoverPdf(_fileName: string): null {
  return null;
}
