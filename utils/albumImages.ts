import { Asset } from 'expo-asset';

/**
 * Маппинг изображений страниц альбомов
 * Используется для загрузки всех страниц альбома как изображений
 */

// Блок БЕРЕМЕННОСТЬ 60 стр - 60 страниц
// Используем явные require() для каждого изображения
const pregnancy60Images = [
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_001.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_002.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_003.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_004.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_005.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_006.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_007.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_008.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_009.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_010.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_011.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_012.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_013.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_014.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_015.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_016.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_017.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_018.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_019.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_020.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_021.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_022.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_023.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_024.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_025.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_026.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_027.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_028.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_029.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_030.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_031.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_032.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_033.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_034.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_035.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_036.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_037.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_038.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_039.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_040.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_041.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_042.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_043.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_044.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_045.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_046.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_047.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_048.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_049.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_050.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_051.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_052.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_053.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_054.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_055.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_056.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_057.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_058.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_059.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/page_060.png'),
];

// Блок БЕРЕМЕННОСТЬ A5 другой блок - 48 страниц
const pregnancyA5Images = [
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_001.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_002.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_003.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_004.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_005.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_006.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_007.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_008.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_009.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_010.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_011.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_012.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_013.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_014.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_015.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_016.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_017.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_018.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_019.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_020.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_021.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_022.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_023.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_024.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_025.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_026.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_027.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_028.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_029.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_030.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_031.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_032.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_033.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_034.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_035.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_036.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_037.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_038.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_039.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_040.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_041.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_042.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_043.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_044.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_045.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_046.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_047.png'),
  require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок/page_048.png'),
];

// Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр - 48 страниц (для всех детских альбомов)
const kids48Images = [
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_001.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_002.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_003.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_004.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_005.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_006.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_007.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_008.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_009.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_010.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_011.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_012.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_013.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_014.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_015.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_016.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_017.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_018.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_019.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_020.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_021.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_022.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_023.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_024.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_025.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_026.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_027.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_028.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_029.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_030.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_031.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_032.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_033.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_034.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_035.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_036.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_037.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_038.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_039.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_040.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_041.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_042.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_043.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_044.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_045.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_046.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_047.png'),
  require('@/assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/page_048.png'),
];

/**
 * Получает массив URI изображений для альбома
 * Конвертирует require() модули в URI через Asset API
 */
export async function getAlbumImageUris(albumId: string): Promise<string[]> {
  const images = getAlbumImages(albumId);
  
  if (images.length === 0) {
    console.warn(`Изображения не найдены для альбома: ${albumId}`);
    return [];
  }
  
  const uris: string[] = [];
  
  try {
    // Загружаем все изображения параллельно для лучшей производительности
    const assetPromises = images.map(async (image) => {
      try {
        const asset = Asset.fromModule(image);
        await asset.downloadAsync();
        return asset.localUri || asset.uri;
      } catch (error) {
        console.warn('Ошибка загрузки изображения:', error);
        return null;
      }
    });
    
    const results = await Promise.all(assetPromises);
    uris.push(...results.filter((uri): uri is string => uri !== null));
    
    console.log(`Загружено ${uris.length} из ${images.length} изображений для альбома ${albumId}`);
  } catch (error) {
    console.error('Ошибка при загрузке изображений альбома:', error);
  }
  
  return uris;
}

/**
 * Получает массив изображений для альбома (require модули)
 */
export function getAlbumImages(albumId: string): any[] {
  switch (albumId) {
    case 'pregnancy_60':
      return pregnancy60Images;
    case 'pregnancy_a5':
      return pregnancyA5Images;
    case 'kids_48':
      return kids48Images;
    default:
      // Для всех детских альбомов используем kids_48
      if (albumId.startsWith('dfa_') || albumId.startsWith('kids_')) {
        return kids48Images;
      }
      return [];
  }
}

/**
 * Получает количество страниц для альбома
 */
export function getAlbumPageCount(albumId: string): number {
  switch (albumId) {
    case 'pregnancy_60':
      return 60;
    case 'pregnancy_a5':
      return 48;
    case 'kids_48':
      return 48;
    default:
      // Для всех детских альбомов используем 48 страниц
      if (albumId.startsWith('dfa_') || albumId.startsWith('kids_')) {
        return 48;
      }
      return 0;
  }
}

