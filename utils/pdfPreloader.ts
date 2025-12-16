// Утилита для предзагрузки PDF файлов
import { Asset } from 'expo-asset';

// Маппинг PDF файлов для предзагрузки
const PDF_ASSETS = {
  // Основные PDF файлы
  'Блок БЕРЕМЕННОСТЬ 60 стр.pdf': require('../assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр.pdf'),
  'Блок БЕРЕМЕННОСТЬ A5 другой блок.pdf': require('../assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок.pdf'),
  // Preview версии PDF файлов
  'Блок БЕРЕМЕННОСТЬ 60 стр_preview.pdf': require('../assets/pdfs/preview/Блок БЕРЕМЕННОСТЬ 60 стр_preview.pdf'),
  'Блок БЕРЕМЕННОСТЬ A5 другой блок_preview.pdf': require('../assets/pdfs/preview/Блок БЕРЕМЕННОСТЬ A5 другой блок_preview.pdf'),
};

// Кэш для предзагруженных PDF файлов
const pdfCache = new Map<string, any>();

export const preloadPdf = async (fileName: string): Promise<any> => {
  // Проверяем кэш
  if (pdfCache.has(fileName)) {
    return pdfCache.get(fileName);
  }

  // Получаем ассет
  const asset = PDF_ASSETS[fileName as keyof typeof PDF_ASSETS];
  if (!asset) {
    throw new Error(`PDF file not found: ${fileName}`);
  }

  try {
    // Предзагружаем ассет
    const loadedAsset = await Asset.fromModule(asset).downloadAsync();
    
    // Сохраняем в кэш
    pdfCache.set(fileName, loadedAsset);
    
    return loadedAsset;
  } catch (error) {
    console.error('Error preloading PDF:', error);
    throw error;
  }
};

export const getPdfFromCache = (fileName: string): any => {
  return pdfCache.get(fileName);
};

export const clearPdfCache = () => {
  pdfCache.clear();
};

/**
 * Получить preview версию PDF файла, если она существует
 * @param fileName - имя основного PDF файла
 * @returns имя preview файла или исходное имя, если preview не найден
 */
export const getPreviewFileName = (fileName: string): string => {
  const previewName = fileName.replace('.pdf', '_preview.pdf');
  if (PDF_ASSETS[previewName as keyof typeof PDF_ASSETS]) {
    return previewName;
  }
  return fileName;
};

/**
 * Получить asset для PDF файла (основной или preview)
 * @param fileName - имя PDF файла
 * @param usePreview - использовать preview версию, если доступна
 * @returns asset модуль или null
 */
export const getPdfAsset = (fileName: string, usePreview: boolean = false): any => {
  const targetFileName = usePreview ? getPreviewFileName(fileName) : fileName;
  return PDF_ASSETS[targetFileName as keyof typeof PDF_ASSETS] || null;
};
