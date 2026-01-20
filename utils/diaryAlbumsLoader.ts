import { Asset } from 'expo-asset';
import type { ImageSourcePropType } from 'react-native';

/**
 * Интерфейс для обложки дневника
 */
export interface DiaryCover {
  id: string;
  sku: string; // SKU для поиска в каталоге (DD1, DD2, ..., DD21)
  image: ImageSourcePropType;
  imageSpring: ImageSourcePropType | null; // Вариант с пружиной
  name: string;
}

/**
 * Интерфейс для внутренней части дневника
 */
export interface DiaryInterior {
  id: string;
  name: string;
  description: string;
  pages: number;
  images: ImageSourcePropType[];
}

/**
 * Извлекает SKU из названия файла обложки
 * @param filename - Название файла (например, 'DD_1.png', 'DD_21_пружина.png')
 * @returns SKU (например, 'DD1', 'DD21')
 */
export function extractSkuFromFilename(filename: string): string | null {
  // Ищем паттерн DD_число или DD_число_пружина
  const match = filename.match(/DD_(\d+)/i);
  if (match) {
    const number = match[1];
    return `DD${number}`;
  }
  return null;
}

/**
 * Статический маппинг обложек дневников
 * Ключ: SKU (DD1, DD2, ..., DD21)
 */
const DIARY_COVERS_MAPPING: Record<string, DiaryCover> = {
  DD1: {
    id: 'diary_dd1',
    sku: 'DD1',
    image: require('@/albums/diary/cover/DD_1.png'),
    imageSpring: require('@/albums/diary/cover/DD_1_пружина.png'),
    name: 'Личный дневник',
  },
  DD2: {
    id: 'diary_dd2',
    sku: 'DD2',
    image: require('@/albums/diary/cover/DD_2.png'),
    imageSpring: require('@/albums/diary/cover/DD_2_пружина.png'),
    name: 'Личный дневник',
  },
  DD3: {
    id: 'diary_dd3',
    sku: 'DD3',
    image: require('@/albums/diary/cover/DD_3.png'),
    imageSpring: require('@/albums/diary/cover/DD_3_пружина.png'),
    name: 'Личный дневник',
  },
  DD4: {
    id: 'diary_dd4',
    sku: 'DD4',
    image: require('@/albums/diary/cover/DD_4.png'),
    imageSpring: require('@/albums/diary/cover/DD_4_пружина.png'),
    name: 'Личный дневник',
  },
  DD5: {
    id: 'diary_dd5',
    sku: 'DD5',
    image: require('@/albums/diary/cover/DD_5.png'),
    imageSpring: require('@/albums/diary/cover/DD_5_пружина.png'),
    name: 'Личный дневник',
  },
  DD6: {
    id: 'diary_dd6',
    sku: 'DD6',
    image: require('@/albums/diary/cover/DD_6.png'),
    imageSpring: require('@/albums/diary/cover/DD_6_пружина.png'),
    name: 'Личный дневник',
  },
  DD7: {
    id: 'diary_dd7',
    sku: 'DD7',
    image: require('@/albums/diary/cover/DD_7.png'),
    imageSpring: require('@/albums/diary/cover/DD_7_пружина.png'),
    name: 'Личный дневник',
  },
  DD8: {
    id: 'diary_dd8',
    sku: 'DD8',
    image: require('@/albums/diary/cover/DD_8.png'),
    imageSpring: require('@/albums/diary/cover/DD_8_пружина.png'),
    name: 'Личный дневник',
  },
  DD9: {
    id: 'diary_dd9',
    sku: 'DD9',
    image: require('@/albums/diary/cover/DD_9.png'),
    imageSpring: require('@/albums/diary/cover/DD_9_пружина.png'),
    name: 'Личный дневник',
  },
  DD10: {
    id: 'diary_dd10',
    sku: 'DD10',
    image: require('@/albums/diary/cover/DD_10.png'),
    imageSpring: require('@/albums/diary/cover/DD_10_пружина.png'),
    name: 'Личный дневник',
  },
  DD11: {
    id: 'diary_dd11',
    sku: 'DD11',
    image: require('@/albums/diary/cover/DD_11.png'),
    imageSpring: require('@/albums/diary/cover/DD_11_пружина.png'),
    name: 'Личный дневник',
  },
  DD12: {
    id: 'diary_dd12',
    sku: 'DD12',
    image: require('@/albums/diary/cover/DD_12.png'),
    imageSpring: require('@/albums/diary/cover/DD_12_пружина.png'),
    name: 'Личный дневник',
  },
  DD13: {
    id: 'diary_dd13',
    sku: 'DD13',
    image: require('@/albums/diary/cover/DD_13.png'),
    imageSpring: require('@/albums/diary/cover/DD_13_пружина.png'),
    name: 'Личный дневник',
  },
  DD14: {
    id: 'diary_dd14',
    sku: 'DD14',
    image: require('@/albums/diary/cover/DD_14.png'),
    imageSpring: require('@/albums/diary/cover/DD_14_пружина.png'),
    name: 'Личный дневник',
  },
  DD15: {
    id: 'diary_dd15',
    sku: 'DD15',
    image: require('@/albums/diary/cover/DD_15.png'),
    imageSpring: require('@/albums/diary/cover/DD_15_пружина.png'),
    name: 'Личный дневник',
  },
  DD16: {
    id: 'diary_dd16',
    sku: 'DD16',
    image: require('@/albums/diary/cover/DD_16.png'),
    imageSpring: require('@/albums/diary/cover/DD_16_пружина.png'),
    name: 'Личный дневник',
  },
  DD17: {
    id: 'diary_dd17',
    sku: 'DD17',
    image: require('@/albums/diary/cover/DD_17.png'),
    imageSpring: require('@/albums/diary/cover/DD_17_пружина.png'),
    name: 'Личный дневник',
  },
  DD18: {
    id: 'diary_dd18',
    sku: 'DD18',
    image: require('@/albums/diary/cover/DD_18.png'),
    imageSpring: require('@/albums/diary/cover/DD_18_пружина.png'),
    name: 'Личный дневник',
  },
  DD20: {
    id: 'diary_dd20',
    sku: 'DD20',
    image: require('@/albums/diary/cover/DD_20.png'),
    imageSpring: require('@/albums/diary/cover/DD_20_пружина.png'),
    name: 'Личный дневник',
  },
  DD21: {
    id: 'diary_dd21',
    sku: 'DD21',
    image: require('@/albums/diary/cover/DD_21.png'),
    imageSpring: require('@/albums/diary/cover/DD_21_пружина.png'),
    name: 'Личный дневник',
  },
};

