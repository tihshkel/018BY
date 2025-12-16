import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

/**
 * Маппинг альбомов к папкам с изображениями
 */
const ALBUM_IMAGE_FOLDERS: { [key: string]: string } = {
  'pregnancy_60': 'Блок БЕРЕМЕННОСТЬ 60 стр',
  'pregnancy_a5': 'Блок БЕРЕМЕННОСТЬ A5 другой блок',
};

/**
 * Получает массив URI изображений для альбома
 * @param albumId - ID альбома
 * @returns Массив URI изображений
 */
export async function loadAlbumImages(albumId: string): Promise<string[]> {
  const folderName = ALBUM_IMAGE_FOLDERS[albumId];
  
  if (!folderName) {
    console.warn(`Папка с изображениями не найдена для альбома: ${albumId}`);
    return [];
  }

  try {
    // Для разработки используем require() для каждого изображения
    // В продакшене можно использовать Asset API или FileSystem
    
    // Определяем количество страниц на основе альбома
    const pageCount = albumId === 'pregnancy_60' ? 60 : 48;
    
    const images: string[] = [];
    
    // Генерируем пути к изображениям
    for (let i = 1; i <= pageCount; i++) {
      const pageNumber = i.toString().padStart(3, '0');
      const imageName = `page_${pageNumber}.png`;
      
      try {
        // Пытаемся загрузить изображение через require
        // В React Native это работает только для статических ресурсов
        // Для динамической загрузки нужно использовать другой подход
        
        // Используем Asset API для получения URI
        const imagePath = `assets/pdfs/${folderName}/${imageName}`;
        
        // Для веб и мобильных платформ используем разные подходы
        if (typeof window !== 'undefined') {
          // Веб-версия
          images.push(`/${imagePath}`);
        } else {
          // Мобильная версия - используем Asset API
          // В реальном приложении нужно скопировать изображения в FileSystem
          // или использовать bundle identifier
          const asset = Asset.fromModule(require(`@/assets/pdfs/${folderName}/${imageName}`));
          await asset.downloadAsync();
          images.push(asset.localUri || asset.uri);
        }
      } catch (error) {
        console.warn(`Не удалось загрузить изображение ${imageName}:`, error);
        // Пропускаем это изображение
      }
    }
    
    return images;
  } catch (error) {
    console.error('Ошибка загрузки изображений альбома:', error);
    return [];
  }
}

/**
 * Альтернативный метод: загрузка изображений через FileSystem
 * (требует, чтобы изображения были скопированы в FileSystem)
 */
export async function loadAlbumImagesFromFileSystem(albumId: string): Promise<string[]> {
  const folderName = ALBUM_IMAGE_FOLDERS[albumId];
  
  if (!folderName) {
    return [];
  }

  try {
    const pageCount = albumId === 'pregnancy_60' ? 60 : 48;
    const images: string[] = [];
    
    // Путь к папке с изображениями в FileSystem
    const folderPath = `${FileSystem.documentDirectory}albums/${folderName}/`;
    
    // Проверяем существование папки
    const folderInfo = await FileSystem.getInfoAsync(folderPath);
    if (!folderInfo.exists) {
      console.warn(`Папка не найдена: ${folderPath}`);
      return [];
    }
    
    // Читаем файлы в папке
    const files = await FileSystem.readDirectoryAsync(folderPath);
    
    // Сортируем файлы по имени
    const sortedFiles = files
      .filter(file => file.endsWith('.png'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });
    
    // Формируем массив URI
    for (const file of sortedFiles) {
      images.push(`${folderPath}${file}`);
    }
    
    return images;
  } catch (error) {
    console.error('Ошибка загрузки изображений из FileSystem:', error);
    return [];
  }
}

/**
 * Получает изображения через require (статическая загрузка)
 * Работает только для известных альбомов
 */
export function getAlbumImagesStatic(albumId: string): string[] {
  const folderName = ALBUM_IMAGE_FOLDERS[albumId];
  
  if (!folderName) {
    return [];
  }

  const pageCount = albumId === 'pregnancy_60' ? 60 : 48;
  const images: any[] = [];
  
  // Для статической загрузки нужно явно указать все require()
  // Это не масштабируемо, но работает для известных альбомов
  
  if (albumId === 'pregnancy_60') {
    // Загружаем все 60 изображений
    for (let i = 1; i <= 60; i++) {
      const pageNumber = i.toString().padStart(3, '0');
      try {
        const image = require(`@/assets/pdfs/${folderName}/page_${pageNumber}.png`);
        images.push(image);
      } catch (error) {
        console.warn(`Не удалось загрузить page_${pageNumber}.png`);
      }
    }
  } else if (albumId === 'pregnancy_a5') {
    // Загружаем все 48 изображений
    for (let i = 1; i <= 48; i++) {
      const pageNumber = i.toString().padStart(3, '0');
      try {
        const image = require(`@/assets/pdfs/${folderName}/page_${pageNumber}.png`);
        images.push(image);
      } catch (error) {
        console.warn(`Не удалось загрузить page_${pageNumber}.png`);
      }
    }
  }
  
  return images;
}

