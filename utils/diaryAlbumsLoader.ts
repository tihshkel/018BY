import { Asset } from 'expo-asset';
import type { ImageSourcePropType } from 'react-native';

const PLACEHOLDER_IMAGE = require('@/assets/images/albums/blank_white.png');

const DIARY_COVER_IMAGES = {
  DD1: require('@/assets/images/albums/DD_1.png'),
  DD2: require('@/assets/images/albums/DD_2.png'),
  DD3: require('@/assets/images/albums/DD_3.png'),
  DD4: require('@/assets/images/albums/DD_4.png'),
  DD5: require('@/assets/images/albums/DD_5.png'),
  DD6: require('@/assets/images/albums/DD_6.png'),
  DD7: require('@/assets/images/albums/DD_7.png'),
  DD8: require('@/assets/images/albums/DD_8.png'),
  DD9: require('@/assets/images/albums/DD_9.png'),
  DD10: require('@/assets/images/albums/DD_10.png'),
  DD11: require('@/assets/images/albums/DD_11.png'),
  DD12: require('@/assets/images/albums/DD_12.png'),
  DD13: require('@/assets/images/albums/DD_13.png'),
  DD14: require('@/assets/images/albums/DD_14.png'),
  DD15: require('@/assets/images/albums/DD_15.png'),
  DD16: require('@/assets/images/albums/DD_16.png'),
  DD17: require('@/assets/images/albums/DD_17.png'),
  DD18: require('@/assets/images/albums/DD_18.png'),
  DD20: require('@/assets/images/albums/DD_20.png'),
  DD21: require('@/assets/images/albums/DD_21.png'),
} as const;

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
    image: DIARY_COVER_IMAGES.DD1,
    imageSpring: DIARY_COVER_IMAGES.DD1,
    name: 'Личный дневник',
  },
  DD2: {
    id: 'diary_dd2',
    sku: 'DD2',
    image: DIARY_COVER_IMAGES.DD2,
    imageSpring: DIARY_COVER_IMAGES.DD2,
    name: 'Личный дневник',
  },
  DD3: {
    id: 'diary_dd3',
    sku: 'DD3',
    image: DIARY_COVER_IMAGES.DD3,
    imageSpring: DIARY_COVER_IMAGES.DD3,
    name: 'Личный дневник',
  },
  DD4: {
    id: 'diary_dd4',
    sku: 'DD4',
    image: DIARY_COVER_IMAGES.DD4,
    imageSpring: DIARY_COVER_IMAGES.DD4,
    name: 'Личный дневник',
  },
  DD5: {
    id: 'diary_dd5',
    sku: 'DD5',
    image: DIARY_COVER_IMAGES.DD5,
    imageSpring: DIARY_COVER_IMAGES.DD5,
    name: 'Личный дневник',
  },
  DD6: {
    id: 'diary_dd6',
    sku: 'DD6',
    image: DIARY_COVER_IMAGES.DD6,
    imageSpring: DIARY_COVER_IMAGES.DD6,
    name: 'Личный дневник',
  },
  DD7: {
    id: 'diary_dd7',
    sku: 'DD7',
    image: DIARY_COVER_IMAGES.DD7,
    imageSpring: DIARY_COVER_IMAGES.DD7,
    name: 'Личный дневник',
  },
  DD8: {
    id: 'diary_dd8',
    sku: 'DD8',
    image: DIARY_COVER_IMAGES.DD8,
    imageSpring: DIARY_COVER_IMAGES.DD8,
    name: 'Личный дневник',
  },
  DD9: {
    id: 'diary_dd9',
    sku: 'DD9',
    image: DIARY_COVER_IMAGES.DD9,
    imageSpring: DIARY_COVER_IMAGES.DD9,
    name: 'Личный дневник',
  },
  DD10: {
    id: 'diary_dd10',
    sku: 'DD10',
    image: DIARY_COVER_IMAGES.DD10,
    imageSpring: DIARY_COVER_IMAGES.DD10,
    name: 'Личный дневник',
  },
  DD11: {
    id: 'diary_dd11',
    sku: 'DD11',
    image: DIARY_COVER_IMAGES.DD11,
    imageSpring: DIARY_COVER_IMAGES.DD11,
    name: 'Личный дневник',
  },
  DD12: {
    id: 'diary_dd12',
    sku: 'DD12',
    image: DIARY_COVER_IMAGES.DD12,
    imageSpring: DIARY_COVER_IMAGES.DD12,
    name: 'Личный дневник',
  },
  DD13: {
    id: 'diary_dd13',
    sku: 'DD13',
    image: DIARY_COVER_IMAGES.DD13,
    imageSpring: DIARY_COVER_IMAGES.DD13,
    name: 'Личный дневник',
  },
  DD14: {
    id: 'diary_dd14',
    sku: 'DD14',
    image: DIARY_COVER_IMAGES.DD14,
    imageSpring: DIARY_COVER_IMAGES.DD14,
    name: 'Личный дневник',
  },
  DD15: {
    id: 'diary_dd15',
    sku: 'DD15',
    image: DIARY_COVER_IMAGES.DD15,
    imageSpring: DIARY_COVER_IMAGES.DD15,
    name: 'Личный дневник',
  },
  DD16: {
    id: 'diary_dd16',
    sku: 'DD16',
    image: DIARY_COVER_IMAGES.DD16,
    imageSpring: DIARY_COVER_IMAGES.DD16,
    name: 'Личный дневник',
  },
  DD17: {
    id: 'diary_dd17',
    sku: 'DD17',
    image: DIARY_COVER_IMAGES.DD17,
    imageSpring: DIARY_COVER_IMAGES.DD17,
    name: 'Личный дневник',
  },
  DD18: {
    id: 'diary_dd18',
    sku: 'DD18',
    image: DIARY_COVER_IMAGES.DD18,
    imageSpring: DIARY_COVER_IMAGES.DD18,
    name: 'Личный дневник',
  },
  DD20: {
    id: 'diary_dd20',
    sku: 'DD20',
    image: DIARY_COVER_IMAGES.DD20,
    imageSpring: DIARY_COVER_IMAGES.DD20,
    name: 'Личный дневник',
  },
  DD21: {
    id: 'diary_dd21',
    sku: 'DD21',
    image: DIARY_COVER_IMAGES.DD21,
    imageSpring: DIARY_COVER_IMAGES.DD21,
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

// В EAS Build не тащим тяжёлые папки `albums/**`. Для сборки используем заглушки.
const brownBlockImages = Array.from({ length: 60 }, () => PLACEHOLDER_IMAGE);

const purpleBlockImages = Array.from({ length: 40 }, () => PLACEHOLDER_IMAGE);

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
    // Все слоты могут ссылаться на один и тот же require (заглушка в production).
    // Параллельный downloadAsync по одному модулю даёт гонки; достаточно одной загрузки.
    const firstModule = interior.images[0];
    const asset = Asset.fromModule(firstModule as any);
    await asset.downloadAsync();
    const uri = asset.localUri || asset.uri;
    if (!uri) {
      return null;
    }
    const pageCount = interior.pages > 0 ? interior.pages : interior.images.length;
    // Каждая страница — отдельный элемент массива (порядок = номер страницы), URI может совпадать.
    return Array.from({ length: pageCount }, () => uri);
  } catch (error) {
    console.error(`[Diary Loader] Ошибка при загрузке изображений внутренней части ${interiorId}:`, error);
    return null;
  }
}
