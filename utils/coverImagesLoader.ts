import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { getCoverPdfForExport } from './coverPdfMapping';

/**
 * Загружает изображения развертки обложки из папки albums
 * @param folderName - Название папки (например, 'DFA9_твердый переплет', 'DB1')
 * @returns Массив URI изображений или null
 */
export async function loadCoverImagesFromFolder(folderName: string | null): Promise<string[] | null> {
  if (!folderName) return null;

  try {
    // Динамически загружаем изображения из папки albums
    // Формируем путь к папке
    const folderPath = `../albums/${folderName}`;
    
    // Пытаемся загрузить изображения page_001.png, page_002.png и т.д.
    const images: string[] = [];
    let pageNumber = 1;
    let hasMorePages = true;

    while (hasMorePages && pageNumber <= 10) { // Максимум 10 страниц для развертки
      try {
        // Формируем имя файла с ведущими нулями
        const fileName = `page_${String(pageNumber).padStart(3, '0')}.png`;
        const imagePath = `${folderPath}/${fileName}`;
        
        // Пытаемся загрузить изображение
        // Для динамической загрузки используем require с динамическим путем
        // Но это не работает напрямую, поэтому используем другой подход
        
        // Вместо этого, используем FileSystem для чтения файлов из папки
        // Но для этого нужно знать точный путь
        
        // Альтернативный подход: используем Asset API с известными путями
        // Но это требует статического require
        
        // Пока возвращаем null, так как нужна другая реализация
        pageNumber++;
      } catch (error) {
        // Если файл не найден, прекращаем загрузку
        hasMorePages = false;
      }
    }

    return images.length > 0 ? images : null;
  } catch (error) {
    console.error(`[Cover Images Loader] Ошибка загрузки изображений из папки ${folderName}:`, error);
    return null;
  }
}

/**
 * Получает изображения развертки обложки на основе albumId, category и coverType
 * @param albumId - ID альбома
 * @param category - Категория альбома
 * @param coverType - Тип обложки ('hard' | 'soft')
 * @returns Массив URI изображений или null
 */
export async function getCoverImagesForViewer(
  albumId: string | null,
  category?: string,
  coverType: 'hard' | 'soft' = 'hard'
): Promise<string[] | null> {
  if (!albumId) return null;

  // Получаем название папки из маппинга
  const folderName = getCoverPdfForExport(albumId, category, coverType);
  
  if (!folderName) {
    console.warn(`[Cover Images Loader] Папка развертки не найдена для albumId=${albumId}, category=${category}, coverType=${coverType}`);
    return null;
  }

  // Загружаем изображения из папки
  return await loadCoverImagesFromFolder(folderName);
}

/**
 * Создает массив require() модулей для изображений развертки обложки
 * Это статический маппинг для всех возможных папок
 */