/**
 * Получает все обложки дневников
 */
export function getAllDiaryCovers(): DiaryCover[] {
  return Object.values(DIARY_COVERS_MAPPING);
}

/**
 * Получает обложку дневника по SKU
 */
export function getDiaryCoverBySku(sku: string): DiaryCover | null {
  return DIARY_COVERS_MAPPING[sku] || null;
}

/**
 * Получает обложку дневника по ID
 */
export function getDiaryCoverById(id: string): DiaryCover | null {
  return Object.values(DIARY_COVERS_MAPPING).find(cover => cover.id === id) || null;
}

// Статический маппинг страниц коричневого блока (60 страниц)
const brownBlockImages = [
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_001.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_002.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_003.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_004.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_005.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_006.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_007.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_008.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_009.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_010.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_011.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_012.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_013.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_014.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_015.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_016.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_017.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_018.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_019.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_020.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_021.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_022.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_023.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_024.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_025.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_026.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_027.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_028.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_029.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_030.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_031.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_032.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_033.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_034.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_035.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_036.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_037.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_038.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_039.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_040.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_041.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_042.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_043.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_044.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_045.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_046.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_047.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_048.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_049.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_050.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_051.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_052.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_053.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_054.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_055.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_056.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_057.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_058.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_059.png'),
  require('@/albums/diary/cover/in album/Блок коричневый _180х240_print/page_060.png'),
];

// Статический маппинг страниц фиолетового блока (40 страниц)
const purpleBlockImages = [
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_001.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_002.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_003.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_004.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_005.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_006.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_007.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_008.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_009.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_010.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_011.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_012.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_013.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_014.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_015.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_016.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_017.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_018.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_019.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_020.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_021.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_022.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_023.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_024.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_025.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_026.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_027.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_028.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_029.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_030.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_031.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_032.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_033.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_034.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_035.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_036.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_037.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_038.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_039.png'),
  require('@/albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_040.png'),
];

/**
 * Статический маппинг внутренних частей дневников
 * Коричневый блок (60 страниц) и фиолетовый блок (40 страниц)
 */
const DIARY_INTERIOR_MAPPING: Record<string, DiaryInterior> = {
  brown: {
    id: 'diary_interior_brown',
    name: 'Коричневый',
    description: '60 страниц для записи',
    pages: brownBlockImages.length,
    images: brownBlockImages,
  },
  purple: {
    id: 'diary_interior_purple',
    name: 'Фиолетовый',
    description: '40 страниц для записи',
    pages: purpleBlockImages.length,
    images: purpleBlockImages,
  },
};

/**
 * Получает все внутренние части дневников
 */
export function getAllDiaryInteriors(): DiaryInterior[] {
  return Object.values(DIARY_INTERIOR_MAPPING);
}

/**
 * Получает внутреннюю часть дневника по ID
 */
export function getDiaryInteriorById(id: string): DiaryInterior | null {
  return Object.values(DIARY_INTERIOR_MAPPING).find(interior => interior.id === id) || null;
}

/**
 * Загружает URI изображений внутренней части дневника
 * Оптимизировано для максимально быстрой параллельной загрузки
 */
export async function getDiaryInteriorImageUris(interiorId: string): Promise<string[] | null> {
  const interior = getDiaryInteriorById(interiorId);
  if (!interior || interior.images.length === 0) {
    return null;
  }

  try {
    // Параллельная загрузка всех изображений для максимальной скорости
    // Используем Promise.allSettled для обработки ошибок без остановки загрузки
    const assetPromises = interior.images.map(async (imageModule) => {
      try {
        const asset = Asset.fromModule(imageModule as any);
        // downloadAsync уже оптимизирован для параллельной загрузки
        await asset.downloadAsync();
        return asset.localUri || asset.uri;
      } catch (error) {
        console.warn(`[Diary Loader] Ошибка загрузки изображения:`, error);
        return null;
      }
    });

    // Используем Promise.all для максимальной параллельной загрузки
    const results = await Promise.all(assetPromises);
    const uris = results.filter((uri): uri is string => uri !== null);

    return uris.length > 0 ? uris : null;
  } catch (error) {
    console.error(`[Diary Loader] Ошибка при загрузке изображений внутренней части ${interiorId}:`, error);
    return null;
  }
}
