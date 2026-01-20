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
 * В React Native require() должен быть статическим, поэтому используем прямые вызовы
 */
const COVER_IMAGES_MAPPING: Record<string, any[]> = {
  // DB1 - Беременность
  'DB1': (() => {
    try {
      return [require('@/albums/DB1/page_001.png')];
    } catch {
      return [];
    }
  })(),
  // DB2 - Беременность
  'DB2': (() => {
    try {
      return [require('@/albums/DB2/page_001.png')];
    } catch {
      return [];
    }
  })(),
  // DB3 - Беременность
  'DB3': (() => {
    try {
      return [require('@/albums/DB3/page_001.png')];
    } catch {
      return [];
    }
  })(),
  // DB4 - Беременность
  'DB4': (() => {
    try {
      return [require('@/albums/DB4/page_001.png')];
    } catch {
      return [];
    }
  })(),
  // DB5 - Беременность
  'DB5': (() => {
    try {
      return [require('@/albums/DB5/page_001.png')];
    } catch {
      return [];
    }
  })(),
  // DB6 - Беременность
  'DB6': (() => {
    try {
      return [require('@/albums/DB6/page_001.png')];
    } catch {
      return [];
    }
  })(),
  // DFA5
  'DFA5_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA5_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA5_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA5_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA5_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA5_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA5_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA5_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA5_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA7
  'DFA7_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA7_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA7_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA7_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA7_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA7_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA7_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA7_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA7_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA8
  'DFA8_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA8_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA8_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA8_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA8_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA8_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA8_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA8_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA8_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA9
  'DFA9_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA9_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA9_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA9_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA9_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA9_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA9_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA9_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA9_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA12
  'DFA12_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA12_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA12_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA12_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA12_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA12_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA12_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA12_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA12_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA15
  'DFA15_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA15_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA15_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA15_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA15_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA15_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA15_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA15_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA15_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA16
  'DFA16_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA16_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA16_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA16_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA16_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA16_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA16_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA16_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA16_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // Добавляем остальные папки на основе KIDS_COVER_PDF_MAPPING
  // DFA19
  'DFA19_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA19_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA19_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA19_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA19_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA19_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA19_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA19_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA19_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA21
  'DFA21_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA21_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA21_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA21_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA21_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA21_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA21_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA21_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA21_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA22
  'DFA22_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA22_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA22_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA22_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA22_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA22_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA22_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA22_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA22_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA23
  'DFA23_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA23_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA23_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA23_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA23_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA23_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA23_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA23_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA23_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA24
  'DFA24_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA24_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA24_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA24_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA24_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA24_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA24_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA24_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA24_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA25
  'DFA25_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA25_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA25_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA25_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA25_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA25_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA25_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA25_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA25_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA26
  'DFA26_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA26_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA26_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA26_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA26_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA26_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA26_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA26_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA26_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA27
  'DFA27_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA27_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA27_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA27_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA27_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA27_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA27_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA27_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA27_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA28
  'DFA28_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA28_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA28_твердый переплет/page_002.png')); } catch {}
    return images;
  })(),
  'DFA28_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA28_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA28_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA28_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA28_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA29
  'DFA29_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA29_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA29_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA29_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA29_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA29_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA29_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA29_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA29_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA30
  'DFA30_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA30_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA30_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA30_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA30_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA30_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA30_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA30_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA30_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA31
  'DFA31_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA31_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA31_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA31_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA31_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA31_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA31_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA31_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA31_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // dfa43
  'dfa43_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/dfa43_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/dfa43_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/dfa43_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'dfa43_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/dfa43_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/dfa43_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/dfa43_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/dfa43_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA46
  'DFA46_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA46_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA46_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA46_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA46_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA46_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA46_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA46_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA46_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA47
  'DFA47_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA47_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA47_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA47_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA47_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA47_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA47_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA47_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA47_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA50
  'DFA50_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA50_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA50_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA50_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA50_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA50_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA50_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA50_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA50_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA52
  'DFA52_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA52_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA52_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA52_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA52_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA52_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA52_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA52_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA52_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA53
  'DFA53_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA53_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA53_твердый переплет/page_002.png')); } catch {}
    return images;
  })(),
  'DFA53_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA53_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA53_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA53_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA53_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA59
  'DFA59_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA59_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA59_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA59_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA59_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA59_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA59_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA59_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA59_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA60
  'DFA60_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA60_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA60_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA60_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA60_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA60_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA60_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA60_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA60_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA71
  'DFA71_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA71_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA71_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA71_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA71_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA71_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA71_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA71_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA71_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA72
  'DFA72_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA72_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA72_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA72_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA72_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA72_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA72_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA72_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA72_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA74
  'DFA74_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA74_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA74_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA74_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA74_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA74_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA74_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA74_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA74_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA205
  'DFA205_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA205_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA205_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA205_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA205_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA205_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA205_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA205_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA205_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA206
  'DFA206_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA206_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA206_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA206_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA206_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA206_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA206_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA206_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA206_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA207
  'DFA207_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA207_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA207_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA207_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA207_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA207_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA207_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA207_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA207_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA208
  'DFA208_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA208_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA208_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA208_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA208_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA208_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA208_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA208_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA208_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA301
  'DFA301_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA301_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA301_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA301_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA301_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA301_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA301_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA301_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA301_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA302
  'DFA302_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA302_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA302_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA302_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA302_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA302_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA302_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA302_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA302_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA304
  'DFA304_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA304_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA304_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA304_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA304_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA304_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA304_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA304_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA304_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA305
  'DFA305_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA305_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA305_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA305_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA305_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA305_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA305_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA305_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA305_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA306
  'DFA306_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA306_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA306_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA306_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA306_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA306_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA306_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA306_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA306_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA307
  'DFA307_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA307_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA307_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA307_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA307_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA307_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA307_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA307_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA307_пружина/page_004.png')); } catch {}
    return images;
  })(),
  // DFA309
  'DFA309_твердый переплет': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA309_твердый переплет/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA309_твердый переплет/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA309_твердый переплет/page_003.png')); } catch {}
    return images;
  })(),
  'DFA309_пружина': (() => {
    const images: any[] = [];
    try { images.push(require('@/albums/DFA309_пружина/page_001.png')); } catch {}
    try { images.push(require('@/albums/DFA309_пружина/page_002.png')); } catch {}
    try { images.push(require('@/albums/DFA309_пружина/page_003.png')); } catch {}
    try { images.push(require('@/albums/DFA309_пружина/page_004.png')); } catch {}
    return images;
  })(),
};

/**
 * Получает require() модули изображений для развертки обложки
 * @param folderName - Название папки
 * @returns Массив require() модулей или null
 */
export function getCoverImageModules(folderName: string | null): any[] | null {
  if (!folderName) return null;
  
  const images = COVER_IMAGES_MAPPING[folderName];
  if (!images) return null;
  
  // Фильтруем null значения (для несуществующих файлов)
  const validImages = images.filter((img): img is any => img !== null);
  return validImages.length > 0 ? validImages : null;
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

