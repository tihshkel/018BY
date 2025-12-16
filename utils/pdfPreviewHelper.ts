/**
 * Утилиты для работы с preview версиями PDF файлов
 */

import { getPreviewFileName, getPdfAsset } from './pdfPreloader';

/**
 * Определяет, доступна ли preview версия для указанного файла
 * @param fileName - имя основного PDF файла
 * @returns true, если preview версия доступна
 */
export const hasPreviewVersion = (fileName: string): boolean => {
  const previewName = getPreviewFileName(fileName);
  return previewName !== fileName;
};

/**
 * Получить путь к PDF файлу (основной или preview)
 * @param baseFileName - имя основного PDF файла
 * @param preferPreview - предпочитать preview версию, если доступна
 * @returns путь к файлу для использования в компонентах
 */
export const getPdfPath = (
  baseFileName: string,
  preferPreview: boolean = false
): string | number => {
  const asset = getPdfAsset(baseFileName, preferPreview);
  if (asset) {
    return asset;
  }
  
  // Если asset не найден, возвращаем путь как строку
  if (preferPreview && hasPreviewVersion(baseFileName)) {
    return `./assets/pdfs/preview/${getPreviewFileName(baseFileName)}`;
  }
  return `./assets/pdfs/${baseFileName}`;
};

/**
 * Получить список всех доступных PDF файлов (основные и preview)
 * @returns объект с основными файлами и их preview версиями
 */
export const getAllAvailablePdfs = () => {
  return {
    main: [
      'Блок БЕРЕМЕННОСТЬ 60 стр.pdf',
      'Блок БЕРЕМЕННОСТЬ A5 другой блок.pdf',
    ],
    preview: [
      'Блок БЕРЕМЕННОСТЬ 60 стр_preview.pdf',
      'Блок БЕРЕМЕННОСТЬ A5 другой блок_preview.pdf',
    ],
  };
};