const COVER_IMAGES_MAPPING: Record<string, any[]> = {
  // DB1 - Беременность
  'DB1': [
    require('@/albums/DB1/page_001.png'),
  ],
  // DB2 - Беременность
  'DB2': [
    require('@/albums/DB2/page_001.png'),
  ],
  // DB3 - Беременность
  'DB3': [
    require('@/albums/DB3/page_001.png'),
  ],
  // DB4 - Беременность
  'DB4': [
    require('@/albums/DB4/page_001.png'),
  ],
  // DB5 - Беременность
  'DB5': [
    require('@/albums/DB5/page_001.png'),
  ],
  // DB6 - Беременность
  'DB6': [
    require('@/albums/DB6/page_001.png'),
  ],
  // DFA5
  'DFA5_твердый переплет': [
    require('@/albums/DFA5_твердый переплет/page_001.png'),
    require('@/albums/DFA5_твердый переплет/page_002.png'),
    require('@/albums/DFA5_твердый переплет/page_003.png'),
  ],
  'DFA5_пружина': [
    require('@/albums/DFA5_пружина/page_001.png'),
    require('@/albums/DFA5_пружина/page_002.png'),
    require('@/albums/DFA5_пружина/page_003.png'),
    require('@/albums/DFA5_пружина/page_004.png'),
  ],
  // DFA7
  'DFA7_твердый переплет': [
    require('@/albums/DFA7_твердый переплет/page_001.png'),
    require('@/albums/DFA7_твердый переплет/page_002.png'),
    require('@/albums/DFA7_твердый переплет/page_003.png'),
  ],
  'DFA7_пружина': [
    require('@/albums/DFA7_пружина/page_001.png'),
    require('@/albums/DFA7_пружина/page_002.png'),
    require('@/albums/DFA7_пружина/page_003.png'),
    require('@/albums/DFA7_пружина/page_004.png'),
  ],
  // DFA8
  'DFA8_твердый переплет': [
    require('@/albums/DFA8_твердый переплет/page_001.png'),
    require('@/albums/DFA8_твердый переплет/page_002.png'),
    require('@/albums/DFA8_твердый переплет/page_003.png'),
  ],
  'DFA8_пружина': [
    require('@/albums/DFA8_пружина/page_001.png'),
    require('@/albums/DFA8_пружина/page_002.png'),
    require('@/albums/DFA8_пружина/page_003.png'),
    require('@/albums/DFA8_пружина/page_004.png'),
  ],
  // DFA9
  'DFA9_твердый переплет': [
    require('@/albums/DFA9_твердый переплет/page_001.png'),
    require('@/albums/DFA9_твердый переплет/page_002.png'),
    require('@/albums/DFA9_твердый переплет/page_003.png'),
  ],
  'DFA9_пружина': [
    require('@/albums/DFA9_пружина/page_001.png'),
    require('@/albums/DFA9_пружина/page_002.png'),
    require('@/albums/DFA9_пружина/page_003.png'),
    require('@/albums/DFA9_пружина/page_004.png'),
  ],
  // DFA12
  'DFA12_твердый переплет': [
    require('@/albums/DFA12_твердый переплет/page_001.png'),
    require('@/albums/DFA12_твердый переплет/page_002.png'),
    require('@/albums/DFA12_твердый переплет/page_003.png'),
  ],
  'DFA12_пружина': [
    require('@/albums/DFA12_пружина/page_001.png'),
    require('@/albums/DFA12_пружина/page_002.png'),
    require('@/albums/DFA12_пружина/page_003.png'),
    require('@/albums/DFA12_пружина/page_004.png'),
  ],
  // DFA15
  'DFA15_твердый переплет': [
    require('@/albums/DFA15_твердый переплет/page_001.png'),
    require('@/albums/DFA15_твердый переплет/page_002.png'),
    require('@/albums/DFA15_твердый переплет/page_003.png'),
  ],
  'DFA15_пружина': [
    require('@/albums/DFA15_пружина/page_001.png'),
    require('@/albums/DFA15_пружина/page_002.png'),
    require('@/albums/DFA15_пружина/page_003.png'),
    require('@/albums/DFA15_пружина/page_004.png'),
  ],
  // DFA16
  'DFA16_твердый переплет': [
    require('@/albums/DFA16_твердый переплет/page_001.png'),
    require('@/albums/DFA16_твердый переплет/page_002.png'),
    require('@/albums/DFA16_твердый переплет/page_003.png'),
  ],
  'DFA16_пружина': [
    require('@/albums/DFA16_пружина/page_001.png'),
    require('@/albums/DFA16_пружина/page_002.png'),
    require('@/albums/DFA16_пружина/page_003.png'),
    require('@/albums/DFA16_пружина/page_004.png'),
  ],
  // Добавляем остальные папки на основе KIDS_COVER_PDF_MAPPING
  // DFA19
  'DFA19_твердый переплет': [
    require('@/albums/DFA19_твердый переплет/page_001.png'),
    require('@/albums/DFA19_твердый переплет/page_002.png'),
    require('@/albums/DFA19_твердый переплет/page_003.png'),
  ],
  'DFA19_пружина': [
    require('@/albums/DFA19_пружина/page_001.png'),
    require('@/albums/DFA19_пружина/page_002.png'),
    require('@/albums/DFA19_пружина/page_003.png'),
    require('@/albums/DFA19_пружина/page_004.png'),
  ],
  // DFA21
  'DFA21_твердый переплет': [
    require('@/albums/DFA21_твердый переплет/page_001.png'),
    require('@/albums/DFA21_твердый переплет/page_002.png'),
    require('@/albums/DFA21_твердый переплет/page_003.png'),
  ],
  'DFA21_пружина': [
    require('@/albums/DFA21_пружина/page_001.png'),
    require('@/albums/DFA21_пружина/page_002.png'),
    require('@/albums/DFA21_пружина/page_003.png'),
    require('@/albums/DFA21_пружина/page_004.png'),
  ],
  // DFA22
  'DFA22_твердый переплет': [
    require('@/albums/DFA22_твердый переплет/page_001.png'),
    require('@/albums/DFA22_твердый переплет/page_002.png'),
    require('@/albums/DFA22_твердый переплет/page_003.png'),
  ],
  'DFA22_пружина': [
    require('@/albums/DFA22_пружина/page_001.png'),
    require('@/albums/DFA22_пружина/page_002.png'),
    require('@/albums/DFA22_пружина/page_003.png'),
    require('@/albums/DFA22_пружина/page_004.png'),
  ],
  // DFA23
  'DFA23_твердый переплет': [
    require('@/albums/DFA23_твердый переплет/page_001.png'),
    require('@/albums/DFA23_твердый переплет/page_002.png'),
    require('@/albums/DFA23_твердый переплет/page_003.png'),
  ],
  'DFA23_пружина': [
    require('@/albums/DFA23_пружина/page_001.png'),
    require('@/albums/DFA23_пружина/page_002.png'),
    require('@/albums/DFA23_пружина/page_003.png'),
    require('@/albums/DFA23_пружина/page_004.png'),
  ],
  // DFA24
  'DFA24_твердый переплет': [
    require('@/albums/DFA24_твердый переплет/page_001.png'),
    require('@/albums/DFA24_твердый переплет/page_002.png'),
    require('@/albums/DFA24_твердый переплет/page_003.png'),
  ],
  'DFA24_пружина': [
    require('@/albums/DFA24_пружина/page_001.png'),
    require('@/albums/DFA24_пружина/page_002.png'),
    require('@/albums/DFA24_пружина/page_003.png'),
    require('@/albums/DFA24_пружина/page_004.png'),
  ],
  // DFA25
  'DFA25_твердый переплет': [
    require('@/albums/DFA25_твердый переплет/page_001.png'),
    require('@/albums/DFA25_твердый переплет/page_002.png'),
    require('@/albums/DFA25_твердый переплет/page_003.png'),
  ],
  'DFA25_пружина': [
    require('@/albums/DFA25_пружина/page_001.png'),
    require('@/albums/DFA25_пружина/page_002.png'),
    require('@/albums/DFA25_пружина/page_003.png'),
    require('@/albums/DFA25_пружина/page_004.png'),
  ],
  // DFA26
  'DFA26_твердый переплет': [
    require('@/albums/DFA26_твердый переплет/page_001.png'),
    require('@/albums/DFA26_твердый переплет/page_002.png'),
    require('@/albums/DFA26_твердый переплет/page_003.png'),
  ],
  'DFA26_пружина': [
    require('@/albums/DFA26_пружина/page_001.png'),
    require('@/albums/DFA26_пружина/page_002.png'),
    require('@/albums/DFA26_пружина/page_003.png'),
    require('@/albums/DFA26_пружина/page_004.png'),
  ],
  // DFA27
  'DFA27_твердый переплет': [
    require('@/albums/DFA27_твердый переплет/page_001.png'),
    require('@/albums/DFA27_твердый переплет/page_002.png'),
    require('@/albums/DFA27_твердый переплет/page_003.png'),
  ],
  'DFA27_пружина': [
    require('@/albums/DFA27_пружина/page_001.png'),
    require('@/albums/DFA27_пружина/page_002.png'),
    require('@/albums/DFA27_пружина/page_003.png'),
    require('@/albums/DFA27_пружина/page_004.png'),
  ],
  // DFA28
  'DFA28_твердый переплет': [
    require('@/albums/DFA28_твердый переплет/page_001.png'),
    require('@/albums/DFA28_твердый переплет/page_002.png'),
  ],
  'DFA28_пружина': [
    require('@/albums/DFA28_пружина/page_001.png'),
    require('@/albums/DFA28_пружина/page_002.png'),
    require('@/albums/DFA28_пружина/page_003.png'),
    require('@/albums/DFA28_пружина/page_004.png'),
  ],
  // DFA29
  'DFA29_твердый переплет': [
    require('@/albums/DFA29_твердый переплет/page_001.png'),
    require('@/albums/DFA29_твердый переплет/page_002.png'),
    require('@/albums/DFA29_твердый переплет/page_003.png'),
  ],
  'DFA29_пружина': [
    require('@/albums/DFA29_пружина/page_001.png'),
    require('@/albums/DFA29_пружина/page_002.png'),
    require('@/albums/DFA29_пружина/page_003.png'),
    require('@/albums/DFA29_пружина/page_004.png'),
  ],
  // DFA30
  'DFA30_твердый переплет': [
    require('@/albums/DFA30_твердый переплет/page_001.png'),
    require('@/albums/DFA30_твердый переплет/page_002.png'),
    require('@/albums/DFA30_твердый переплет/page_003.png'),
  ],
  'DFA30_пружина': [
    require('@/albums/DFA30_пружина/page_001.png'),
    require('@/albums/DFA30_пружина/page_002.png'),
    require('@/albums/DFA30_пружина/page_003.png'),
    require('@/albums/DFA30_пружина/page_004.png'),
  ],
  // DFA31
  'DFA31_твердый переплет': [
    require('@/albums/DFA31_твердый переплет/page_001.png'),
    require('@/albums/DFA31_твердый переплет/page_002.png'),
    require('@/albums/DFA31_твердый переплет/page_003.png'),
  ],
  'DFA31_пружина': [
    require('@/albums/DFA31_пружина/page_001.png'),
    require('@/albums/DFA31_пружина/page_002.png'),
    require('@/albums/DFA31_пружина/page_003.png'),
    require('@/albums/DFA31_пружина/page_004.png'),
  ],
  // dfa43
  'dfa43_твердый переплет': [
    require('@/albums/dfa43_твердый переплет/page_001.png'),
    require('@/albums/dfa43_твердый переплет/page_002.png'),
    require('@/albums/dfa43_твердый переплет/page_003.png'),
  ],
  'dfa43_пружина': [
    require('@/albums/dfa43_пружина/page_001.png'),
    require('@/albums/dfa43_пружина/page_002.png'),
    require('@/albums/dfa43_пружина/page_003.png'),
    require('@/albums/dfa43_пружина/page_004.png'),
  ],
  // DFA46
  'DFA46_твердый переплет': [
    require('@/albums/DFA46_твердый переплет/page_001.png'),
    require('@/albums/DFA46_твердый переплет/page_002.png'),
    require('@/albums/DFA46_твердый переплет/page_003.png'),
  ],
  'DFA46_пружина': [
    require('@/albums/DFA46_пружина/page_001.png'),
    require('@/albums/DFA46_пружина/page_002.png'),
    require('@/albums/DFA46_пружина/page_003.png'),
    require('@/albums/DFA46_пружина/page_004.png'),
  ],
  // DFA47
  'DFA47_твердый переплет': [
    require('@/albums/DFA47_твердый переплет/page_001.png'),
    require('@/albums/DFA47_твердый переплет/page_002.png'),
    require('@/albums/DFA47_твердый переплет/page_003.png'),
  ],
  'DFA47_пружина': [
    require('@/albums/DFA47_пружина/page_001.png'),
    require('@/albums/DFA47_пружина/page_002.png'),
    require('@/albums/DFA47_пружина/page_003.png'),
    require('@/albums/DFA47_пружина/page_004.png'),
  ],
  // DFA50
  'DFA50_твердый переплет': [
    require('@/albums/DFA50_твердый переплет/page_001.png'),
    require('@/albums/DFA50_твердый переплет/page_002.png'),
    require('@/albums/DFA50_твердый переплет/page_003.png'),
  ],
  'DFA50_пружина': [
    require('@/albums/DFA50_пружина/page_001.png'),
    require('@/albums/DFA50_пружина/page_002.png'),
    require('@/albums/DFA50_пружина/page_003.png'),
    require('@/albums/DFA50_пружина/page_004.png'),
  ],
  // DFA52
  'DFA52_твердый переплет': [
    require('@/albums/DFA52_твердый переплет/page_001.png'),
    require('@/albums/DFA52_твердый переплет/page_002.png'),
    require('@/albums/DFA52_твердый переплет/page_003.png'),
  ],
  'DFA52_пружина': [
    require('@/albums/DFA52_пружина/page_001.png'),
    require('@/albums/DFA52_пружина/page_002.png'),
    require('@/albums/DFA52_пружина/page_003.png'),
    require('@/albums/DFA52_пружина/page_004.png'),
  ],
  // DFA53
  'DFA53_твердый переплет': [
    require('@/albums/DFA53_твердый переплет/page_001.png'),
    require('@/albums/DFA53_твердый переплет/page_002.png'),
  ],
  'DFA53_пружина': [
    require('@/albums/DFA53_пружина/page_001.png'),
    require('@/albums/DFA53_пружина/page_002.png'),
    require('@/albums/DFA53_пружина/page_003.png'),
    require('@/albums/DFA53_пружина/page_004.png'),
  ],
  // DFA59
  'DFA59_твердый переплет': [
    require('@/albums/DFA59_твердый переплет/page_001.png'),
    require('@/albums/DFA59_твердый переплет/page_002.png'),
    require('@/albums/DFA59_твердый переплет/page_003.png'),
  ],
  'DFA59_пружина': [
    require('@/albums/DFA59_пружина/page_001.png'),
    require('@/albums/DFA59_пружина/page_002.png'),
    require('@/albums/DFA59_пружина/page_003.png'),
    require('@/albums/DFA59_пружина/page_004.png'),
  ],
  // DFA60
  'DFA60_твердый переплет': [
    require('@/albums/DFA60_твердый переплет/page_001.png'),
    require('@/albums/DFA60_твердый переплет/page_002.png'),
    require('@/albums/DFA60_твердый переплет/page_003.png'),
  ],
  'DFA60_пружина': [
    require('@/albums/DFA60_пружина/page_001.png'),
    require('@/albums/DFA60_пружина/page_002.png'),
    require('@/albums/DFA60_пружина/page_003.png'),
    require('@/albums/DFA60_пружина/page_004.png'),
  ],
  // DFA71
  'DFA71_твердый переплет': [
    require('@/albums/DFA71_твердый переплет/page_001.png'),
    require('@/albums/DFA71_твердый переплет/page_002.png'),
    require('@/albums/DFA71_твердый переплет/page_003.png'),
  ],
  'DFA71_пружина': [
    require('@/albums/DFA71_пружина/page_001.png'),
    require('@/albums/DFA71_пружина/page_002.png'),
    require('@/albums/DFA71_пружина/page_003.png'),
    require('@/albums/DFA71_пружина/page_004.png'),
  ],
  // DFA72
  'DFA72_твердый переплет': [
    require('@/albums/DFA72_твердый переплет/page_001.png'),
    require('@/albums/DFA72_твердый переплет/page_002.png'),
    require('@/albums/DFA72_твердый переплет/page_003.png'),
  ],
  'DFA72_пружина': [
    require('@/albums/DFA72_пружина/page_001.png'),
    require('@/albums/DFA72_пружина/page_002.png'),
    require('@/albums/DFA72_пружина/page_003.png'),
    require('@/albums/DFA72_пружина/page_004.png'),
  ],
  // DFA74
  'DFA74_твердый переплет': [
    require('@/albums/DFA74_твердый переплет/page_001.png'),
    require('@/albums/DFA74_твердый переплет/page_002.png'),
    require('@/albums/DFA74_твердый переплет/page_003.png'),
  ],
  'DFA74_пружина': [
    require('@/albums/DFA74_пружина/page_001.png'),
    require('@/albums/DFA74_пружина/page_002.png'),
    require('@/albums/DFA74_пружина/page_003.png'),
    require('@/albums/DFA74_пружина/page_004.png'),
  ],
  // DFA205
  'DFA205_твердый переплет': [
    require('@/albums/DFA205_твердый переплет/page_001.png'),
    require('@/albums/DFA205_твердый переплет/page_002.png'),
    require('@/albums/DFA205_твердый переплет/page_003.png'),
  ],
  'DFA205_пружина': [
    require('@/albums/DFA205_пружина/page_001.png'),
    require('@/albums/DFA205_пружина/page_002.png'),
    require('@/albums/DFA205_пружина/page_003.png'),
    require('@/albums/DFA205_пружина/page_004.png'),
  ],
  // DFA206
  'DFA206_твердый переплет': [
    require('@/albums/DFA206_твердый переплет/page_001.png'),
    require('@/albums/DFA206_твердый переплет/page_002.png'),
    require('@/albums/DFA206_твердый переплет/page_003.png'),
  ],
  'DFA206_пружина': [
    require('@/albums/DFA206_пружина/page_001.png'),
    require('@/albums/DFA206_пружина/page_002.png'),
    require('@/albums/DFA206_пружина/page_003.png'),
    require('@/albums/DFA206_пружина/page_004.png'),
  ],
  // DFA207
  'DFA207_твердый переплет': [
    require('@/albums/DFA207_твердый переплет/page_001.png'),
    require('@/albums/DFA207_твердый переплет/page_002.png'),
    require('@/albums/DFA207_твердый переплет/page_003.png'),
  ],
  'DFA207_пружина': [
    require('@/albums/DFA207_пружина/page_001.png'),
    require('@/albums/DFA207_пружина/page_002.png'),
    require('@/albums/DFA207_пружина/page_003.png'),
    require('@/albums/DFA207_пружина/page_004.png'),
  ],
  // DFA208
  'DFA208_твердый переплет': [
    require('@/albums/DFA208_твердый переплет/page_001.png'),
    require('@/albums/DFA208_твердый переплет/page_002.png'),
    require('@/albums/DFA208_твердый переплет/page_003.png'),
  ],
  'DFA208_пружина': [
    require('@/albums/DFA208_пружина/page_001.png'),
    require('@/albums/DFA208_пружина/page_002.png'),
    require('@/albums/DFA208_пружина/page_003.png'),
    require('@/albums/DFA208_пружина/page_004.png'),
  ],
  // DFA301
  'DFA301_твердый переплет': [
    require('@/albums/DFA301_твердый переплет/page_001.png'),
    require('@/albums/DFA301_твердый переплет/page_002.png'),
    require('@/albums/DFA301_твердый переплет/page_003.png'),
  ],
  'DFA301_пружина': [
    require('@/albums/DFA301_пружина/page_001.png'),
    require('@/albums/DFA301_пружина/page_002.png'),
    require('@/albums/DFA301_пружина/page_003.png'),
    require('@/albums/DFA301_пружина/page_004.png'),
  ],
  // DFA302
  'DFA302_твердый переплет': [
    require('@/albums/DFA302_твердый переплет/page_001.png'),
    require('@/albums/DFA302_твердый переплет/page_002.png'),
    require('@/albums/DFA302_твердый переплет/page_003.png'),
  ],
  'DFA302_пружина': [
    require('@/albums/DFA302_пружина/page_001.png'),
    require('@/albums/DFA302_пружина/page_002.png'),
    require('@/albums/DFA302_пружина/page_003.png'),
    require('@/albums/DFA302_пружина/page_004.png'),
  ],
  // DFA304
  'DFA304_твердый переплет': [
    require('@/albums/DFA304_твердый переплет/page_001.png'),
    require('@/albums/DFA304_твердый переплет/page_002.png'),
    require('@/albums/DFA304_твердый переплет/page_003.png'),
  ],
  'DFA304_пружина': [
    require('@/albums/DFA304_пружина/page_001.png'),
    require('@/albums/DFA304_пружина/page_002.png'),
    require('@/albums/DFA304_пружина/page_003.png'),
    require('@/albums/DFA304_пружина/page_004.png'),
  ],
  // DFA305
  'DFA305_твердый переплет': [
    require('@/albums/DFA305_твердый переплет/page_001.png'),
    require('@/albums/DFA305_твердый переплет/page_002.png'),
    require('@/albums/DFA305_твердый переплет/page_003.png'),
  ],
  'DFA305_пружина': [
    require('@/albums/DFA305_пружина/page_001.png'),
    require('@/albums/DFA305_пружина/page_002.png'),
    require('@/albums/DFA305_пружина/page_003.png'),
    require('@/albums/DFA305_пружина/page_004.png'),
  ],
  // DFA306
  'DFA306_твердый переплет': [
    require('@/albums/DFA306_твердый переплет/page_001.png'),
    require('@/albums/DFA306_твердый переплет/page_002.png'),
    require('@/albums/DFA306_твердый переплет/page_003.png'),
  ],
  'DFA306_пружина': [
    require('@/albums/DFA306_пружина/page_001.png'),
    require('@/albums/DFA306_пружина/page_002.png'),
    require('@/albums/DFA306_пружина/page_003.png'),
    require('@/albums/DFA306_пружина/page_004.png'),
  ],
  // DFA307
  'DFA307_твердый переплет': [
    require('@/albums/DFA307_твердый переплет/page_001.png'),
    require('@/albums/DFA307_твердый переплет/page_002.png'),
    require('@/albums/DFA307_твердый переплет/page_003.png'),
  ],
  'DFA307_пружина': [
    require('@/albums/DFA307_пружина/page_001.png'),
    require('@/albums/DFA307_пружина/page_002.png'),
    require('@/albums/DFA307_пружина/page_003.png'),
    require('@/albums/DFA307_пружина/page_004.png'),
  ],
  // DFA309
  'DFA309_твердый переплет': [
    require('@/albums/DFA309_твердый переплет/page_001.png'),
    require('@/albums/DFA309_твердый переплет/page_002.png'),
    require('@/albums/DFA309_твердый переплет/page_003.png'),
  ],
  'DFA309_пружина': [
    require('@/albums/DFA309_пружина/page_001.png'),
    require('@/albums/DFA309_пружина/page_002.png'),
    require('@/albums/DFA309_пружина/page_003.png'),
    require('@/albums/DFA309_пружина/page_004.png'),
  ],
};

/**
 * Получает require() модули изображений для развертки обложки
 * @param folderName - Название папки
 * @returns Массив require() модулей или null
 */
export function getCoverImageModules(folderName: string | null): any[] | null {
  if (!folderName) return null;
  
  const images = COVER_IMAGES_MAPPING[folderName];
  return images || null;
}

/**
 * Загружает URI изображений развертки обложки
 * @param folderName - Название папки
 * @returns Массив URI изображений или null
 */
export async function getCoverImageUris(folderName: string | null): Promise<string[] | null> {
  if (!folderName) return null;

  const imageModules = getCoverImageModules(folderName);
  if (!imageModules || imageModules.length === 0) {
    console.warn(`[Cover Images Loader] Изображения не найдены для папки: ${folderName}`);
    return null;
  }

  try {
    // Загружаем все изображения параллельно
    const assetPromises = imageModules.map(async (imageModule) => {
      try {
        const asset = Asset.fromModule(imageModule);
        await asset.downloadAsync();
        return asset.localUri || asset.uri;
      } catch (error) {
        console.warn(`[Cover Images Loader] Ошибка загрузки изображения:`, error);
        return null;
      }
    });

    const results = await Promise.all(assetPromises);
    const uris = results.filter((uri): uri is string => uri !== null);

    console.log(`[Cover Images Loader] Загружено ${uris.length} из ${imageModules.length} изображений для папки ${folderName}`);
    return uris.length > 0 ? uris : null;
  } catch (error) {
    console.error(`[Cover Images Loader] Ошибка при загрузке изображений из папки ${folderName}:`, error);
    return null;
  }
}

